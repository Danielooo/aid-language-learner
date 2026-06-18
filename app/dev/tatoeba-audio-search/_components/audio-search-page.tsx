"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { AudioResultTable } from "@/app/dev/_components/audio-result-table";
import {
  TATOEBA_SEARCH_DEFAULT_MODEL,
  TATOEBA_SEARCH_DEFAULT_TOP_K,
  TATOEBA_SEARCH_RERANK_MAX_CANDIDATES,
  type TatoebaSearchModel,
} from "@/lib/ai/tatoeba-search-config";
import { useCorpusCache } from "@/lib/hooks/use-corpus-cache";
import { useSearchSessionCache } from "@/lib/hooks/use-search-session-cache";
import { useTranslationCache } from "@/lib/hooks/use-translation-cache";
import { cosineSim } from "@/lib/utils/cosine";

import { ClearWarningDialog } from "./clear-warning-dialog";
import { ConflictDialog } from "./conflict-dialog";
import { CorpusBar } from "./corpus-bar";
import { HistoryPanel } from "./history-panel";
import { NoTranslationWarningDialog } from "./no-translation-warning-dialog";
import { PersistBar } from "./persist-bar";
import { SearchControls } from "./search-controls";
import { SearchDebug } from "./search-debug";

import type { AudioRow } from "@/app/api/dev/tatoeba-audio/list/route";
import type { ExistingTopicsResponse } from "@/app/api/dev/tatoeba-audio/existing-topics/route";
import type {
  ApplySuccess,
  ExistingConflictRow,
  PersistItem,
  PersistResolution,
  PersistResponse,
  PreflightSuccess,
} from "@/app/api/dev/tatoeba-audio/persist-batch/route";
import type { EnrichResponse } from "@/app/api/dev/tatoeba-audio/translate/route";
import type { CorpusResponse } from "@/app/api/dev/tatoeba-audio-search/corpus/route";
import type { EmbedQueryResponse } from "@/app/api/dev/tatoeba-audio-search/embed-query/route";
import type { RerankResponse } from "@/app/api/dev/tatoeba-audio-search/rerank/route";
import type { TranslateRowState } from "@/app/dev/_components/audio-result-table";
import type { CorpusSnapshot } from "@/lib/hooks/use-corpus-cache";
import type { SearchSessionSnapshot } from "@/lib/hooks/use-search-session-cache";
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

// Shallow-equal voor de selectie-Set vs. een serialized array. Wordt
// gebruikt in de restore-tak om een gratuit `new Set(...)` te vermijden
// als de cached selectie identiek is aan de huidige — anders zou de
// restore na elke auto-persist één extra render veroorzaken (Set-identity
// verandert, ook al is de inhoud gelijk).
function sameNumberSet(a: Set<number>, b: readonly number[]): boolean {
  if (a.size !== b.length) return false;
  for (const id of b) {
    if (!a.has(id)) return false;
  }
  return true;
}

export function AudioSearchPage() {
  const [lang, setLang] = useState<string>("spa");
  const [model, setModel] = useState<TatoebaSearchModel>(
    TATOEBA_SEARCH_DEFAULT_MODEL,
  );
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [stack, setStack] = useState<Selection[]>([]);
  const [searching, setSearching] = useState<boolean>(false);
  const [debug, setDebug] = useState<SearchDebugSnapshot | null>(null);
  const [corpusLoading, setCorpusLoading] = useState<boolean>(false);
  const [corpusError, setCorpusError] = useState<string | null>(null);

  const corpus = useCorpusCache(lang);
  const sessionCache = useSearchSessionCache(lang);
  const translationCache = useTranslationCache();
  const [translateState, setTranslateState] = useState<
    Record<number, TranslateRowState>
  >({});
  // Onthoudt de tuple van (lang, sessionSnapshot, corpusSnapshot) die
  // we voor het laatst hebben gerestored. Identity-compare is veilig:
  // `writeSnapshot` in beide cache-hooks gebruikt een write-through
  // cache, dus snapshot-objecten houden hun referentie zolang de
  // onderliggende data niet wijzigt. Pas wanneer een van de drie écht
  // verandert (lang-switch, of een nieuwe snapshot-identity via hydration
  // of cross-tab) draait de restore-tak opnieuw.
  const restoredRef = useRef<{
    lang: string;
    session: SearchSessionSnapshot | null;
    corpus: CorpusSnapshot | null;
  } | null>(null);

  // True gezet door `handleLoadCorpus` vlak vóór een eigen corpus-write
  // + stack/messages-setState. Het corpus-snapshot identity verandert
  // dan binnen dezelfde commit-cyclus, wat de restore-effect zou
  // triggeren — die zou vervolgens de OUDE sessie uit localStorage
  // teruglezen en de zojuist-gezette nieuwe stack overschrijven (oud
  // gedrag: "tabel blijft op de oude data staan na Ophalen"). Met deze
  // flag slaat restore die ene run over en synchroniseert alleen de
  // refs, zodat verdere snapshot-identity-bumps (b.v. auto-persist) wél
  // weer netjes door restore worden opgepikt.
  const skipRestoreOnceRef = useRef(false);

  // Wis-dialog state: open zodra de user "Wissen" klikt en er nog
  // verrijkingen in de cache staan voor de huidige taal.
  const [clearPrompt, setClearPrompt] = useState(false);
  // Lijst bestaande topics uit Supabase; één keer opgehaald bij mount
  // en doorgestuurd naar elke enrich-call zodat de LLM voorrang geeft
  // aan hergebruik boven het verzinnen van nieuwe labels. Lege array
  // is geldig (eerste enrichment) — de prompt vangt dat geval expliciet
  // af in `buildEnrichUserMessage`.
  const [existingTopics, setExistingTopics] = useState<string[]>([]);

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

  // Eén keer bij mount én na elke persist (statsRefreshKey wijzigt dan)
  // verse topic-lijst ophalen, want een succesvolle persist kan een
  // nieuw topic-label hebben aangemaakt waar volgende enrichments van
  // moeten kunnen profiteren. AbortController vermijdt setState op een
  // unmounted component bij snelle navigatie.
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/dev/tatoeba-audio/existing-topics", {
      signal: controller.signal,
    })
      .then((res) => res.json() as Promise<ExistingTopicsResponse>)
      .then((json) => {
        if (json.ok) setExistingTopics(json.topics);
      })
      .catch(() => {
        // Niet-fataal: enrichment werkt ook zonder bestaande topics,
        // alleen zonder reuse-bias. Geen UI-toast nodig.
      });
    return () => controller.abort();
  }, [statsRefreshKey]);

  // ── Sessie restore (mount + lang-wissel + late-arriving snapshots) ─
  // Drie scenarios in volgorde van voorkeur:
  //   1. Cached sessie aanwezig → herstel stack/messages/selectedIds.
  //   2. Geen sessie maar wel corpus → re-creëer een root-selectie
  //      (zelfde shape als in handleLoadCorpus); zorgt dat de tabel
  //      ook na refresh meteen oefeningen toont.
  //   3. Geen sessie én geen corpus → empty-state.
  //
  // Deps bevatten óók `sessionCache.snapshot` en `corpus.snapshot` —
  // niet alleen `lang` — omdat `useSyncExternalStore` tijdens hydration
  // eerst `getServerSnapshot()` (= null) returnt en pas ná de eerste
  // commit naar de echte client-snapshot synchroniseert. Met deps
  // `[lang]` only zou de restore op de allereerste pass empty-state
  // committen en daarna nooit meer triggeren — exact het "tabel weg na
  // refresh"-symptoom. De `restoredRef`-guard zorgt dat we niet alsnog
  // in een loop belanden zodra auto-persist een nieuwe identity
  // doorgeeft (writeSnapshot houdt identity stabiel voor identieke
  // data, en saveSession gebruikt dezelfde stack/messages-refs als
  // state — dus de echo-restore is een React-no-op).
  useEffect(() => {
    const cachedSession = sessionCache.snapshot;
    const cachedCorpus = corpus.snapshot;

    // Eigen-write skip: handleLoadCorpus heeft net corpus.setCorpus +
    // setStack + setMessages aangeroepen. De corpus-snapshot is wel
    // veranderd, maar de sessie-snapshot loopt nog één tick achter; als
    // we hier zouden restoreren overschrijven we de net-gezette stack
    // met de oude session uit localStorage.
    if (skipRestoreOnceRef.current) {
      skipRestoreOnceRef.current = false;
      restoredRef.current = {
        lang,
        session: cachedSession,
        corpus: cachedCorpus,
      };
      return;
    }

    if (
      restoredRef.current &&
      restoredRef.current.lang === lang &&
      restoredRef.current.session === cachedSession &&
      restoredRef.current.corpus === cachedCorpus
    ) {
      return;
    }
    restoredRef.current = {
      lang,
      session: cachedSession,
      corpus: cachedCorpus,
    };

    if (cachedSession) {
      setStack(cachedSession.stack);
      setMessages(cachedSession.messages);
      setSelectedIds((prev) =>
        sameNumberSet(prev, cachedSession.selectedAudioIds)
          ? prev
          : new Set(cachedSession.selectedAudioIds),
      );
    } else if (cachedCorpus) {
      const root: Selection = {
        id: newId(),
        query: null,
        audioIds: cachedCorpus.rows.map((r) => r.audio_id),
        summary: `${cachedCorpus.rows.length} records geladen voor ${lang}.`,
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
        },
      ]);
      setSelectedIds(new Set());
    } else {
      setStack([]);
      setMessages([]);
      setSelectedIds(new Set());
    }
    setDebug(null);
  }, [lang, sessionCache.snapshot, corpus.snapshot]);

  // ── Sessie auto-persist ──────────────────────────────────────────
  // Schrijft elke state-mutatie naar localStorage per lang.
  //
  // Empty-state skip: tijdens hydration zijn beide snapshots null en
  // commit de restore-effect een lege state ([], [], ∅). Als we die
  // empty-state vervolgens netjes wegschrijven (saveSession ziet `[]`
  // → writeSnapshot(null) → REMOVE), wissen we de eerder-bewaarde
  // sessie nog vóórdat `useSyncExternalStore` van getServerSnapshot
  // naar de echte client-snapshot kan synchroniseren. Door empty-state
  // hier te skippen, blijft de localStorage-sleutel staan totdat de
  // user iets daadwerkelijk in scope heeft. "Wissen" zelf gaat niet
  // via deze flow maar via `runClear` → `sessionCache.clear()`.
  //
  // Echo-writes (auto-persist schrijft data die we net via restore
  // hebben binnengetrokken) vangt `writeSnapshot` zelf af met een
  // `newRaw === currentRaw` no-op skip. Geen extra ref-guard nodig.
  //
  // Belangrijk: we destructuren `save` uit `sessionCache` zodat ESLint
  // niet om het hele `sessionCache` object als dep vraagt. Dat object
  // krijgt namelijk op elke render een nieuwe identity (hook returnt
  // `{ snapshot, save, clear }` als verse literal). `save` is daarentegen
  // een useCallback met deps `[lang]` en dus stabiel zolang lang gelijk
  // blijft — geen render-loop meer.
  const saveSession = sessionCache.save;
  useEffect(() => {
    if (stack.length === 0 && messages.length === 0 && selectedIds.size === 0) {
      return;
    }
    saveSession({
      stack,
      messages,
      selectedAudioIds: Array.from(selectedIds),
    });
  }, [stack, messages, selectedIds, saveSession]);

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

  // ── Corpus laden (= "Ophalen" knop) ───────────────────────────────
  // Twee modi via dezelfde flow:
  //   - Fresh load (geen bestaand corpus voor deze lang) → API-respons
  //     1:1 wegschrijven en een nieuwe root-selectie bouwen.
  //   - Append (er staat al een corpus) → fetch N records, dedupe op
  //     audio_id tegen bestaande rijen, behoud oude embeddings en voeg
  //     alleen écht-nieuwe records toe. Bespaart re-embed van bekende
  //     zinnen en voorkomt dubbele rijen in de tabel.
  //
  // Na de merge wordt de stack altijd gereset naar één root die het
  // samengevoegde totaal weerspiegelt; eventuele sub-selecties (search-
  // resultaten in de chat-historie) verdwijnen. Reden: de user-intent
  // van "Ophalen" is "laat me zien wat er nu in scope zit" — sub-
  // selecties zouden alleen oude audioIds tonen en de toevoeging
  // onzichtbaar maken. De translation-cache + corpus zelf blijven
  // intact, dus geen verlies van eerder vertaalde records.
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

        const existing = corpus.snapshot;
        const mergedRows: AudioRow[] = existing ? [...existing.rows] : [];
        const mergedEmbeddings: number[][] = existing
          ? [...existing.embeddings]
          : [];
        const knownIds = new Set(mergedRows.map((r) => r.audio_id));
        let appendedCount = 0;
        json.rows.forEach((row, i) => {
          if (knownIds.has(row.audio_id)) return;
          mergedRows.push(row);
          mergedEmbeddings.push(json.embeddings[i]);
          knownIds.add(row.audio_id);
          appendedCount += 1;
        });

        const summary = existing
          ? `${mergedRows.length} records voor ${json.lang} · ${appendedCount} nieuw${appendedCount === 0 ? " (alleen duplicaten ontvangen)" : ""}`
          : `${mergedRows.length} records geladen voor ${json.lang} (${json.pages_fetched} pagina${json.pages_fetched === 1 ? "" : "'s"}).`;

        // Restore-effect onderdrukken: corpus.setCorpus wijzigt straks de
        // snapshot-identity en zou anders — in dezelfde commit-cyclus —
        // de oude session uit localStorage boven ons net-gezette nieuwe
        // stack heen leggen ("tabel blijft op de oude data staan na
        // Ophalen"-bug).
        skipRestoreOnceRef.current = true;
        corpus.setCorpus({
          lang: json.lang,
          rows: mergedRows,
          embeddings: mergedEmbeddings,
          fetched_at: json.fetched_at,
          // Bestaande dims winnen; embed-route hoort dezelfde dimensies
          // te returnen, maar voor de cosineSim-veiligheid mogen we niet
          // half-stilletjes naar een ander getal switchen.
          dims: existing?.dims ?? json.dims,
        });

        const root: Selection = {
          id: newId(),
          query: null,
          audioIds: mergedRows.map((r) => r.audio_id),
          summary,
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

  // Aantal verrijkte cache-entries voor de actieve taal. Bepaalt of
  // "Wissen" de waarschuwings-dialog opent (>0) of direct wist (0).
  const enrichedCountForLang = useMemo(
    () =>
      Object.values(translationCache.cache).filter((e) => e.lang === lang)
        .length,
    [translationCache.cache, lang],
  );

  const runClear = useCallback(() => {
    corpus.clear();
    sessionCache.clear();
    translationCache.clearByLang(lang);
    // Restore-effect zou óók terug naar de root-fallback gaan zodra
    // corpus.snapshot null is, maar daar zit een render tussen — door
    // hier expliciet te resetten ziet de UI direct de empty-state.
    setStack([]);
    setMessages([]);
    setSelectedIds(new Set());
    setDebug(null);
    setCorpusError(null);
    setClearPrompt(false);
  }, [corpus, sessionCache, translationCache, lang]);

  const handleClearCorpus = useCallback(() => {
    if (enrichedCountForLang > 0) {
      setClearPrompt(true);
      return;
    }
    runClear();
  }, [enrichedCountForLang, runClear]);

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
        topK: TATOEBA_SEARCH_DEFAULT_TOP_K,
        searchModel: model,
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
        const topCandidates = scoredRows.slice(0, TATOEBA_SEARCH_DEFAULT_TOP_K);
        debugSnapshot.cosineCandidates = topCandidates;

        let summary: string;
        let finalAudioIds: number[];
        const reasonsById: Record<number, string> = {};
        const cosineById: Record<number, number> = Object.fromEntries(
          topCandidates.map((c) => [c.audio_id, c.cosine]),
        );

        if (topCandidates.length > 0) {
          const searchUrl = "/api/dev/tatoeba-audio-search/rerank";
          const searchBody = {
            query,
            candidates: topCandidates.slice(
              0,
              TATOEBA_SEARCH_RERANK_MAX_CANDIDATES,
            ),
            model,
          };
          const searchRes = await fetch(searchUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(searchBody),
          });
          const searchJson = (await searchRes.json()) as RerankResponse;
          debugSnapshot.search = {
            url: searchUrl,
            request: searchBody,
            response: searchJson,
            ok: searchRes.ok && searchJson.ok,
          };
          if (!searchRes.ok || !searchJson.ok) {
            const err = searchJson.ok
              ? `HTTP ${searchRes.status}`
              : searchJson.error;
            throw new Error(`Zoeken mislukt: ${err}`);
          }
          summary = searchJson.summary;
          finalAudioIds = searchJson.matches.map((m) => m.audio_id);
          for (const m of searchJson.matches) {
            reasonsById[m.audio_id] = m.reason;
          }
        } else {
          finalAudioIds = [];
          summary = "Geen kandidaten in de huidige scope.";
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
            mode: "search",
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
    [corpus.snapshot, currentSelection, searching, model],
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

  // ── Enrich-flow (per-rij) ─────────────────────────────────────────
  // Identieke pattern als in audio-table.tsx; alleen geen batch-knop
  // omdat selecties op de search-page typisch klein zijn. De call
  // levert nu vertaling + topic + tags in één rondje.
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

      let result: EnrichResponse;
      try {
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ items, existing_topics: existingTopics }),
        });
        result = (await res.json()) as EnrichResponse;
      } catch (e) {
        result = {
          ok: false,
          error: e instanceof Error ? e.message : "Onbekende netwerkfout.",
          reason: "openai_error",
        };
      }

      if (result.ok) {
        translationCache.bulkSet(
          result.items.map((t) => ({
            audio_id: t.audio_id,
            translation: t.translation,
            source_text: row.sentence_text,
            lang: row.lang,
            cached_at: new Date().toISOString(),
            topic: t.topic,
            tags: t.tags,
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
    [translationCache, existingTopics],
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
        chunks.map(async (chunk): Promise<EnrichResponse> => {
          try {
            const res = await fetch("/api/dev/tatoeba-audio/translate", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                items: chunk,
                existing_topics: existingTopics,
              }),
            });
            return (await res.json()) as EnrichResponse;
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
        topic: string;
        tags: string[];
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
          for (const t of result.items) {
            successEntries.push({
              audio_id: t.audio_id,
              translation: t.translation,
              source_text: sourceById.get(t.audio_id) ?? "",
              lang: langById.get(t.audio_id) ?? "",
              cached_at: new Date().toISOString(),
              topic: t.topic,
              tags: t.tags,
            });
          }
        } else {
          const ids =
            result.reason === "missing_items" && result.missing_audio_ids
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
    [batchTranslating, translationCache, existingTopics],
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
        // Enrichment-data uit de cache. Voor NL-rijen blijft 'ie leeg
        // tenzij de user vooraf "Verrijk" heeft gedraaid; de DB-defaults
        // (`topic null`, `tags ''`) vangen dat dan op.
        let topic: string | null = null;
        let tagsCsv = "";
        const cached = translationCache.get(row.audio_id, row.sentence_text);
        if (row.lang === TARGET_LANG) {
          target_text = row.sentence_text;
        } else if (cached) {
          target_text = cached.translation;
          manually_edited = cached.manually_edited;
          alternatives = cached.alternatives;
        }
        if (cached) {
          topic = cached.topic;
          // CSV-formaat zoals afgesproken in migration 0010: lowercase,
          // comma-gescheiden, geen spaties rond commas. We trimmen
          // defensief voor het geval een handmatige edit ze achterlaat.
          tagsCsv = cached.tags
            .map((t) => t.trim())
            .filter((t) => t.length > 0)
            .join(",");
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
          topic,
          tags: tagsCsv,
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
        // Geen handmatige reset meer: de restore-effect detecteert de
        // lang-wissel en herstelt de juiste sessie voor de nieuwe taal
        // (of valt terug op een root-selectie / empty-state).
        onLangChange={setLang}
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
              "cosine",
            ]}
          />

          {debug && <SearchDebug snapshot={debug} />}
        </>
      ) : (
        <p className="rounded-md border border-dashed border-border bg-muted/40 px-4 py-3 text-xs text-muted-foreground">
          Klik &quot;Haal records op&quot; om te beginnen. De zoekfunctie
          komt beschikbaar zodra de embeddings in localStorage staan.
        </p>
      )}

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

      <ClearWarningDialog
        open={clearPrompt}
        enrichedCount={enrichedCountForLang}
        onCancel={() => setClearPrompt(false)}
        onConfirm={runClear}
      />
    </div>
  );
}
