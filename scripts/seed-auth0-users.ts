/**
 * Seed testuser en testadmin via Auth0 Management API + Supabase provisioning.
 *
 * Run: npm run seed:auth0-users
 * Vereist: .env.local met Auth0 + Supabase credentials.
 */
import { randomBytes } from "node:crypto";
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";

import { createClient } from "@supabase/supabase-js";

import { AUTH0_DATABASE_CONNECTION, usernameToEmail } from "../lib/auth/username";

type SeedSpec = {
  username: string;
  role?: "admin";
};

const SEED_USERS: SeedSpec[] = [
  { username: "testuser" },
  { username: "testadmin", role: "admin" },
];

const MANAGEMENT_AUDIENCE = (domain: string) => `https://${domain}/api/v2/`;

/** Scopes voor rol-toewijzing aan testadmin (naast user-scopes in .env.example). */
const ROLE_SCOPES = ["read:roles", "create:role_members"] as const;

type Auth0ManagementUser = {
  user_id: string;
  email?: string;
  app_metadata?: Record<string, unknown>;
  user_metadata?: Record<string, unknown>;
};

function generatePassword(): string {
  return randomBytes(18).toString("base64url");
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Env var ${name} ontbreekt. Zet 'm in .env.local.`);
  }
  return value;
}

async function getManagementToken(): Promise<string> {
  const domain = requireEnv("AUTH0_DOMAIN");
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

async function managementFetch(
  path: string,
  init?: RequestInit,
): Promise<Response> {
  const domain = requireEnv("AUTH0_DOMAIN");
  const token = await getManagementToken();
  return fetch(`https://${domain}/api/v2${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });
}

async function findAuth0UserByEmail(
  email: string,
): Promise<Auth0ManagementUser | null> {
  const res = await managementFetch(
    `/users-by-email?email=${encodeURIComponent(email)}`,
  );
  if (!res.ok) throw new Error(`users-by-email mislukt: ${await res.text()}`);
  const users = (await res.json()) as Auth0ManagementUser[];
  return users[0] ?? null;
}

async function createAuth0User(
  email: string,
  password: string,
  username: string,
): Promise<Auth0ManagementUser> {
  const res = await managementFetch("/users", {
    method: "POST",
    body: JSON.stringify({
      email,
      password,
      connection: AUTH0_DATABASE_CONNECTION,
      email_verified: true,
      user_metadata: { username },
    }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(
      typeof body.message === "string"
        ? body.message
        : `createUser mislukt (${res.status})`,
    );
  }
  return (await res.json()) as Auth0ManagementUser;
}

async function updateAppMetadata(
  userId: string,
  appMetadata: Record<string, unknown>,
): Promise<void> {
  const res = await managementFetch(`/users/${encodeURIComponent(userId)}`, {
    method: "PATCH",
    body: JSON.stringify({ app_metadata: appMetadata }),
  });
  if (!res.ok) throw new Error(`app_metadata update mislukt: ${await res.text()}`);
}

async function assignRole(userId: string, roleId: string): Promise<boolean> {
  const res = await managementFetch(`/users/${encodeURIComponent(userId)}/roles`, {
    method: "POST",
    body: JSON.stringify({ roles: [roleId] }),
  });
  if (res.ok) return true;

  const body = await res.text();
  if (isInsufficientScopeError(body)) {
    console.warn(
      `Rol toewijzen overgeslagen (ontbrekende scope create:role_members). ` +
        `Voeg ${ROLE_SCOPES.join(", ")} toe aan je Auth0 M2M-app.`,
    );
    return false;
  }
  throw new Error(`rol toewijzen mislukt: ${body}`);
}

function isInsufficientScopeError(body: string): boolean {
  return body.includes("insufficient_scope");
}

async function updateAuth0Password(userId: string, password: string): Promise<void> {
  const res = await managementFetch(`/users/${encodeURIComponent(userId)}`, {
    method: "PATCH",
    body: JSON.stringify({ password, connection: AUTH0_DATABASE_CONNECTION }),
  });
  if (!res.ok) throw new Error(`wachtwoord reset mislukt: ${await res.text()}`);
}

async function findRoleByName(name: string): Promise<{ id: string } | null> {
  const res = await managementFetch(`/roles?name_filter=${encodeURIComponent(name)}`);
  if (!res.ok) {
    const body = await res.text();
    if (isInsufficientScopeError(body)) {
      console.warn(
        `Auth0-rollen niet opvraagbaar (ontbrekende scope read:roles). ` +
          `testadmin wordt aangemaakt zonder admin-rol. ` +
          `Voeg ${ROLE_SCOPES.join(", ")} toe aan je M2M-app in Auth0 → Applications → APIs → Auth0 Management API.`,
      );
      return null;
    }
    throw new Error(`rollen ophalen mislukt: ${body}`);
  }
  const roles = (await res.json()) as Array<{ id: string; name: string }>;
  return roles.find((r) => r.name === name) ?? null;
}

async function provisionSupabase(
  admin: ReturnType<typeof createClient>,
  auth0UserId: string,
  username: string,
  email: string,
  existingMetadata: Record<string, unknown>,
): Promise<string> {
  if (
    typeof existingMetadata.supabase_user_id === "string" &&
    existingMetadata.supabase_user_id
  ) {
    return existingMetadata.supabase_user_id;
  }

  const supabasePassword = randomBytes(24).toString("base64url");
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: supabasePassword,
    email_confirm: true,
    user_metadata: { username },
  });

  let supabaseUserId: string;
  if (error) {
    const msg = error.message.toLowerCase();
    if (!msg.includes("already") && !msg.includes("registered")) throw error;
    const { data: listData, error: listError } =
      await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
    if (listError) throw listError;
    const existing = listData.users.find((u) => u.email === email);
    if (!existing) throw error;
    supabaseUserId = existing.id;
  } else if (data.user) {
    supabaseUserId = data.user.id;
  } else {
    throw new Error(`Geen Supabase-user voor ${email}`);
  }

  await updateAppMetadata(auth0UserId, {
    ...existingMetadata,
    supabase_user_id: supabaseUserId,
    supabase_password: supabasePassword,
  });

  return supabaseUserId;
}

async function main() {
  requireEnv("AUTH0_DOMAIN");
  requireEnv("AUTH0_MANAGEMENT_CLIENT_ID");
  requireEnv("AUTH0_MANAGEMENT_CLIENT_SECRET");
  const supabaseUrl = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
  const secret =
    process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) {
    throw new Error(
      "Zet SUPABASE_SECRET_KEY of SUPABASE_SERVICE_ROLE_KEY in .env.local.",
    );
  }

  const admin = createClient(supabaseUrl, secret, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const credLines: string[] = [
    "# Test credentials — NIET committen (staat in .gitignore)",
    "",
    "Genereerd door `npm run seed:auth0-users`.",
    "Kopieerknoppen: start `npm run dev` en open `/dev/credentials`.",
    "",
  ];

  const adminRole = await findRoleByName("admin");

  for (const spec of SEED_USERS) {
    const password = generatePassword();
    const email = usernameToEmail(spec.username);

    let auth0User = await findAuth0UserByEmail(email);
    let created = false;
    if (!auth0User) {
      auth0User = await createAuth0User(email, password, spec.username);
      created = true;
    } else {
      await updateAuth0Password(auth0User.user_id, password);
    }

    const supabaseUserId = await provisionSupabase(
      admin,
      auth0User.user_id,
      spec.username,
      email,
      auth0User.app_metadata ?? {},
    );

    if (spec.role === "admin" && adminRole) {
      await assignRole(auth0User.user_id, adminRole.id);
    }

    console.log(
      `${created ? "[+]" : "[=]"} ${spec.username}  auth0=${auth0User.user_id}  supabase=${supabaseUserId}`,
    );

    credLines.push(`## ${spec.username}`);
    credLines.push(`- Username: \`${spec.username}\``);
    credLines.push(`- E-mail: \`${email}\``);
    credLines.push(`- Wachtwoord: \`${password}\``);
    if (spec.role === "admin") credLines.push(`- Rol: admin`);
    credLines.push("");
  }

  if (!adminRole) {
    credLines.push(
      "> Let op: Auth0-rol `admin` niet gevonden. Maak de rol aan in het Auth0-dashboard.",
      "",
    );
  }

  const credPath = resolve(process.cwd(), "CRED.md");
  writeFileSync(credPath, credLines.join("\n"), "utf8");
  console.log(`\nCredentials geschreven naar ${credPath}`);
}

main().catch((err) => {
  console.error("seed-auth0-users.ts faalde:", err);
  process.exit(1);
});
