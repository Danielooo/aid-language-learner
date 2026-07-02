import { normalizeForCompare } from "@/lib/quiz/compare";

export type BlankWordResult = {
  word: string;
  display: string;
};

type TokenInfo = {
  raw: string;
  normalized: string;
  index: number;
};

function tokenize(sentence: string): TokenInfo[] {
  return sentence.split(/\s+/).map((raw, index) => ({
    raw,
    normalized: normalizeForCompare(raw),
    index,
  }));
}

/**
 * Kiest het langste woord in `sentence` als blank; bij gelijke lengte het
 * eerste. Valt terug op elk woord >2 tekens, anders het eerste woord.
 */
export function pickBlankWord(sentence: string): BlankWordResult {
  const tokens = tokenize(sentence.trim()).filter((t) => t.raw.length > 0);

  if (tokens.length === 0) {
    return { word: "", display: "___" };
  }

  const eligible =
    tokens.filter((t) => t.normalized.length > 2).length > 0
      ? tokens.filter((t) => t.normalized.length > 2)
      : tokens;

  let chosen = eligible[0];
  for (const token of eligible) {
    if (token.normalized.length > chosen.normalized.length) {
      chosen = token;
    }
  }

  const parts = sentence.trim().split(/\s+/);
  parts[chosen.index] = "___";

  return {
    word: chosen.raw,
    display: parts.join(" "),
  };
}
