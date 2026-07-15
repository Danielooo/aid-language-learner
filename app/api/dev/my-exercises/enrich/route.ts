import { z } from "zod";

import {
  assertAndConsumeAiQuota,
  getSessionUser,
} from "@/lib/auth/assert-ai-quota";
import { enrichExercises } from "@/lib/dev/exercises-enrich";
import { requireExerciseUser } from "@/lib/dev/require-exercise-user";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MAX_ITEMS = 50;

const inputSchema = z.object({
  exercise_ids: z.array(z.string().uuid()).min(1).max(MAX_ITEMS),
});

export type MyExercisesEnrichSuccess = {
  ok: true;
  enriched: number;
  skipped: number;
};

export type MyExercisesEnrichFailure = {
  ok: false;
  error: string;
  reason?: string;
};

export type MyExercisesEnrichResponse =
  | MyExercisesEnrichSuccess
  | MyExercisesEnrichFailure;

export async function POST(req: Request): Promise<Response> {
  const auth = await requireExerciseUser();
  if (!auth.ok) return auth.response;

  const user = await getSessionUser();
  const quota = await assertAndConsumeAiQuota(user);
  if (!quota.ok) {
    return Response.json(
      {
        ok: false,
        error: quota.error,
        reason: "ai_quota",
      } satisfies MyExercisesEnrichFailure,
      { status: quota.status },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json(
      {
        ok: false,
        error: "Body is geen geldige JSON.",
        reason: "validation",
      } satisfies MyExercisesEnrichFailure,
      { status: 400 },
    );
  }

  const parse = inputSchema.safeParse(body);
  if (!parse.success) {
    return Response.json(
      {
        ok: false,
        error: "Validatie mislukt.",
        reason: "validation",
      } satisfies MyExercisesEnrichFailure,
      { status: 400 },
    );
  }

  const result = await enrichExercises({
    supabase: auth.supabase,
    exerciseIds: parse.data.exercise_ids,
    ownerId: auth.userId,
  });

  if (!result.ok) {
    return Response.json(
      {
        ok: false,
        error: result.error,
        reason: result.reason,
      } satisfies MyExercisesEnrichFailure,
      { status: result.status },
    );
  }

  return Response.json({
    ok: true,
    enriched: result.enriched,
    skipped: result.skipped,
  } satisfies MyExercisesEnrichSuccess);
}
