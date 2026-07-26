// Gedeelde constants/utilities voor de tatoeba-audio enrich-route.
// Zelfde patroon als [exercise-generator-config.ts](./exercise-generator-config.ts):
// model + system-prompt + helper voor de user-message worden zowel server-side
// (route → generateObject) als client-side (debug-panel) geïmporteerd, zodat
// het paneel exact toont wat de LLM gezien heeft.
//
// Geen secrets — mag in de client-bundle.
//
// Historie: voorheen alleen "translate" (vertaling). Sinds de topic+tags-
// extensie levert dezelfde call ook een topic-label en 2-5 tags per zin.
// Filebestandsnaam blijft `tatoeba-translate-config.ts` om diff-noise
// klein te houden; nieuwe symbolen heten TATOEBA_ENRICH_*.

export const TATOEBA_ENRICH_MODEL = "gpt-4o-mini";

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

export const TATOEBA_ENRICH_SYSTEM_PROMPT = [
  "Je bent een vertaler én contentcurator voor Spaanse/Engelse/Franse/etc. taaloefeningen.",
  "Per audio_id lever je drie dingen tegelijk: een NL-vertaling, een topic-label en 2 tot 5 tags.",
  "",
  "Vertaling — strikte regels:",
  "- Behoud `audio_id` exact zoals aangeleverd (1-op-1 mapping in de output).",
  "- Geef precies één vertaling per item — geen alternatieven, geen toelichting.",
  "- Het Nederlands moet vloeiend klinken, géén woord-voor-woord vertaling.",
  "- Behoud de leestoon (vraag blijft vraag, uitroep blijft uitroep, etc.).",
  "- Als de bron al Nederlands is, geef de zin ongewijzigd terug.",
  "- Gebruik geen aanhalingstekens om je vertaling heen.",
  "",
  "Topic — strikte regels:",
  "- Bekijk eerst de lijst `existing_topics` in de user-message.",
  "- Als één van die bestaande topics semantisch past bij de zin, gebruik die EXACT (zelfde spelling, zelfde casing). Hergebruik heeft prioriteit boven creativiteit.",
  '- Past geen enkele bestaande topic? Verzin dan een kort label: 1 woord (max 2 woorden), lowercase, Nederlands. Bv. "restaurant", "luchthaven", "reizen", "begroeting".',
  "- Topic beschrijft de situatie/setting waarin deze zin natuurlijk past — niet het thema van het gesprek of de spreker.",
  "",
  "Tags — strikte regels:",
  "- 2 tot 5 tags per zin.",
  "- Elke tag: lowercase, Nederlands, één woord (max twee woorden, koppelteken-gescheiden indien nodig).",
  '- Tags beschrijven concepten, woordvelden of taal-aspecten die in de zin voorkomen, bv. "eten", "beleefdheid", "verleden-tijd", "vraag", "familie".',
  "- Geen duplicaten binnen één tag-lijst. Tag mag niet identiek zijn aan de topic-string.",
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
//
// `existingTopics` wordt expliciet als eerste blok meegestuurd zodat de
// LLM ze als reuse-kandidaat in de context heeft vóór 'ie de zinnen
// ziet. Lege lijst = signaleert dat de model er nieuwe mag verzinnen.
export function buildEnrichUserMessage(
  items: TranslateInputItem[],
  existingTopics: string[] = [],
): string {
  const grouped = groupByLang(items);
  const blocks = grouped.map(({ lang, list }) => {
    const lines = list
      .map((item) => `  - audio_id ${item.audio_id}: ${item.source_text}`)
      .join("\n");
    return `Bron-taal: ${languageLabel(lang)} (${lang})\n${lines}`;
  });

  const topicsHeader =
    existingTopics.length > 0
      ? `existing_topics (hergebruik exact als er een past): ${JSON.stringify(existingTopics)}`
      : "existing_topics: [] — er zijn nog geen topics in de database, verzin een passend label per item.";

  return [
    `Verrijk de volgende ${items.length} zin${items.length === 1 ? "" : "nen"} met vertaling, topic en tags.`,
    "",
    topicsHeader,
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
export const TATOEBA_ENRICH_DESCRIPTOR = {
  name: "enrichTatoebaSentences",
  description:
    "Verrijkt N Tatoeba-zinnen (Spaans/Engels/Frans/...) met een Nederlandse vertaling, een topic-label en 2-5 tags via OpenAI generateObject.",
  inputSchema: {
    items:
      "Array<{ audio_id: number, source_text: string, source_lang: string }>, 1..50",
    existing_topics: "string[] — bestaande Supabase-topics voor hergebruik",
  },
  outputSchema: {
    items:
      "Array<{ audio_id: number, translation: string, topic: string, tags: string[] (2-5) }>",
  },
} as const;
