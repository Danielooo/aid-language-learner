import { z } from "zod";

import { assertAdmin } from "@/lib/auth/assert-admin";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const rejectBodySchema = z.object({
  submission_ids: z.array(z.string().uuid()).min(1).max(50),
  reason: z.string().trim().max(1000).optional(),
});

export type GroupRejectSuccess = {
  ok: true;
  rejected: number;
  errors: string[];
};

export type GroupRejectFailure = { ok: false; error: string };

/**
 * Afkeuren vanuit pending of approved.
 * Bij approved: eerst status wijzigen + resulting_group_id clearen,
 * daarna global groep hard verwijderen (exercises cascaden).
 */
export async function POST(req: Request): Promise<Response> {
  const adminUser = await assertAdmin();
  const admin = getSupabaseAdmin();

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json(
      {
        ok: false,
        error: "Body is geen geldige JSON.",
      } satisfies GroupRejectFailure,
      { status: 400 },
    );
  }

  const parse = rejectBodySchema.safeParse(body);
  if (!parse.success) {
    return Response.json(
      {
        ok: false,
        error: "Validatie mislukt.",
      } satisfies GroupRejectFailure,
      { status: 400 },
    );
  }

  const reason = parse.data.reason?.trim() || null;
  const { submission_ids } = parse.data;
  const errors: string[] = [];
  let rejected = 0;
  const reviewedAt = new Date().toISOString();

  const { data: submissions, error: fetchError } = await admin
    .from("exercise_group_submissions")
    .select("id, status, resulting_group_id")
    .in("id", submission_ids)
    .in("status", ["pending", "approved"]);

  if (fetchError) {
    return Response.json(
      { ok: false, error: fetchError.message } satisfies GroupRejectFailure,
      { status: 500 },
    );
  }

  const foundIds = new Set((submissions ?? []).map((s) => s.id as string));
  for (const id of submission_ids) {
    if (!foundIds.has(id)) {
      errors.push(`${id}: niet gevonden of niet pending/approved.`);
    }
  }

  for (const submission of submissions ?? []) {
    const fromStatus = submission.status as string;
    const resultingGroupId = submission.resulting_group_id as string | null;

    const { data: updated, error: updateError } = await admin
      .from("exercise_group_submissions")
      .update({
        status: "rejected",
        reject_reason: reason,
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
        // Submission is al rejected; teller toch ophogen
      }
    }

    rejected += 1;
  }

  return Response.json({
    ok: true,
    rejected,
    errors,
  } satisfies GroupRejectSuccess);
}
