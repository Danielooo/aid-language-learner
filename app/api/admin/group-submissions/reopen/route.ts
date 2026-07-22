import { z } from "zod";

import { assertAdmin } from "@/lib/auth/assert-admin";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const reopenBodySchema = z.object({
  submission_ids: z.array(z.string().uuid()).min(1).max(50),
});

export type GroupReopenSuccess = {
  ok: true;
  reopened: number;
  errors: string[];
};

export type GroupReopenFailure = { ok: false; error: string };

/**
 * Terugzetten naar pending vanuit approved of rejected.
 * Bij approved: eerst status → pending + clear resulting_group_id,
 * daarna global groep hard verwijderen.
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
      } satisfies GroupReopenFailure,
      { status: 400 },
    );
  }

  const parse = reopenBodySchema.safeParse(body);
  if (!parse.success) {
    return Response.json(
      { ok: false, error: "Validatie mislukt." } satisfies GroupReopenFailure,
      { status: 400 },
    );
  }

  const { submission_ids } = parse.data;
  const errors: string[] = [];
  let reopened = 0;
  const reviewedAt = new Date().toISOString();

  const { data: submissions, error: fetchError } = await admin
    .from("exercise_group_submissions")
    .select("id, status, resulting_group_id, source_group_id")
    .in("id", submission_ids)
    .in("status", ["approved", "rejected"]);

  if (fetchError) {
    return Response.json(
      { ok: false, error: fetchError.message } satisfies GroupReopenFailure,
      { status: 500 },
    );
  }

  const foundIds = new Set((submissions ?? []).map((s) => s.id as string));
  for (const id of submission_ids) {
    if (!foundIds.has(id)) {
      errors.push(`${id}: niet gevonden of niet approved/rejected.`);
    }
  }

  for (const submission of submissions ?? []) {
    const fromStatus = submission.status as string;
    const resultingGroupId = submission.resulting_group_id as string | null;
    const sourceGroupId = submission.source_group_id as string;

    // Unieke pending-index: blokkeer als er al een andere pending bestaat
    const { data: existingPending } = await admin
      .from("exercise_group_submissions")
      .select("id")
      .eq("source_group_id", sourceGroupId)
      .eq("status", "pending")
      .neq("id", submission.id)
      .maybeSingle();

    if (existingPending) {
      errors.push(
        `${submission.id}: er bestaat al een pending aanbieding voor deze groep.`,
      );
      continue;
    }

    const { data: updated, error: updateError } = await admin
      .from("exercise_group_submissions")
      .update({
        status: "pending",
        reject_reason: null,
        reviewed_by: adminUser.id,
        reviewed_at: reviewedAt,
        resulting_group_id: null,
      })
      .eq("id", submission.id)
      .eq("status", fromStatus)
      .select("id")
      .maybeSingle();

    if (updateError) {
      errors.push(`${submission.id}: ${updateError.message}`);
      continue;
    }
    if (!updated) {
      errors.push(`${submission.id}: status gewijzigd door een andere actie.`);
      continue;
    }

    if (resultingGroupId) {
      const { error: deleteError } = await admin
        .from("exercise_groups")
        .delete()
        .eq("id", resultingGroupId)
        .is("owner_id", null);

      if (deleteError) {
        errors.push(
          `${submission.id}: global verwijderen mislukt (${deleteError.message})`,
        );
      }
    }

    reopened += 1;
  }

  return Response.json({
    ok: true,
    reopened,
    errors,
  } satisfies GroupReopenSuccess);
}
