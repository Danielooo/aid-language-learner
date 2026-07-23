import { generateObject, NoObjectGeneratedError } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";

import {
  TATOEBA_ENRICH_MODEL,
  TATOEBA_ENRICH_SYSTEM_PROMPT,
  buildEnrichUserMessage,
} from "@/lib/ai/tatoeba-translate-config";
import { assertAdmin } from "@/lib/auth/assert-admin";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

// Enrich-route voor de tabel op Tatoeba-import. Krijgt een
// batch items (max 50 per call) binnen, en levert per audio_id in één
// LLM-rondje terug: Nederlandse vertaling + topic-label + 2-5 tags.
// Bewust `generateObject` i.p.v. een tool-call: de taak is
// deterministisch en de output-vorm vast — een tool-call zou alleen
// extra protocol-overhead toevoegen zonder semantische winst.
//
// De client chunkt zelf in batches van 50 met Promise.all om grote
// tabel-selecties (bv. 200+ rijen) parallel weg te schrijven; deze
// route hoeft alleen één batch te verwerken.
//
// Naming-history: route heette eerst `/translate` en deed enkel vertaling.
// Sinds de enrichment-uitbreiding (topic + tags) doet 'ie meer; pad blijft
// hetzelfde om diff-noise klein te houden en de bestaande hook-cache-key
// te behouden.

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MAX_ITEMS_PER_REQUEST = 50;
// Cap op het aantal existing_topics dat we naar de LLM sturen. Bij
// 100+ topics wordt de prompt onnodig groot zonder navenant betere
// hergebruik-bias. Bij overschrijden: alfabetisch eerste N.
const MAX_EXISTING_TOPICS = 100;

const inputSchema = z.object({
  items: z
    .array(
      z.object({
        audio_id: z.number().int().positive(),
        source_text: z.string().min(1),
        source_lang: z
          .string()
          .min(2)
          .max(4)
          .regex(/^[a-z]+$/, "lang moet een ISO 639-3 code zijn"),
      }),
    )
    .min(1)
    .max(MAX_ITEMS_PER_REQUEST),
  // Optioneel: caller mag een gepre-fetchte topic-lijst meesturen om
  // round-trip naar Supabase te besparen wanneer 'ie er toch al één
  // ophaalde (zoals audio-search-page bij mount doet). Ontbreekt-of-
  // leeg → route haalt zelf op.
  existing_topics: z.array(z.string().min(1)).optional(),
});

// Output van de LLM. We laten de LLM de audio_id's terug-mappen zodat
// de UI eenduidig kan koppelen, ook als de volgorde verschuift.
const outputSchema = z.object({
  items: z.array(
    z.object({
      audio_id: z.number().int().positive(),
      translation: z.string().min(1),
      // Topic: bij voorkeur hergebruik van een existing_topic, anders
      // een nieuw kort lowercase NL-label. Validatie laat allebei toe;
      // de "hergebruik exact"-instructie zit in de system prompt.
      topic: z.string().min(1),
      // 2-5 tags per item; verbiedt lege strings binnenin.
      tags: z.array(z.string().min(1)).min(2).max(5),
    }),
  ),
});

export type EnrichRequestBody = z.infer<typeof inputSchema>;
export type EnrichOutput = z.infer<typeof outputSchema>;

// Item-shape voor consumers (UI). Geëxporteerd zodat de cache-hook en
// page-component één gemeenschappelijke type-source hebben.
export type EnrichedItem = EnrichOutput["items"][number];

export type EnrichSuccess = {
  ok: true;
  items: EnrichOutput["items"];
  // Echo zodat het debug-panel exact ziet wat we naar OpenAI stuurden.
  request: {
    model: string;
    system: string;
    prompt: string;
    items: EnrichRequestBody["items"];
    existing_topics: string[];
  };
};

export type EnrichFailure = {
  ok: false;
  error: string;
  reason?:
    | "validation"
    | "no_api_key"
    | "missing_items"
    | "no_object_generated"
    | "openai_error";
  // Bij missing_items: de audio_ids waar geen enrichment voor terugkwam.
  missing_audio_ids?: number[];
};

export type EnrichResponse = EnrichSuccess | EnrichFailure;

// Back-compat alias: oude callers die nog `TranslateResponse` importeren
// (zoals het playground-tabel-component) blijven dan compileren.
export type TranslateResponse = EnrichResponse;

export async function POST(req: Request): Promise<Response> {
  const auth = await assertAdmin();
  if (!auth.ok) return auth.response;

  let parsedBody: unknown;
  try {
    parsedBody = await req.json();
  } catch {
    return Response.json(
      {
        ok: false,
        error: "Body is geen geldige JSON.",
        reason: "validation",
      } satisfies EnrichFailure,
      { status: 400 },
    );
  }

  const parseResult = inputSchema.safeParse(parsedBody);
  if (!parseResult.success) {
    return Response.json(
      {
        ok: false,
        error: "Validatie mislukt.",
        reason: "validation",
      } satisfies EnrichFailure,
      { status: 400 },
    );
  }

  const { items, existing_topics: providedTopics } = parseResult.data;

  if (!process.env.OPENAI_API_KEY) {
    return Response.json(
      {
        ok: false,
        error: "OPENAI_API_KEY is niet geconfigureerd op de server.",
        reason: "no_api_key",
      } satisfies EnrichFailure,
      { status: 500 },
    );
  }

  // Topic-hergebruik werkt alleen als de LLM weet welke topics er al
  // zijn. Caller mag een lijst meesturen; anders halen we 'm hier op.
  // Fout bij de fallback is niet-fataal — dan biedt de LLM gewoon een
  // nieuw label voor élk item.
  const existingTopics = (
    providedTopics ?? (await fetchExistingTopicsSafe())
  ).slice(0, MAX_EXISTING_TOPICS);

  const prompt = buildEnrichUserMessage(items, existingTopics);

  try {
    const result = await generateObject({
      model: openai(TATOEBA_ENRICH_MODEL),
      schema: outputSchema,
      schemaName: "TatoebaEnrichments",
      schemaDescription:
        "Per audio_id één Nederlandse vertaling + topic-label + 2-5 tags voor de bron-zin.",
      system: TATOEBA_ENRICH_SYSTEM_PROMPT,
      prompt,
      temperature: 0.2,
    });

    // Sanity-check: de LLM moet voor élk audio_id een item teruggeven.
    // Bij mismatch kunnen we niet veilig partieel cachen, dus we falen hard.
    const requestedIds = new Set(items.map((i) => i.audio_id));
    const returnedIds = new Set(result.object.items.map((t) => t.audio_id));
    const missing = Array.from(requestedIds).filter(
      (id) => !returnedIds.has(id),
    );
    if (missing.length > 0) {
      return Response.json(
        {
          ok: false,
          error: `LLM gaf geen enrichment voor ${missing.length} audio_id(s).`,
          reason: "missing_items",
          missing_audio_ids: missing,
        } satisfies EnrichFailure,
        { status: 502 },
      );
    }

    return Response.json({
      ok: true,
      items: result.object.items,
      request: {
        model: TATOEBA_ENRICH_MODEL,
        system: TATOEBA_ENRICH_SYSTEM_PROMPT,
        prompt,
        items,
        existing_topics: existingTopics,
      },
    } satisfies EnrichSuccess);
  } catch (e) {
    if (NoObjectGeneratedError.isInstance(e)) {
      return Response.json(
        {
          ok: false,
          error:
            e.message ||
            "OpenAI kon geen geldig object genereren voor deze batch.",
          reason: "no_object_generated",
        } satisfies EnrichFailure,
        { status: 502 },
      );
    }
    return Response.json(
      {
        ok: false,
        error: e instanceof Error ? e.message : "Onbekende OpenAI-fout.",
        reason: "openai_error",
      } satisfies EnrichFailure,
      { status: 502 },
    );
  }
}

// Fallback voor wanneer de caller geen `existing_topics` meestuurt.
// Pure helper: Supabase-fout swallowed → lege array zodat de LLM
// alsnog kan enrichen (zonder reuse-bias). Service-role voor consistente
// "alle topics globaal" semantiek, identiek aan de aparte GET-route
// `/api/admin/tatoeba/existing-topics`.
async function fetchExistingTopicsSafe(): Promise<string[]> {
  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("exercises")
      .select("topic")
      .not("topic", "is", null);
    if (error || !data) return [];
    return Array.from(
      new Set(
        data
          .map((row) => row.topic)
          .filter(
            (topic): topic is string =>
              typeof topic === "string" && topic.trim().length > 0,
          ),
      ),
    ).sort((a, b) => a.localeCompare(b, "nl"));
  } catch {
    return [];
  }
}
