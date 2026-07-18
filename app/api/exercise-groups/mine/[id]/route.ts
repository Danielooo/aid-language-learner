import { getExerciseUserAccess } from "@/lib/exercises/exercise-access";
import {
  resolveGroupOfferState,
  type OfferSubmissionRow,
} from "@/lib/exercises/resolve-group-offer-state";

import type {
  ExerciseGroupDetail,
  ExerciseGroupDetailSuccess,
  ExerciseGroupMember,
  ExerciseGroupsDeleteSuccess,
  ExerciseGroupsFailure,
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

  const [membersRes, submissionsRes] = await Promise.all([
    access.supabase
      .from("exercises")
      .select("id, source_text, target_text, tags, topic")
      .eq("group_id", id)
      .eq("owner_id", access.userId)
      .order("created_at", { ascending: true }),
    access.supabase
      .from("exercise_group_submissions")
      .select("source_group_id, status, created_at, updated_at, reviewed_at")
      .eq("source_group_id", id)
      .eq("submitted_by", access.userId)
      .in("status", ["pending", "approved", "rejected"])
      .order("created_at", { ascending: false })
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
  if (submissionsRes.error) {
    return Response.json(
      {
        ok: false,
        error: submissionsRes.error.message,
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

  const latest = submissionsRes.data
    ? (submissionsRes.data as OfferSubmissionRow)
    : undefined;
  const { offerState } = resolveGroupOfferState(members.length, latest);

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

/**
 * Hard-delete: persoonlijke oefeningengroep + cascade op leden/progress,
 * plus topic-voorkeur voor de groepsnaam.
 */
export async function DELETE(
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

  const { error: deleteError } = await access.supabase
    .from("exercise_groups")
    .delete()
    .eq("id", id)
    .eq("owner_id", access.userId);

  if (deleteError) {
    return Response.json(
      {
        ok: false,
        error: deleteError.message,
      } satisfies ExerciseGroupsFailure,
      { status: 500 },
    );
  }

  // Actief-status hangt aan topic-naam (= groepsnaam), niet aan group-id.
  if (groupName) {
    const { error: prefError } = await access.supabase
      .from("user_topic_preferences")
      .delete()
      .eq("user_id", access.userId)
      .eq("topic", groupName);

    if (prefError) {
      return Response.json(
        {
          ok: false,
          error: prefError.message,
        } satisfies ExerciseGroupsFailure,
        { status: 500 },
      );
    }
  }

  return Response.json({
    ok: true,
  } satisfies ExerciseGroupsDeleteSuccess);
}
