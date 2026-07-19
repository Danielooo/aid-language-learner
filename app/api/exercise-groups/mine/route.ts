import { getExerciseUserAccess } from "@/lib/exercises/exercise-access";
import {
  latestOfferByGroup,
  resolveGroupOfferState,
  type OfferSubmissionRow,
} from "@/lib/exercises/resolve-group-offer-state";
import { getActiveTopicsForUser } from "@/lib/topics/active-topics";

import type {
  ExerciseGroupListItem,
  ExerciseGroupsFailure,
  ExerciseGroupsListSuccess,
} from "@/types/exercise-groups";

export const dynamic = "force-dynamic";

/**
 * Persoonlijke oefeningengroepen van de ingelogde user,
 * met actief-, offer-, herkomst- en bewerkt-status.
 */
export async function GET(): Promise<Response> {
  const access = await getExerciseUserAccess();
  if (!access.ok) return access.response;

  const [groupsRes, activeTopics, submissionsRes] = await Promise.all([
    access.supabase
      .from("exercise_groups")
      .select("id, name, source_group_id")
      .eq("owner_id", access.userId)
      .order("name", { ascending: true }),
    getActiveTopicsForUser(access.supabase, access.userId),
    access.supabase
      .from("exercise_group_submissions")
      .select(
        "source_group_id, status, created_at, updated_at, reviewed_at, reject_reason",
      )
      .eq("submitted_by", access.userId)
      .in("status", ["pending", "approved", "rejected"]),
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

  const offerByGroup = latestOfferByGroup(
    (submissionsRes.data ?? []) as OfferSubmissionRow[],
  );

  const groups = groupsRes.data ?? [];
  const groupIds = groups.map((g) => g.id as string);
  const countByGroup = new Map<string, number>();
  const tagsByGroup = new Map<string, string>();
  const editedByGroup = new Map<string, boolean>();
  const hasAudioByGroup = new Map<string, boolean>();

  if (groupIds.length > 0) {
    const { data: exerciseRows, error: countError } = await access.supabase
      .from("exercises")
      .select("group_id, tags, target_text_manually_edited, audio_path")
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

      const tags = ((row.tags as string) ?? "").trim();
      if (tags) {
        const prev = tagsByGroup.get(gid);
        tagsByGroup.set(gid, prev ? `${prev} ${tags}` : tags);
      }

      if (row.target_text_manually_edited === true) {
        editedByGroup.set(gid, true);
      }

      if (row.audio_path != null) {
        hasAudioByGroup.set(gid, true);
      }
    }
  }

  const items: ExerciseGroupListItem[] = groups.map((g) => {
    const id = g.id as string;
    const name = (g.name as string).trim();
    const exerciseCount = countByGroup.get(id) ?? 0;
    const latest = offerByGroup.get(id);
    const { offerState, offerStatusAt } = resolveGroupOfferState(
      exerciseCount,
      latest,
    );
    const sourceGroupId = (g.source_group_id as string | null) ?? null;

    return {
      id,
      name,
      exerciseCount,
      isActive: activeTopics.has(name),
      offerState,
      offerStatusAt,
      rejectReason:
        latest?.status === "rejected"
          ? (latest.reject_reason ?? null)
          : null,
      sourceGroupId,
      isEdited: editedByGroup.get(id) ?? false,
      hasAudio: hasAudioByGroup.get(id) ?? false,
      tagText: tagsByGroup.get(id) ?? "",
    };
  });

  return Response.json({
    ok: true,
    groups: items,
  } satisfies ExerciseGroupsListSuccess);
}
