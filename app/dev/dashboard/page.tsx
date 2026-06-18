import { getSupabaseServerClient } from "@/lib/supabase/server";

import { Dashboard } from "./_components/dashboard";

// Server Component wrapper: header + intro hier, zodat alleen de
// daadwerkelijk-interactieve <Dashboard /> in de client-bundle landt.
// De data zelf komt uit Supabase (`quiz_attempts`) en wordt op de client
// opgehaald via `/api/dev/quiz-attempts`. RLS zorgt dat elke user
// alleen zijn eigen pogingen ziet.
export default async function DashboardPage() {
  // TIJDELIJK: proxy vereist geen sessie zolang DEV_EXERCISE_TOOLS_REQUIRE_AUTH
  // false is; fallback "gast" als er geen profile is.
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = user
    ? await supabase
        .from("profiles")
        .select("username")
        .eq("id", user.id)
        .maybeSingle()
    : { data: null as { username: string } | null };

  const username = profile?.username ?? (user ? "jij" : "gast");

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Dashboard — @{username}
        </h1>
        <p className="text-sm text-muted-foreground">
          Overzicht van je oefen-historie uit{" "}
          <code className="font-mono text-xs">quiz_attempts</code> in
          Supabase. Trends en zwakke plekken worden berekend over de
          laatste 500 pogingen (default-limiet van{" "}
          <code className="font-mono text-xs">
            GET /api/dev/quiz-attempts
          </code>
          ).
        </p>
      </header>

      <Dashboard />
    </div>
  );
}
