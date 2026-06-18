import { generateObject, NoObjectGeneratedError } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";

import {
  TATOEBA_ENRICH_MODEL,
  TATOEBA_ENRICH_SYSTEM_PROMPT,
  buildEnrichUserMessage,
} from "@/lib/ai/tatoeba-translate-config";
import { assertAdmin } from "@/lib/dev/assert-admin";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

import {
  EXERCISE_SELECT_COLUMNS,
  type ExerciseDbRow,
  uuidToSyntheticAudioId,
} from "../types";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MAX_ITEMS = 50;
const MAX_EXISTING_TOPICS = 100;

const inputSchema = z.object({
  exercise_ids: z.array(z.string().uuid()).min(1).max(MAX_ITEMS),
});

const outputSchema = z.object({
  items: z.array(
    z.object({
      audio_id: z.number().int(),
      translation: z.string().min(1),
      topic: z.string().min(1),
      tags: z.array(z.string().min(1)).min(2).max(5),
    }),
  ),
});

export type ExercisesAdminEnrichSuccess = {
  ok: true;
  enriched: number;
  skipped: number;
};

export type ExercisesAdminEnrichFailure = {
  ok: false;
  error: string;
  reason?: string;
};

export type ExercisesAdminEnrichResponse =
  | ExercisesAdminEnrichSuccess
  | ExercisesAdminEnrichFailure;

export async function POST(req: Request): Promise<Response> {
  await assertAdmin();

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json(
      { ok: false, error: "Body is geen geldige JSON.", reason: "validation" } satisfies ExercisesAdminEnrichFailure,
      { status: 400 },
    );
  }

  const parse = inputSchema.safeParse(body);
  if (!parse.success) {
    return Response.json(
      { ok: false, error: "Validatie mislukt.", reason: "validation" } satisfies ExercisesAdminEnrichFailure,
      { status: 400 },
    );
  }

  if (!process.env.OPENAI_API_KEY) {
    return Response.json(
      {
        ok: false,
        error: "OPENAI_API_KEY is niet geconfigureerd.",
        reason: "no_api_key",
      } satisfies ExercisesAdminEnrichFailure,
      { status: 500 },
    );
  }

  const supabase = getSupabaseAdmin();
  const { data: rows, error: fetchError } = await supabase
    .from("exercises")
    .select(EXERCISE_SELECT_COLUMNS)
    .in("id", parse.data.exercise_ids);

  if (fetchError) {
    return Response.json(
      {
        ok: false,
        error: `Oefeningen ophalen mislukt: ${fetchError.message}`,
      } satisfies ExercisesAdminEnrichFailure,
      { status: 500 },
    );
  }

  const dbRows = (rows ?? []) as ExerciseDbRow[];
  let skipped = 0;
  const enrichItems: Array<{
    audio_id: number;
    source_text: string;
    source_lang: string;
    exercise_id: string;
  }> = [];

  for (const row of dbRows) {
    const lang = row.source_lang ?? "spa";
    if (lang === "nld") {
      skipped += 1;
      continue;
    }
    const audioId = row.tatoeba_audio_id ?? uuidToSyntheticAudioId(row.id);
    enrichItems.push({
      audio_id: audioId,
      source_text: row.source_text,
      source_lang: lang,
      exercise_id: row.id,
    });
  }

  if (enrichItems.length === 0) {
    return Response.json({
      ok: true,
      enriched: 0,
      skipped,
    } satisfies ExercisesAdminEnrichSuccess);
  }

  const existingTopics = await fetchExistingTopicsSafe();
  const llmItems = enrichItems.map(({ audio_id, source_text, source_lang }) => ({
    audio_id,
    source_text,
    source_lang,
  }));

  const prompt = buildEnrichUserMessage(llmItems, existingTopics);

  try {
    const result = await generateObject({
      model: openai(TATOEBA_ENRICH_MODEL),
      schema: outputSchema,
      schemaName: "TatoebaEnrichments",
      schemaDescription:
        "Per audio_id één Nederlandse vertaling + topic-label + 2-5 tags.",
      system: TATOEBA_ENRICH_SYSTEM_PROMPT,
      prompt,
      temperature: 0.2,
    });

    const byAudioId = new Map(
      result.object.items.map((item) => [item.audio_id, item]),
    );

    let enriched = 0;
    for (const item of enrichItems) {
      const out = byAudioId.get(item.audio_id);
      if (!out) continue;

      const tagsCsv = out.tags.join(",");
      const { error: updateError } = await supabase
        .from("exercises")
        .update({
          target_text: out.translation,
          topic: out.topic,
          tags: tagsCsv,
          target_text_manually_edited: false,
        })
        .eq("id", item.exercise_id);

      if (!updateError) enriched += 1;
    }

    return Response.json({
      ok: true,
      enriched,
      skipped,
    } satisfies ExercisesAdminEnrichSuccess);
  } catch (e) {
    if (NoObjectGeneratedError.isInstance(e)) {
      return Response.json(
        {
          ok: false,
          error: e.message || "OpenAI kon geen geldig object genereren.",
          reason: "no_object_generated",
        } satisfies ExercisesAdminEnrichFailure,
        { status: 502 },
      );
    }
    return Response.json(
      {
        ok: false,
        error: e instanceof Error ? e.message : "Onbekende OpenAI-fout.",
        reason: "openai_error",
      } satisfies ExercisesAdminEnrichFailure,
      { status: 502 },
    );
  }
}

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
    )
      .sort((a, b) => a.localeCompare(b, "nl"))
      .slice(0, MAX_EXISTING_TOPICS);
  } catch {
    return [];
  }
}
