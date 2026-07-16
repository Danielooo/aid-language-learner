import { getExerciseUserAccess } from "@/lib/exercises/exercise-access";

import type {
  ExerciseGroupListItem,
  ExerciseGroupsFailure,
  ExerciseGroupsListSuccess,
} from "@/types/exercise-groups";

export const dynamic = "force-dynamic";

/**
 * Actieve globale oefeningengroepen voor het leerplan.
 */
export async function GET(): Promise<Response> {
  const access = await getExerciseUserAccess();
  if (!access.ok) return access.response;

  const [groupsRes, personalRes] = await Promise.all([
    access.supabase
      .from("exercise_groups")
      .select("id, name")
      .is("owner_id", null)
      .eq("is_active", true)
      .order("name", { ascending: true }),
    access.supabase
      .from("exercise_groups")
      .select("name")
      .eq("owner_id", access.userId),
  ]);

  if (groupsRes.error) {
    return Response.json(
      { ok: false, error: groupsRes.error.message } satisfies ExerciseGroupsFailure,
      { status: 500 },
    );
  }
  if (personalRes.error) {
    return Response.json(
      {
        ok: false,
        error: personalRes.error.message,
      } satisfies ExerciseGroupsFailure,
      { status: 500 },
    );
  }

  const groups = groupsRes.data ?? [];
  const personalNames = new Set(
    (personalRes.data ?? [])
      .map((row) => (row.name as string | null)?.trim())
      .filter((name): name is string => Boolean(name)),
  );

  const groupIds = groups.map((g) => g.id as string);
  const countByGroup = new Map<string, number>();

  if (groupIds.length > 0) {
    const { data: exerciseRows, error: countError } = await access.supabase
      .from("exercises")
      .select("group_id")
      .in("group_id", groupIds);

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
    const name = (g.name as string).trim();
    return {
      id: g.id as string,
      name,
      exerciseCount: countByGroup.get(g.id as string) ?? 0,
      alreadyCopied: personalNames.has(name),
    };
  });

  return Response.json({
    ok: true,
    groups: items,
  } satisfies ExerciseGroupsListSuccess);
}
