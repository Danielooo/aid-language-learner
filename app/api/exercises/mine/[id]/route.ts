import { z } from "zod";

import { getPublicAudioUrl } from "@/lib/exercises/public-audio-url";
import {
  EXERCISE_SELECT_COLUMNS,
  type AdminExerciseRow,
  type ExerciseDbRow,
  mapDbRowToAdminRow,
} from "@/lib/exercises/types";
import { requireExerciseUser } from "@/lib/exercises/require-exercise-user";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const patchBodySchema = z.object({
  source_text: z.string().min(1).optional(),
  target_text: z.string().min(1).optional(),
  topic: z.string().nullable().optional(),
  tags: z.string().optional(),
  alternative_translations: z.array(z.string().min(1)).optional(),
  target_text_manually_edited: z.boolean().optional(),
});

export type MyExercisesPatchSuccess = {
  ok: true;
  row: AdminExerciseRow;
};

export type MyExercisesPatchFailure = {
  ok: false;
  error: string;
};

export type MyExercisesPatchResponse =
  | MyExercisesPatchSuccess
  | MyExercisesPatchFailure;

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const auth = await requireExerciseUser();
  if (!auth.ok) return auth.response;

  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) {
    return Response.json(
      { ok: false, error: "Ongeldig exercise-id." } satisfies MyExercisesPatchFailure,
      { status: 400 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json(
      { ok: false, error: "Body is geen geldige JSON." } satisfies MyExercisesPatchFailure,
      { status: 400 },
    );
  }

  const parse = patchBodySchema.safeParse(body);
  if (!parse.success) {
    return Response.json(
      { ok: false, error: "Validatie mislukt." } satisfies MyExercisesPatchFailure,
      { status: 400 },
    );
  }

  const patch = parse.data;
  const updates: Record<string, unknown> = { ...patch };

  // Markeer handmatige bewerkingen voor leerplan-kolom Bewerkt.
  if (
    patch.target_text_manually_edited === undefined &&
    (patch.source_text !== undefined ||
      patch.target_text !== undefined ||
      patch.tags !== undefined ||
      patch.alternative_translations !== undefined)
  ) {
    updates.target_text_manually_edited = true;
  }

  const { supabase, userId } = auth;
  const { data, error } = await supabase
    .from("exercises")
    .update(updates)
    .eq("id", id)
    .eq("owner_id", userId)
    .select(EXERCISE_SELECT_COLUMNS)
    .maybeSingle();

  if (error) {
    return Response.json(
      {
        ok: false,
        error: `Update mislukt: ${error.message}`,
      } satisfies MyExercisesPatchFailure,
      { status: 500 },
    );
  }

  if (!data) {
    return Response.json(
      { ok: false, error: "Oefening niet gevonden." } satisfies MyExercisesPatchFailure,
      { status: 404 },
    );
  }

  const publicUrlForPath = (path: string) => getPublicAudioUrl(supabase, path);
  const row = mapDbRowToAdminRow(data as ExerciseDbRow, publicUrlForPath);

  return Response.json({ ok: true, row } satisfies MyExercisesPatchSuccess);
}
