"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";

import type { ProposalBatch } from "@/app/_components/features/generator/proposal-table-adapter";

// Client-only draft voor tekst-generator (batches + topic/selectie).
// Overleeft refresh/navigatie; wordt gewist na opslaan of “Wis chat”.

const STORAGE_KEY = "aid-text-generator-draft-v1";
const DRAFT_UPDATED_EVENT = "aid-text-generator-draft-updated";

export type TextGeneratorDraftSnapshot = {
  batches: ProposalBatch[];
  selectedAudioIds: number[];
  topic: string;
};

type CacheEntry = {
  raw: string | null;
  parsed: TextGeneratorDraftSnapshot | null;
};

let memo: CacheEntry | null = null;

function isValidBatch(value: unknown): value is ProposalBatch {
  if (typeof value !== "object" || value === null) return false;
  const batch = value as Record<string, unknown>;
  if (typeof batch.id !== "string") return false;
  if (typeof batch.proposal !== "object" || batch.proposal === null) return false;
  const proposal = batch.proposal as Record<string, unknown>;
  if (typeof proposal.topic !== "string") return false;
  if (!Array.isArray(proposal.exercises)) return false;
  return proposal.exercises.every((ex) => {
    if (typeof ex !== "object" || ex === null) return false;
    const row = ex as Record<string, unknown>;
    return (
      typeof row.source_text === "string" &&
      typeof row.target_text === "string" &&
      Array.isArray(row.tags)
    );
  });
}

function parseSnapshot(raw: string | null): TextGeneratorDraftSnapshot | null {
  if (!raw) return null;
  try {
    const obj = JSON.parse(raw) as unknown;
    if (typeof obj !== "object" || obj === null) return null;
    const draft = obj as Record<string, unknown>;
    if (!Array.isArray(draft.batches)) return null;
    if (!Array.isArray(draft.selectedAudioIds)) return null;
    if (typeof draft.topic !== "string") return null;
    if (!draft.batches.every(isValidBatch)) return null;
    if (!draft.selectedAudioIds.every((id) => typeof id === "number")) {
      return null;
    }
    return {
      batches: draft.batches,
      selectedAudioIds: draft.selectedAudioIds,
      topic: draft.topic,
    };
  } catch {
    return null;
  }
}

function readSnapshot(): TextGeneratorDraftSnapshot | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (memo && memo.raw === raw) return memo.parsed;
  const parsed = parseSnapshot(raw);
  memo = { raw, parsed };
  return parsed;
}

function writeSnapshot(snapshot: TextGeneratorDraftSnapshot | null): void {
  if (typeof window === "undefined") return;
  const newRaw = snapshot ? JSON.stringify(snapshot) : null;
  const currentRaw = window.localStorage.getItem(STORAGE_KEY);
  if (newRaw === currentRaw) return;
  try {
    if (newRaw) {
      window.localStorage.setItem(STORAGE_KEY, newRaw);
    } else {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    // Quota / disabled storage — in-memory blijft werken tot refresh.
  }
  memo = { raw: newRaw, parsed: snapshot };
  window.dispatchEvent(new Event(DRAFT_UPDATED_EVENT));
}

function subscribe(callback: () => void): () => void {
  if (typeof window === "undefined") return () => { };
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) callback();
  };
  window.addEventListener("storage", onStorage);
  window.addEventListener(DRAFT_UPDATED_EVENT, callback);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(DRAFT_UPDATED_EVENT, callback);
  };
}

function getServerSnapshot(): TextGeneratorDraftSnapshot | null {
  return null;
}

export type UseTextGeneratorDraft = {
  snapshot: TextGeneratorDraftSnapshot | null;
  save: (snapshot: TextGeneratorDraftSnapshot) => void;
  clear: () => void;
};

export function useTextGeneratorDraft(): UseTextGeneratorDraft {
  const snapshot = useSyncExternalStore(
    subscribe,
    readSnapshot,
    getServerSnapshot,
  );

  const save = useCallback((next: TextGeneratorDraftSnapshot) => {
    if (next.batches.length === 0 && !next.topic.trim()) {
      writeSnapshot(null);
      return;
    }
    writeSnapshot(next);
  }, []);

  const clear = useCallback(() => {
    writeSnapshot(null);
  }, []);

  return useMemo(
    () => ({ snapshot, save, clear }),
    [snapshot, save, clear],
  );
}
