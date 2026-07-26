import { normalizeForCompare } from "@/lib/quiz/compare";

const PUNCTUATION = /[.,!?;:'"¿¡()\-—–]/g;

/**
 * Splitst een zin in woorden na leestekens te strippen.
 * Behoudt accenten en hoofdletters in de weergave.
 */
export function tokenizeSentence(text: string): string[] {
  return text
    .split(/\s+/)
    .map((part) => part.replace(PUNCTUATION, "").trim())
    .filter((word) => word.length > 0);
}

export function countWords(text: string): number {
  return tokenizeSentence(text).length;
}

/** Normaliseert één woord voor vergelijking (zelfde regels als compare.ts). */
export function normalizeWord(word: string): string {
  return normalizeForCompare(word);
}
