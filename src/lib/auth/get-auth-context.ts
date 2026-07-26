import "server-only";

import { getSupabaseServerClient } from "@/lib/supabase/server";

export type AuthContext = {
  isAuthenticated: boolean;
  supabaseUserId: string | null;
  username: string | null;
  displayName: string | null;
};

/**
 * Centrale server-helper: Supabase-sessie + profielvelden uit profiles.
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
      displayName: null,
    };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("username, display_name")
    .eq("id", user.id)
    .maybeSingle();

  return {
    isAuthenticated: true,
    supabaseUserId: user.id,
    username: profile?.username ?? null,
    displayName: profile?.display_name ?? null,
  };
}
