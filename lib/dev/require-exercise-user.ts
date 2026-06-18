import { getExerciseUserAccess } from "@/lib/dev/exercise-access";

import type { SupabaseClient } from "@supabase/supabase-js";

export type ExerciseUserContext =
  | { ok: true; userId: string; supabase: SupabaseClient }
  | { ok: false; response: Response };

/** User-context voor my-exercises routes (echte user of dev-mock). */
export async function requireExerciseUser(): Promise<ExerciseUserContext> {
  const access = await getExerciseUserAccess();
  if (!access.ok) return access;
  return {
    ok: true,
    userId: access.userId,
    supabase: access.supabase,
  };
}
