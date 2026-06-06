"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { AudioResultTable } from "@/app/dev/_components/audio-result-table";
import {
  TATOEBA_SEARCH_DEFAULT_TOP_K,
  TATOEBA_SEARCH_RERANK_DEFAULT_MODEL,
  TATOEBA_SEARCH_RERANK_MAX_CANDIDATES,
  type TatoebaSearchRerankModel,
} from "@/lib/ai/tatoeba-search-config";
import { useCorpusCache } from "@/lib/hooks/use-corpus-cache";
import { useTranslationCache } from "@/lib/hooks/use-translation-cache";
import { cosineSim } from "@/lib/utils/cosine";

import { AudioStatsPanel } from "./audio-stats-panel";
import { ConflictDialog } from "./conflict-dialog";
import { CorpusBar } from "./corpus-bar";
import { HistoryPanel } from "./history-panel";
import { NoTranslationWarningDialog } from "./no-translation-warning-dialog";
import { PersistBar } from "./persist-bar";
import { SearchControls } from "./search-controls";
import { SearchDebug } from "./search-debug";

import type { AudioRow } from "@/app/api/dev/tatoeba-audio/list/route";
import type {
  ApplySuccess,
  ExistingConflictRow,
  PersistItem,
  PersistResolution,
  PersistResponse,
  PreflightSuccess,
} from "@/app/api/dev/tatoeba-audio/persist-batch/route";
import type { TranslateResponse } from "@/app/api/dev/tatoeba-audio/translate/route";
import type { CorpusResponse } from "@/app/api/dev/tatoeba-audio-search/corpus/route";
import type { EmbedQueryResponse } from "@/app/api/dev/tatoeba-audio-search/embed-query/route";
import type { RerankResponse } from "@/app/api/dev/tatoeba-audio-search/rerank/route";
import type { TranslateRowState } from "@/app/dev/_components/audio-result-table";
import type {
  ChatMessage,
  SearchDebugSnapshot,
  Selection,
} from "./types";

// Top-level orkestrator voor /dev/tatoeba-audio-search. State leeft
// hier; alle sub-componenten zijn dom (props in, callbacks out).
//
// State-model:
//   - `lang`: actieve taal (bepaalt welke localStorage-bucket actief is).
//   - `stack`: undo-stack van Selection's. Bottom = wortel (alle 500),
//     top = huidige actieve selectie.
//   - `messages`: chat-history. Elk assistant-bericht verwijst naar
//     een selectie via `selectionId`, zodat klikken op een ouder
//     bericht de stack truncates naar dat punt.
//   - `topK`, `rerankEnabled`, `model`: search-knobs.
//   - `debug`: laatste pipeline-snapshot voor het debug-panel.
//   - `translateState`: per audio_id pending/error tijdens vertaal-call.
//     Geslaagde vertalingen leven in `translationCache` (localStorage).
//
// De translate-flow is bewust een kopie van die in audio-table.tsx
// (zelfde route, zelfde cache-key) — niet via shared hook omdat de
// state per pagina onafhankelijk moet zijn (twee pagina's tegelijk
// open mogen niet in elkaars pending-state porren).

const LANG_OPTIONS = [
  { value: "spa", label: "Spaans (spa)" },
  { value: "eng", label: "Engels (eng)" },
  { value: "nld", label: "Nederlands (nld)" },
  { value: "fra", label: "Frans (fra)" },
  { value: "deu", label: "Duits (deu)" },
] as const;

const TARGET_LANG = "nld";

// Translate-route cap. Houden in sync met max-items in
// [translate/route.ts](app/api/dev/tatoeba-audio/translate/route.ts).
const TRANSLATE_CHUNK_SIZE = 50;

// Persist-route cap (zie persist-batch route). Boven deze waarde splitsen
// we client-side op zodat we niet tegen het 60s ceiling aanlopen of de
// validatie-min/max in de zod-schema breken.
const PERSIST_CHUNK_SIZE = 50;

function newId(): string {
  return crypto.randomUUID();
}

export function AudioSearchPage() {
  const [lang, setLang] = useState<string>("spa");
  const [topK, setTopK] = useState<number>(TATOEBA_SEARCH_DEFAULT_TOP_K);
  const [rerankEnabled, setRerankEnabled] = useState<boolean>(true);
  const [model, setModel] = useState<TatoebaSearchRerankModel>(
    TATOEBA_SEARCH_RERANK_DEFAULT_MODEL,
  );
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [stack, setStack] = useState<Selection[]>([]);
  const [searching, setSearching] = useState<boolean>(false);
  const [debug, setDebug] = useState<SearchDebugSnapshot | null>(null);
  const [corpusLoading, setCorpusLoading] = useState<boolean>(false);
  const [corpusError, setCorpusError] = useState<string | null>(null);

  const corpus = useCorpusCache(lang);
  const translationCache = useTranslationCache();
  const [translateState, setTranslateState] = useState<
    Record<number, TranslateRowState>
  >({});

  // ── Selectie + persist state ───────────────────────────────────────
  // selectedIds is in-scope: ids die niet meer in `visibleRows` zitten
  // worden automatisch gepruned (zie useEffect verderop). Sleutel is
  // audio_id (stabiele Tatoeba-key) zodat selectie-overerving binnen
  // dezelfde scope blijft werken.
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [batchTranslating, setBatchTranslating] = useState(false);
  const [persisting, setPersisting] = useState(false);
  const [persistError, setPersistError] = useState<string | null>(null);
  const [persistSummary, setPersistSummary] = useState<
    ApplySuccess["summary"] | null
  >(null);
  const [conflictPrompt, setConflictPrompt] = useState<{
    items: PersistItem[];
    conflicts: Record<string, ExistingConflictRow[]>;
    nonConflictItems: PersistItem[];
  } | null>(null);
  // Modal die opent als er rijen in de selectie zitten zonder vertaling.
  // `validItems` zijn de wél-vertaalde records die we ná "Doorgaan" door
  // de normale preflight+apply-flow sturen.
  const [noTranslationPrompt, setNoTranslationPrompt] = useState<{
    validItems: PersistItem[];
    skippedCount: number;
  } | null>(null);
  // Bump om <AudioStatsPanel> te triggeren tot een re-fetch na persist.
  const [statsRefreshKey, setStatsRefreshKey] = useState(0);

  // Bouw een AudioRow-by-id index zodat de tabel snel records kan
  // resolven uit de huidige selectie's audioIds.
  const recordsById = useMemo(() => {
    const map = new Map<number, AudioRow>();
    if (!corpus.snapshot) return map;
    for (const row of corpus.snapshot.rows) {
      map.set(row.audio_id, row);
    }
    return map;
  }, [corpus.snapshot]);

  const currentSelection = stack.at(-1) ?? null;

  const visibleRows = useMemo<AudioRow[]>(() => {
    if (!currentSelection || recordsById.size === 0) return [];
    const out: AudioRow[] = [];
    for (const id of currentSelection.audioIds) {
      const row = recordsById.get(id);
      if (row) out.push(row);
    }
    return out;
  }, [currentSelection, recordsById]);

  // ── Corpus laden ──────────────────────────────────────────────────
  const handleLoadCorpus = useCallback(
    async (limit: number) => {
      setCorpusLoading(true);
      setCorpusError(null);
      try {
        const url = `/api/dev/tatoeba-audio-search/corpus?lang=${encodeURIComponent(lang)}&limit=${limit}`;
        const res = await fetch(url);
        const json = (await res.json()) as CorpusResponse;
        if (!res.ok || !json.ok) {
          const errMsg = json.ok ? `HTTP ${res.status}` : json.error;
          setCorpusError(errMsg);
          return;
        }
        corpus.setCorpus({
          lang: json.lang,
          rows: json.rows,
          embeddings: json.embeddings,
          fetched_at: json.fetched_at,
          dims: json.dims,
        });
        // Reset chat-state: oude selecties verwijzen naar audio_ids
        // die mogelijk niet meer in de corpus zitten.
        const root: Selection = {
          id: newId(),
          query: null,
          audioIds: json.rows.map((r) => r.audio_id),
          summary: `${json.rows.length} records geladen voor ${json.lang} (${json.pages_fetched} pagina${json.pages_fetched === 1 ? "" : "'s"}).`,
          reasonsById: {},
          cosineById: {},
        };
        setStack([root]);
        setMessages([
          {
            role: "assistant",
            id: newId(),
            selectionId: root.id,
            summary: root.summary,
            matchCount: root.audioIds.length,
            mode: "cosine",
          },
        ]);
        setDebug(null);
      } catch (e) {
        setCorpusError(e instanceof Error ? e.message : "Onbekende fout.");
      } finally {
        setCorpusLoading(false);
      }
    },
    [corpus, lang],
  );

  const handleClearCorpus = useCallback(() => {
    corpus.clear();
    setStack([]);
    setMessages([]);
    setDebug(null);
    setCorpusError(null);
  }, [corpus]);

  // ── Search-pipeline ───────────────────────────────────────────────
  const handleSearch = useCallback(
    async (query: string) => {
      if (!corpus.snapshot || !currentSelection || searching) return;

      const userMsg: ChatMessage = { role: "user", id: newId(), query };
      setMessages((prev) => [...prev, userMsg]);
      setSearching(true);

      const debugSnapshot: SearchDebugSnapshot = {
        query,
        scopeSize: currentSelection.audioIds.length,
        topK,
        rerankRequested: rerankEnabled,
        cosineCandidates: [],
      };

      try {
        // (1) Embed query server-side.
        const embedUrl = "/api/dev/tatoeba-audio-search/embed-query";
        const embedRes = await fetch(embedUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query }),
        });
        const embedJson = (await embedRes.json()) as EmbedQueryResponse;
        debugSnapshot.embedQuery = {
          url: embedUrl,
          response: embedJson,
          ok: embedRes.ok && embedJson.ok,
        };
        if (!embedRes.ok || !embedJson.ok) {
          const err = embedJson.ok ? `HTTP ${embedRes.status}` : embedJson.error;
          throw new Error(`Query embedden mislukt: ${err}`);
        }
        const queryEmbedding = embedJson.embedding;

        // (2) Cosine vs scope, top-K. Pure client-side; 500 dot-products
        // is microseconde-werk.
        const idIndex = new Map<number, number>();
        corpus.snapshot.rows.forEach((row, i) => {
          idIndex.set(row.audio_id, i);
        });
        const scoredRows = currentSelection.audioIds
          .map((id) => {
            const idx = idIndex.get(id);
            if (idx === undefined) return null;
            const row = corpus.snapshot!.rows[idx];
            const emb = corpus.snapshot!.embeddings[idx];
            return {
              audio_id: row.audio_id,
              source_text: row.sentence_text,
              cosine: cosineSim(queryEmbedding, emb),
            };
          })
          .filter((r): r is NonNullable<typeof r> => r !== null);
        scoredRows.sort((a, b) => b.cosine - a.cosine);
        const topCandidates = scoredRows.slice(0, topK);
        debugSnapshot.cosineCandidates = topCandidates;

        // (3) Optionele LLM-rerank. Stuurt max 100 kandidaten naar de
        // route; bij topK > 100 trimmen we voorzichtigheidshalve hier.
        let summary: string;
        let finalAudioIds: number[];
        const reasonsById: Record<number, string> = {};
        const cosineById: Record<number, number> = Object.fromEntries(
          topCandidates.map((c) => [c.audio_id, c.cosine]),
        );

        if (rerankEnabled && topCandidates.length > 0) {
          const rerankUrl = "/api/dev/tatoeba-audio-search/rerank";
          const rerankBody = {
            query,
            candidates: topCandidates.slice(
              0,
              TATOEBA_SEARCH_RERANK_MAX_CANDIDATES,
            ),
            model,
          };
          const rerankRes = await fetch(rerankUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(rerankBody),
          });
          const rerankJson = (await rerankRes.json()) as RerankResponse;
          debugSnapshot.rerank = {
            url: rerankUrl,
            request: rerankBody,
            response: rerankJson,
            ok: rerankRes.ok && rerankJson.ok,
          };
          if (!rerankRes.ok || !rerankJson.ok) {
            const err = rerankJson.ok
              ? `HTTP ${rerankRes.status}`
              : rerankJson.error;
            throw new Error(`AI rerank mislukt: ${err}`);
          }
          summary = rerankJson.summary;
          finalAudioIds = rerankJson.matches.map((m) => m.audio_id);
          for (const m of rerankJson.matches) {
            reasonsById[m.audio_id] = m.reason;
          }
        } else {
          finalAudioIds = topCandidates.map((c) => c.audio_id);
          summary =
            topCandidates.length === 0
              ? "Geen kandidaten in de huidige scope."
              : `${topCandidates.length} match${topCandidates.length === 1 ? "" : "es"} (cosine top-${topK}, geen AI-rerank).`;
        }

        // (4) Push selection + assistant message.
        const newSelection: Selection = {
          id: newId(),
          query,
          audioIds: finalAudioIds,
          summary,
          reasonsById,
          cosineById,
        };
        setStack((prev) => [...prev, newSelection]);
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            id: newId(),
            selectionId: newSelection.id,
            summary,
            matchCount: finalAudioIds.length,
            mode: rerankEnabled ? "rerank" : "cosine",
          },
        ]);
      } catch (e) {
        setMessages((prev) => [
          ...prev,
          {
            role: "system-error",
            id: newId(),
            error: e instanceof Error ? e.message : "Onbekende fout.",
          },
        ]);
      } finally {
        setDebug(debugSnapshot);
        setSearching(false);
      }
    },
    [corpus.snapshot, currentSelection, searching, topK, rerankEnabled, model],
  );

  // ── Stack-navigatie ───────────────────────────────────────────────
  const handleBack = useCallback(() => {
    setStack((prev) => (prev.length > 1 ? prev.slice(0, -1) : prev));
    setMessages((prev) => {
      // Verwijder de laatste user/assistant-paar — als de laatste een
      // assistant met selectionId is, drop ook de bijbehorende user.
      if (prev.length === 0) return prev;
      const last = prev[prev.length - 1];
      if (last.role === "assistant" && prev.length >= 2) {
        return prev.slice(0, -2);
      }
      return prev.slice(0, -1);
    });
  }, []);

  const handleJumpTo = useCallback((selectionId: string) => {
    // Truncate stack tot na de geklikte selectie. Truncate messages
    // ook tot na de assistant-message met dezelfde selectionId.
    setStack((prev) => {
      const idx = prev.findIndex((s) => s.id === selectionId);
      if (idx === -1) return prev;
      return prev.slice(0, idx + 1);
    });
    setMessages((prev) => {
      const idx = prev.findIndex(
        (m) => m.role === "assistant" && m.selectionId === selectionId,
      );
      if (idx === -1) return prev;
      return prev.slice(0, idx + 1);
    });
  }, []);

  // Selectie is in-scope: zodra de zichtbare rijen veranderen (nieuwe
  // zoekopdracht, jump-to, terug) prunen we ids die niet meer in scope
  // staan. Hiermee blijft het persist-label gelijk aan wat de user
  // daadwerkelijk in beeld heeft, vergelijkbaar met de vertaal-knop.
  // (Voorheen accumuleerde de selectie over scopes heen, wat een
  // "Sla 50 op"-label gaf bij 10 zichtbare rijen.)
  useEffect(() => {
    const scope = new Set(visibleRows.map((r) => r.audio_id));
    setSelectedIds((prev) => {
      let changed = false;
      const next = new Set<number>();
      for (const id of prev) {
        if (scope.has(id)) next.add(id);
        else changed = true;
      }
      return changed ? next : prev;
    });
  }, [visibleRows]);

  // ── Selectie-helpers ──────────────────────────────────────────────
  const handleToggleRow = useCallback((audioId: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(audioId)) next.delete(audioId);
      else next.add(audioId);
      return next;
    });
  }, []);

  const handleToggleAllVisible = useCallback((visibleIds: number[]) => {
    setSelectedIds((prev) => {
      const allSelected = visibleIds.every((id) => prev.has(id));
      const next = new Set(prev);
      if (allSelected) {
        for (const id of visibleIds) next.delete(id);
      } else {
        for (const id of visibleIds) next.add(id);
      }
      return next;
    });
  }, []);

  const handleClearSelection = useCallback(() => setSelectedIds(new Set()), []);

  // ── Translate-flow (per-rij) ──────────────────────────────────────
  // Identieke pattern als in audio-table.tsx; alleen geen batch-knop
  // omdat selecties op de search-page typisch klein zijn.
  const handleTranslateRow = useCallback(
    async (row: AudioRow) => {
      if (row.lang === TARGET_LANG) return;
      setTranslateState((prev) => ({
        ...prev,
        [row.audio_id]: { status: "loading" },
      }));

      const url = "/api/dev/tatoeba-audio/translate";
      const items = [
        {
          audio_id: row.audio_id,
          source_text: row.sentence_text,
          source_lang: row.lang,
        },
      ];

      let result: TranslateResponse;
      try {
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ items }),
        });
        result = (await res.json()) as TranslateResponse;
      } catch (e) {
        result = {
          ok: false,
          error: e instanceof Error ? e.message : "Onbekende netwerkfout.",
          reason: "openai_error",
        };
      }

      if (result.ok) {
        translationCache.bulkSet(
          result.translations.map((t) => ({
            audio_id: t.audio_id,
            translation: t.translation,
            source_text: row.sentence_text,
            lang: row.lang,
            cached_at: new Date().toISOString(),
          })),
        );
        setTranslateState((prev) => {
          const next = { ...prev };
          delete next[row.audio_id];
          return next;
        });
      } else {
        setTranslateState((prev) => ({
          ...prev,
          [row.audio_id]: { status: "error", error: result.error },
        }));
      }
    },
    [translationCache],
  );

  // ── Batch-translate ───────────────────────────────────────────────
  // Filtert rows die niet meer vertaald hoeven (al NL of cache-hit).
  // De runner is generic: dezelfde flow voor "alle zichtbare" of
  // "alleen geselecteerde". Splitst in chunks van TRANSLATE_CHUNK_SIZE
  // en stuurt parallel.
  const pendingTranslationRows = useMemo(() => {
    return visibleRows.filter((row) => {
      if (row.lang === TARGET_LANG) return false;
      const cached = translationCache.get(row.audio_id, row.sentence_text);
      if (cached) return false;
      const state = translateState[row.audio_id];
      if (state?.status === "loading") return false;
      return true;
    });
  }, [visibleRows, translationCache, translateState]);

  const pendingSelectedTranslationRows = useMemo(() => {
    return pendingTranslationRows.filter((row) =>
      selectedIds.has(row.audio_id),
    );
  }, [pendingTranslationRows, selectedIds]);

  const runTranslate = useCallback(
    async (rows: typeof visibleRows) => {
      if (rows.length === 0 || batchTranslating) return;
      setBatchTranslating(true);

      const items = rows.map((r) => ({
        audio_id: r.audio_id,
        source_text: r.sentence_text,
        source_lang: r.lang,
      }));

      setTranslateState((prev) => {
        const next = { ...prev };
        for (const it of items) next[it.audio_id] = { status: "loading" };
        return next;
      });

      const chunks: typeof items[] = [];
      for (let i = 0; i < items.length; i += TRANSLATE_CHUNK_SIZE) {
        chunks.push(items.slice(i, i + TRANSLATE_CHUNK_SIZE));
      }

      const results = await Promise.all(
        chunks.map(async (chunk): Promise<TranslateResponse> => {
          try {
            const res = await fetch("/api/dev/tatoeba-audio/translate", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ items: chunk }),
            });
            return (await res.json()) as TranslateResponse;
          } catch (e) {
            return {
              ok: false,
              error: e instanceof Error ? e.message : "Onbekende netwerkfout.",
              reason: "openai_error",
            };
          }
        }),
      );

      const successEntries: Array<{
        audio_id: number;
        translation: string;
        source_text: string;
        lang: string;
        cached_at: string;
      }> = [];
      const erroredIds = new Map<number, string>();

      results.forEach((result, idx) => {
        const chunk = chunks[idx];
        if (result.ok) {
          const sourceById = new Map(
            chunk.map((c) => [c.audio_id, c.source_text]),
          );
          const langById = new Map(
            chunk.map((c) => [c.audio_id, c.source_lang]),
          );
          for (const t of result.translations) {
            successEntries.push({
              audio_id: t.audio_id,
              translation: t.translation,
              source_text: sourceById.get(t.audio_id) ?? "",
              lang: langById.get(t.audio_id) ?? "",
              cached_at: new Date().toISOString(),
            });
          }
        } else {
          const ids =
            result.reason === "missing_translations" &&
            result.missing_audio_ids
              ? result.missing_audio_ids
              : chunk.map((c) => c.audio_id);
          for (const id of ids) erroredIds.set(id, result.error);
        }
      });

      if (successEntries.length > 0) {
        translationCache.bulkSet(successEntries);
      }
      setTranslateState((prev) => {
        const next = { ...prev };
        for (const e of successEntries) delete next[e.audio_id];
        for (const [id, err] of erroredIds.entries()) {
          next[id] = { status: "error", error: err };
        }
        return next;
      });
      setBatchTranslating(false);
    },
    [batchTranslating, translationCache],
  );

  const handleTranslateAllVisible = useCallback(
    () => runTranslate(pendingTranslationRows),
    [runTranslate, pendingTranslationRows],
  );

  const handleTranslateSelected = useCallback(
    () => runTranslate(pendingSelectedTranslationRows),
    [runTranslate, pendingSelectedTranslationRows],
  );

  // Smart-keuze voor de gecombineerde vertaal-knop in PersistBar:
  // selectie heeft prioriteit zodra er iets in zit met pending werk,
  // anders pakken we alle zichtbare die nog moeten.
  const handleTranslateSmart = useCallback(() => {
    if (pendingSelectedTranslationRows.length > 0) {
      handleTranslateSelected();
    } else {
      handleTranslateAllVisible();
    }
  }, [
    pendingSelectedTranslationRows.length,
    handleTranslateSelected,
    handleTranslateAllVisible,
  ]);

  // ── Persist-flow ──────────────────────────────────────────────────
  // Bouwt PersistItem[] op uit een opgegeven set rijen + cache. Rijen
  // zonder vertaling worden hier gefilterd; de UI signaleert dat
  // expliciet via de NoTranslationWarningDialog.
  const buildPersistItemsForRows = useCallback(
    (
      rows: AudioRow[],
    ): { items: PersistItem[]; skippedNoTranslation: number } => {
      const items: PersistItem[] = [];
      let skipped = 0;
      for (const row of rows) {
        // Voor NL-rijen is bron-tekst zelf de "vertaling" (geen translate
        // nodig). Voor andere talen: cache-hit verplicht.
        let target_text: string | null = null;
        let manually_edited = false;
        let alternatives: string[] = [];
        if (row.lang === TARGET_LANG) {
          target_text = row.sentence_text;
        } else {
          const cached = translationCache.get(row.audio_id, row.sentence_text);
          if (cached) {
            target_text = cached.translation;
            manually_edited = cached.manually_edited;
            alternatives = cached.alternatives;
          }
        }
        if (!target_text) {
          skipped += 1;
          continue;
        }
        items.push({
          audio_id: row.audio_id,
          sentence_id: row.sentence_id,
          sentence_text: row.sentence_text,
          source_lang: row.lang,
          target_text,
          topic: null,
          license: row.license,
          author: row.author,
          attribution_url: row.attribution_url,
          target_text_manually_edited: manually_edited,
          alternative_translations: alternatives,
        });
      }
      return { items, skippedNoTranslation: skipped };
    },
    [translationCache],
  );

  // Telt hoeveel rijen we daadwerkelijk kunnen persisten (NL-bron of
  // cache-hit). Door dit te delen tussen de selectie- en zichtbare-
  // count vermijden we ad-hoc filtering op meerdere plekken.
  const isPersistable = useCallback(
    (row: AudioRow): boolean => {
      if (row.lang === TARGET_LANG) return true;
      return (
        translationCache.get(row.audio_id, row.sentence_text) !== null
      );
    },
    [translationCache],
  );

  // Geselecteerd ∩ zichtbaar — alles wat de user nu in beeld heeft
  // en aangevinkt heeft. Inclusief rijen zonder vertaling, want die
  // moeten alsnog de waarschuwing kunnen triggeren bij persisten.
  const selectedRowsInScope = useMemo(
    () => visibleRows.filter((r) => selectedIds.has(r.audio_id)),
    [visibleRows, selectedIds],
  );

  // De rijen die direct opgeslagen kunnen worden — basis voor de
  // button-labels (mode-keuze in PersistBar gebruikt deze counts).
  const persistableSelectedRows = useMemo(
    () => selectedRowsInScope.filter(isPersistable),
    [selectedRowsInScope, isPersistable],
  );
  const persistableVisibleRows = useMemo(
    () => visibleRows.filter(isPersistable),
    [visibleRows, isPersistable],
  );

  // Stuurt de apply-call. `nonConflictItems` wordt direct meegestuurd
  // zónder resolutie; de conflict-items krijgen de gekozen resoluties.
  const runApply = useCallback(
    async (
      allItems: PersistItem[],
      resolutions: Record<string, PersistResolution>,
    ) => {
      setPersisting(true);
      setPersistError(null);

      // Splitsen in chunks van PERSIST_CHUNK_SIZE; sequentieel om de
      // bucket niet te ramen en zodat een falende chunk niet de hele
      // batch invalideert (resultaten zijn additief).
      const merged: ApplySuccess["summary"] = {
        inserted: 0,
        replaced: 0,
        kept_both: 0,
        skipped_conflict: 0,
        skipped_license: 0,
        errors: 0,
      };
      let errorMsg: string | null = null;

      for (let i = 0; i < allItems.length; i += PERSIST_CHUNK_SIZE) {
        const chunk = allItems.slice(i, i + PERSIST_CHUNK_SIZE);
        const chunkResolutions: Record<string, PersistResolution> = {};
        for (const item of chunk) {
          const key = String(item.audio_id);
          if (resolutions[key]) chunkResolutions[key] = resolutions[key];
        }

        try {
          const res = await fetch("/api/dev/tatoeba-audio/persist-batch", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              mode: "apply",
              items: chunk,
              resolutions: chunkResolutions,
            }),
          });
          const json = (await res.json()) as PersistResponse;
          if (!res.ok || !json.ok || json.mode !== "apply") {
            errorMsg = json.ok ? `HTTP ${res.status}` : json.error;
            break;
          }
          merged.inserted += json.summary.inserted;
          merged.replaced += json.summary.replaced;
          merged.kept_both += json.summary.kept_both;
          merged.skipped_conflict += json.summary.skipped_conflict;
          merged.skipped_license += json.summary.skipped_license;
          merged.errors += json.summary.errors;
        } catch (e) {
          errorMsg = e instanceof Error ? e.message : "Onbekende netwerkfout.";
          break;
        }
      }

      setPersisting(false);
      if (errorMsg) {
        setPersistError(errorMsg);
        setPersistSummary(null);
        return;
      }
      setPersistSummary(merged);
      // Selectie leegmaken zodat dezelfde rijen niet per ongeluk
      // dubbel worden gesubmit; conflict-prompt sluiten.
      setSelectedIds(new Set());
      setConflictPrompt(null);
      // Trigger een refresh van de stats-panel.
      setStatsRefreshKey((k) => k + 1);
    },
    [],
  );

  // Stap 2 van de persist-flow: preflight + óf direct apply (geen
  // conflicten) óf openen van de ConflictDialog. Apart zodat we 'm ook
  // kunnen aanroepen vanuit de NoTranslationWarningDialog wanneer de
  // user "Doorgaan" kiest.
  const runPreflightAndApply = useCallback(
    async (items: PersistItem[]) => {
      if (items.length === 0) {
        setPersistError("Geen rijen om op te slaan.");
        return;
      }

      setPersisting(true);
      let preflight: PreflightSuccess | null = null;
      try {
        const res = await fetch("/api/dev/tatoeba-audio/persist-batch", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mode: "preflight", items }),
        });
        const json = (await res.json()) as PersistResponse;
        if (!res.ok || !json.ok || json.mode !== "preflight") {
          setPersistError(json.ok ? `HTTP ${res.status}` : json.error);
          setPersisting(false);
          return;
        }
        preflight = json;
      } catch (e) {
        setPersistError(e instanceof Error ? e.message : "Onbekende fout.");
        setPersisting(false);
        return;
      }

      const conflictItems: PersistItem[] = [];
      const nonConflictItems: PersistItem[] = [];
      for (const item of items) {
        const list = preflight.conflicts[String(item.audio_id)] ?? [];
        if (list.length > 0) conflictItems.push(item);
        else nonConflictItems.push(item);
      }

      setPersisting(false);

      if (conflictItems.length === 0) {
        // Geen conflicten → meteen apply zonder resoluties.
        await runApply(nonConflictItems, {});
        return;
      }

      // Conflict-dialog openen; user kiest resoluties, daarna runApply.
      setConflictPrompt({
        items: conflictItems,
        conflicts: preflight.conflicts,
        nonConflictItems,
      });
    },
    [runApply],
  );

  // Click-handler op de "Sla geselecteerde op"-knop. Filtert eerst op
  // rijen-zónder-vertaling: zijn er die, dan opent de waarschuwing-
  // modal. De user kiest expliciet om door te gaan (alleen vertaalde
  // rijen worden opgeslagen) of te annuleren.
  const handlePersistSelected = useCallback(async () => {
    setPersistError(null);
    setPersistSummary(null);
    const { items, skippedNoTranslation } =
      buildPersistItemsForRows(selectedRowsInScope);

    if (skippedNoTranslation > 0) {
      setNoTranslationPrompt({
        validItems: items,
        skippedCount: skippedNoTranslation,
      });
      return;
    }

    await runPreflightAndApply(items);
  }, [buildPersistItemsForRows, selectedRowsInScope, runPreflightAndApply]);

  const handlePersistVisible = useCallback(async () => {
    setPersistError(null);
    setPersistSummary(null);
    const { items, skippedNoTranslation } =
      buildPersistItemsForRows(visibleRows);

    if (skippedNoTranslation > 0) {
      setNoTranslationPrompt({
        validItems: items,
        skippedCount: skippedNoTranslation,
      });
      return;
    }

    await runPreflightAndApply(items);
  }, [buildPersistItemsForRows, visibleRows, runPreflightAndApply]);

  // Smart-keuze voor de persist-knop: zelfde patroon als
  // `handleTranslateSmart`. Bij een actieve selectie persisten we die,
  // anders pakken we alle zichtbare rijen die opgeslagen kunnen worden.
  const handlePersistSmart = useCallback(() => {
    if (selectedRowsInScope.length > 0) {
      handlePersistSelected();
    } else {
      handlePersistVisible();
    }
  }, [selectedRowsInScope.length, handlePersistSelected, handlePersistVisible]);

  const handleConfirmNoTranslation = useCallback(async () => {
    if (!noTranslationPrompt) return;
    const { validItems } = noTranslationPrompt;
    setNoTranslationPrompt(null);
    if (validItems.length === 0) return;
    await runPreflightAndApply(validItems);
  }, [noTranslationPrompt, runPreflightAndApply]);

  const handleConfirmConflicts = useCallback(
    async (resolutions: Record<string, PersistResolution>) => {
      if (!conflictPrompt) return;
      const allItems = [
        ...conflictPrompt.nonConflictItems,
        ...conflictPrompt.items,
      ];
      await runApply(allItems, resolutions);
    },
    [conflictPrompt, runApply],
  );

  // Cosine/reden-kolommen moeten alleen verschijnen als de huidige
  // selectie een query-resultaat is (root-selectie heeft lege maps).
  const hasSearchEnrichments =
    currentSelection !== null &&
    (Object.keys(currentSelection.cosineById).length > 0 ||
      Object.keys(currentSelection.reasonsById).length > 0);

  return (
    <div className="space-y-6">
      <CorpusBar
        lang={lang}
        onLangChange={(v) => {
          setLang(v);
          // Stack hoort bij de oude lang's snapshot; reset bij wissel.
          setStack([]);
          setMessages([]);
          setDebug(null);
        }}
        langOptions={LANG_OPTIONS}
        snapshot={corpus.snapshot}
        loading={corpusLoading}
        error={corpusError}
        onLoad={handleLoadCorpus}
        onClear={handleClearCorpus}
      />

      {corpus.snapshot ? (
        <>
          <SearchControls
            topK={topK}
            onTopKChange={setTopK}
            rerankEnabled={rerankEnabled}
            onRerankToggle={setRerankEnabled}
            model={model}
            onModelChange={setModel}
            disabled={searching || !currentSelection}
            onSubmit={handleSearch}
          />

          <HistoryPanel
            stack={stack}
            messages={messages}
            currentSelectionId={currentSelection?.id ?? null}
            onBack={handleBack}
            onJumpTo={handleJumpTo}
          />

          <PersistBar
            visibleCount={visibleRows.length}
            selectedCount={selectedIds.size}
            pendingTranslationCount={pendingTranslationRows.length}
            pendingSelectedTranslationCount={
              pendingSelectedTranslationRows.length
            }
            persistableSelectedCount={persistableSelectedRows.length}
            persistableVisibleCount={persistableVisibleRows.length}
            translating={batchTranslating}
            persisting={persisting}
            onTranslate={handleTranslateSmart}
            onPersist={handlePersistSmart}
            onClearSelection={handleClearSelection}
            persistError={persistError}
            persistSummary={persistSummary}
          />

          <AudioResultTable
            rows={visibleRows}
            translation={{
              cache: translationCache,
              state: translateState,
              onTranslateRow: handleTranslateRow,
            }}
            searchEnrichments={
              hasSearchEnrichments
                ? {
                    cosineById: currentSelection.cosineById,
                    reasonsById: currentSelection.reasonsById,
                  }
                : undefined
            }
            selection={{
              selectedIds,
              onToggle: handleToggleRow,
              onToggleAllVisible: handleToggleAllVisible,
            }}
            tableScope="search"
            defaultHiddenColumns={[
              "sentence_id",
              "edited",
              "alternatives",
              "lang",
              "author",
              "license",
              "created",
            ]}
          />

          {debug && <SearchDebug snapshot={debug} />}
        </>
      ) : (
        <p className="rounded-md border border-dashed border-border bg-muted/40 px-4 py-3 text-xs text-muted-foreground">
          Klik &quot;Haal corpus op&quot; om te beginnen. De zoekfunctie
          komt beschikbaar zodra de embeddings in localStorage staan.
        </p>
      )}

      <AudioStatsPanel refreshKey={statsRefreshKey} />

      {conflictPrompt && (
        <ConflictDialog
          open={conflictPrompt !== null}
          items={conflictPrompt.items}
          conflicts={conflictPrompt.conflicts}
          onCancel={() => setConflictPrompt(null)}
          onConfirm={handleConfirmConflicts}
        />
      )}

      {noTranslationPrompt && (
        <NoTranslationWarningDialog
          open={noTranslationPrompt !== null}
          skippedCount={noTranslationPrompt.skippedCount}
          validCount={noTranslationPrompt.validItems.length}
          onCancel={() => setNoTranslationPrompt(null)}
          onConfirm={handleConfirmNoTranslation}
        />
      )}
    </div>
  );
}
