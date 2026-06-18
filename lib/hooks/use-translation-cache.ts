"use client";

import { useCallback, useSyncExternalStore } from "react";

// Cache voor AI-enrichments op /dev/tatoeba-audio en
// /dev/tatoeba-audio-search. Bewust client-only (localStorage) omdat
// de enrich-feature in dit stadium een dev-tool is — geen multi-device
// sync nodig, en geen Supabase-tabel om op te onderhouden. Bij latere
// "Admin-knop" feature uit IDEEFASE.md migreren we dit naar Supabase.
//
// Belangrijke detail: we slaan source_text mee op zodat we cache-hits
// kunnen invalideren als Tatoeba ooit een zin update. Zo komt er nooit
// een vertaling van zin "A" terecht op zin "B" met hetzelfde audio_id.
//
// Implementatie: `useSyncExternalStore` is de React 19-canonieke manier
// om externe state (zoals localStorage) te lezen zonder cascading renders
// vanuit `useEffect` te triggeren. Mutaties dispatchen een custom event
// zodat andere instanties van de hook in dezelfde tab ook re-renderen.
//
// v2 (Jun 2026): TranslationCacheEntry kreeg `manually_edited` en
// `alternatives`. We gebruiken een aparte storage-key zodat oude v1-entries
// niet crashen op het nieuwe schema; het bestaande v1-blob wordt lazy
// gemigreerd bij de eerste read.
//
// v3 (Jun 2026): TranslationCacheEntry kreeg `topic` (string | null) en
// `tags` (string[]) door de AI-enrichment-uitbreiding. Storage-key
// bumped naar v3 zodat half-gevulde v2-entries (translation maar geen
// topic/tags) ons niet stilletjes inconsistente cache-state opleveren —
// gebruiker drukt 1x opnieuw "Verrijk" en heeft direct volledige
// enrichment. Oudere blobs (v1/v2) worden niet langer gemigreerd; ze
// worden bij de eerste v3-write uit localStorage opgeruimd om quota
// niet te verspillen.

const STORAGE_KEY = "aid-tatoeba-translations-v3";
const STORAGE_KEY_V2 = "aid-tatoeba-translations-v2";
const STORAGE_KEY_V1 = "aid-tatoeba-translations-v1";
const CACHE_UPDATED_EVENT = "aid-tatoeba-translations-updated";

export type TranslationCacheEntry = {
  translation: string;
  // Snapshot van de bron-zin op het moment van vertalen — gebruikt om
  // stale cache-hits te detecteren als Tatoeba ooit zinnen aanpast.
  source_text: string;
  lang: string;
  cached_at: string;
  // True zodra de user de vertaling handmatig heeft overschreven via
  // dubbelklik in de tabel. Wordt bij een hervertaling gereset naar
  // false (verse AI-output is per definitie niet meer "manually_edited").
  manually_edited: boolean;
  // Door de user toegevoegde extra correcte vertalingen — gebruikt voor
  // de toekomstige `markAsAlsoCorrect`-quizfeature uit IDEEFASE.md.
  alternatives: string[];
  // AI-gegenereerd topic-label (lowercase NL). `null` zolang er nog
  // geen enrichment is gedaan voor deze entry (oude v2-entries die
  // alleen via translate gevuld werden, of de playground-flow die
  // geen topic doorzet).
  topic: string | null;
  // AI-gegenereerde tags (2-5, lowercase NL). Lege array tot
  // enrichment plaatsvindt.
  tags: string[];
};

export type TranslationCacheMap = Record<string, TranslationCacheEntry>;

// Subset die de translate-batch flow per item produceert; bevat alle
// "vers van de LLM"-velden + de bron-context (source_text/lang) die
// nodig is voor stale-detect. `topic` en `tags` zijn optioneel zodat
// een caller die enkel kan vertalen (zoals de playground) niet hoeft
// te liegen over enrichment-data die 'ie niet heeft.
export type TranslationBulkSetEntry = {
  audio_id: number;
  translation: string;
  source_text: string;
  lang: string;
  cached_at: string;
  topic?: string | null;
  tags?: string[];
};

export type UseTranslationCache = {
  cache: TranslationCacheMap;
  get: (
    audioId: number,
    currentSourceText: string,
  ) => TranslationCacheEntry | null;
  set: (audioId: number, entry: TranslationCacheEntry) => void;
  bulkSet: (entries: TranslationBulkSetEntry[]) => void;
  setManualTranslation: (audioId: number, newText: string) => void;
  addAlternative: (audioId: number, text: string) => void;
  removeAlternative: (audioId: number, index: number) => void;
  clearAll: () => void;
  // Wist alleen entries met matching `lang` (overige talen blijven
  // staan). Gebruikt door de corpus-bar "Wissen"-flow zodat we niet
  // per ongeluk de cache van een andere taal kwijtraken.
  clearByLang: (lang: string) => void;
};

// Module-scope cache zodat `getSnapshot` een stabiele referentie kan
// teruggeven — useSyncExternalStore vergelijkt op identity, dus elke
// keer een nieuwe object retourneren zou re-render-loops triggeren.
const EMPTY_MAP: TranslationCacheMap = Object.freeze(
  {},
) as TranslationCacheMap;
let cachedRaw: string | null = null;
let cachedParsed: TranslationCacheMap = EMPTY_MAP;

// Normaliseert een mogelijk-v1/v2 entry naar de v3-shape. Idempotent.
// v2-entries (zonder topic/tags) krijgen veilige defaults zodat de UI
// op pre-enrichment data geen crashes geeft.
function normalizeEntry(raw: unknown): TranslationCacheEntry | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.translation !== "string" || typeof r.source_text !== "string") {
    return null;
  }
  const alternatives = Array.isArray(r.alternatives)
    ? (r.alternatives.filter((s): s is string => typeof s === "string") as string[])
    : [];
  const tags = Array.isArray(r.tags)
    ? (r.tags.filter((s): s is string => typeof s === "string") as string[])
    : [];
  const topic =
    typeof r.topic === "string" && r.topic.trim().length > 0 ? r.topic : null;
  return {
    translation: r.translation,
    source_text: r.source_text,
    lang: typeof r.lang === "string" ? r.lang : "",
    cached_at: typeof r.cached_at === "string" ? r.cached_at : "",
    manually_edited:
      typeof r.manually_edited === "boolean" ? r.manually_edited : false,
    alternatives,
    topic,
    tags,
  };
}

function readSnapshot(): TranslationCacheMap {
  if (typeof window === "undefined") return EMPTY_MAP;
  // Strict v3-only: oudere blobs worden niet meer ge-lazy-migreerd.
  // Plan-rationale: een v2-entry zonder topic/tags zou half-gevulde
  // cache-state opleveren tot de user opnieuw "Verrijk" klikt; voor
  // het kleine aantal records dat lokaal staat is een wipe + her-
  // enrichment lager-risico dan tussenstaten in de UI.
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (raw === cachedRaw) return cachedParsed;
  cachedRaw = raw;
  if (!raw) {
    cachedParsed = EMPTY_MAP;
    return cachedParsed;
  }
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") {
      cachedParsed = EMPTY_MAP;
      return cachedParsed;
    }
    const next: TranslationCacheMap = {};
    for (const [key, value] of Object.entries(parsed)) {
      const normalized = normalizeEntry(value);
      if (normalized) next[key] = normalized;
    }
    cachedParsed = next;
  } catch {
    cachedParsed = EMPTY_MAP;
  }
  return cachedParsed;
}

function subscribe(callback: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  // 'storage' fires alleen cross-tab. Voor same-tab mutaties dispatchen
  // we een custom event vanuit de write-helpers hieronder.
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) callback();
  };
  const onCustom = () => callback();
  window.addEventListener("storage", onStorage);
  window.addEventListener(CACHE_UPDATED_EVENT, onCustom);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(CACHE_UPDATED_EVENT, onCustom);
  };
}

function getServerSnapshot(): TranslationCacheMap {
  return EMPTY_MAP;
}

function writeSnapshot(next: TranslationCacheMap): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    // Oude key-versies opruimen na de eerste v3-write — voorkomt dat
    // er drie blobs naast elkaar in localStorage blijven hangen voor
    // gebruikers die de feature al eerder hebben gebruikt.
    window.localStorage.removeItem(STORAGE_KEY_V2);
    window.localStorage.removeItem(STORAGE_KEY_V1);
  } catch {
    // Quota exceeded of disabled storage — UI blijft werken in-memory
    // tot pagina-refresh. Beter dan throwen.
  }
  // Reset module-cache zodat de volgende readSnapshot() de nieuwe
  // waarde returnt; dispatch event om subscribers te triggeren.
  cachedRaw = null;
  window.dispatchEvent(new Event(CACHE_UPDATED_EVENT));
}

export function useTranslationCache(): UseTranslationCache {
  const cache = useSyncExternalStore(
    subscribe,
    readSnapshot,
    getServerSnapshot,
  );

  const get = useCallback(
    (
      audioId: number,
      currentSourceText: string,
    ): TranslationCacheEntry | null => {
      const entry = cache[String(audioId)];
      if (!entry) return null;
      // Stale-detect: bron-zin verschilt → behandel als miss.
      if (entry.source_text !== currentSourceText) return null;
      return entry;
    },
    [cache],
  );

  const set = useCallback(
    (audioId: number, entry: TranslationCacheEntry) => {
      writeSnapshot({ ...cache, [String(audioId)]: entry });
    },
    [cache],
  );

  // bulkSet wordt gebruikt door de translate-batch flow. Bij een
  // hervertaling moeten alternatieven, edit-flag, en bestaande
  // enrichment (topic/tags) niet zomaar overschreven worden; we mergen
  // met de oude entry waar mogelijk.
  const bulkSet = useCallback(
    (entries: TranslationBulkSetEntry[]) => {
      const next: TranslationCacheMap = { ...cache };
      for (const e of entries) {
        const key = String(e.audio_id);
        const prev = next[key];
        // Als de bron-zin gewijzigd is t.o.v. de bestaande cache-entry
        // beschouwen we de oude alternatieven én oude enrichment als
        // 'niet meer relevant' (verschillende zin → verschillende
        // correcte vertalingen, mogelijk ander onderwerp).
        const sameSource = prev?.source_text === e.source_text;

        // Topic/tags: caller mag ze leeg laten (playground-flow die geen
        // enrichment uitvoert). Bij sameSource behouden we bestaande
        // enrichment als de caller niets stuurt; bij verschillende
        // source nullen we (mismatch zou onjuist labels gevangen
        // houden).
        const topic =
          e.topic !== undefined
            ? (e.topic ?? null)
            : sameSource
              ? (prev?.topic ?? null)
              : null;
        const tags =
          e.tags !== undefined
            ? e.tags
            : sameSource
              ? (prev?.tags ?? [])
              : [];

        next[key] = {
          translation: e.translation,
          source_text: e.source_text,
          lang: e.lang,
          cached_at: e.cached_at,
          // Verse AI-output → reset de edit-flag. De user heeft hem
          // niet handmatig opnieuw aangepast; pas na een nieuwe
          // dubbelklik wordt 'ie weer true.
          manually_edited: false,
          alternatives: sameSource ? (prev?.alternatives ?? []) : [],
          topic,
          tags,
        };
      }
      writeSnapshot(next);
    },
    [cache],
  );

  const setManualTranslation = useCallback(
    (audioId: number, newText: string) => {
      const key = String(audioId);
      const prev = cache[key];
      if (!prev) return;
      const trimmed = newText.trim();
      if (trimmed.length === 0) return;
      // Geen no-op write: als er niets veranderd is en de flag al true
      // staat, doen we niets om onnodige re-renders te vermijden.
      if (prev.translation === trimmed && prev.manually_edited) return;
      writeSnapshot({
        ...cache,
        [key]: {
          ...prev,
          translation: trimmed,
          manually_edited: true,
          cached_at: new Date().toISOString(),
        },
      });
    },
    [cache],
  );

  const addAlternative = useCallback(
    (audioId: number, text: string) => {
      const key = String(audioId);
      const prev = cache[key];
      if (!prev) return;
      const trimmed = text.trim();
      if (trimmed.length === 0) return;
      // Dedupe vs. zowel de primary translation als bestaande alternatieven.
      if (prev.translation === trimmed) return;
      if (prev.alternatives.includes(trimmed)) return;
      writeSnapshot({
        ...cache,
        [key]: {
          ...prev,
          alternatives: [...prev.alternatives, trimmed],
        },
      });
    },
    [cache],
  );

  const removeAlternative = useCallback(
    (audioId: number, index: number) => {
      const key = String(audioId);
      const prev = cache[key];
      if (!prev) return;
      if (index < 0 || index >= prev.alternatives.length) return;
      const nextAlternatives = prev.alternatives.slice();
      nextAlternatives.splice(index, 1);
      writeSnapshot({
        ...cache,
        [key]: {
          ...prev,
          alternatives: nextAlternatives,
        },
      });
    },
    [cache],
  );

  const clearAll = useCallback(() => {
    writeSnapshot({});
  }, []);

  const clearByLang = useCallback(
    (lang: string) => {
      const next: TranslationCacheMap = {};
      let removed = 0;
      for (const [key, entry] of Object.entries(cache)) {
        if (entry.lang === lang) {
          removed += 1;
          continue;
        }
        next[key] = entry;
      }
      // No-op skippen om onnodige re-renders en localStorage-writes
      // te vermijden — voorkomt ook dat een leeg-blijvende cache
      // herhaaldelijk wordt herschreven bij snelle clicks.
      if (removed === 0) return;
      writeSnapshot(next);
    },
    [cache],
  );

  return {
    cache,
    get,
    set,
    bulkSet,
    setManualTranslation,
    addAlternative,
    removeAlternative,
    clearAll,
    clearByLang,
  };
}
