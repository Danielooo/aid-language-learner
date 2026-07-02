const MAX_SHUFFLE_ATTEMPTS = 10;

function fisherYatesShuffle<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * Maakt een anagram van `word` door letters te shufflen.
 * Retourneert het origineel als het woord ≤1 teken heeft, of als shufflen
 * geen ander resultaat oplevert (bijv. "aa").
 */
export function shuffleAnagram(word: string): string {
  if (word.length <= 1) return word;

  const letters = [...word];
  for (let attempt = 0; attempt < MAX_SHUFFLE_ATTEMPTS; attempt += 1) {
    const shuffled = fisherYatesShuffle(letters).join("");
    if (shuffled !== word) return shuffled;
  }

  return word;
}
