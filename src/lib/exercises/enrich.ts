import { generateObject, NoObjectGeneratedError } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";

import {
  TATOEBA_ENRICH_MODEL,
  TATOEBA_ENRICH_SYSTEM_PROMPT,
  buildEnrichUserMessage,
} from "@/lib/ai/tatoeba-translate-config";

import {
  EXERCISE_SELECT_COLUMNS,
  type ExerciseDbRow,
  uuidToSyntheticAudioId,
} from "@/lib/exercises/types";

import type { SupabaseClient } from "@supabase/supabase-js";

const MAX_EXISTING_TOPICS = 100;

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

export type EnrichExercisesResult =
  | { ok: true; enriched: number; skipped: number }
  | { ok: false; error: string; reason?: string; status: number };

type EnrichExercisesOptions = {
  supabase: SupabaseClient;
  exerciseIds: string[];
  /** Optioneel: beperk topics-lookup tot eigen rijen (user-flow). */
  ownerId?: string;
  /** Alleen global corpus (owner_id IS NULL) — admin-flow. */
  globalsOnly?: boolean;
};

export async function enrichExercises({
  supabase,
  exerciseIds,
  ownerId,
  globalsOnly,
}: EnrichExercisesOptions): Promise<EnrichExercisesResult> {
  if (!process.env.OPENAI_API_KEY) {
    return {
      ok: false,
      error: "OPENAI_API_KEY is niet geconfigureerd.",
      reason: "no_api_key",
      status: 500,
    };
  }

  let fetchQuery = supabase
    .from("exercises")
    .select(EXERCISE_SELECT_COLUMNS)
    .in("id", exerciseIds);

  if (ownerId) {
    fetchQuery = fetchQuery.eq("owner_id", ownerId);
  } else if (globalsOnly) {
    fetchQuery = fetchQuery.is("owner_id", null);
  }

  const { data: rows, error: fetchError } = await fetchQuery;

  if (fetchError) {
    return {
      ok: false,
      error: `Oefeningen ophalen mislukt: ${fetchError.message}`,
      status: 500,
    };
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
    return { ok: true, enriched: 0, skipped };
  }

  const existingTopics = await fetchExistingTopicsSafe(supabase, ownerId);
  const llmItems = enrichItems.map(
    ({ audio_id, source_text, source_lang }) => ({
      audio_id,
      source_text,
      source_lang,
    }),
  );

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
      let updateQuery = supabase
        .from("exercises")
        .update({
          target_text: out.translation,
          topic: out.topic,
          tags: tagsCsv,
          target_text_manually_edited: false,
        })
        .eq("id", item.exercise_id);

      if (ownerId) {
        updateQuery = updateQuery.eq("owner_id", ownerId);
      }

      const { error: updateError } = await updateQuery;
      if (!updateError) enriched += 1;
    }

    return { ok: true, enriched, skipped };
  } catch (e) {
    if (NoObjectGeneratedError.isInstance(e)) {
      return {
        ok: false,
        error: e.message || "OpenAI kon geen geldig object genereren.",
        reason: "no_object_generated",
        status: 502,
      };
    }
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Onbekende OpenAI-fout.",
      reason: "openai_error",
      status: 502,
    };
  }
}

async function fetchExistingTopicsSafe(
  supabase: SupabaseClient,
  ownerId?: string,
): Promise<string[]> {
  try {
    let query = supabase
      .from("exercises")
      .select("topic")
      .not("topic", "is", null);
    if (ownerId) {
      query = query.eq("owner_id", ownerId);
    }
    const { data, error } = await query;
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
