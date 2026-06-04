import { generateObject, NoObjectGeneratedError } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";

import {
  TATOEBA_SEARCH_RERANK_DEFAULT_MODEL,
  TATOEBA_SEARCH_RERANK_MAX_CANDIDATES,
  TATOEBA_SEARCH_RERANK_MODEL_VALUES,
  TATOEBA_SEARCH_RERANK_SYSTEM_PROMPT,
  buildRerankUserMessage,
} from "@/lib/ai/tatoeba-search-config";

// Rerank-route voor /dev/tatoeba-audio-search. Ontvangt de query +
// een lijst kandidaten (al gefilterd op cosine-similarity, max 100)
// en laat een LLM filteren/herorderen + een korte samenvatting maken.
//
// Bewust `generateObject` voor zowel de matches als de samenvatting
// in één call — bespaart een tweede streamText-call voor een paar
// zinnetjes uitleg, en houdt de response strikt JSON-gevalideerd.

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const candidateSchema = z.object({
  audio_id: z.number().int().positive(),
  source_text: z.string().min(1),
  cosine: z.number(),
});

const requestSchema = z.object({
  query: z.string().min(1).max(500),
  candidates: z
    .array(candidateSchema)
    .min(1)
    .max(TATOEBA_SEARCH_RERANK_MAX_CANDIDATES),
  // Optioneel — default valt terug op het goedkoopste model. Validatie
  // tegen de registry voorkomt dat de UI per ongeluk een onbekende of
  // duurder-dan-bedoeld model-string doorstuurt.
  model: z
    .enum(TATOEBA_SEARCH_RERANK_MODEL_VALUES)
    .default(TATOEBA_SEARCH_RERANK_DEFAULT_MODEL),
});

const outputSchema = z.object({
  summary: z.string().min(1).max(500),
  matches: z
    .array(
      z.object({
        audio_id: z.number().int().positive(),
        reason: z.string().min(1).max(200),
      }),
    )
    .min(0),
});

export type RerankRequestBody = z.infer<typeof requestSchema>;
export type RerankOutput = z.infer<typeof outputSchema>;

export type RerankSuccess = {
  ok: true;
  summary: string;
  matches: RerankOutput["matches"];
  // Echo van wat we naar OpenAI stuurden — zodat het debug-panel exact
  // ziet wat er gegenereerd werd.
  request: {
    model: string;
    system: string;
    prompt: string;
  };
};

export type RerankFailure = {
  ok: false;
  error: string;
  reason?:
    | "validation"
    | "no_api_key"
    | "no_object_generated"
    | "openai_failed"
    | "hallucinated_ids";
  // Bij `hallucinated_ids`: de audio_ids die de LLM verzon (niet in de
  // input-kandidaten zaten). Geeft de UI de optie om alsnog door te
  // gaan met de geldige subset.
  hallucinated_ids?: number[];
};

export type RerankResponse = RerankSuccess | RerankFailure;

export async function POST(req: Request): Promise<Response> {
  let parsed: unknown;
  try {
    parsed = await req.json();
  } catch {
    return Response.json(
      {
        ok: false,
        error: "Body is geen geldige JSON.",
        reason: "validation",
      } satisfies RerankFailure,
      { status: 400 },
    );
  }

  const result = requestSchema.safeParse(parsed);
  if (!result.success) {
    return Response.json(
      {
        ok: false,
        error: "Validatie mislukt.",
        reason: "validation",
      } satisfies RerankFailure,
      { status: 400 },
    );
  }

  const { query, candidates, model } = result.data;

  if (!process.env.OPENAI_API_KEY) {
    return Response.json(
      {
        ok: false,
        error: "OPENAI_API_KEY is niet geconfigureerd op de server.",
        reason: "no_api_key",
      } satisfies RerankFailure,
      { status: 500 },
    );
  }

  const prompt = buildRerankUserMessage(query, candidates);

  try {
    const result = await generateObject({
      model: openai(model),
      schema: outputSchema,
      schemaName: "TatoebaSearchRerank",
      schemaDescription:
        "Geef de gefilterde + herorderde matches en een korte samenvatting.",
      system: TATOEBA_SEARCH_RERANK_SYSTEM_PROMPT,
      prompt,
      temperature: 0.2,
    });

    // Detecteer hallucinaties: alle returned audio_ids moeten in de
    // input-kandidaten zitten. Bij mismatch geven we wel een 502 maar
    // sturen we de geldige subset terug zodat de UI gracefully verder kan.
    const validIds = new Set(candidates.map((c) => c.audio_id));
    const hallucinated = result.object.matches
      .map((m) => m.audio_id)
      .filter((id) => !validIds.has(id));

    if (hallucinated.length > 0) {
      return Response.json(
        {
          ok: false,
          error: `LLM gaf ${hallucinated.length} audio_id(s) terug die niet in de input-kandidaten zaten.`,
          reason: "hallucinated_ids",
          hallucinated_ids: hallucinated,
        } satisfies RerankFailure,
        { status: 502 },
      );
    }

    return Response.json({
      ok: true,
      summary: result.object.summary,
      matches: result.object.matches,
      request: {
        model,
        system: TATOEBA_SEARCH_RERANK_SYSTEM_PROMPT,
        prompt,
      },
    } satisfies RerankSuccess);
  } catch (e) {
    if (NoObjectGeneratedError.isInstance(e)) {
      return Response.json(
        {
          ok: false,
          error:
            e.message ||
            "OpenAI kon geen geldig object genereren voor deze rerank.",
          reason: "no_object_generated",
        } satisfies RerankFailure,
        { status: 502 },
      );
    }
    return Response.json(
      {
        ok: false,
        error: e instanceof Error ? e.message : "Onbekende OpenAI-fout.",
        reason: "openai_failed",
      } satisfies RerankFailure,
      { status: 502 },
    );
  }
}
