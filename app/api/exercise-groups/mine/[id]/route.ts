import { getExerciseUserAccess } from "@/lib/exercises/exercise-access";

import type {
  ExerciseGroupDetail,
  ExerciseGroupDetailSuccess,
  ExerciseGroupMember,
  ExerciseGroupsFailure,
  GroupOfferState,
} from "@/types/exercise-groups";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * Detail van een persoonlijke oefeningengroep van de ingelogde user.
 */
export async function GET(
  _req: Request,
  context: RouteContext,
): Promise<Response> {
  const access = await getExerciseUserAccess();
  if (!access.ok) return access.response;

  const { id } = await context.params;

  const { data: group, error: groupError } = await access.supabase
    .from("exercise_groups")
    .select("id, name")
    .eq("id", id)
    .eq("owner_id", access.userId)
    .maybeSingle();

  if (groupError) {
    return Response.json(
      { ok: false, error: groupError.message } satisfies ExerciseGroupsFailure,
      { status: 500 },
    );
  }
  if (!group) {
    return Response.json(
      {
        ok: false,
        error: "Persoonlijke oefeningengroep niet gevonden.",
      } satisfies ExerciseGroupsFailure,
      { status: 404 },
    );
  }

  const groupName = (group.name as string).trim();

  const [membersRes, blockRes] = await Promise.all([
    access.supabase
      .from("exercises")
      .select("id, source_text, target_text, tags, topic")
      .eq("group_id", id)
      .eq("owner_id", access.userId)
      .order("created_at", { ascending: true }),
    access.supabase
      .from("exercise_group_submissions")
      .select("status")
      .eq("source_group_id", id)
      .in("status", ["pending", "approved"])
      .limit(1)
      .maybeSingle(),
  ]);

  if (membersRes.error) {
    return Response.json(
      {
        ok: false,
        error: membersRes.error.message,
      } satisfies ExerciseGroupsFailure,
      { status: 500 },
    );
  }
  if (blockRes.error) {
    return Response.json(
      {
        ok: false,
        error: blockRes.error.message,
      } satisfies ExerciseGroupsFailure,
      { status: 500 },
    );
  }

  const members: ExerciseGroupMember[] = (membersRes.data ?? []).map((row) => ({
    id: row.id as string,
    source_text: row.source_text as string,
    target_text: row.target_text as string,
    tags: (row.tags as string) ?? "",
    topic: (row.topic as string | null) ?? null,
  }));

  let offerState: GroupOfferState = "available";
  if (members.length === 0) offerState = "empty";
  else if (blockRes.data?.status === "pending") offerState = "pending";
  else if (blockRes.data?.status === "approved") offerState = "approved";

  const detail: ExerciseGroupDetail = {
    id: group.id as string,
    name: groupName,
    exerciseCount: members.length,
    alreadyCopied: true,
    members,
    offerState,
  };

  return Response.json({
    ok: true,
    group: detail,
  } satisfies ExerciseGroupDetailSuccess);
}
