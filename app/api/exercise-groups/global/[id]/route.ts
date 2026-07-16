import { getExerciseUserAccess } from "@/lib/exercises/exercise-access";

import type {
  ExerciseGroupDetail,
  ExerciseGroupDetailSuccess,
  ExerciseGroupMember,
  ExerciseGroupsFailure,
} from "@/types/exercise-groups";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * Detail van een actieve globale groep inclusief lid-oefeningen.
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

  const [membersRes, personalRes] = await Promise.all([
    access.supabase
      .from("exercises")
      .select("id, source_text, target_text, tags, topic")
      .eq("group_id", id)
      .is("owner_id", null)
      .order("created_at", { ascending: true }),
    access.supabase
      .from("exercise_groups")
      .select("id")
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
  if (personalRes.error) {
    return Response.json(
      {
        ok: false,
        error: personalRes.error.message,
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

  const detail: ExerciseGroupDetail = {
    id: globalGroup.id as string,
    name: groupName,
    exerciseCount: members.length,
    alreadyCopied: Boolean(personalRes.data?.id),
    members,
  };

  return Response.json({
    ok: true,
    group: detail,
  } satisfies ExerciseGroupDetailSuccess);
}
