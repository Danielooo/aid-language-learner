import { z } from "zod";

import { getSessionUser } from "@/lib/auth/assert-ai-quota";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export type WithdrawSuccess = { ok: true };
export type WithdrawFailure = { ok: false; error: string };

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const user = await getSessionUser();
  if (!user) {
    return Response.json(
      { ok: false, error: "Niet ingelogd." } satisfies WithdrawFailure,
      { status: 401 },
    );
  }

  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) {
    return Response.json(
      { ok: false, error: "Ongeldig id." } satisfies WithdrawFailure,
      { status: 400 },
    );
  }

  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase
    .from("exercise_global_submissions")
    .update({ status: "withdrawn" })
    .eq("id", id)
    .eq("submitted_by", user.id)
    .eq("status", "pending")
    .select("id")
    .maybeSingle();

  if (error) {
    return Response.json(
      { ok: false, error: error.message } satisfies WithdrawFailure,
      { status: 500 },
    );
  }

  if (!data) {
    return Response.json(
      {
        ok: false,
        error: "Aanbieding niet gevonden of niet meer pending.",
      } satisfies WithdrawFailure,
      { status: 404 },
    );
  }

  return Response.json({ ok: true } satisfies WithdrawSuccess);
}
