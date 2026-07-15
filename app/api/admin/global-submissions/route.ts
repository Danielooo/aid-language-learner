import { z } from "zod";

import { assertAdmin } from "@/lib/auth/assert-admin";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

import type {
  ExerciseGlobalSnapshot,
  ExerciseGlobalSubmissionRow,
} from "@/types/exercise-global-submission";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export type ReviewQueueSuccess = {
  ok: true;
  rows: Array<
    ExerciseGlobalSubmissionRow & {
      submitter_username: string | null;
    }
  >;
};

export type ReviewFailure = { ok: false; error: string };

const idsBodySchema = z.object({
  submission_ids: z.array(z.string().uuid()).min(1).max(50),
});

const rejectBodySchema = idsBodySchema.extend({
  reason: z.string().trim().min(1).max(1000),
});

export async function GET(): Promise<Response> {
  await assertAdmin();
  const admin = getSupabaseAdmin();

  const { data, error } = await admin
    .from("exercise_global_submissions")
    .select("*")
    .eq("status", "pending")
    .order("created_at", { ascending: true });

  if (error) {
    return Response.json(
      { ok: false, error: error.message } satisfies ReviewFailure,
      { status: 500 },
    );
  }

  const rows = (data ?? []) as ExerciseGlobalSubmissionRow[];
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
  } satisfies ReviewQueueSuccess);
}

export async function POST(req: Request): Promise<Response> {
  // Approve (bulk). Reject heeft aparte route.
  const adminUser = await assertAdmin();
  const admin = getSupabaseAdmin();

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json(
      { ok: false, error: "Body is geen geldige JSON." } satisfies ReviewFailure,
      { status: 400 },
    );
  }

  const parse = idsBodySchema.safeParse(body);
  if (!parse.success) {
    return Response.json(
      { ok: false, error: "Validatie mislukt." } satisfies ReviewFailure,
      { status: 400 },
    );
  }

  const { submission_ids } = parse.data;
  const errors: string[] = [];
  let approved = 0;

  const { data: submissions, error: fetchError } = await admin
    .from("exercise_global_submissions")
    .select("*")
    .in("id", submission_ids)
    .eq("status", "pending");

  if (fetchError) {
    return Response.json(
      { ok: false, error: fetchError.message } satisfies ReviewFailure,
      { status: 500 },
    );
  }

  for (const submission of submissions ?? []) {
    const snapshot = submission.snapshot as ExerciseGlobalSnapshot;
    const { data: created, error: insertError } = await admin
      .from("exercises")
      .insert({
        source_text: snapshot.source_text,
        target_text: snapshot.target_text,
        topic: snapshot.topic,
        tags: snapshot.tags,
        source_lang: snapshot.source_lang,
        audio_path: snapshot.audio_path,
        tatoeba_audio_id: snapshot.tatoeba_audio_id,
        tatoeba_sentence_id: snapshot.tatoeba_sentence_id,
        tatoeba_author: snapshot.tatoeba_author,
        tatoeba_license: snapshot.tatoeba_license,
        tatoeba_attribution_url: snapshot.tatoeba_attribution_url,
        target_text_manually_edited: snapshot.target_text_manually_edited,
        alternative_translations: snapshot.alternative_translations ?? [],
        owner_id: null,
      })
      .select("id")
      .maybeSingle();

    if (insertError || !created) {
      errors.push(
        `${submission.id}: insert global mislukt (${insertError?.message ?? "geen id"})`,
      );
      continue;
    }

    const { error: updateError } = await admin
      .from("exercise_global_submissions")
      .update({
        status: "approved",
        reviewed_by: adminUser.id,
        reviewed_at: new Date().toISOString(),
        resulting_exercise_id: created.id,
      })
      .eq("id", submission.id)
      .eq("status", "pending");

    if (updateError) {
      errors.push(`${submission.id}: ${updateError.message}`);
      // Best-effort: global hangt; admin kan handmatig opruimen.
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
