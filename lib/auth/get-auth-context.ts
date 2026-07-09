import "server-only";

import { auth0 } from "@/lib/auth0";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export type AuthContext = {
  isAuthenticated: boolean;
  auth0Sub: string | null;
  supabaseUserId: string | null;
  username: string | null;
};

/**
 * Centrale server-helper: Auth0-sessie + Supabase-user-id + username uit profiles.
 */
export async function getAuthContext(): Promise<AuthContext> {
  const session = await auth0.getSession();
  if (!session) {
    return {
      isAuthenticated: false,
      auth0Sub: null,
      supabaseUserId: null,
      username: null,
    };
  }

  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      isAuthenticated: true,
      auth0Sub: session.user.sub,
      supabaseUserId: null,
      username: null,
    };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("username")
    .eq("id", user.id)
    .maybeSingle();

  return {
    isAuthenticated: true,
    auth0Sub: session.user.sub,
    supabaseUserId: user.id,
    username: profile?.username ?? null,
  };
}
