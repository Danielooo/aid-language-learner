import { embed } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";

import {
  TATOEBA_SEARCH_EMBED_DIMS,
  TATOEBA_SEARCH_EMBED_MODEL,
} from "@/lib/ai/tatoeba-search-config";

// Embed-query route voor /dev/tatoeba-audio-search. Ontvangt één
// gebruikers-query (meestal Nederlands) en retourneert de embedding-
// vector — hetzelfde model + dimensies als de corpus-route, anders
// werkt cosine-vergelijking niet.
//
// Apart van /corpus zodat queries onafhankelijk van een corpus-fetch
// kunnen draaien (bv. opnieuw zoeken in een al-gecachet corpus).

export const dynamic = "force-dynamic";
export const maxDuration = 15;

const requestSchema = z.object({
  query: z.string().min(1).max(500),
});

export type EmbedQuerySuccess = {
  ok: true;
  query: string;
  embedding: number[];
  dims: number;
  model: string;
};

export type EmbedQueryFailure = {
  ok: false;
  error: string;
  reason?: "validation" | "no_api_key" | "openai_failed";
};

export type EmbedQueryResponse = EmbedQuerySuccess | EmbedQueryFailure;

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
      } satisfies EmbedQueryFailure,
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
      } satisfies EmbedQueryFailure,
      { status: 400 },
    );
  }

  const { query } = result.data;

  if (!process.env.OPENAI_API_KEY) {
    return Response.json(
      {
        ok: false,
        error: "OPENAI_API_KEY is niet geconfigureerd op de server.",
        reason: "no_api_key",
      } satisfies EmbedQueryFailure,
      { status: 500 },
    );
  }

  try {
    const { embedding } = await embed({
      model: openai.textEmbeddingModel(TATOEBA_SEARCH_EMBED_MODEL),
      value: query,
      providerOptions: {
        openai: {
          dimensions: TATOEBA_SEARCH_EMBED_DIMS,
        },
      },
    });

    return Response.json({
      ok: true,
      query,
      embedding,
      dims: TATOEBA_SEARCH_EMBED_DIMS,
      model: TATOEBA_SEARCH_EMBED_MODEL,
    } satisfies EmbedQuerySuccess);
  } catch (e) {
    return Response.json(
      {
        ok: false,
        error: e instanceof Error ? e.message : "Onbekende OpenAI-fout.",
        reason: "openai_failed",
      } satisfies EmbedQueryFailure,
      { status: 502 },
    );
  }
}
