import { z } from "zod";

import { assertAdmin } from "@/lib/auth/assert-admin";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const rejectBodySchema = z.object({
  submission_ids: z.array(z.string().uuid()).min(1).max(50),
  reason: z.string().trim().min(1).max(1000),
});

export type RejectSuccess = {
  ok: true;
  rejected: number;
  errors: string[];
};

export type RejectFailure = { ok: false; error: string };

export async function POST(req: Request): Promise<Response> {
  const adminUser = await assertAdmin();
  const admin = getSupabaseAdmin();

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json(
      { ok: false, error: "Body is geen geldige JSON." } satisfies RejectFailure,
      { status: 400 },
    );
  }

  const parse = rejectBodySchema.safeParse(body);
  if (!parse.success) {
    return Response.json(
      { ok: false, error: "Validatie mislukt (reden verplicht)." } satisfies RejectFailure,
      { status: 400 },
    );
  }

  const { submission_ids, reason } = parse.data;
  const errors: string[] = [];
  let rejected = 0;

  for (const id of submission_ids) {
    const { data, error } = await admin
      .from("exercise_global_submissions")
      .update({
        status: "rejected",
        reject_reason: reason,
        reviewed_by: adminUser.id,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("status", "pending")
      .select("id")
      .maybeSingle();

    if (error) {
      errors.push(`${id}: ${error.message}`);
      continue;
    }
    if (!data) {
      errors.push(`${id}: niet gevonden of niet pending.`);
      continue;
    }
    rejected += 1;
  }

  return Response.json({
    ok: true,
    rejected,
    errors,
  } satisfies RejectSuccess);
}
