import { z } from "zod";

import { assertAdmin } from "@/lib/dev/assert-admin";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

import {
  EXERCISE_SELECT_COLUMNS,
  type AdminExerciseRow,
  type ExerciseDbRow,
  getPublicAudioUrl,
  mapDbRowToAdminRow,
} from "../types";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const patchBodySchema = z.object({
  target_text: z.string().min(1).optional(),
  topic: z.string().nullable().optional(),
  tags: z.string().optional(),
  alternative_translations: z.array(z.string().min(1)).optional(),
  target_text_manually_edited: z.boolean().optional(),
});

export type ExercisesAdminPatchSuccess = {
  ok: true;
  row: AdminExerciseRow;
};

export type ExercisesAdminPatchFailure = {
  ok: false;
  error: string;
};

export type ExercisesAdminPatchResponse =
  | ExercisesAdminPatchSuccess
  | ExercisesAdminPatchFailure;

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  await assertAdmin();

  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) {
    return Response.json(
      { ok: false, error: "Ongeldig exercise-id." } satisfies ExercisesAdminPatchFailure,
      { status: 400 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json(
      { ok: false, error: "Body is geen geldige JSON." } satisfies ExercisesAdminPatchFailure,
      { status: 400 },
    );
  }

  const parse = patchBodySchema.safeParse(body);
  if (!parse.success) {
    return Response.json(
      { ok: false, error: "Validatie mislukt." } satisfies ExercisesAdminPatchFailure,
      { status: 400 },
    );
  }

  const patch = parse.data;
  const updates: Record<string, unknown> = { ...patch };

  if (patch.target_text !== undefined && patch.target_text_manually_edited === undefined) {
    updates.target_text_manually_edited = true;
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("exercises")
    .update(updates)
    .eq("id", id)
    .is("owner_id", null)
    .select(EXERCISE_SELECT_COLUMNS)
    .maybeSingle();

  if (error) {
    return Response.json(
      {
        ok: false,
        error: `Update mislukt: ${error.message}`,
      } satisfies ExercisesAdminPatchFailure,
      { status: 500 },
    );
  }

  if (!data) {
    return Response.json(
      { ok: false, error: "Oefening niet gevonden." } satisfies ExercisesAdminPatchFailure,
      { status: 404 },
    );
  }

  const publicUrlForPath = (path: string) => getPublicAudioUrl(supabase, path);
  const row = mapDbRowToAdminRow(data as ExerciseDbRow, publicUrlForPath);

  return Response.json({ ok: true, row } satisfies ExercisesAdminPatchSuccess);
}
