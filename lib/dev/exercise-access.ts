import { getAuthContext } from "@/lib/auth/get-auth-context";
import { DEV_MOCK_USER_ID } from "@/lib/dev/dev-identities";
import { DEV_EXERCISE_TOOLS_REQUIRE_AUTH } from "@/lib/dev/exercise-generator-auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getSupabaseServerClient } from "@/lib/supabase/server";

import type { SupabaseClient } from "@supabase/supabase-js";

export type ExerciseUserAccess =
  | {
      ok: true;
      userId: string;
      supabase: SupabaseClient;
      /** True wanneer we de vaste dev-user gebruiken i.p.v. een echte sessie. */
      isDevMockUser: boolean;
    }
  | { ok: false; response: Response };

/**
 * User-context voor generator-persist en my-exercises.
 * Echte login wint; anders dev-modus met vaste DEV_MOCK_USER_ID.
 */
export async function getExerciseUserAccess(): Promise<ExerciseUserAccess> {
  const { supabaseUserId } = await getAuthContext();
  const serverSupabase = await getSupabaseServerClient();

  if (supabaseUserId) {
    return {
      ok: true,
      userId: supabaseUserId,
      supabase: serverSupabase,
      isDevMockUser: false,
    };
  }

  if (DEV_EXERCISE_TOOLS_REQUIRE_AUTH) {
    return {
      ok: false,
      response: Response.json({ ok: false, error: "Niet ingelogd." }, { status: 401 }),
    };
  }

  return {
    ok: true,
    userId: DEV_MOCK_USER_ID,
    supabase: getSupabaseAdmin(),
    isDevMockUser: true,
  };
}
