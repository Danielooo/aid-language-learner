import { getExerciseUserAccess } from "@/lib/exercises/exercise-access";

import type {
  ExerciseGroupSnapshot,
  ExerciseGroupSubmissionRow,
  GroupSubmissionStatus,
} from "@/types/exercise-group-submission";
import type {
  ExerciseGroupsFailure,
  MyGroupSubmissionListItem,
  MyGroupSubmissionsListSuccess,
} from "@/types/exercise-groups";

export const dynamic = "force-dynamic";

const LIST_STATUSES = ["pending", "approved", "rejected"] as const;

function parseStatus(raw: string | null): GroupSubmissionStatus | null {
  if (!raw) return null;
  if ((LIST_STATUSES as readonly string[]).includes(raw)) {
    return raw as GroupSubmissionStatus;
  }
  return null;
}

/**
 * Eigen community-aanbiedingen gefilterd op status (pending | approved | rejected).
 */
export async function GET(req: Request): Promise<Response> {
  const access = await getExerciseUserAccess();
  if (!access.ok) return access.response;

  const status = parseStatus(new URL(req.url).searchParams.get("status"));
  if (!status) {
    return Response.json(
      {
        ok: false,
        error: "Ongeldige status (pending | approved | rejected).",
      } satisfies ExerciseGroupsFailure,
      { status: 400 },
    );
  }

  const ascending = status === "pending";
  const { data, error } = await access.supabase
    .from("exercise_group_submissions")
    .select(
      "id, source_group_id, status, reject_reason, created_at, updated_at, reviewed_at, snapshot",
    )
    .eq("submitted_by", access.userId)
    .eq("status", status)
    .order("created_at", { ascending });

  if (error) {
    return Response.json(
      { ok: false, error: error.message } satisfies ExerciseGroupsFailure,
      { status: 500 },
    );
  }

  const rows: MyGroupSubmissionListItem[] = (
    (data ?? []) as Pick<
      ExerciseGroupSubmissionRow,
      | "id"
      | "source_group_id"
      | "status"
      | "reject_reason"
      | "created_at"
      | "updated_at"
      | "reviewed_at"
      | "snapshot"
    >[]
  ).map((row) => {
    const snapshot = row.snapshot as ExerciseGroupSnapshot;
    const exercises = Array.isArray(snapshot?.exercises)
      ? snapshot.exercises
      : [];
    return {
      id: row.id,
      source_group_id: row.source_group_id,
      status: row.status,
      reject_reason: row.reject_reason,
      created_at: row.created_at,
      updated_at: row.updated_at,
      reviewed_at: row.reviewed_at,
      name: snapshot?.name?.trim() || "Naamloos",
      exerciseCount: exercises.length,
    };
  });

  return Response.json({
    ok: true,
    rows,
  } satisfies MyGroupSubmissionsListSuccess);
}
