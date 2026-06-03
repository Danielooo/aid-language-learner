"use client";

import { createBrowserClient } from "@supabase/ssr";

import type { SupabaseClient } from "@supabase/supabase-js";

// Browser-singleton. `createBrowserClient` cacht intern al, maar we
// houden 'm hier nog eens vast zodat hot-reload-cycles in dev niet
// elke render een nieuwe client maken (en bijbehorende auth-listener).

let cached: SupabaseClient | null = null;

export function getSupabaseBrowserClient(): SupabaseClient {
  if (cached) return cached;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !publishableKey) {
    throw new Error(
      "Supabase env vars ontbreken. Zet NEXT_PUBLIC_SUPABASE_URL en NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY in .env.local.",
    );
  }

  cached = createBrowserClient(url, publishableKey);
  return cached;
}
