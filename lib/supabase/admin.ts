import "server-only";

import { createClient } from "@supabase/supabase-js";

import type { SupabaseClient } from "@supabase/supabase-js";

// Service-role client. Omzeilt RLS — gebruik UITSLUITEND voor Auth Admin
// API (signUp confirm, deleteUser, e-mail sync), Storage-writes zonder
// authenticated policies, en seed/MCP-tools. Admin-DB-toegang op user-data
// loopt via de sessie-client + RLS (`public.is_admin()`).
// NOOIT importeren vanuit een client component. `import "server-only"`
// gooit anders een build-error i.p.v. een gelekte secret.
//
// Voor user-data (exercises, quiz_attempts, …) gebruiken we
// [getSupabaseServerClient](./server.ts) — die respecteert RLS via
// de session-cookie van de ingelogde user.

let cached: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient {
  if (cached) return cached;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;

  if (!url || !secretKey) {
    throw new Error(
      "Supabase env vars ontbreken. Zet NEXT_PUBLIC_SUPABASE_URL en SUPABASE_SERVICE_ROLE_KEY in .env.local.",
    );
  }

  cached = createClient(url, secretKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  return cached;
}
