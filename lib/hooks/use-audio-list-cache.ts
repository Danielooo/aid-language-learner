"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";

import type { AudioListSuccess } from "@/app/api/dev/tatoeba-audio/list/route";

// Cache voor de opgehaalde records op /dev/tatoeba-audio (de "Laad
// audios"-tabel). Bewaart de laatste succesvolle response per taal in
// localStorage zodat een page-refresh de zojuist opgehaalde rijen niet
// kwijtraakt.
//
// We slaan de volledige `AudioListSuccess` op (rows + total + url +
// pages_fetched) plus de aangevraagde limit en een fetched_at tijdstip.
// Daarmee kan de UI direct terugschakelen naar dezelfde "loaded"-state
// die de fetch zou produceren, inclusief het debug-paneel onderaan.
//
// Pattern volgt 1:1 [use-corpus-cache.ts](./use-corpus-cache.ts):
// module-scope memo + `useSyncExternalStore` + custom event voor
// same-tab sync. Cross-tab sync gaat gratis via het 'storage'-event.

const STORAGE_PREFIX = "aid-tatoeba-audio-list-v1:";
const LIST_UPDATED_EVENT = "aid-tatoeba-audio-list-updated";

export type AudioListSnapshot = {
  lang: string;
  limit: number;
  fetched_at: string;
  // Hele success-response — bevat rows, total, url en pages_fetched.
  // Zo blijft het RequestDebugPanel ook na refresh consistent.
  response: AudioListSuccess;
};

// Module-scope memo zodat `getSnapshot` een stabiele referentie kan
// teruggeven — anders triggert `useSyncExternalStore` infinite re-renders.
const cache = new Map<
  string,
  { raw: string | null; parsed: AudioListSnapshot | null }
>();

function readSnapshot(lang: string): AudioListSnapshot | null {
  if (typeof window === "undefined") return null;
  const key = STORAGE_PREFIX + lang;
  const raw = window.localStorage.getItem(key);
  const memo = cache.get(lang);
  if (memo && memo.raw === raw) return memo.parsed;

  let parsed: AudioListSnapshot | null = null;
  if (raw) {
    try {
      const obj = JSON.parse(raw) as unknown;
      if (
        obj &&
        typeof obj === "object" &&
        "response" in obj &&
        "limit" in obj &&
        "fetched_at" in obj
      ) {
        parsed = obj as AudioListSnapshot;
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
  snapshot: AudioListSnapshot | null,
): void {
  if (typeof window === "undefined") return;
  const key = STORAGE_PREFIX + lang;
  const newRaw = snapshot ? JSON.stringify(snapshot) : null;
  const currentRaw = window.localStorage.getItem(key);
  // No-op skip — identieke inhoud doet niets. Defensieve hardening
  // tegen feedback-loops als toekomstige consumers een auto-persist
  // effect zouden bouwen (zie [use-search-session-cache.ts] voor de
  // bug die dit patroon adresseert).
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
  // Write-through cache: zonder dit zou de volgende readSnapshot()
  // re-parsen en een nieuwe parsed-identity teruggeven, wat een
  // re-render zou triggeren ook al is de data identiek.
  cache.set(lang, { raw: newRaw, parsed: snapshot });
  window.dispatchEvent(
    new CustomEvent(LIST_UPDATED_EVENT, { detail: { lang } }),
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
    window.addEventListener(LIST_UPDATED_EVENT, onCustom);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(LIST_UPDATED_EVENT, onCustom);
    };
  };
}

function getServerSnapshot(): AudioListSnapshot | null {
  return null;
}

export type UseAudioListCache = {
  snapshot: AudioListSnapshot | null;
  save: (snapshot: AudioListSnapshot) => void;
  clear: () => void;
};

export function useAudioListCache(lang: string): UseAudioListCache {
  const subscribe = useMemo(() => makeSubscribe(lang), [lang]);
  const getSnapshot = useCallback(() => readSnapshot(lang), [lang]);
  const snapshot = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );

  const save = useCallback(
    (next: AudioListSnapshot) => {
      writeSnapshot(lang, next);
    },
    [lang],
  );

  const clear = useCallback(() => {
    writeSnapshot(lang, null);
  }, [lang]);

  return { snapshot, save, clear };
}
