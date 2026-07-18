import { getExerciseUserAccess } from "@/lib/exercises/exercise-access";

import type {
  ExerciseGroupDetail,
  ExerciseGroupDetailSuccess,
  ExerciseGroupMember,
  ExerciseGroupsFailure,
} from "@/types/exercise-groups";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

type PersonalCopyRow = {
  id: string;
  created_at: string;
};

/**
 * Detail van een actieve community-groep inclusief lid-oefeningen.
 */
export async function GET(
  _req: Request,
  context: RouteContext,
): Promise<Response> {
  const access = await getExerciseUserAccess();
  if (!access.ok) return access.response;

  const { id } = await context.params;

  const { data: globalGroup, error: groupError } = await access.supabase
    .from("exercise_groups")
    .select("id, name")
    .eq("id", id)
    .is("owner_id", null)
    .eq("is_active", true)
    .maybeSingle();

  if (groupError) {
    return Response.json(
      { ok: false, error: groupError.message } satisfies ExerciseGroupsFailure,
      { status: 500 },
    );
  }
  if (!globalGroup) {
    return Response.json(
      {
        ok: false,
        error: "Community-oefeningengroep niet gevonden of niet actief.",
      } satisfies ExerciseGroupsFailure,
      { status: 404 },
    );
  }

  const groupName = (globalGroup.name as string).trim();

  const [membersRes, bySourceRes, byNameRes] = await Promise.all([
    access.supabase
      .from("exercises")
      .select("id, source_text, target_text, tags, topic")
      .eq("group_id", id)
      .is("owner_id", null)
      .order("created_at", { ascending: true }),
    access.supabase
      .from("exercise_groups")
      .select("id, created_at")
      .eq("owner_id", access.userId)
      .eq("source_group_id", id)
      .maybeSingle(),
    access.supabase
      .from("exercise_groups")
      .select("id, created_at")
      .eq("owner_id", access.userId)
      .eq("name", groupName)
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
  if (bySourceRes.error) {
    return Response.json(
      {
        ok: false,
        error: bySourceRes.error.message,
      } satisfies ExerciseGroupsFailure,
      { status: 500 },
    );
  }
  if (byNameRes.error) {
    return Response.json(
      {
        ok: false,
        error: byNameRes.error.message,
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

  const match =
    (bySourceRes.data as PersonalCopyRow | null) ??
    (byNameRes.data as PersonalCopyRow | null);

  const detail: ExerciseGroupDetail = {
    id: globalGroup.id as string,
    name: groupName,
    exerciseCount: members.length,
    alreadyCopied: Boolean(match?.id),
    copiedAt: match?.created_at ?? null,
    members,
  };

  return Response.json({
    ok: true,
    group: detail,
  } satisfies ExerciseGroupDetailSuccess);
}
