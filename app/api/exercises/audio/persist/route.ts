import { z } from "zod";

import { fetchAudioBinary } from "@/lib/api/tatoeba-audio";
import { getExerciseUserAccess } from "@/lib/exercises/exercise-access";
import { ensurePersonalExerciseGroup } from "@/lib/exercises/ensure-personal-exercise-group";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

// Persist audio-oefeningen naar een persoonlijke groep:
// download mp3 → Storage → insert exercises met owner_id + Tatoeba-meta.

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function parseTagsCsv(value: string): string[] {
  return value
    .split(",")
    .map((tag) => tag.trim())
    .filter((tag) => tag.length > 0);
}

const persistItemSchema = z.object({
  audio_id: z.number().int().positive(),
  sentence_id: z.number().int().positive(),
  source_text: z.string().min(1),
  target_text: z.string().min(1),
  source_lang: z
    .string()
    .min(2)
    .max(4)
    .regex(/^[a-z]+$/, "lang moet een ISO 639-3 code zijn")
    .default("spa"),
  license: z.string(),
  author: z.string(),
  attribution_url: z.string().optional().default(""),
  tags: z
    .string()
    .min(1)
    .refine((value) => parseTagsCsv(value).length >= 2, {
      message: "Minimaal 2 tags vereist.",
    }),
  alternative_translations: z.array(z.string().min(1)).default([]),
});

const requestSchema = z.object({
  topic: z.string().min(1),
  exercises: z.array(persistItemSchema).min(1).max(30),
});

export type AudioPersistItemResult = {
  audio_id: number;
  status: "inserted" | "skipped_license" | "error";
  exercise_id?: string;
  error?: string;
};

export async function POST(req: Request) {
  let parsedBody: unknown;
  try {
    parsedBody = await req.json();
  } catch {
    return Response.json(
      { ok: false, error: "Body is geen geldige JSON." },
      { status: 400 },
    );
  }

  const parsed = requestSchema.safeParse(parsedBody);
  if (!parsed.success) {
    return Response.json(
      {
        ok: false,
        error: "Validatie mislukt.",
        issues: parsed.error.issues,
      },
      { status: 400 },
    );
  }

  const access = await getExerciseUserAccess();
  if (!access.ok) {
    return Response.json(
      { ok: false, error: "Niet ingelogd." },
      { status: 401 },
    );
  }

  const { topic, exercises } = parsed.data;
  const groupResult = await ensurePersonalExerciseGroup(
    access.supabase,
    access.userId,
    topic,
  );
  if (!groupResult.ok) {
    return Response.json(
      { ok: false, error: groupResult.error },
      { status: 500 },
    );
  }

  const storage = getSupabaseAdmin();
  const results: AudioPersistItemResult[] = [];
  let inserted = 0;

  for (const item of exercises) {
    if (item.license.trim() === "") {
      results.push({
        audio_id: item.audio_id,
        status: "skipped_license",
        error: "Licentie verbiedt hergebruik.",
      });
      continue;
    }

    const binary = await fetchAudioBinary(item.audio_id);
    if (!binary.ok) {
      results.push({
        audio_id: item.audio_id,
        status: "error",
        error: `Audio-download mislukt (${binary.reason}): ${binary.message}`,
      });
      continue;
    }

    const path = `${item.source_lang}/${item.sentence_id}/${item.audio_id}.mp3`;
    const { error: uploadError } = await storage.storage
      .from("tatoeba-audio")
      .upload(path, binary.bytes, {
        contentType: binary.contentType,
        upsert: true,
        metadata: {
          source: "tatoeba",
          audio_id: String(item.audio_id),
          sentence_id: String(item.sentence_id),
          lang: item.source_lang,
          license: item.license,
          author: item.author,
          attribution_url: item.attribution_url ?? "",
          owner_id: access.userId,
        },
      });

    if (uploadError) {
      results.push({
        audio_id: item.audio_id,
        status: "error",
        error: `Bucket-upload mislukt: ${uploadError.message}`,
      });
      continue;
    }

    const { data: insertedRow, error: insertError } = await access.supabase
      .from("exercises")
      .insert({
        source_text: item.source_text,
        target_text: item.target_text,
        topic,
        tags: item.tags,
        alternative_translations: item.alternative_translations,
        owner_id: access.userId,
        group_id: groupResult.groupId,
        source_lang: item.source_lang,
        audio_path: path,
        tatoeba_audio_id: item.audio_id,
        tatoeba_sentence_id: item.sentence_id,
        tatoeba_author: item.author,
        tatoeba_license: item.license,
        tatoeba_attribution_url: item.attribution_url || "",
      })
      .select("id, source_text, target_text, topic, created_at")
      .single();

    if (insertError || !insertedRow) {
      results.push({
        audio_id: item.audio_id,
        status: "error",
        error: `Insert mislukt: ${insertError?.message ?? "onbekend"}`,
      });
      continue;
    }

    inserted += 1;
    results.push({
      audio_id: item.audio_id,
      status: "inserted",
      exercise_id: insertedRow.id as string,
    });
  }

  if (inserted === 0) {
    return Response.json(
      {
        ok: false,
        error: "Geen oefeningen opgeslagen. Controleer licenties of audio.",
        results,
        groupId: groupResult.groupId,
        groupName: topic,
      },
      { status: 422 },
    );
  }

  return Response.json({
    ok: true,
    inserted,
    groupId: groupResult.groupId,
    groupName: topic,
    results,
  });
}
