import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

import { ADMIN_ROLE } from "@/lib/auth/is-admin";
import { APP_ROUTES } from "@/lib/routes";

// Next.js 16 hernoemt `middleware.ts` → `proxy.ts` (zelfde semantiek,
// nieuwe naam — zie docs/01-app/03-api-reference/03-file-conventions/proxy.md).
//
// Verantwoordelijkheden:
//   1. Auth-sessie refreshen op elke request → cookies blijven geldig.
//      We gebruiken `getClaims()` (NIET `getUser()`) zodat de JWT
//      lokaal tegen de project-JWKS wordt gevalideerd zonder parallelle
//      refresh-races op API-requests.
//   2. Onauth'd users redirecten op beschermde page-routes.
//      API-routes valideren zelf (assertAdmin / getUser) en geven 401.
//   3. Gedeactiveerde users: ban-check in assertAdmin + app-layout
//      (niet hier — getUser in proxy veroorzaakte 401/500 op admin-API).

const APP_PAGE_PREFIXES = [
  "/oefenen",
  "/leerplan",
  "/community",
  "/generator",
  "/voortgang",
  "/profiel",
  "/admin",
] as const;

const PROTECTED_PAGE_PREFIXES = [...APP_PAGE_PREFIXES];

const LEARNER_ONLY_PREFIXES = [
  "/oefenen",
  "/generator",
  "/leerplan",
  "/community",
  "/voortgang",
] as const;

function isProtectedPagePath(pathname: string): boolean {
  return PROTECTED_PAGE_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

function isLearnerOnlyPath(pathname: string): boolean {
  return LEARNER_ONLY_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

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
    redirectUrl.pathname = APP_ROUTES.login;
    redirectUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(redirectUrl);
  }

  const isAdmin = claims?.app_metadata?.role === ADMIN_ROLE;
  if (isAdmin && isLearnerOnlyPath(pathname)) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = APP_ROUTES.adminBijdragen;
    redirectUrl.search = "";
    return NextResponse.redirect(redirectUrl);
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
