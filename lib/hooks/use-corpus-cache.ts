"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";

import type { AudioRow } from "@/app/api/dev/tatoeba-audio/list/route";

// Cache voor de Tatoeba-corpus + embeddings op /dev/tatoeba-audio-search.
// Per `lang` apart opgeslagen zodat een taal-wissel een eerdere cache
// niet overschrijft. Bewust localStorage en niet IndexedDB:
//
//   - 500 × 512 × 4 bytes ≈ 1 MB voor de embeddings + ~75 KB voor de
//     records — comfortabel onder de ~5 MB localStorage-cap per origin.
//   - localStorage is synchroon, makkelijk in `useSyncExternalStore`,
//     en heeft geen async-boilerplate. IndexedDB zou pas nuttig worden
//     bij meerdere talen tegelijk of >2k records.
//
// Pattern volgt [use-translation-cache.ts](./use-translation-cache.ts):
// `useSyncExternalStore` + module-scope memo + custom event voor
// same-tab synchronisatie tussen meerdere instances van de hook.

const STORAGE_PREFIX = "aid-tatoeba-corpus-v1:";
const CORPUS_UPDATED_EVENT = "aid-tatoeba-corpus-updated";

export type CorpusSnapshot = {
  lang: string;
  rows: AudioRow[];
  embeddings: number[][];
  fetched_at: string;
  // Opgeslagen zodat het debug-panel ook na refresh ziet welke
  // dimensies de cached embeddings hebben.
  dims: number;
};

// Module-scope memo zodat `getSnapshot` een stabiele referentie
// teruggeeft — anders triggeren we infinite render-loops in
// `useSyncExternalStore`.
const cache = new Map<string, { raw: string | null; parsed: CorpusSnapshot | null }>();

function readSnapshot(lang: string): CorpusSnapshot | null {
  if (typeof window === "undefined") return null;
  const key = STORAGE_PREFIX + lang;
  const raw = window.localStorage.getItem(key);
  const memo = cache.get(lang);
  if (memo && memo.raw === raw) return memo.parsed;

  let parsed: CorpusSnapshot | null = null;
  if (raw) {
    try {
      const obj = JSON.parse(raw) as unknown;
      if (
        obj &&
        typeof obj === "object" &&
        "rows" in obj &&
        "embeddings" in obj
      ) {
        parsed = obj as CorpusSnapshot;
      }
    } catch {
      // Corrupt → behandel als afwezig, schrijf niets weg.
    }
  }
  cache.set(lang, { raw, parsed });
  return parsed;
}

function writeSnapshot(lang: string, snapshot: CorpusSnapshot | null): void {
  if (typeof window === "undefined") return;
  const key = STORAGE_PREFIX + lang;
  try {
    if (snapshot) {
      window.localStorage.setItem(key, JSON.stringify(snapshot));
    } else {
      window.localStorage.removeItem(key);
    }
  } catch {
    // Quota exceeded of disabled storage — geen throw, UI blijft
    // werken in-memory tot de pagina ververst.
  }
  cache.delete(lang);
  window.dispatchEvent(
    new CustomEvent(CORPUS_UPDATED_EVENT, { detail: { lang } }),
  );
}

function makeSubscribe(lang: string): (cb: () => void) => () => void {
  return (callback) => {
    if (typeof window === "undefined") return () => {};
    const key = STORAGE_PREFIX + lang;
    const onStorage = (e: StorageEvent) => {
      if (e.key === key) callback();
    };
    const onCustom = (e: Event) => {
      if (e instanceof CustomEvent && e.detail?.lang === lang) callback();
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener(CORPUS_UPDATED_EVENT, onCustom);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(CORPUS_UPDATED_EVENT, onCustom);
    };
  };
}

function getServerSnapshot(): CorpusSnapshot | null {
  return null;
}

export type UseCorpusCache = {
  snapshot: CorpusSnapshot | null;
  setCorpus: (snapshot: CorpusSnapshot) => void;
  clear: () => void;
};

// `lang` is verplicht: één hook-instance is gebonden aan één taal,
// net zoals één `<Form>` aan één formulier. Wissel je van taal in
// de UI, dan re-rendert de parent en mount de hook opnieuw met de
// nieuwe lang — `subscribe` re-init en je krijgt automatisch de
// juiste snapshot terug.
export function useCorpusCache(lang: string): UseCorpusCache {
  // useMemo i.p.v. useCallback omdat we hier een waarde (een functie)
  // afleiden van `lang`, niet een callback-prop wrappen — de eslint
  // react-hooks/use-memo-regel staat geen niet-inline factory-call
  // toe als eerste argument van useCallback.
  const subscribe = useMemo(() => makeSubscribe(lang), [lang]);
  const getSnapshot = useCallback(() => readSnapshot(lang), [lang]);
  const snapshot = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );

  const setCorpus = useCallback(
    (next: CorpusSnapshot) => {
      writeSnapshot(lang, next);
    },
    [lang],
  );

  const clear = useCallback(() => {
    writeSnapshot(lang, null);
  }, [lang]);

  return { snapshot, setCorpus, clear };
}
