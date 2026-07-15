import { getAuthContext } from "@/lib/auth/get-auth-context";

import { DashboardWithStats } from "@/app/_components/features/dashboard/dashboard";

// Server Component wrapper: header + intro hier, zodat alleen de
// daadwerkelijk-interactieve <Dashboard /> in de client-bundle landt.
// De data zelf komt uit Supabase (`quiz_attempts`) en wordt op de client
// opgehaald via `/api/dev/quiz-attempts`. RLS zorgt dat elke user
// alleen zijn eigen pogingen ziet.
export default async function DashboardPage() {
  // TIJDELIJK: proxy vereist geen sessie zolang DEV_EXERCISE_TOOLS_REQUIRE_AUTH
  // false is; fallback "gast" als er geen profile is.
  const { isAuthenticated, username: profileUsername } = await getAuthContext();
  const username = profileUsername ?? (isAuthenticated ? "jij" : "gast");

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Dashboard — @{username}
        </h1>
        <p className="text-sm text-muted-foreground">
          Overzicht van je SRS-voortgang: op welke stap van het herhaalschema je
          oefeningen staan. Data uit{" "}
          <code className="font-mono text-xs">exercise_progress</code> in Supabase.
        </p>
      </header>

      <DashboardWithStats />
    </div>
  );
}
