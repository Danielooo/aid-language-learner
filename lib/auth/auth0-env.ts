import "server-only";

/**
 * Normaliseert AUTH0_DOMAIN: strip scheme/slash en vul .eu.auth0.com aan
 * wanneer alleen de tenant-slug is ingevuld (veelvoorkomende .env-fout).
 */
export function getAuth0Domain(): string {
  const raw = process.env.AUTH0_DOMAIN?.trim();
  if (!raw) {
    throw new Error("AUTH0_DOMAIN ontbreekt in .env.local.");
  }

  let domain = raw.replace(/^https?:\/\//i, "").replace(/\/$/, "");

  if (!domain.includes(".")) {
    const region = process.env.AUTH0_REGION?.trim().toLowerCase() || "eu";
    domain =
      region === "us" ? `${domain}.auth0.com` : `${domain}.${region}.auth0.com`;
  }

  return domain;
}

export function getAuth0TenantSlug(): string {
  return getAuth0Domain().split(".")[0] ?? "";
}

export function getAuth0ClientId(): string {
  const clientId = process.env.AUTH0_CLIENT_ID?.trim();
  if (!clientId) {
    throw new Error("AUTH0_CLIENT_ID ontbreekt in .env.local.");
  }

  const slug = getAuth0TenantSlug();
  if (clientId === slug || clientId === process.env.AUTH0_DOMAIN?.trim()) {
    throw new Error(
      "AUTH0_CLIENT_ID is de tenant-naam, niet de Client ID van je Web Application. " +
        "Kopieer de Client ID uit Auth0 Dashboard → Applications → [Web App] → Settings.",
    );
  }

  return clientId;
}

export function getAuth0ClientSecret(): string {
  const secret = process.env.AUTH0_CLIENT_SECRET?.trim();
  if (!secret) {
    throw new Error("AUTH0_CLIENT_SECRET ontbreekt in .env.local.");
  }
  return secret;
}

export function getAuth0ManagementClientId(): string {
  const clientId = process.env.AUTH0_MANAGEMENT_CLIENT_ID?.trim();
  if (!clientId) {
    throw new Error("AUTH0_MANAGEMENT_CLIENT_ID ontbreekt in .env.local.");
  }
  return clientId;
}

export function getAuth0ManagementClientSecret(): string {
  const secret = process.env.AUTH0_MANAGEMENT_CLIENT_SECRET?.trim();
  if (!secret) {
    throw new Error("AUTH0_MANAGEMENT_CLIENT_SECRET ontbreekt in .env.local.");
  }
  return secret;
}

/** Vangt netwerkfouten van fetch af met een duidelijke Auth0-domeinhint. */
export function rethrowAuth0FetchError(error: unknown, context: string): never {
  const domain = process.env.AUTH0_DOMAIN?.trim() ?? "(leeg)";
  const message = error instanceof Error ? error.message : String(error);

  if (message.toLowerCase().includes("fetch failed")) {
    throw new Error(
      `${context}: kan Auth0 niet bereiken. Controleer AUTH0_DOMAIN (nu: "${domain}"). ` +
        "Gebruik bijv. jouw-tenant.eu.auth0.com zonder https://.",
      { cause: error },
    );
  }

  throw error instanceof Error ? error : new Error(message);
}
