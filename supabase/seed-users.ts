// Idempotente seed-script voor de twee test-users.
// Run met:
//   npx tsx --env-file=.env.local supabase/seed-users.ts
// (Node ≥ 20.6 ondersteunt `--env-file` native; we passeren 'm via tsx
//  omdat het hetzelfde Node-proces is.)
//
// Werking:
//   * Lookup van bestaande auth.users via paginatie (geen
//     `getUserByEmail`-API beschikbaar in v2).
//   * `auth.admin.createUser({ email_confirm: true })` zodat de
//     synthetische `*.aid.local` adressen geen confirmation-mail nodig
//     hebben en de trigger `on_auth_user_created` direct
//     `public.profiles` vult met de meegegeven `user_metadata.username`.
//   * Print de UUID van Danijelooo zodat de backfill (apart) kan zien
//     welk id naar `quiz_attempts.user_id` moet.

import { createClient } from "@supabase/supabase-js";

import {
  DEV_MOCK_ADMIN_EMAIL,
  DEV_MOCK_ADMIN_ID,
  DEV_MOCK_ADMIN_USERNAME,
  DEV_MOCK_USER_EMAIL,
  DEV_MOCK_USER_ID,
  DEV_MOCK_USER_USERNAME,
} from "../lib/dev/dev-identities";

import type { SupabaseClient, User } from "@supabase/supabase-js";

type AdminClient = SupabaseClient;

type SeedUser = {
  id?: string;
  username: string;
  email: string;
};

const SEED_USERS: SeedUser[] = [
  {
    id: DEV_MOCK_USER_ID,
    username: DEV_MOCK_USER_USERNAME,
    email: DEV_MOCK_USER_EMAIL,
  },
  {
    id: DEV_MOCK_ADMIN_ID,
    username: DEV_MOCK_ADMIN_USERNAME,
    email: DEV_MOCK_ADMIN_EMAIL,
  },
  { username: "Danijelooo", email: "danijelooo@aid.local" },
  { username: "Fred", email: "fred@aid.local" },
];

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Env var ${name} ontbreekt. Zet 'm in .env.local.`);
  }
  return value;
}

async function findUserByEmail(
  admin: AdminClient,
  email: string,
): Promise<User | null> {
  // listUsers paginert met perPage (default 50, max 1000). Voor twee
  // seed-users is één pagina ruim voldoende; we lopen door tot we 'm
  // vinden of out of pages zijn.
  let page = 1;
  const perPage = 200;
  // Loop met expliciete cap om een runaway-lookup te voorkomen
  // mocht de auth-server ooit raar pagineren.
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

async function ensureUser(
  admin: AdminClient,
  password: string,
  seed: SeedUser,
): Promise<{ user: User; created: boolean }> {
  const existing = await findUserByEmail(admin, seed.email);
  if (existing) {
    return { user: existing, created: false };
  }

  const { data, error } = await admin.auth.admin.createUser({
    ...(seed.id ? { id: seed.id } : {}),
    email: seed.email,
    password,
    email_confirm: true,
    user_metadata: { username: seed.username },
  });
  if (error || !data.user) {
    throw error ?? new Error("createUser gaf geen user terug.");
  }
  return { user: data.user, created: true };
}

async function main() {
  const url = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
  // Beide key-namen accepteren — `.env.local` heeft historisch de legacy
  // SERVICE_ROLE en de nieuwere SECRET-naam beide gezet.
  const secret =
    process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) {
    throw new Error(
      "Zet SUPABASE_SECRET_KEY of SUPABASE_SERVICE_ROLE_KEY in .env.local.",
    );
  }
  const password = requireEnv("SEED_USER_PASSWORD");

  const admin: AdminClient = createClient(url, secret, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  console.log("Seeden van users:", SEED_USERS.map((s) => s.username).join(", "));

  for (const seed of SEED_USERS) {
    const { user, created } = await ensureUser(admin, password, seed);
    console.log(
      `${created ? "[+]" : "[=]"} ${seed.username.padEnd(12)} ${user.id}  (${seed.email})`,
    );
  }

  console.log(
    "\nKlaar. dev-user/dev-admin UUIDs staan vast in lib/dev/dev-identities.ts.",
  );
}

main().catch((err) => {
  console.error("seed-users.ts faalde:", err);
  process.exit(1);
});
