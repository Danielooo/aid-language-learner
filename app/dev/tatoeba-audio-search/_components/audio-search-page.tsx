"use client";

import { useCallback, useMemo, useState } from "react";

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

import { ChatHistory } from "./chat-history";
import { CorpusBar } from "./corpus-bar";
import { SearchControls } from "./search-controls";
import { SearchDebug } from "./search-debug";
import { SelectionBreadcrumb } from "./selection-breadcrumb";

import type { AudioRow } from "@/app/api/dev/tatoeba-audio/list/route";
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

          <ChatHistory
            messages={messages}
            currentSelectionId={currentSelection?.id ?? null}
            onJumpTo={handleJumpTo}
          />

          <SelectionBreadcrumb
            stack={stack}
            onBack={handleBack}
            onJumpTo={handleJumpTo}
          />

          {currentSelection?.query && (
            <p className="text-xs text-muted-foreground">
              Voor:{" "}
              <em className="text-foreground">
                &ldquo;{currentSelection.query}&rdquo;
              </em>
            </p>
          )}

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
          />

          {debug && <SearchDebug snapshot={debug} />}
        </>
      ) : (
        <p className="rounded-md border border-dashed border-border bg-muted/40 px-4 py-3 text-xs text-muted-foreground">
          Klik &quot;Haal corpus op&quot; om te beginnen. De zoekfunctie
          komt beschikbaar zodra de embeddings in localStorage staan.
        </p>
      )}
    </div>
  );
}
