import { z } from "zod";

import { assertAdmin } from "@/lib/auth/assert-admin";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

import type {
  ExerciseGroupSnapshot,
  ExerciseGroupSubmissionRow,
  ExerciseMemberSnapshot,
  GroupSubmissionStatus,
} from "@/types/exercise-group-submission";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const REVIEW_STATUSES = ["pending", "approved", "rejected"] as const;

export type GroupReviewQueueSuccess = {
  ok: true;
  rows: Array<
    ExerciseGroupSubmissionRow & {
      submitter_username: string | null;
    }
  >;
};

export type GroupReviewFailure = { ok: false; error: string };

const idsBodySchema = z.object({
  submission_ids: z.array(z.string().uuid()).min(1).max(50),
});

function exerciseInsertFromSnapshot(
  snapshot: ExerciseMemberSnapshot,
  groupId: string,
  groupName: string,
) {
  return {
    source_text: snapshot.source_text,
    target_text: snapshot.target_text,
    topic: snapshot.topic ?? groupName,
    tags: snapshot.tags ?? "",
    source_lang: snapshot.source_lang,
    audio_path: snapshot.audio_path,
    tatoeba_audio_id: snapshot.tatoeba_audio_id,
    tatoeba_sentence_id: snapshot.tatoeba_sentence_id,
    tatoeba_author: snapshot.tatoeba_author,
    tatoeba_license: snapshot.tatoeba_license,
    tatoeba_attribution_url: snapshot.tatoeba_attribution_url,
    target_text_manually_edited: snapshot.target_text_manually_edited ?? false,
    alternative_translations: snapshot.alternative_translations ?? [],
    owner_id: null,
    group_id: groupId,
  };
}

function parseStatus(raw: string | null): GroupSubmissionStatus | null {
  if (!raw) return "pending";
  if ((REVIEW_STATUSES as readonly string[]).includes(raw)) {
    return raw as GroupSubmissionStatus;
  }
  return null;
}

export async function GET(req: Request): Promise<Response> {
  const auth = await assertAdmin();
  if (!auth.ok) return auth.response;
  const admin = getSupabaseAdmin();

  const status = parseStatus(new URL(req.url).searchParams.get("status"));
  if (!status) {
    return Response.json(
      {
        ok: false,
        error: "Ongeldige status (pending | approved | rejected).",
      } satisfies GroupReviewFailure,
      { status: 400 },
    );
  }

  const ascending = status === "pending";
  const { data, error } = await admin
    .from("exercise_group_submissions")
    .select("*")
    .eq("status", status)
    .order("created_at", { ascending });

  if (error) {
    return Response.json(
      { ok: false, error: error.message } satisfies GroupReviewFailure,
      { status: 500 },
    );
  }

  const rows = (data ?? []) as ExerciseGroupSubmissionRow[];
  const submitterIds = [...new Set(rows.map((r) => r.submitted_by))];

  const usernames = new Map<string, string | null>();
  if (submitterIds.length > 0) {
    const { data: profiles } = await admin
      .from("profiles")
      .select("id, username")
      .in("id", submitterIds);
    for (const p of profiles ?? []) {
      usernames.set(p.id, p.username ?? null);
    }
  }

  return Response.json({
    ok: true,
    rows: rows.map((row) => ({
      ...row,
      submitter_username: usernames.get(row.submitted_by) ?? null,
    })),
  } satisfies GroupReviewQueueSuccess);
}

/**
 * Goedkeuren: copy-on-approve vanuit pending of rejected snapshot.
 */
export async function POST(req: Request): Promise<Response> {
  const auth = await assertAdmin();
  if (!auth.ok) return auth.response;
  const adminUser = auth.user;
  const admin = getSupabaseAdmin();

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json(
      {
        ok: false,
        error: "Body is geen geldige JSON.",
      } satisfies GroupReviewFailure,
      { status: 400 },
    );
  }

  const parse = idsBodySchema.safeParse(body);
  if (!parse.success) {
    return Response.json(
      { ok: false, error: "Validatie mislukt." } satisfies GroupReviewFailure,
      { status: 400 },
    );
  }

  const { submission_ids } = parse.data;
  const errors: string[] = [];
  let approved = 0;

  const { data: submissions, error: fetchError } = await admin
    .from("exercise_group_submissions")
    .select("*")
    .in("id", submission_ids)
    .in("status", ["pending", "rejected"]);

  if (fetchError) {
    return Response.json(
      { ok: false, error: fetchError.message } satisfies GroupReviewFailure,
      { status: 500 },
    );
  }

  const foundIds = new Set((submissions ?? []).map((s) => s.id as string));
  for (const id of submission_ids) {
    if (!foundIds.has(id)) {
      errors.push(`${id}: niet gevonden of niet pending/rejected.`);
    }
  }

  for (const submission of submissions ?? []) {
    const snapshot = submission.snapshot as ExerciseGroupSnapshot;
    const groupName = snapshot.name?.trim();
    const members = Array.isArray(snapshot.exercises) ? snapshot.exercises : [];
    const fromStatus = submission.status as string;

    if (!groupName || members.length === 0) {
      errors.push(`${submission.id}: snapshot mist naam of oefeningen.`);
      continue;
    }

    const { data: createdGroup, error: groupError } = await admin
      .from("exercise_groups")
      .insert({
        name: groupName,
        owner_id: null,
        is_active: true,
      })
      .select("id")
      .maybeSingle();

    if (groupError || !createdGroup) {
      errors.push(
        `${submission.id}: global groep aanmaken mislukt (${groupError?.message ?? "geen id"})`,
      );
      continue;
    }

    const exerciseRows = members.map((member) =>
      exerciseInsertFromSnapshot(member, createdGroup.id, groupName),
    );

    const { error: exercisesError } = await admin
      .from("exercises")
      .insert(exerciseRows);

    if (exercisesError) {
      await admin.from("exercise_groups").delete().eq("id", createdGroup.id);
      errors.push(
        `${submission.id}: oefeningen insert mislukt (${exercisesError.message})`,
      );
      continue;
    }

    const { error: updateError } = await admin
      .from("exercise_group_submissions")
      .update({
        status: "approved",
        reject_reason: null,
        reviewed_by: adminUser.id,
        reviewed_at: new Date().toISOString(),
        resulting_group_id: createdGroup.id,
      })
      .eq("id", submission.id)
      .eq("status", fromStatus);

    if (updateError) {
      await admin.from("exercise_groups").delete().eq("id", createdGroup.id);
      errors.push(`${submission.id}: ${updateError.message}`);
      continue;
    }
    approved += 1;
  }

  return Response.json({
    ok: true,
    approved,
    errors,
  });
}
