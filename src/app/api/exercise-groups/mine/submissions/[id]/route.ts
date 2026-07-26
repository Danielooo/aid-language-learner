import { getExerciseUserAccess } from "@/lib/exercises/exercise-access";

import type { ExerciseGroupSubmissionRow } from "@/types/exercise-group-submission";
import type {
  ExerciseGroupsFailure,
  MyGroupSubmissionDetailSuccess,
} from "@/types/exercise-groups";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * Detail van één eigen community-aanbieding (snapshot voor modal).
 */
export async function GET(
  _req: Request,
  context: RouteContext,
): Promise<Response> {
  const access = await getExerciseUserAccess();
  if (!access.ok) return access.response;

  const { id } = await context.params;

  const { data, error } = await access.supabase
    .from("exercise_group_submissions")
    .select(
      "id, source_group_id, status, reject_reason, created_at, updated_at, reviewed_at, resulting_group_id, snapshot",
    )
    .eq("id", id)
    .eq("submitted_by", access.userId)
    .maybeSingle();

  if (error) {
    return Response.json(
      { ok: false, error: error.message } satisfies ExerciseGroupsFailure,
      { status: 500 },
    );
  }
  if (!data) {
    return Response.json(
      {
        ok: false,
        error: "Aanbieding niet gevonden.",
      } satisfies ExerciseGroupsFailure,
      { status: 404 },
    );
  }

  const row = data as Pick<
    ExerciseGroupSubmissionRow,
    | "id"
    | "source_group_id"
    | "status"
    | "reject_reason"
    | "created_at"
    | "updated_at"
    | "reviewed_at"
    | "resulting_group_id"
    | "snapshot"
  >;

  return Response.json({
    ok: true,
    row: {
      id: row.id,
      source_group_id: row.source_group_id,
      status: row.status,
      reject_reason: row.reject_reason,
      created_at: row.created_at,
      updated_at: row.updated_at,
      reviewed_at: row.reviewed_at,
      resulting_group_id: row.resulting_group_id,
      snapshot: row.snapshot,
    },
  } satisfies MyGroupSubmissionDetailSuccess);
}
