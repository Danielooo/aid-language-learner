import { getExerciseUserAccess } from "@/lib/exercises/exercise-access";

import type {
  ExerciseGroupListItem,
  ExerciseGroupsFailure,
  ExerciseGroupsListSuccess,
} from "@/types/exercise-groups";

export const dynamic = "force-dynamic";

type PersonalCopyRow = {
  id: string;
  name: string | null;
  source_group_id: string | null;
  created_at: string;
};

/**
 * Actieve community-oefeningengroepen voor Overnemen (en legacy clients).
 * Incl. alreadyCopied / copiedAt via source_group_id (fallback: naam) + tagText.
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
      .select("id, name, source_group_id, created_at")
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
  const personalRows = (personalRes.data ?? []) as PersonalCopyRow[];

  const bySourceId = new Map<string, PersonalCopyRow>();
  const byName = new Map<string, PersonalCopyRow>();
  for (const row of personalRows) {
    if (row.source_group_id) {
      bySourceId.set(row.source_group_id, row);
    }
    const name = row.name?.trim();
    if (name && !byName.has(name)) {
      byName.set(name, row);
    }
  }

  const groupIds = groups.map((g) => g.id as string);
  const countByGroup = new Map<string, number>();
  const tagsByGroup = new Map<string, string>();

  if (groupIds.length > 0) {
    const { data: exerciseRows, error: countError } = await access.supabase
      .from("exercises")
      .select("group_id, tags")
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
      const tags = ((row.tags as string) ?? "").trim();
      if (!tags) continue;
      const prev = tagsByGroup.get(gid);
      tagsByGroup.set(gid, prev ? `${prev} ${tags}` : tags);
    }
  }

  const items: ExerciseGroupListItem[] = groups.map((g) => {
    const id = g.id as string;
    const name = (g.name as string).trim();
    const fromSource = bySourceId.get(id);
    const fromName = byName.get(name);
    const match = fromSource ?? fromName;

    return {
      id,
      name,
      exerciseCount: countByGroup.get(id) ?? 0,
      alreadyCopied: Boolean(match),
      copiedAt: match?.created_at ?? null,
      tagText: tagsByGroup.get(id) ?? "",
    };
  });

  return Response.json({
    ok: true,
    groups: items,
  } satisfies ExerciseGroupsListSuccess);
}
