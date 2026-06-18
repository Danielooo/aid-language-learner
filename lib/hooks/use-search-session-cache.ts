"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";

import type {
  ChatMessage,
  Selection,
} from "@/app/dev/tatoeba-audio-search/_components/types";

// Cache voor de zoek-sessie op /dev/tatoeba-audio-search. Bevat de
// stack (undo-stack van Selection's), de chat-messages en de huidige
// checkbox-selectie. Per `lang` apart opgeslagen — wisselen van taal
// houdt eerdere sessies intact zodat terugschakelen ze restored.
//
// Pattern volgt 1:1 [use-corpus-cache.ts](./use-corpus-cache.ts):
// module-scope memo + `useSyncExternalStore` + custom event voor
// same-tab synchronisatie. Cross-tab sync gaat automatisch via het
// browser-`storage`-event.
//
// `selectedIds` zit in component-state als `Set<number>`, maar we
// serialiseren 'm als array (`selectedAudioIds`) zodat JSON.stringify
// niet stilletjes een lege `{}` produceert voor een Set.

const STORAGE_PREFIX = "aid-tatoeba-search-session-v1:";
const SESSION_UPDATED_EVENT = "aid-tatoeba-search-session-updated";

export type SearchSessionSnapshot = {
  stack: Selection[];
  messages: ChatMessage[];
  selectedAudioIds: number[];
};

// Module-scope memo zodat `getSnapshot` een stabiele referentie
// teruggeeft — anders krijgen we infinite render-loops in
// `useSyncExternalStore`.
const cache = new Map<
  string,
  { raw: string | null; parsed: SearchSessionSnapshot | null }
>();

function readSnapshot(lang: string): SearchSessionSnapshot | null {
  if (typeof window === "undefined") return null;
  const key = STORAGE_PREFIX + lang;
  const raw = window.localStorage.getItem(key);
  const memo = cache.get(lang);
  if (memo && memo.raw === raw) return memo.parsed;

  let parsed: SearchSessionSnapshot | null = null;
  if (raw) {
    try {
      const obj = JSON.parse(raw) as unknown;
      if (
        obj &&
        typeof obj === "object" &&
        "stack" in obj &&
        "messages" in obj &&
        "selectedAudioIds" in obj &&
        Array.isArray((obj as SearchSessionSnapshot).stack) &&
        Array.isArray((obj as SearchSessionSnapshot).messages) &&
        Array.isArray((obj as SearchSessionSnapshot).selectedAudioIds)
      ) {
        parsed = obj as SearchSessionSnapshot;
      }
    } catch {
      // Corrupt → behandel als afwezig.
    }
  }
  cache.set(lang, { raw, parsed });
  return parsed;
}

function writeSnapshot(
  lang: string,
  snapshot: SearchSessionSnapshot | null,
): void {
  if (typeof window === "undefined") return;
  const key = STORAGE_PREFIX + lang;
  const newRaw = snapshot ? JSON.stringify(snapshot) : null;
  const currentRaw = window.localStorage.getItem(key);
  // No-op skip: identieke inhoud → geen write, geen event, geen
  // cache-update. Breekt de feedback-loop tussen auto-persist effect
  // en useSyncExternalStore wanneer state hetzelfde blijft.
  if (newRaw === currentRaw) return;
  try {
    if (newRaw) {
      window.localStorage.setItem(key, newRaw);
    } else {
      window.localStorage.removeItem(key);
    }
  } catch {
    // Quota exceeded of disabled storage — UI blijft werken in-memory
    // tot de pagina ververst.
  }
  // Write-through cache: bewaar het zojuist-geschreven snapshot-object
  // direct. Zonder dit zou de volgende readSnapshot() opnieuw parsen en
  // een nieuwe parsed-identity teruggeven; useSyncExternalStore zou dat
  // als wijziging zien en een re-render triggeren — waarna het persist-
  // effect weer zou willen schrijven (= loop).
  cache.set(lang, { raw: newRaw, parsed: snapshot });
  window.dispatchEvent(
    new CustomEvent(SESSION_UPDATED_EVENT, { detail: { lang } }),
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
    window.addEventListener(SESSION_UPDATED_EVENT, onCustom);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(SESSION_UPDATED_EVENT, onCustom);
    };
  };
}

function getServerSnapshot(): SearchSessionSnapshot | null {
  return null;
}

export type UseSearchSessionCache = {
  snapshot: SearchSessionSnapshot | null;
  save: (snapshot: SearchSessionSnapshot) => void;
  clear: () => void;
};

export function useSearchSessionCache(lang: string): UseSearchSessionCache {
  const subscribe = useMemo(() => makeSubscribe(lang), [lang]);
  const getSnapshot = useCallback(() => readSnapshot(lang), [lang]);
  const snapshot = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );

  const save = useCallback(
    (next: SearchSessionSnapshot) => {
      // Lege sessie schrijven we niet weg: voorkomt dat een net-gewist
      // localStorage-blob meteen weer als lege `{stack:[], …}` terug
      // komt, en houdt de "geen-sessie" → root-selectie-fallback in
      // audio-search-page werkbaar.
      if (
        next.stack.length === 0 &&
        next.messages.length === 0 &&
        next.selectedAudioIds.length === 0
      ) {
        writeSnapshot(lang, null);
        return;
      }
      writeSnapshot(lang, next);
    },
    [lang],
  );

  const clear = useCallback(() => {
    writeSnapshot(lang, null);
  }, [lang]);

  return { snapshot, save, clear };
}
