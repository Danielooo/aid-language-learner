import { getExerciseUserAccess } from "@/lib/exercises/exercise-access";
import { getActiveTopicsForUser } from "@/lib/topics/active-topics";

import type {
  ExerciseGroupListItem,
  ExerciseGroupsFailure,
  ExerciseGroupsListSuccess,
  GroupOfferState,
} from "@/types/exercise-groups";

export const dynamic = "force-dynamic";

/**
 * Persoonlijke oefeningengroepen van de ingelogde user, met actief- + offer-status.
 */
export async function GET(): Promise<Response> {
  const access = await getExerciseUserAccess();
  if (!access.ok) return access.response;

  const [groupsRes, activeTopics, submissionsRes] = await Promise.all([
    access.supabase
      .from("exercise_groups")
      .select("id, name")
      .eq("owner_id", access.userId)
      .order("name", { ascending: true }),
    getActiveTopicsForUser(access.supabase, access.userId),
    access.supabase
      .from("exercise_group_submissions")
      .select("source_group_id, status")
      .eq("submitted_by", access.userId)
      .in("status", ["pending", "approved"]),
  ]);

  if (groupsRes.error) {
    return Response.json(
      { ok: false, error: groupsRes.error.message } satisfies ExerciseGroupsFailure,
      { status: 500 },
    );
  }
  if (submissionsRes.error) {
    return Response.json(
      {
        ok: false,
        error: submissionsRes.error.message,
      } satisfies ExerciseGroupsFailure,
      { status: 500 },
    );
  }

  const offerByGroup = new Map<string, "pending" | "approved">();
  for (const row of submissionsRes.data ?? []) {
    const gid = row.source_group_id as string;
    const status = row.status as "pending" | "approved";
    // approved wint van pending als beide ooit zouden voorkomen
    if (status === "approved" || !offerByGroup.has(gid)) {
      offerByGroup.set(gid, status);
    }
  }

  const groups = groupsRes.data ?? [];
  const groupIds = groups.map((g) => g.id as string);
  const countByGroup = new Map<string, number>();

  if (groupIds.length > 0) {
    const { data: exerciseRows, error: countError } = await access.supabase
      .from("exercises")
      .select("group_id")
      .in("group_id", groupIds)
      .eq("owner_id", access.userId);

    if (countError) {
      return Response.json(
        { ok: false, error: countError.message } satisfies ExerciseGroupsFailure,
        { status: 500 },
      );
    }

    for (const row of exerciseRows ?? []) {
      const gid = row.group_id as string;
      countByGroup.set(gid, (countByGroup.get(gid) ?? 0) + 1);
    }
  }

  const items: ExerciseGroupListItem[] = groups.map((g) => {
    const id = g.id as string;
    const name = (g.name as string).trim();
    const exerciseCount = countByGroup.get(id) ?? 0;
    const blocked = offerByGroup.get(id);

    let offerState: GroupOfferState = "available";
    if (exerciseCount === 0) offerState = "empty";
    else if (blocked === "pending") offerState = "pending";
    else if (blocked === "approved") offerState = "approved";

    return {
      id,
      name,
      exerciseCount,
      isActive: activeTopics.has(name),
      offerState,
    };
  });

  return Response.json({
    ok: true,
    groups: items,
  } satisfies ExerciseGroupsListSuccess);
}
