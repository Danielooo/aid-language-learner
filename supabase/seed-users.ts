// Idempotente seed-script voor dev-users en test-credentials (CRED.md).
// Run met: npm run seed:users
//
// Werking:
//   * dev-user / dev-admin: vaste UUIDs + SEED_USER_PASSWORD uit .env.local
//   * testuser / testadmin: willekeurig wachtwoord per run → geschreven naar CRED.md
//   * testuser + dev-user: demo-oefeningen, quiz-pogingen en SRS-voortgang voor dashboard

import { randomBytes } from "node:crypto";
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";

import { createClient } from "@supabase/supabase-js";

import { usernameToEmail } from "../lib/auth/username";
import {
  DEV_MOCK_ADMIN_EMAIL,
  DEV_MOCK_ADMIN_ID,
  DEV_MOCK_ADMIN_USERNAME,
  DEV_MOCK_USER_EMAIL,
  DEV_MOCK_USER_ID,
  DEV_MOCK_USER_USERNAME,
} from "../lib/dev/dev-identities";

import { seedDemoExerciseData } from "./seed-exercise-demo";

import type { SupabaseClient, User } from "@supabase/supabase-js";

type AdminClient = SupabaseClient;

type DevSeedUser = {
  id?: string;
  username: string;
  email: string;
  role?: "admin";
};

type TestSeedUser = {
  username: string;
  role?: "admin";
};

const DEV_SEED_USERS: DevSeedUser[] = [
  {
    id: DEV_MOCK_USER_ID,
    username: DEV_MOCK_USER_USERNAME,
    email: DEV_MOCK_USER_EMAIL,
  },
  {
    id: DEV_MOCK_ADMIN_ID,
    username: DEV_MOCK_ADMIN_USERNAME,
    email: DEV_MOCK_ADMIN_EMAIL,
    role: "admin",
  },
  { username: "Danijelooo", email: "danijelooo@aid.local" },
  { username: "Fred", email: "fred@aid.local" },
];

const TEST_CREDENTIAL_USERS: TestSeedUser[] = [
  { username: "testuser" },
  { username: "testadmin", role: "admin" },
];

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Env var ${name} ontbreekt. Zet 'm in .env.local.`);
  }
  return value;
}

function generatePassword(): string {
  return randomBytes(18).toString("base64url");
}

async function findUserByEmail(
  admin: AdminClient,
  email: string,
): Promise<User | null> {
  let page = 1;
  const perPage = 200;

  for (let i = 0; i < 50; i++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) throw error;
    const match = data.users.find((u) => u.email === email);
    if (match) return match;
    if (data.users.length < perPage) return null;
    page += 1;
  }
  return null;
}

async function ensureDevUser(
  admin: AdminClient,
  password: string,
  seed: DevSeedUser,
): Promise<{ user: User; created: boolean }> {
  const existing = await findUserByEmail(admin, seed.email);
  if (existing) {
    if (seed.role === "admin") {
      await admin.auth.admin.updateUserById(existing.id, {
        app_metadata: { role: "admin" },
      });
    }
    return { user: existing, created: false };
  }

  const { data, error } = await admin.auth.admin.createUser({
    ...(seed.id ? { id: seed.id } : {}),
    email: seed.email,
    password,
    email_confirm: true,
    user_metadata: { username: seed.username },
    ...(seed.role === "admin" ? { app_metadata: { role: "admin" } } : {}),
  });
  if (error || !data.user) {
    throw error ?? new Error("createUser gaf geen user terug.");
  }
  return { user: data.user, created: true };
}

async function ensureTestUser(
  admin: AdminClient,
  seed: TestSeedUser,
): Promise<{ user: User; created: boolean; password: string }> {
  const email = usernameToEmail(seed.username);
  const password = generatePassword();
  const existing = await findUserByEmail(admin, email);

  if (existing) {
    const { error } = await admin.auth.admin.updateUserById(existing.id, {
      password,
      user_metadata: { username: seed.username },
      ...(seed.role === "admin"
        ? { app_metadata: { role: "admin" } }
        : { app_metadata: { role: null } }),
    });
    if (error) throw error;
    return { user: existing, created: false, password };
  }

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { username: seed.username },
    ...(seed.role === "admin" ? { app_metadata: { role: "admin" } } : {}),
  });
  if (error || !data.user) {
    throw error ?? new Error("createUser gaf geen user terug.");
  }
  return { user: data.user, created: true, password };
}

function writeCredMd(
  users: Array<{ username: string; email: string; password: string; role?: "admin" }>,
): void {
  const lines: string[] = [
    "# Test credentials — NIET committen (staat in .gitignore)",
    "",
    "Genereerd door `npm run seed:users`.",
    "Kopieerknoppen: start `npm run dev` en open `/dev/credentials`.",
    "",
  ];

  for (const user of users) {
    lines.push(`## ${user.username}`);
    lines.push(`- Username: \`${user.username}\``);
    lines.push(`- E-mail: \`${user.email}\``);
    lines.push(`- Wachtwoord: \`${user.password}\``);
    if (user.role === "admin") {
      lines.push("- Rol: admin (via Supabase `app_metadata.role`)");
    }
    lines.push("");
  }

  const credPath = resolve(process.cwd(), "CRED.md");
  writeFileSync(credPath, lines.join("\n"), "utf8");
  console.log(`\nCredentials geschreven naar ${credPath}`);
}

async function main() {
  const url = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
  const secret =
    process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) {
    throw new Error(
      "Zet SUPABASE_SECRET_KEY of SUPABASE_SERVICE_ROLE_KEY in .env.local.",
    );
  }
  const devPassword = requireEnv("SEED_USER_PASSWORD");

  const admin: AdminClient = createClient(url, secret, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  console.log(
    "Seeden van dev-users:",
    DEV_SEED_USERS.map((s) => s.username).join(", "),
  );

  for (const seed of DEV_SEED_USERS) {
    const { user, created } = await ensureDevUser(admin, devPassword, seed);
    console.log(
      `${created ? "[+]" : "[=]"} ${seed.username.padEnd(12)} ${user.id}  (${seed.email})`,
    );
  }

  console.log(
    "\nSeeden van test-credentials:",
    TEST_CREDENTIAL_USERS.map((s) => s.username).join(", "),
  );

  const credUsers: Array<{
    username: string;
    email: string;
    password: string;
    role?: "admin";
  }> = [];

  for (const seed of TEST_CREDENTIAL_USERS) {
    const email = usernameToEmail(seed.username);
    const { user, created, password } = await ensureTestUser(admin, seed);
    credUsers.push({ username: seed.username, email, password, role: seed.role });
    console.log(
      `${created ? "[+]" : "[=]"} ${seed.username.padEnd(12)} ${user.id}  (${email})`,
    );
  }

  writeCredMd(credUsers);

  const demoUsers: Array<{ id: string; username: string }> = [
    { id: DEV_MOCK_USER_ID, username: DEV_MOCK_USER_USERNAME },
  ];

  const testuserRow = credUsers.find((u) => u.username === "testuser");
  if (testuserRow) {
    const testuserAuth = await findUserByEmail(
      admin,
      usernameToEmail("testuser"),
    );
    if (testuserAuth) {
      demoUsers.push({ id: testuserAuth.id, username: "testuser" });
    }
  }

  for (const demoUser of demoUsers) {
    await seedDemoExerciseData(admin, demoUser.id, demoUser.username);
  }

  console.log(
    "\nKlaar. Log in op /login met username + wachtwoord uit CRED.md.",
  );
}

main().catch((err) => {
  console.error("seed-users.ts faalde:", err);
  process.exit(1);
});
