import "server-only";

import { isAdminUser } from "@/lib/auth/is-admin";
import { getSupabaseServerClient } from "@/lib/supabase/server";

import type { User } from "@supabase/supabase-js";

/**
 * Controleert of de ingelogde gebruiker `app_metadata.role === "admin"` heeft.
 * Retourneert de user voor audit-velden (reviewed_by, enz.).
 */
export async function assertAdmin(): Promise<User> {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Response(JSON.stringify({ error: "Niet ingelogd." }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!isAdminUser(user)) {
    throw new Response(JSON.stringify({ error: "Geen toegang (admin vereist)." }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }

  return user;
}
