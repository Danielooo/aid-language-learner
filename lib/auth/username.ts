/** Synthetisch e-maildomein voor username-only login (non-routable). */
export const SYNTHETIC_EMAIL_DOMAIN = "aid.local";

/** Auth0 database connection voor username/wachtwoord. */
export const AUTH0_DATABASE_CONNECTION = "Username-Password-Authentication";

/** Custom claim voor RBAC-rollen (Auth0 Action). */
export const AUTH0_ROLES_CLAIM = "https://aid-language-learner/roles";

export function usernameToEmail(username: string): string {
  return `${username.toLowerCase()}@${SYNTHETIC_EMAIL_DOMAIN}`;
}

/**
 * Leid een username af uit Auth0/OAuth-profiel (zelfde logica als migration 0014).
 */
export function deriveUsernameFromAuth0Profile(user: {
  email?: string;
  nickname?: string;
  name?: string;
  user_metadata?: Record<string, unknown>;
}): string {
  const metadata = user.user_metadata ?? {};
  const base =
    (typeof metadata.username === "string" && metadata.username) ||
    (typeof metadata.user_name === "string" && metadata.user_name) ||
    (typeof metadata.preferred_username === "string" &&
      metadata.preferred_username) ||
    user.nickname ||
    user.name ||
    (user.email ? user.email.split("@")[0] : "") ||
    "leerling";

  let sanitized = base
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "-")
    .slice(0, 32);

  if (sanitized.length < 2) {
    sanitized = "leerling";
  }

  return sanitized;
}
