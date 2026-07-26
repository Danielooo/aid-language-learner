import { getRoleCapabilities } from "@/lib/auth/role-capabilities";
import { buildExerciseGroupSnapshot } from "@/lib/exercises/build-exercise-group-snapshot";
import { snapshotsContentEqual } from "@/lib/exercises/compare-exercise-group-snapshots";
import { getExerciseUserAccess } from "@/lib/exercises/exercise-access";
import {
  EXERCISE_SELECT_COLUMNS,
  type ExerciseDbRow,
} from "@/lib/exercises/types";

import type { ExerciseGroupSnapshot } from "@/types/exercise-group-submission";
import type {
  ExerciseGroupSubmitSuccess,
  ExerciseGroupsFailure,
} from "@/types/exercise-groups";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

type RouteContext = { params: Promise<{ id: string }> };

/**
 * Biedt een persoonlijke oefeningengroep aan de community (snapshot + pending).
 * Geen intrekken; opnieuw na reject alleen als de inhoud is gewijzigd.
 */
export async function POST(
  _req: Request,
  context: RouteContext,
): Promise<Response> {
  const access = await getExerciseUserAccess();
  if (!access.ok) return access.response;

  const {
    data: { user },
  } = await access.supabase.auth.getUser();
  const caps = getRoleCapabilities(user);
  if (!caps.canSubmitExerciseForGlobal) {
    return Response.json(
      {
        ok: false,
        error: "Alleen leerlingen kunnen een oefeningengroep aanbieden.",
      } satisfies ExerciseGroupsFailure,
      { status: 403 },
    );
  }

  const { id: groupId } = await context.params;

  const { data: group, error: groupError } = await access.supabase
    .from("exercise_groups")
    .select("id, name, owner_id")
    .eq("id", groupId)
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

  const { data: blocking, error: blockError } = await access.supabase
    .from("exercise_group_submissions")
    .select("id, status")
    .eq("source_group_id", groupId)
    .in("status", ["pending", "approved"])
    .limit(1)
    .maybeSingle();

  if (blockError) {
    return Response.json(
      { ok: false, error: blockError.message } satisfies ExerciseGroupsFailure,
      { status: 500 },
    );
  }
  if (blocking?.status === "pending") {
    return Response.json(
      {
        ok: false,
        error: "Dit topic is al aangeboden en wacht op review.",
      } satisfies ExerciseGroupsFailure,
      { status: 409 },
    );
  }
  if (blocking?.status === "approved") {
    return Response.json(
      {
        ok: false,
        error:
          "Dit topic is al goedgekeurd voor de community en kan niet opnieuw worden aangeboden.",
      } satisfies ExerciseGroupsFailure,
      { status: 409 },
    );
  }

  const { data: members, error: membersError } = await access.supabase
    .from("exercises")
    .select(EXERCISE_SELECT_COLUMNS)
    .eq("group_id", groupId)
    .eq("owner_id", access.userId)
    .order("created_at", { ascending: true });

  if (membersError) {
    return Response.json(
      {
        ok: false,
        error: membersError.message,
      } satisfies ExerciseGroupsFailure,
      { status: 500 },
    );
  }

  const rows = (members ?? []) as ExerciseDbRow[];
  if (rows.length === 0) {
    return Response.json(
      {
        ok: false,
        error: "Een leeg topic kan niet worden aangeboden.",
      } satisfies ExerciseGroupsFailure,
      { status: 400 },
    );
  }

  const snapshot = buildExerciseGroupSnapshot(groupName, rows);

  // Na afkeuring: alleen opnieuw als inhoud t.o.v. die snapshot is gewijzigd.
  const { data: latestRejected, error: rejectedError } = await access.supabase
    .from("exercise_group_submissions")
    .select("snapshot")
    .eq("source_group_id", groupId)
    .eq("submitted_by", access.userId)
    .eq("status", "rejected")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (rejectedError) {
    return Response.json(
      {
        ok: false,
        error: rejectedError.message,
      } satisfies ExerciseGroupsFailure,
      { status: 500 },
    );
  }
  if (latestRejected?.snapshot) {
    const previous = latestRejected.snapshot as ExerciseGroupSnapshot;
    if (snapshotsContentEqual(snapshot, previous)) {
      return Response.json(
        {
          ok: false,
          error:
            "Dit topic is afgekeurd. Pas het eerst aan in je Leerplan voordat je opnieuw aanbiedt.",
        } satisfies ExerciseGroupsFailure,
        { status: 409 },
      );
    }
  }

  const { data: created, error: insertError } = await access.supabase
    .from("exercise_group_submissions")
    .insert({
      source_group_id: groupId,
      submitted_by: access.userId,
      snapshot,
      status: "pending",
    })
    .select("id")
    .maybeSingle();

  if (insertError || !created?.id) {
    return Response.json(
      {
        ok: false,
        error: insertError?.message ?? "Aanbieden mislukt.",
      } satisfies ExerciseGroupsFailure,
      { status: 500 },
    );
  }

  return Response.json({
    ok: true,
    submissionId: created.id as string,
    status: "pending",
  } satisfies ExerciseGroupSubmitSuccess);
}
