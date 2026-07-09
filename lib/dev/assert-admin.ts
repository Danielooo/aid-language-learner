import "server-only";

import { auth0 } from "@/lib/auth0";
import { AUTH0_ROLES_CLAIM } from "@/lib/auth/username";

const ADMIN_ROLE = "admin";

/**
 * Controleert of de ingelogde gebruiker de Auth0 `admin`-rol heeft.
 * Vereist een Auth0 Action die `https://aid-language-learner/roles` in het ID-token zet.
 */
export async function assertAdmin(): Promise<void> {
  const session = await auth0.getSession();
  if (!session) {
    throw new Response(JSON.stringify({ error: "Niet ingelogd." }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const roles = session.user[AUTH0_ROLES_CLAIM];
  const roleList = Array.isArray(roles) ? roles : [];
  if (!roleList.includes(ADMIN_ROLE)) {
    throw new Response(JSON.stringify({ error: "Geen toegang (admin vereist)." }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }
}
