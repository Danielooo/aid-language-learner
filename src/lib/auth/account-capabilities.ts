import { SYNTHETIC_EMAIL_DOMAIN } from "@/lib/auth/username";

import type { User } from "@supabase/supabase-js";

export type OAuthProviderId = "google" | "github";

export type AccountCapabilities = {
  canChangePassword: boolean;
  /** E-mail is altijd read-only in de UI; helpertekst verschilt. */
  emailHelper: string;
  oauthProvider: OAuthProviderId | null;
  usesSyntheticEmail: boolean;
};

const OAUTH_LABELS: Record<OAuthProviderId, string> = {
  google: "Google",
  github: "GitHub",
};

function isOAuthProvider(value: string): value is OAuthProviderId {
  return value === "google" || value === "github";
}

/**
 * Bepaalt wat een gebruiker mag wijzigen op basis van auth identities.
 * Geen password-identity ⇒ SSO; wachtwoord wijzigen is dan niet mogelijk.
 */
export function getAccountCapabilities(user: User): AccountCapabilities {
  const identities = user.identities ?? [];
  const hasPasswordIdentity = identities.some(
    (identity) => identity.provider === "email",
  );

  let oauthProvider: OAuthProviderId | null = null;
  for (const identity of identities) {
    if (isOAuthProvider(identity.provider)) {
      oauthProvider = identity.provider;
      break;
    }
  }

  const usesSyntheticEmail = isSyntheticEmail(user.email);

  let emailHelper: string;
  if (oauthProvider) {
    emailHelper = `Beheerd door ${OAUTH_LABELS[oauthProvider]}.`;
  } else if (usesSyntheticEmail) {
    emailHelper =
      "Je logt in met je gebruikersnaam; dit adres volgt je username.";
  } else {
    emailHelper = "E-mailadres van je account (niet te wijzigen hier).";
  }

  return {
    canChangePassword: hasPasswordIdentity,
    emailHelper,
    oauthProvider,
    usesSyntheticEmail,
  };
}

export function isSyntheticEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return email.toLowerCase().endsWith(`@${SYNTHETIC_EMAIL_DOMAIN}`);
}
