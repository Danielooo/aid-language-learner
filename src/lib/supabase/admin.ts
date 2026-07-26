import "server-only";

import { createClient } from "@supabase/supabase-js";

import { getSupabaseAdminKey } from "@/lib/supabase/admin-key";

import type { SupabaseClient } from "@supabase/supabase-js";

// Service-role client. Omzeilt RLS — gebruik UITSLUITEND na assertAdmin
// (of Auth Admin API / Storage zonder authenticated policies).
// Admin-productiepagina's filteren expliciet op owner_id IS NULL;
// geen peep in andermans personal data via deze client zonder filters.
// NOOIT importeren vanuit een client component. `import "server-only"`
// gooit anders een build-error i.p.v. een gelekte secret.

let cached: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient {
  if (cached) return cached;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) {
    throw new Error(
      "Supabase env vars ontbreken. Zet NEXT_PUBLIC_SUPABASE_URL in .env.local.",
    );
  }

  const secretKey = getSupabaseAdminKey();

  cached = createClient(url, secretKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  return cached;
}
