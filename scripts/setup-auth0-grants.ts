/**
 * Schakelt password-realm login in op de Auth0 Web Application.
 *
 * Run: npm run setup:auth0-grants
 * Vereist M2M-scopes: read:clients, update:clients
 */
import { PASSWORD_REALM_GRANT } from "../lib/auth/auth0-constants";
import { AUTH0_DATABASE_CONNECTION } from "../lib/auth/username";

const MANAGEMENT_AUDIENCE = (domain: string) => `https://${domain}/api/v2/`;

function getAuth0Domain(): string {
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

type Auth0Client = {
  client_id: string;
  name: string;
  grant_types?: string[];
  web_origins?: string[];
  callbacks?: string[];
};

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Env var ${name} ontbreekt. Zet 'm in .env.local.`);
  }
  return value;
}

async function getManagementToken(domain: string): Promise<string> {
  const clientId = requireEnv("AUTH0_MANAGEMENT_CLIENT_ID");
  const clientSecret = requireEnv("AUTH0_MANAGEMENT_CLIENT_SECRET");

  const res = await fetch(`https://${domain}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      audience: MANAGEMENT_AUDIENCE(domain),
      grant_type: "client_credentials",
    }),
  });

  if (!res.ok) {
    throw new Error(`Management token mislukt: ${res.status} ${await res.text()}`);
  }

  const data = (await res.json()) as { access_token: string };
  return data.access_token;
}

function printManualInstructions(webClientId: string, appBaseUrl: string): void {
  console.log(`
Handmatige Auth0-configuratie (als M2M-scopes ontbreken):

1. Auth0 Dashboard → Applications → je Web App (${webClientId})
2. Settings → Advanced Settings → Grant Types
3. Vink aan: Password Realm (${PASSWORD_REALM_GRANT})
4. Tab Application URIs → Allowed Web Origins: voeg toe ${appBaseUrl}
5. Save Changes

M2M-scopes voor dit script:
  Applications → [M2M app] → APIs → Auth0 Management API
  → read:clients, update:clients
`);
}

async function testPasswordRealmLogin(
  domain: string,
  clientId: string,
  clientSecret: string,
): Promise<boolean> {
  const res = await fetch(`https://${domain}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      grant_type: PASSWORD_REALM_GRANT,
      username: "probe@aid.local",
      password: "probe",
      realm: AUTH0_DATABASE_CONNECTION,
      client_id: clientId,
      client_secret: clientSecret,
      scope: "openid profile email offline_access",
    }),
  });

  const body = (await res.json()) as { error?: string; error_description?: string };
  if (body.error === "unauthorized_client") return false;
  // invalid_grant = grant staat aan, credentials kloppen niet (verwacht voor probe-user)
  return body.error !== "unauthorized_client";
}

async function main() {
  const domain = getAuth0Domain();
  const webClientId = requireEnv("AUTH0_CLIENT_ID");
  const webClientSecret = requireEnv("AUTH0_CLIENT_SECRET");
  const appBaseUrl = process.env.APP_BASE_URL?.trim() || "http://localhost:3000";

  const alreadyEnabled = await testPasswordRealmLogin(
    domain,
    webClientId,
    webClientSecret,
  );
  if (alreadyEnabled) {
    console.log("Password-realm login staat al aan voor AUTH0_CLIENT_ID.");
    return;
  }

  const token = await getManagementToken(domain);
  const clientRes = await fetch(
    `https://${domain}/api/v2/clients/${encodeURIComponent(webClientId)}?fields=client_id,name,grant_types,web_origins,callbacks`,
    { headers: { Authorization: `Bearer ${token}` } },
  );

  if (!clientRes.ok) {
    console.error("Web app ophalen mislukt:", clientRes.status, await clientRes.text());
    printManualInstructions(webClientId, appBaseUrl);
    process.exit(1);
  }

  const client = (await clientRes.json()) as Auth0Client;
  const grantTypes = new Set(client.grant_types ?? []);
  grantTypes.add(PASSWORD_REALM_GRANT);
  if (!grantTypes.has("refresh_token")) {
    grantTypes.add("refresh_token");
  }

  const webOrigins = new Set(client.web_origins ?? []);
  webOrigins.add(appBaseUrl);

  const patchRes = await fetch(
    `https://${domain}/api/v2/clients/${encodeURIComponent(webClientId)}`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        grant_types: [...grantTypes],
        web_origins: [...webOrigins],
        cross_origin_auth: true,
      }),
    },
  );

  if (!patchRes.ok) {
    console.error("Web app bijwerken mislukt:", patchRes.status, await patchRes.text());
    printManualInstructions(webClientId, appBaseUrl);
    process.exit(1);
  }

  const enabled = await testPasswordRealmLogin(domain, webClientId, webClientSecret);
  if (!enabled) {
    console.error(
      "Patch geslaagd, maar password-realm login werkt nog niet. Controleer tenant-instellingen.",
    );
    printManualInstructions(webClientId, appBaseUrl);
    process.exit(1);
  }

  console.log(`Password-realm login ingeschakeld voor "${client.name}".`);
  console.log(`Allowed Web Origins bevat nu ${appBaseUrl}.`);
}

main().catch((err) => {
  console.error("setup-auth0-grants.ts faalde:", err);
  process.exit(1);
});
