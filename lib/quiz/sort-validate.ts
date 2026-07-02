import { normalizeWord } from "@/lib/quiz/tokenize";

import type { SortPoolItem } from "@/lib/quiz/sort-config";

export type SortFeedback = {
  isCorrect: boolean;
  correctAnswer: string;
};

function sequencesMatch(
  userWords: string[],
  sequence: string[],
): boolean {
  if (userWords.length !== sequence.length) return false;
  return userWords.every(
    (word, i) => normalizeWord(word) === normalizeWord(sequence[i] ?? ""),
  );
}

/**
 * Controleert of de geplaatste woorden overeenkomen met één van de
 * toegestane token-volgordes.
 */
export function evaluateSortOrder(
  userWords: string[],
  correctSequences: string[][],
  primaryAnswer: string,
): SortFeedback {
  const isCorrect = correctSequences.some((seq) =>
    sequencesMatch(userWords, seq),
  );
  return {
    isCorrect,
    correctAnswer: primaryAnswer,
  };
}

/**
 * Filtert pool-items waarvan het woord begint met `prefix`.
 * Case-sensitive zolang dat kandidaten oplevert; anders genormaliseerd.
 */
export function matchWordsByPrefix(
  prefix: string,
  pool: SortPoolItem[],
): SortPoolItem[] {
  if (prefix.length === 0) return [];

  const caseSensitive = pool.filter((item) => item.word.startsWith(prefix));
  if (caseSensitive.length > 0) return caseSensitive;

  const normalizedPrefix = normalizeWord(prefix);
  return pool.filter((item) =>
    normalizeWord(item.word).startsWith(normalizedPrefix),
  );
}

/** Bouwt de zin uit pool-items in slot-volgorde. */
export function buildSentenceFromSlots(
  slots: (string | null)[],
  poolById: Map<string, SortPoolItem>,
): string {
  return slots
    .map((id) => (id ? poolById.get(id)?.word : null))
    .filter((word): word is string => word !== null && word !== undefined)
    .join(" ");
}

/** Alle pool-items (initieel + terug in pool) als lookup-map. */
export function buildPoolLookup(items: SortPoolItem[]): Map<string, SortPoolItem> {
  return new Map(items.map((item) => [item.id, item]));
}

export function getWordsFromSlots(
  slots: (string | null)[],
  poolById: Map<string, SortPoolItem>,
): string[] {
  return slots
    .map((id) => (id ? poolById.get(id)?.word : undefined))
    .filter((word): word is string => word !== undefined);
}

export function isAllSlotsFilled(slots: (string | null)[]): boolean {
  return slots.length > 0 && slots.every((id) => id !== null);
}
