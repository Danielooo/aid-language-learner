// Gedeelde constants/utilities voor de tatoeba-audio translate-route.
// Zelfde patroon als [exercise-generator-config.ts](./exercise-generator-config.ts):
// model + system-prompt + helper voor de user-message worden zowel server-side
// (route → generateObject) als client-side (debug-panel) geïmporteerd, zodat
// het paneel exact toont wat de LLM gezien heeft.
//
// Geen secrets — mag in de client-bundle.

export const TATOEBA_TRANSLATE_MODEL = "gpt-4o-mini";

// ISO 639-3 → mens-leesbaar label voor in de prompt. Helpt de LLM om
// idiomatisch te vertalen (Spaans heeft andere idioom dan bv. Frans).
const LANG_LABELS: Record<string, string> = {
  spa: "Spaans",
  eng: "Engels",
  fra: "Frans",
  deu: "Duits",
  ita: "Italiaans",
  por: "Portugees",
  nld: "Nederlands",
};

export function languageLabel(code: string): string {
  return LANG_LABELS[code] ?? code;
}

export const TATOEBA_TRANSLATE_SYSTEM_PROMPT = [
  "Je bent een professionele vertaler. Vertaal de zinnen naar natuurlijk, idiomatisch Nederlands.",
  "",
  "Strikte regels:",
  "- Behoud `audio_id` exact zoals aangeleverd (1-op-1 mapping in de output).",
  "- Geef precies één vertaling per item — geen alternatieven, geen toelichting.",
  "- Het Nederlands moet vloeiend klinken, géén woord-voor-woord vertaling.",
  "- Behoud de leestoon (vraag blijft vraag, uitroep blijft uitroep, etc.).",
  "- Als de bron al Nederlands is, geef de zin ongewijzigd terug.",
  "- Gebruik geen aanhalingstekens om je vertaling heen.",
].join("\n");

export type TranslateInputItem = {
  audio_id: number;
  source_text: string;
  source_lang: string;
};

// Bouwt de user-message met de te vertalen items als een gestructureerde
// JSON-blob. We sturen dit als één blok zodat de LLM de items als één
// batch ziet i.p.v. ze afzonderlijk te behandelen — dat hindert
// consistentie van toon en woordkeuze.
export function buildTranslateUserMessage(items: TranslateInputItem[]): string {
  const grouped = groupByLang(items);
  const blocks = grouped.map(({ lang, list }) => {
    const lines = list
      .map((item) => `  - audio_id ${item.audio_id}: ${item.source_text}`)
      .join("\n");
    return `Bron-taal: ${languageLabel(lang)} (${lang})\n${lines}`;
  });

  return [
    `Vertaal de volgende ${items.length} zin${items.length === 1 ? "" : "nen"} naar Nederlands.`,
    "",
    blocks.join("\n\n"),
    "",
    "Lever je antwoord aan in het gevraagde JSON-schema.",
  ].join("\n");
}

function groupByLang(
  items: TranslateInputItem[],
): Array<{ lang: string; list: TranslateInputItem[] }> {
  const map = new Map<string, TranslateInputItem[]>();
  for (const item of items) {
    const arr = map.get(item.source_lang) ?? [];
    arr.push(item);
    map.set(item.source_lang, arr);
  }
  return Array.from(map.entries()).map(([lang, list]) => ({ lang, list }));
}

// Mens-leesbare schets voor het debug-panel; handmatig synchroon te houden
// met de Zod-schema's in de route. Identieke aanpak als
// EXERCISE_CHAT_TOOL_DESCRIPTOR.
export const TATOEBA_TRANSLATE_DESCRIPTOR = {
  name: "translateToDutch",
  description:
    "Vertaalt N Tatoeba-zinnen (Spaans/Engels/Frans/...) naar Nederlands via OpenAI generateObject.",
  inputSchema: {
    items:
      "Array<{ audio_id: number, source_text: string, source_lang: string }>, 1..50",
  },
  outputSchema: {
    translations: "Array<{ audio_id: number, translation: string }>",
  },
} as const;
