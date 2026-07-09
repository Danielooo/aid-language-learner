import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

import { auth0 } from "@/lib/auth0";
import { DEV_EXERCISE_TOOLS_REQUIRE_AUTH } from "@/lib/dev/exercise-generator-auth";

// Next.js 16 hernoemt `middleware.ts` → `proxy.ts` (zelfde semantiek,
// nieuwe naam — zie docs/01-app/03-api-reference/03-file-conventions/proxy.md).
//
// Drie verantwoordelijkheden:
//   1. Auth0 SDK-routes (`/auth/*`) en rolling Auth0-sessies.
//   2. Supabase cookie-refresh zodat RLS (`auth.uid()`) blijft werken.
//   3. Redirect naar /login bij ontbrekende Auth0-sessie op beschermde routes.

const APP_PAGE_PREFIXES = [
  "/oefenen",
  "/leerplan",
  "/oefeningen",
  "/voortgang",
] as const;

const DEV_PAGE_PREFIXES = DEV_EXERCISE_TOOLS_REQUIRE_AUTH
  ? ([
      "/dev/exercise-generator",
      "/dev/my-exercises",
      "/dev/exercises-quiz",
      "/dev/exercise-generator-quiz",
      "/dev/dashboard",
    ] as const)
  : ([] as const);

const PROTECTED_PAGE_PREFIXES = [...APP_PAGE_PREFIXES, ...DEV_PAGE_PREFIXES];

function isProtectedPagePath(pathname: string): boolean {
  return PROTECTED_PAGE_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

export async function proxy(request: NextRequest) {
  let response = await auth0.middleware(request);
  const { pathname } = request.nextUrl;

  // Auth0 SDK afhandelt login/logout/callback volledig zelf.
  if (pathname.startsWith("/auth")) {
    return response;
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (url && publishableKey) {
    const supabase = createServerClient(url, publishableKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          const merged = NextResponse.next({ request });
          for (const cookie of response.cookies.getAll()) {
            merged.cookies.set(cookie);
          }
          for (const { name, value, options } of cookiesToSet) {
            merged.cookies.set(name, value, options);
          }
          response = merged;
        },
      },
    });

    await supabase.auth.getClaims();
  }

  const session = await auth0.getSession(request);

  if (isProtectedPagePath(pathname) && !session) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    redirectUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(redirectUrl);
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
