import "server-only";

import { getSupabaseAdminKey } from "@/lib/supabase/admin-key";

/**
 * Best-effort: alle Auth-sessies van een user intrekken (refresh tokens).
 * Access-JWT blijft geldig tot expiry — proxy/layout checkt daarom ook banned_until.
 */
export async function revokeAllUserSessions(userId: string): Promise<void> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) return;

  let secretKey: string;
  try {
    secretKey = getSupabaseAdminKey();
  } catch {
    return;
  }

  try {
    await fetch(`${url}/auth/v1/admin/users/${userId}/sessions`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${secretKey}`,
        apikey: secretKey,
      },
    });
  } catch {
    // Ban + proxy-check blijven de harde gate; sessie-revoke is extra.
  }
}
