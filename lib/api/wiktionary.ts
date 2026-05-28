// Typed wrapper voor Wiktionary REST API (Engelse Wiktionary).
// Documentatie: https://en.wiktionary.org/api/rest_v1/.
// We gebruiken EN-Wiktionary omdat de NL/ES varianten 501 retourneren
// op /page/definition voor Spaanse woorden.

const WIKTIONARY_BASE = "https://en.wiktionary.org/api/rest_v1/page/definition";

export type WiktionaryExample = string;

export type WiktionaryDefinition = {
  definition: string;
  parsedExamples?: { example: string; translation?: string }[];
  examples?: WiktionaryExample[];
};

export type WiktionaryEntry = {
  partOfSpeech: string;
  language: string;
  definitions: WiktionaryDefinition[];
};

// Wiktionary's REST API geeft een object met taal-keys ("es", "en",
// "ast", "other", ...) waaronder telkens een array van entries.
export type WiktionaryResponse = Record<string, WiktionaryEntry[]>;

export type WiktionaryError = {
  status: number;
  type: string;
  title?: string;
  detail?: string;
};

export type WiktionaryResult =
  | { ok: true; url: string; word: string; data: WiktionaryResponse }
  | { ok: false; url: string; word: string; error: WiktionaryError };

export async function wiktionaryLookup(
  word: string,
): Promise<WiktionaryResult> {
  // Wiktionary verwacht het woord URL-encoded, exact zoals het op de
  // wiki staat (case-sensitive, lowercase voor de meeste vocab).
  const url = `${WIKTIONARY_BASE}/${encodeURIComponent(word)}`;
  try {
    const res = await fetch(url, { cache: "no-store" });
    const json = (await res.json()) as WiktionaryResponse | WiktionaryError;
    if (!res.ok || "status" in json) {
      return { ok: false, url, word, error: json as WiktionaryError };
    }
    return { ok: true, url, word, data: json as WiktionaryResponse };
  } catch (e) {
    return {
      ok: false,
      url,
      word,
      error: {
        status: 0,
        type: "fetch-error",
        detail: e instanceof Error ? e.message : "Unknown error",
      },
    };
  }
}

// Wiktionary stopt HTML in definitions ("<a rel=\"mw:WikiLink\" ...>", "<ol>"
// voor verbuigings-lijsten, "<span typeof=\"mw:Entity\">!</span>" voor
// HTML-entities). Voor een leesbare preview hebben we een zeer beperkte
// strip nodig. Voor productie zou je dit door de LLM laten interpreteren
// (zie rubric 1.2: "interpreteert en verrijkt").
export function stripWiktionaryHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}
