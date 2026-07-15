import { z } from "zod";

import { buildExerciseGlobalSnapshot } from "@/lib/exercises/build-exercise-global-snapshot";
import { getSessionUser } from "@/lib/auth/assert-ai-quota";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import {
  EXERCISE_SELECT_COLUMNS,
  type ExerciseDbRow,
} from "@/lib/exercises/types";

import type { ExerciseGlobalSubmissionRow } from "@/types/exercise-global-submission";

export const dynamic = "force-dynamic";

const submitBodySchema = z.object({
  exercise_ids: z.array(z.string().uuid()).min(1).max(50),
});

export type MySubmissionsListSuccess = {
  ok: true;
  rows: ExerciseGlobalSubmissionRow[];
};

export type SubmitGlobalSuccess = {
  ok: true;
  created: number;
  errors: string[];
};

export type SubmissionsFailure = {
  ok: false;
  error: string;
};

export async function GET(): Promise<Response> {
  const user = await getSessionUser();
  if (!user) {
    return Response.json(
      { ok: false, error: "Niet ingelogd." } satisfies SubmissionsFailure,
      { status: 401 },
    );
  }

  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase
    .from("exercise_global_submissions")
    .select("*")
    .eq("submitted_by", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    return Response.json(
      { ok: false, error: error.message } satisfies SubmissionsFailure,
      { status: 500 },
    );
  }

  return Response.json({
    ok: true,
    rows: (data ?? []) as ExerciseGlobalSubmissionRow[],
  } satisfies MySubmissionsListSuccess);
}

export async function POST(req: Request): Promise<Response> {
  const user = await getSessionUser();
  if (!user) {
    return Response.json(
      { ok: false, error: "Niet ingelogd." } satisfies SubmissionsFailure,
      { status: 401 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json(
      { ok: false, error: "Body is geen geldige JSON." } satisfies SubmissionsFailure,
      { status: 400 },
    );
  }

  const parse = submitBodySchema.safeParse(body);
  if (!parse.success) {
    return Response.json(
      { ok: false, error: "Validatie mislukt." } satisfies SubmissionsFailure,
      { status: 400 },
    );
  }

  const supabase = await getSupabaseServerClient();
  const ids = parse.data.exercise_ids;
  const errors: string[] = [];
  let created = 0;

  const { data: exercises, error: fetchError } = await supabase
    .from("exercises")
    .select(EXERCISE_SELECT_COLUMNS)
    .eq("owner_id", user.id)
    .in("id", ids);

  if (fetchError) {
    return Response.json(
      { ok: false, error: fetchError.message } satisfies SubmissionsFailure,
      { status: 500 },
    );
  }

  const byId = new Map(
    ((exercises ?? []) as ExerciseDbRow[]).map((row) => [row.id, row]),
  );

  for (const id of ids) {
    const row = byId.get(id);
    if (!row) {
      errors.push(`${id}: oefening niet gevonden of niet van jou.`);
      continue;
    }

    const snapshot = buildExerciseGlobalSnapshot(row);
    const { error: insertError } = await supabase
      .from("exercise_global_submissions")
      .insert({
        source_exercise_id: id,
        submitted_by: user.id,
        snapshot,
        status: "pending",
      });

    if (insertError) {
      errors.push(`${id}: ${insertError.message}`);
      continue;
    }
    created += 1;
  }

  return Response.json({
    ok: true,
    created,
    errors,
  } satisfies SubmitGlobalSuccess);
}
