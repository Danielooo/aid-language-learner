import "server-only";

/**
 * Key voor de service-role / admin-client (Auth Admin + RLS bypass).
 *
 * Prefer legacy `SUPABASE_SERVICE_ROLE_KEY` (JWT) boven `SUPABASE_SECRET_KEY`
 * (`sb_secret_…`). supabase-js zet de key in `Authorization: Bearer …`;
 * GoTrue verwacht daar een JWT. Opaque `sb_secret_`-keys geven intermittent
 * `bad_jwt` / `unrecognized JWT kid` op Auth Admin (ban, getUserById, …).
 */
export function getSupabaseAdminKey(): string {
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  const secret = process.env.SUPABASE_SECRET_KEY?.trim();

  if (serviceRole?.startsWith("eyJ")) return serviceRole;
  if (secret) return secret;
  if (serviceRole) return serviceRole;

  throw new Error(
    "Supabase admin-key ontbreekt. Zet SUPABASE_SERVICE_ROLE_KEY of SUPABASE_SECRET_KEY in .env.local.",
  );
}
