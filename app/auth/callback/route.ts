import { NextResponse } from "next/server";

import { APP_ROUTES } from "@/lib/routes";
import { getSupabaseServerClient } from "@/lib/supabase/server";

// OAuth-callback (PKCE): wisselt de `code` van de provider in voor een
// Supabase-sessie. De SSR-client schrijft de sessie-cookies.

export const dynamic = "force-dynamic";

function sanitizeNextPath(value: string | null): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return APP_ROUTES.oefenen;
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

    if (!error) {
      return NextResponse.redirect(new URL(next, url.origin));
    }
  }

  return NextResponse.redirect(
    new URL(`${APP_ROUTES.login}?fout=oauth`, url.origin),
  );
}
