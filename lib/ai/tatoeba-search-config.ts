// Gedeelde constants en prompt-builders voor de tatoeba-audio-search
// feature. Server- én client-side importeerbaar (geen secrets, geen
// platform-only dependencies) zodat het debug-panel exact kan tonen
// wat de routes naar OpenAI sturen.

// ── Embedding-model ────────────────────────────────────────────────

// `text-embedding-3-small` is multilingual (Dutch query → Spanish
// content werkt acceptabel) en is via de `dimensions`-parameter
// tot 512 floats te knijpen — een factor 3 compacter dan de default
// 1536, met minimaal kwaliteits-verlies en grote winst voor de
// localStorage-budget (500 × 512 × 4 ≈ 1 MB).
export const TATOEBA_SEARCH_EMBED_MODEL = "text-embedding-3-small";
export const TATOEBA_SEARCH_EMBED_DIMS = 512;

// ── Zoek-model + prompts ───────────────────────────────────────────

// Dropdown-opties voor het Zoek model (user-facing). Intern heet de
// route nog `rerank` — dat is de LLM-stap die cosine-kandidaten
// filtert op onderwerp.
export const TATOEBA_SEARCH_MODELS = [
  { value: "gpt-4o-mini", label: "GPT-4o mini (snel, goedkoop)" },
  { value: "gpt-5-mini", label: "GPT-5 mini (mid)" },
  { value: "gpt-5.5", label: "GPT-5.5 (premium)" },
] as const;

/** @deprecated Gebruik `TATOEBA_SEARCH_MODELS` */
export const TATOEBA_SEARCH_RERANK_MODELS = TATOEBA_SEARCH_MODELS;

export type TatoebaSearchModel =
  (typeof TATOEBA_SEARCH_MODELS)[number]["value"];

/** @deprecated Gebruik `TatoebaSearchModel` */
export type TatoebaSearchRerankModel = TatoebaSearchModel;

export const TATOEBA_SEARCH_DEFAULT_MODEL: TatoebaSearchModel =
  "gpt-4o-mini";

/** @deprecated Gebruik `TATOEBA_SEARCH_DEFAULT_MODEL` */
export const TATOEBA_SEARCH_RERANK_DEFAULT_MODEL = TATOEBA_SEARCH_DEFAULT_MODEL;

// Lijst van toegestane model-waardes — handig voor `z.enum()` in de
// route en voor runtime-validatie aan de client-zijde. Apart van de
// MODELS-registry zodat `z.enum` een literal tuple krijgt; afgeleid
// geven map() een gewone array en die accepteert Zod niet.
export const TATOEBA_SEARCH_RERANK_MODEL_VALUES = [
  "gpt-4o-mini",
  "gpt-5-mini",
  "gpt-5.5",
] as const satisfies ReadonlyArray<TatoebaSearchRerankModel>;

// Hoeveelheid kandidaten die client-side door cosine wordt geselecteerd
// vóór de optionele LLM-rerank. Hoger = duurder + tragere LLM-call,
// lager = meer kans dat een relevante zin uit de boot valt. 50 is
// een redelijke default voor 500 records.
export const TATOEBA_SEARCH_DEFAULT_TOP_K = 50;

// Cap op het aantal kandidaten dat de rerank-route ontvangt — ook
// onafhankelijk van top-K als veiligheidsnet tegen oversized prompts.
export const TATOEBA_SEARCH_RERANK_MAX_CANDIDATES = 100;

export const TATOEBA_SEARCH_RERANK_SYSTEM_PROMPT = [
  "Je helpt een gebruiker Spaanse zinnen vinden in een Tatoeba-corpus op basis van een vrije tekst-query (meestal in het Nederlands).",
  "",
  "Je krijgt:",
  "- De query van de gebruiker.",
  "- Een lijst kandidaten — al voorgeselecteerd op cosine-similarity. Elke kandidaat heeft een `audio_id`, `source_text`, en `cosine`-score.",
  "",
  "Je taak:",
  "- Behoud alleen kandidaten die écht semantisch relevant zijn voor de query. Cosine is een proxy, niet de waarheid.",
  "- Geef per overgebleven kandidaat een korte `reason` (max 10 woorden, in het Nederlands) die uitlegt waaróm 'ie matcht. Bv. 'noemt rijbewijs', 'over auto-onderhoud', 'metafoor over snelheid'.",
  "- Sorteer aflopend op semantische relevantie (eerste = beste match).",
  "",
  "Strikt:",
  "- Verzin geen `audio_id`s die niet in de lijst zitten.",
  "- Liever 5 sterke matches dan 30 zwakke. Bij twijfel: skip.",
  "- `summary`: max 2 zinnen, in het Nederlands. Vat samen wat je vond, hoeveel matches je terugstuurt, en eventueel patroon (bv. 'veel zinnen gaan over autorijden, een paar over autopech').",
  "- Antwoord uitsluitend in het gevraagde JSON-schema.",
].join("\n");

export type RerankCandidate = {
  audio_id: number;
  source_text: string;
  cosine: number;
};

export function buildRerankUserMessage(
  query: string,
  candidates: RerankCandidate[],
): string {
  const lines = candidates.map((c, idx) => {
    const score = c.cosine.toFixed(3);
    return `  ${idx + 1}. audio_id=${c.audio_id} cosine=${score} :: ${c.source_text}`;
  });

  return [
    `Query: ${query}`,
    "",
    `Kandidaten (${candidates.length}, gesorteerd op cosine aflopend):`,
    ...lines,
    "",
    "Filter en herorder. Lever je antwoord aan in het gevraagde JSON-schema.",
  ].join("\n");
}

// Mens-leesbare descriptors voor de debug-panels. Synchroon te houden
// met de Zod-schema's in de routes — analoog aan de andere
// `*_DESCRIPTOR` constants in deze map.
export const TATOEBA_SEARCH_DESCRIPTORS = {
  corpus: {
    name: "fetchCorpusWithEmbeddings",
    description:
      "Pagineert Tatoeba /unstable/audios tot N records en embed elke source_text via text-embedding-3-small (512 dims).",
    inputSchema: { lang: "ISO 639-3 string", limit: "number 1..2000" },
    outputSchema: {
      rows: "AudioRow[]",
      embeddings: "number[512][]",
      fetched_at: "ISO 8601 string",
    },
  },
  embedQuery: {
    name: "embedQuery",
    description: "Embed één string via text-embedding-3-small (512 dims).",
    inputSchema: { query: "string" },
    outputSchema: { embedding: "number[512]" },
  },
  rerank: {
    name: "searchByTopic",
    description:
      "Zoek op onderwerp: filter + rangschik cosine-kandidaten via het gekozen Zoek model en geef een korte AI-samenvatting.",
    inputSchema: {
      query: "string",
      candidates: "{ audio_id, source_text, cosine }[] (1..100)",
      model: "TatoebaSearchModel",
    },
    outputSchema: {
      summary: "string (max 2 zinnen)",
      matches: "{ audio_id, reason }[]",
    },
  },
} as const;
