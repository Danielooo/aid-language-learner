import type { User } from "@supabase/supabase-js";

export const ADMIN_ROLE = "admin";

/**
 * True als de user `app_metadata.role === "admin"` heeft.
 * Bron van waarheid is Auth JWT/app_metadata (niet `profiles`).
 */
export function isAdminUser(user: User | null | undefined): boolean {
  return user?.app_metadata?.role === ADMIN_ROLE;
}
