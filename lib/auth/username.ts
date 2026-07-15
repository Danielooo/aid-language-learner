/** Synthetisch e-maildomein voor username-only login (non-routable). */
export const SYNTHETIC_EMAIL_DOMAIN = "aid.local";

export function usernameToEmail(username: string): string {
  return `${username.toLowerCase()}@${SYNTHETIC_EMAIL_DOMAIN}`;
}
