// Lenient string-vergelijking voor de Spaans→NL vertaal-quiz.
// "Basic" leniency: hoofdletters, leestekens en extra whitespace negeren.
// Geen accent-normalisatie en geen fuzzy/Levenshtein-matching — die keuze
// is bewust om feedback voorspelbaar te houden voor de leerling.

const PUNCTUATION = /[.,!?;:'"¿¡()\-—–]/g;

/**
 * Normaliseert een string voor vergelijking: lowercase, leestekens
 * verwijderd, whitespace genormaliseerd. Pure functie.
 */
export function normalizeForCompare(s: string): string {
  return s.toLowerCase().replace(PUNCTUATION, "").replace(/\s+/g, " ").trim();
}

/**
 * Checkt of `input` overeenkomt met één van de toegestane vertalingen.
 * Lege input geldt nooit als correct.
 */
export function isAnswerCorrect(input: string, options: string[]): boolean {
  const normalized = normalizeForCompare(input);
  if (normalized.length === 0) return false;
  return options.some((opt) => normalizeForCompare(opt) === normalized);
}
