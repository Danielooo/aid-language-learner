import "server-only";

import { provisionSupabaseUser } from "@/lib/auth/provision-supabase-user";

import type { SessionData } from "@auth0/nextjs-auth0/types";

/**
 * Auth0-hook: provision Supabase-user vóór het opslaan van de Auth0-sessie.
 */
export async function beforeSessionSaved(
  session: SessionData,
  idToken: string | null,
): Promise<SessionData> {
  void idToken;
  await provisionSupabaseUser(session.user);
  return session;
}
