import {
  stripWiktionaryHtml,
  wiktionaryLookup,
} from "@/lib/api/wiktionary";

import type {
  WiktionaryEntry,
  WiktionaryResult,
} from "@/lib/api/wiktionary";

// Eén gedeelde helper voor zowel de chat-route (die naar OpenAI streamt)
// als de preview-route (die de raw JSON terug naar de UI stuurt). Zo zijn
// het system-prompt en de Wiktionary-data die in de UI-debug-panels
// verschijnen gegarandeerd identiek aan wat de LLM daadwerkelijk ziet.

export type WiktionaryContext = {
  word: string;
  focusLang: string;
  wiktionaryResult: WiktionaryResult | null;
  systemPrompt: string;
};

const NO_WORD_FALLBACK_PROMPT =
  "Je bent een Spaans-leer-assistent. Vraag de gebruiker om eerst een woord in te vullen in het woord-veld voordat je inhoudelijk kunt antwoorden. Antwoord in het Nederlands.";

export async function buildWiktionaryContext(
  rawWord: string | undefined,
  rawFocusLang: string | undefined,
): Promise<WiktionaryContext> {
  const word = (rawWord ?? "").trim();
  const focusLang = (rawFocusLang ?? "es").trim().toLowerCase() || "es";

  if (!word) {
    return {
      word: "",
      focusLang,
      wiktionaryResult: null,
      systemPrompt: NO_WORD_FALLBACK_PROMPT,
    };
  }

  const wiktionaryResult = await wiktionaryLookup(word);
  const systemPrompt = renderSystemPrompt(word, focusLang, wiktionaryResult);

  return { word, focusLang, wiktionaryResult, systemPrompt };
}

function renderSystemPrompt(
  word: string,
  focusLang: string,
  result: WiktionaryResult,
): string {
  const dataBlock = result.ok
    ? renderEntries(result.data[focusLang])
    : `LOOKUP MISLUKT: ${result.error.type}${result.error.detail ? ` — ${result.error.detail}` : ""
    }`;

  return [
    "Je bent een Spaans-leer-assistent. Antwoord ALTIJD in het Nederlands.",
    "",
    `Hieronder staat de Wiktionary-data voor het woord "${word}" in de "${focusLang}"-sectie. Gebruik UITSLUITEND deze data om vragen te beantwoorden — verzin niets. Als de data leeg is of geen antwoord geeft op de vraag, zeg dat eerlijk.`,
    "",
    "WIKTIONARY-DATA:",
    dataBlock,
  ].join("\n");
}

function renderEntries(entries: WiktionaryEntry[] | undefined): string {
  if (!entries || entries.length === 0) {
    return "(geen entries gevonden voor deze taal-sectie)";
  }

  return entries
    .map((entry, idx) => {
      const header = `${idx + 1}. ${entry.partOfSpeech} (${entry.language})`;
      const definitions = entry.definitions
        .map((def, di) => {
          const text = stripWiktionaryHtml(def.definition);
          const examples =
            def.parsedExamples
              ?.map((ex) => {
                const main = stripWiktionaryHtml(ex.example);
                const trans = ex.translation
                  ? ` → ${stripWiktionaryHtml(ex.translation)}`
                  : "";
                return `      * ${main}${trans}`;
              })
              .join("\n") ?? "";
          return `   ${di + 1}) ${text}${examples ? `\n${examples}` : ""}`;
        })
        .join("\n");
      return `${header}\n${definitions}`;
    })
    .join("\n\n");
}
