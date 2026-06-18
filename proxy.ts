import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

import { DEV_EXERCISE_TOOLS_REQUIRE_AUTH } from "@/lib/dev/exercise-generator-auth";

// Next.js 16 hernoemt `middleware.ts` → `proxy.ts` (zelfde semantiek,
// nieuwe naam — zie docs/01-app/03-api-reference/03-file-conventions/proxy.md).
//
// Twee verantwoordelijkheden:
//   1. Auth-sessie refreshen op elke request → cookies blijven geldig.
//      We gebruiken `getClaims()` (NIET `getSession()`) zodat de JWT
//      lokaal tegen de project-JWKS wordt gevalideerd; `getSession()`
//      leest cookies zonder validatie en is onveilig voor authz.
//   2. Onauth'd users redirecten als ze een beschermde page-route
//      bezoeken. API-routes valideren zelf en geven 401 terug zodat
//      client-fetches geen redirect-redirect-loop triggeren.
//
// Cookie-flow: `setAll` schrijft naar zowel `request.cookies` (zodat
// downstream Server Components de nieuwe waarde zien) als
// `response.cookies` (zodat de browser de refresh ontvangt). Dit is de
// canonieke @supabase/ssr-pattern voor middleware/proxy.

// TIJDELIJK: leeg zolang DEV_EXERCISE_TOOLS_REQUIRE_AUTH false is.
const PROTECTED_PAGE_PREFIXES = DEV_EXERCISE_TOOLS_REQUIRE_AUTH
  ? ([
      "/dev/exercise-generator",
      "/dev/my-exercises",
      "/dev/exercise-generator-quiz",
      "/dev/dashboard",
    ] as const)
  : ([] as const);

function isProtectedPagePath(pathname: string): boolean {
  return PROTECTED_PAGE_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  // Geen env-keys → niets te valideren; laat de request gewoon door.
  // Beter dan throwen: dan zou een ontbrekende key elke request killen.
  if (!url || !publishableKey) return response;

  const supabase = createServerClient(url, publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims ?? null;

  const { pathname } = request.nextUrl;

  if (isProtectedPagePath(pathname) && !claims) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    redirectUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(redirectUrl);
  }

  return response;
}

export const config = {
  matcher: [
    // Run op alles behalve statische assets en _next interne paden.
    // Image-extensies expliciet uitsluiten zodat de proxy niet bij
    // elke <Image src=...> opnieuw een Supabase-roundtrip doet.
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
