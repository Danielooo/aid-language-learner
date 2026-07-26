import { getAuthContext } from "@/lib/auth/get-auth-context";
import { getSupabaseServerClient } from "@/lib/supabase/server";

import type { SupabaseClient } from "@supabase/supabase-js";

export type ExerciseUserAccess =
  | {
      ok: true;
      userId: string;
      supabase: SupabaseClient;
    }
  | { ok: false; response: Response };

/**
 * User-context voor quiz-, generator- en oefeningen-API's.
 * Vereist een echte login-sessie.
 */
export async function getExerciseUserAccess(): Promise<ExerciseUserAccess> {
  const { supabaseUserId } = await getAuthContext();
  const serverSupabase = await getSupabaseServerClient();

  if (!supabaseUserId) {
    return {
      ok: false,
      response: Response.json(
        { ok: false, error: "Niet ingelogd." },
        { status: 401 },
      ),
    };
  }

  return {
    ok: true,
    userId: supabaseUserId,
    supabase: serverSupabase,
  };
}
