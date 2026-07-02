/** Fisher-Yates shuffle — pure functie, muteert het origineel niet. */
export function fisherYatesShuffle<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

const MAX_SHUFFLE_ATTEMPTS = 10;

/**
 * Shuffle een array en probeer een volgorde te vinden die afwijkt van `original`.
 * Retourneert `original` als shufflen geen ander resultaat oplevert.
 */
export function shuffleUntilDifferent<T>(
  items: T[],
  original: T[],
  equals: (a: T, b: T) => boolean = (a, b) => a === b,
): T[] {
  if (items.length <= 1) return items;

  for (let attempt = 0; attempt < MAX_SHUFFLE_ATTEMPTS; attempt += 1) {
    const shuffled = fisherYatesShuffle(items);
    const isSame =
      shuffled.length === original.length &&
      shuffled.every((item, i) => equals(item, original[i]));
    if (!isSame) return shuffled;
  }

  return items;
}
