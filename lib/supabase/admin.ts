import "server-only";

import { createClient } from "@supabase/supabase-js";

import type { SupabaseClient } from "@supabase/supabase-js";

// Service-role client. Omzeilt RLS — gebruik UITSLUITEND in route handlers
// of server-only modules, NOOIT importeren vanuit een client component.
// Gemarkeerd met `import "server-only"` zodat een per-ongeluk import in
// client-bundle een build-error geeft i.p.v. een gelekte secret.
//
// Voor de /dev/exercise-generator playground is dit prima: de tabel
// `dev_exercises` heeft geen user_id en geen RLS. In de productie-feature
// (later) gebruiken we de cookie-based server client met anon key zodat
// RLS de policies afdwingt.

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
