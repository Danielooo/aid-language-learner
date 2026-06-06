"use client";

import { useCallback, useSyncExternalStore } from "react";

// Cache voor AI-vertalingen op /dev/tatoeba-audio. Bewust client-only
// (localStorage) omdat de translate-feature in dit stadium een dev-tool
// is — geen multi-device sync nodig, en geen Supabase-tabel om op te
// onderhouden. Bij latere "Admin-knop" feature uit IDEEFASE.md migreren
// we dit naar Supabase.
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

const STORAGE_KEY = "aid-tatoeba-translations-v2";
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
};

export type TranslationCacheMap = Record<string, TranslationCacheEntry>;

export type UseTranslationCache = {
  cache: TranslationCacheMap;
  get: (
    audioId: number,
    currentSourceText: string,
  ) => TranslationCacheEntry | null;
  set: (audioId: number, entry: TranslationCacheEntry) => void;
  bulkSet: (
    entries: Array<
      { audio_id: number } & Pick<
        TranslationCacheEntry,
        "translation" | "source_text" | "lang" | "cached_at"
      >
    >,
  ) => void;
  setManualTranslation: (audioId: number, newText: string) => void;
  addAlternative: (audioId: number, text: string) => void;
  removeAlternative: (audioId: number, index: number) => void;
  clearAll: () => void;
};

// Module-scope cache zodat `getSnapshot` een stabiele referentie kan
// teruggeven — useSyncExternalStore vergelijkt op identity, dus elke
// keer een nieuwe object retourneren zou re-render-loops triggeren.
const EMPTY_MAP: TranslationCacheMap = Object.freeze(
  {},
) as TranslationCacheMap;
let cachedRaw: string | null = null;
let cachedParsed: TranslationCacheMap = EMPTY_MAP;

// Normaliseert een mogelijk-v1 entry naar de v2-shape. Idempotent.
function normalizeEntry(raw: unknown): TranslationCacheEntry | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.translation !== "string" || typeof r.source_text !== "string") {
    return null;
  }
  const alternatives = Array.isArray(r.alternatives)
    ? (r.alternatives.filter((s): s is string => typeof s === "string") as string[])
    : [];
  return {
    translation: r.translation,
    source_text: r.source_text,
    lang: typeof r.lang === "string" ? r.lang : "",
    cached_at: typeof r.cached_at === "string" ? r.cached_at : "",
    manually_edited:
      typeof r.manually_edited === "boolean" ? r.manually_edited : false,
    alternatives,
  };
}

function readSnapshot(): TranslationCacheMap {
  if (typeof window === "undefined") return EMPTY_MAP;
  // Eerst v2 proberen; als die er niet is, lezen we de v1-blob en
  // normaliseren die naar v2-shape (in-memory, schrijven we niet terug
  // tot er iets gemuteerd wordt — voorkomt onnodige writes bij elke
  // pagina-load).
  let raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    const legacy = window.localStorage.getItem(STORAGE_KEY_V1);
    if (legacy) raw = legacy;
  }
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
    if (e.key === STORAGE_KEY || e.key === STORAGE_KEY_V1) callback();
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
    // v1-blob opruimen na de eerste write naar v2 zodat we niet beide
    // formaten in storage hebben staan; daarna heeft v2 strict de
    // master-versie.
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
  // hervertaling moeten alternatieven en bestaande edit-flag niet
  // simpelweg overschreven worden; we mergen met de oude entry.
  const bulkSet = useCallback(
    (
      entries: Array<
        { audio_id: number } & Pick<
          TranslationCacheEntry,
          "translation" | "source_text" | "lang" | "cached_at"
        >
      >,
    ) => {
      const next: TranslationCacheMap = { ...cache };
      for (const e of entries) {
        const key = String(e.audio_id);
        const prev = next[key];
        // Als de bron-zin gewijzigd is t.o.v. de bestaande cache-entry
        // beschouwen we de oude alternatieven als 'niet meer relevant'
        // (verschillende zin → verschillende correcte vertalingen).
        const sameSource = prev?.source_text === e.source_text;
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

  return {
    cache,
    get,
    set,
    bulkSet,
    setManualTranslation,
    addAlternative,
    removeAlternative,
    clearAll,
  };
}
