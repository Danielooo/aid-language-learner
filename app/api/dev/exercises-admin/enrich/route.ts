import { z } from "zod";

import { enrichExercises } from "@/lib/dev/exercises-enrich";
import { assertAdmin } from "@/lib/dev/assert-admin";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MAX_ITEMS = 50;

const inputSchema = z.object({
  exercise_ids: z.array(z.string().uuid()).min(1).max(MAX_ITEMS),
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

  const supabase = await getSupabaseServerClient();
  const result = await enrichExercises({
    supabase,
    exerciseIds: parse.data.exercise_ids,
  });

  if (!result.ok) {
    return Response.json(
      {
        ok: false,
        error: result.error,
        reason: result.reason,
      } satisfies ExercisesAdminEnrichFailure,
      { status: result.status },
    );
  }

  return Response.json({
    ok: true,
    enriched: result.enriched,
    skipped: result.skipped,
  } satisfies ExercisesAdminEnrichSuccess);
}

