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

const STORAGE_KEY = "aid-tatoeba-translations-v1";
const CACHE_UPDATED_EVENT = "aid-tatoeba-translations-updated";

export type TranslationCacheEntry = {
  translation: string;
  // Snapshot van de bron-zin op het moment van vertalen — gebruikt om
  // stale cache-hits te detecteren als Tatoeba ooit zinnen aanpast.
  source_text: string;
  lang: string;
  cached_at: string;
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
    entries: Array<{ audio_id: number } & TranslationCacheEntry>,
  ) => void;
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

function readSnapshot(): TranslationCacheMap {
  if (typeof window === "undefined") return EMPTY_MAP;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (raw === cachedRaw) return cachedParsed;
  cachedRaw = raw;
  if (!raw) {
    cachedParsed = EMPTY_MAP;
    return cachedParsed;
  }
  try {
    const parsed = JSON.parse(raw) as unknown;
    cachedParsed =
      parsed && typeof parsed === "object"
        ? (parsed as TranslationCacheMap)
        : EMPTY_MAP;
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

  const bulkSet = useCallback(
    (entries: Array<{ audio_id: number } & TranslationCacheEntry>) => {
      const next: TranslationCacheMap = { ...cache };
      for (const e of entries) {
        next[String(e.audio_id)] = {
          translation: e.translation,
          source_text: e.source_text,
          lang: e.lang,
          cached_at: e.cached_at,
        };
      }
      writeSnapshot(next);
    },
    [cache],
  );

  const clearAll = useCallback(() => {
    writeSnapshot({});
  }, []);

  return { cache, get, set, bulkSet, clearAll };
}
