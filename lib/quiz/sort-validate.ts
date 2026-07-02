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

/**
 * Lengte van het gematchte prefix in weergavetekst (zelfde regels als matchWordsByPrefix).
 */
export function getPrefixMatchLength(word: string, prefix: string): number {
  if (prefix.length === 0) return 0;

  if (word.startsWith(prefix)) return prefix.length;

  const normalizedPrefix = normalizeWord(prefix);
  const normalizedWord = normalizeWord(word);
  if (normalizedWord.startsWith(normalizedPrefix)) return normalizedPrefix.length;

  return 0;
}

/** Exacte match: getypt prefix === volledig woord (case-sensitive, anders genormaliseerd). */
export function isExactPrefixMatch(word: string, prefix: string): boolean {
  if (prefix.length === 0) return false;
  if (word === prefix) return true;
  return normalizeWord(word) === normalizeWord(prefix);
}

/** Exacte matches in de pool (0, 1 of meer bij duplicaat-woorden). */
export function findExactPrefixMatches(
  prefix: string,
  pool: SortPoolItem[],
): SortPoolItem[] {
  if (prefix.length === 0) return [];
  return pool.filter((item) => isExactPrefixMatch(item.word, prefix));
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
