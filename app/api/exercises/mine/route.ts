import { z } from "zod";

import { getPublicAudioUrl } from "@/lib/exercises/public-audio-url";
import {
  EXERCISE_SELECT_COLUMNS,
  mapDbRowToAdminRow,
  type ExerciseDbRow,
  type MyExercisesDeleteFailure,
  type MyExercisesDeleteSuccess,
  type MyExercisesListFailure,
  type MyExercisesListSuccess,
} from "@/lib/exercises/types";
import { requireExerciseUser } from "@/lib/exercises/require-exercise-user";

export type {
  MyExercisesDeleteResponse,
  MyExercisesListResponse,
} from "@/lib/exercises/types";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const BUCKET = "tatoeba-audio";

const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(500).default(10),
  sortDir: z.enum(["asc", "desc"]).default("desc"),
  groupId: z.string().uuid().optional(),
  lang: z
    .string()
    .min(2)
    .max(4)
    .regex(/^[a-z]+$/)
    .optional(),
  topic: z.string().min(1).optional(),
  q: z.string().min(1).max(200).optional(),
});

const deleteBodySchema = z.object({
  exercise_ids: z.array(z.string().uuid()).min(1).max(200),
  delete_audio: z.boolean().default(false),
});

export async function GET(req: Request): Promise<Response> {
  const auth = await requireExerciseUser();
  if (!auth.ok) return auth.response;

  const reqUrl = new URL(req.url);
  const parse = listQuerySchema.safeParse({
    page: reqUrl.searchParams.get("page") ?? undefined,
    pageSize: reqUrl.searchParams.get("pageSize") ?? undefined,
    sortDir: reqUrl.searchParams.get("sortDir") ?? undefined,
    groupId: reqUrl.searchParams.get("groupId") ?? undefined,
    lang: reqUrl.searchParams.get("lang") ?? undefined,
    topic: reqUrl.searchParams.get("topic") ?? undefined,
    q: reqUrl.searchParams.get("q") ?? undefined,
  });

  if (!parse.success) {
    return Response.json(
      { ok: false, error: "Validatie mislukt." } satisfies MyExercisesListFailure,
      { status: 400 },
    );
  }

  const { page, pageSize, sortDir, groupId, lang, topic, q } = parse.data;
  const offset = (page - 1) * pageSize;
  const { supabase, userId } = auth;

  let query = supabase
    .from("exercises")
    .select(EXERCISE_SELECT_COLUMNS, { count: "exact" })
    .eq("owner_id", userId)
    .order("created_at", { ascending: sortDir === "asc" });

  if (groupId) {
    query = query.eq("group_id", groupId);
  }
  if (lang) {
    query = query.eq("source_lang", lang);
  }
  if (topic) {
    query = query.eq("topic", topic);
  }
  if (q) {
    const escaped = q.replace(/[%_]/g, "\\$&");
    const pattern = `%${escaped}%`;
    // Cast text[] → text zodat substring-zoeken over alternatieven werkt.
    query = query.or(
      `source_text.ilike.${pattern},target_text.ilike.${pattern},alternative_translations::text.ilike.${pattern}`,
    );
  }

  const { data, error, count } = await query.range(
    offset,
    offset + pageSize - 1,
  );

  if (error) {
    return Response.json(
      {
        ok: false,
        error: `Lijst-query mislukt: ${error.message}`,
      } satisfies MyExercisesListFailure,
      { status: 500 },
    );
  }

  const publicUrlForPath = (path: string) => getPublicAudioUrl(supabase, path);
  const rows = (data ?? []).map((row) =>
    mapDbRowToAdminRow(row as ExerciseDbRow, publicUrlForPath),
  );

  return Response.json({
    ok: true,
    rows,
    total: count ?? rows.length,
    page,
    pageSize,
    fetched_at: new Date().toISOString(),
  } satisfies MyExercisesListSuccess);
}

export async function DELETE(req: Request): Promise<Response> {
  const auth = await requireExerciseUser();
  if (!auth.ok) return auth.response;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json(
      { ok: false, error: "Body is geen geldige JSON." } satisfies MyExercisesDeleteFailure,
      { status: 400 },
    );
  }

  const parse = deleteBodySchema.safeParse(body);
  if (!parse.success) {
    return Response.json(
      { ok: false, error: "Validatie mislukt." } satisfies MyExercisesDeleteFailure,
      { status: 400 },
    );
  }

  const { exercise_ids, delete_audio } = parse.data;
  const { supabase, userId } = auth;
  const errors: string[] = [];
  let audioRemoved = 0;

  if (delete_audio) {
    const { data: rows, error: fetchError } = await supabase
      .from("exercises")
      .select("id, audio_path")
      .eq("owner_id", userId)
      .in("id", exercise_ids);

    if (fetchError) {
      return Response.json(
        {
          ok: false,
          error: `Audio-lookup mislukt: ${fetchError.message}`,
        } satisfies MyExercisesDeleteFailure,
        { status: 500 },
      );
    }

    const paths = (rows ?? [])
      .map((r) => r.audio_path)
      .filter((p): p is string => typeof p === "string" && p.length > 0);

    if (paths.length > 0) {
      const { error: removeError } = await supabase.storage
        .from(BUCKET)
        .remove(paths);
      if (removeError) {
        errors.push(`Storage verwijderen: ${removeError.message}`);
      } else {
        audioRemoved = paths.length;
      }
    }
  }

  const { error: deleteError, count } = await supabase
    .from("exercises")
    .delete({ count: "exact" })
    .eq("owner_id", userId)
    .in("id", exercise_ids);

  if (deleteError) {
    return Response.json(
      {
        ok: false,
        error: `Verwijderen mislukt: ${deleteError.message}`,
      } satisfies MyExercisesDeleteFailure,
      { status: 500 },
    );
  }

  return Response.json({
    ok: true,
    deleted: count ?? exercise_ids.length,
    audio_removed: audioRemoved,
    errors,
  } satisfies MyExercisesDeleteSuccess);
}
