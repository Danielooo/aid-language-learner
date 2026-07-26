import "server-only";

import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

import type { SupabaseClient } from "@supabase/supabase-js";

// SSR-cookie client voor Server Components, Server Actions en Route
// Handlers. Elke request krijgt een eigen instance: `cookies()` is per
// request gebonden, dus we kunnen het resultaat niet cachen op modul-
// niveau (zou cross-user cookies geven).
//
// `getClaims()` of `getUser()` is de enige veilige manier om autorisatie-
// beslissingen te nemen — `getSession()` leest cookies zonder validatie.
//
// Server Components mogen geen cookies schrijven; in dat geval gooit
// `cookieStore.set` een fout. We vangen 'm omdat de proxy dezelfde
// refresh-cyclus afhandelt op elke request (zie [proxy.ts](proxy.ts)).
export async function getSupabaseServerClient(): Promise<SupabaseClient> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !publishableKey) {
    throw new Error(
      "Supabase env vars ontbreken. Zet NEXT_PUBLIC_SUPABASE_URL en NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY in .env.local.",
    );
  }

  const cookieStore = await cookies();

  return createServerClient(url, publishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // In een Server Component kunnen we geen cookies schrijven;
          // `proxy.ts` doet dat wel op elke request via getClaims().
        }
      },
    },
  });
}
