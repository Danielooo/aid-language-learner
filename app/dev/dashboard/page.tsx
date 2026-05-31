import { Dashboard } from "./_components/dashboard";

// Server Component wrapper: header + intro hier, zodat alleen de
// daadwerkelijk-interactieve <Dashboard /> in de client-bundle landt.
// De data zelf komt uit Supabase (`dev_quiz_attempts`) en wordt op de
// client opgehaald via `/api/dev/quiz-attempts`.
export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Dashboard — jouw prestaties
        </h1>
        <p className="text-sm text-muted-foreground">
          Overzicht van je oefen-historie uit{" "}
          <code className="font-mono text-xs">dev_quiz_attempts</code> in
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
