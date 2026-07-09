import type { Auth0TokenResponse } from "@/lib/auth/auth0-constants";
import { PASSWORD_REALM_GRANT } from "@/lib/auth/auth0-constants";

/**
 * Vertaalt Auth0 token-fouten naar actiegerichte meldingen voor username/wachtwoord-login.
 */
export function getPasswordRealmAuthErrorMessage(
  tokenResponse: Auth0TokenResponse,
): string | null {
  if (!tokenResponse.error) return null;

  const description = tokenResponse.error_description ?? "";

  if (
    tokenResponse.error === "unauthorized_client" &&
    (description.includes("password-realm") || description.includes("password"))
  ) {
    return (
      "Username/wachtwoord-login staat niet aan voor je Auth0 Web App. " +
      "Voer `npm run setup:auth0-grants` uit, of schakel in Auth0 Dashboard → " +
      "Applications → [Web App] → Settings → Advanced Settings → Grant Types → " +
      "Password Realm in."
    );
  }

  if (tokenResponse.error === "invalid_grant") {
    return "Username of wachtwoord onjuist.";
  }

  if (tokenResponse.error === "access_denied") {
    return description || "Toegang geweigerd.";
  }

  return description || "Inloggen mislukt.";
}

export { PASSWORD_REALM_GRANT };
export type { Auth0TokenResponse } from "@/lib/auth/auth0-constants";
