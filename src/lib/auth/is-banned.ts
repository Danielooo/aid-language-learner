import type { User } from "@supabase/supabase-js";

/** True als Auth `banned_until` in de toekomst ligt (gedeactiveerd). */
export function isUserBanned(user: User | null | undefined): boolean {
  if (!user?.banned_until) return false;
  return new Date(user.banned_until) > new Date();
}
