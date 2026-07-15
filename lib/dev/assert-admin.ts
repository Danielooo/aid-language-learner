import "server-only";

import { isAdminUser } from "@/lib/auth/is-admin";
import { getSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Controleert of de ingelogde gebruiker `app_metadata.role === "admin"` heeft.
 */
export async function assertAdmin(): Promise<void> {
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
}
