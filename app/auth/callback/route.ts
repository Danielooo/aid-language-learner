import { NextResponse } from "next/server";

import { APP_ROUTES } from "@/lib/routes";
import { getSupabaseServerClient } from "@/lib/supabase/server";

// OAuth-callback (PKCE): wisselt de `code` van de provider in voor een
// Supabase-sessie. De SSR-client schrijft de sessie-cookies — dat mag
// hier omdat dit een Route Handler is (geen Server Component).

export const dynamic = "force-dynamic";

function sanitizeNextPath(value: string | null): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return APP_ROUTES.vandaag;
  }
  return value;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = sanitizeNextPath(url.searchParams.get("next"));

  if (code) {
    const supabase = await getSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    // #region agent log
    fetch("http://127.0.0.1:7865/ingest/0922b9b0-9fbf-4ddb-a3a6-2516b9e67588", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Debug-Session-Id": "618d0e",
      },
      body: JSON.stringify({
        sessionId: "618d0e",
        runId: "pre-fix",
        hypothesisId: "E",
        location: "auth/callback/route.ts:exchange",
        message: "OAuth code exchange",
        data: {
          hasCode: true,
          next,
          error: error?.message ?? null,
        },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion

    if (!error) {
      return NextResponse.redirect(new URL(next, url.origin));
    }
  }

  return NextResponse.redirect(
    new URL(`${APP_ROUTES.login}?fout=oauth`, url.origin),
  );
}
