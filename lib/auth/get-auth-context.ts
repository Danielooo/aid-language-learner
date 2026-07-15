import "server-only";

import { getSupabaseServerClient } from "@/lib/supabase/server";

export type AuthContext = {
  isAuthenticated: boolean;
  supabaseUserId: string | null;
  username: string | null;
};

/**
 * Centrale server-helper: Supabase-sessie + username uit profiles.
 */
export async function getAuthContext(): Promise<AuthContext> {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      isAuthenticated: false,
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
    supabaseUserId: user.id,
    username: profile?.username ?? null,
  };
}
