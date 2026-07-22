import "server-only";

import { isUserBanned } from "@/lib/auth/is-banned";
import { isAdminUser } from "@/lib/auth/is-admin";
import { getSupabaseServerClient } from "@/lib/supabase/server";

import type { User } from "@supabase/supabase-js";

export type AssertAdminResult =
  | { ok: true; user: User }
  | { ok: false; response: Response };

function authError(status: number, error: string): AssertAdminResult {
  return {
    ok: false,
    response: Response.json({ ok: false, error }, { status }),
  };
}

/**
 * Controleert of de ingelogde gebruiker admin is (en niet gedeactiveerd).
 * Retourneert een Result — gooi geen `Response` (Next.js 16 → 500).
 */
export async function assertAdmin(): Promise<AssertAdminResult> {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return authError(401, "Niet ingelogd.");
  }

  if (isUserBanned(user)) {
    return authError(401, "Dit account is gedeactiveerd.");
  }

  if (!isAdminUser(user)) {
    return authError(403, "Geen toegang (admin vereist).");
  }

  return { ok: true, user };
}
