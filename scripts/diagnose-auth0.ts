/**
 * Diagnose Auth0-configuratie (geen secrets in output).
 * Run: npx tsx --env-file=.env.local scripts/diagnose-auth0.ts
 */
import { getAuth0Domain } from "../lib/auth/auth0-env";

async function main() {
  const domain = getAuth0Domain();
  console.log("AUTH0_DOMAIN (genormaliseerd):", domain);

  const managementClientId = process.env.AUTH0_MANAGEMENT_CLIENT_ID?.trim();
  const managementClientSecret = process.env.AUTH0_MANAGEMENT_CLIENT_SECRET?.trim();
  if (!managementClientId || !managementClientSecret) {
    console.error("M2M credentials ontbreken.");
    process.exit(1);
  }

  const tokenRes = await fetch(`https://${domain}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: managementClientId,
      client_secret: managementClientSecret,
      audience: `https://${domain}/api/v2/`,
      grant_type: "client_credentials",
    }),
  });

  if (!tokenRes.ok) {
    console.error("Management token mislukt:", tokenRes.status, await tokenRes.text());
    process.exit(1);
  }

  const { access_token } = (await tokenRes.json()) as { access_token: string };
  const appsRes = await fetch(
    `https://${domain}/api/v2/clients?fields=client_id,name,app_type&include_fields=true&per_page=50`,
    { headers: { Authorization: `Bearer ${access_token}` } },
  );

  if (!appsRes.ok) {
    console.error("Clients ophalen mislukt:", appsRes.status, await appsRes.text());
    console.log("Voeg scope read:clients toe aan je M2M app, of kopieer Client ID handmatig uit het dashboard.");
    process.exit(1);
  }

  const apps = (await appsRes.json()) as Array<{
    client_id: string;
    name: string;
    app_type: string;
  }>;

  console.log("\nAuth0 Applications:");
  for (const app of apps) {
    console.log(`  [${app.app_type}] ${app.name}`);
    console.log(`    AUTH0_CLIENT_ID=${app.client_id}`);
  }

  const webApp = apps.find((a) => a.app_type === "regular_web");
  if (webApp) {
    console.log("\n→ Gebruik voor login (Web App):");
    console.log(`AUTH0_CLIENT_ID=${webApp.client_id}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
