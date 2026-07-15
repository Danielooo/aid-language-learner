import { Suspense } from "react";

import { ExercisesAdminPage } from "./_components/exercises-admin-page";

export const dynamic = "force-dynamic";

export default function ExercisesAdminRoutePage() {
  return (
    <div className="space-y-4">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Oefeningen — admin
        </h1>
        <p className="text-sm text-muted-foreground">
          Overzicht van <strong>globale</strong> oefeningen (owner_id null).
          Bewerk, verrijk of verwijder corpus-records. Persoonlijke oefeningen
          van users zijn hier niet zichtbaar.
        </p>
        <p className="text-xs text-muted-foreground">
          Productiebeheer:{" "}
          <code className="font-mono">/admin/oefeningen</code>
        </p>
      </header>

      <Suspense
        fallback={
          <p className="text-xs text-muted-foreground">Dashboard laden...</p>
        }
      >
        <ExercisesAdminPage />
      </Suspense>
    </div>
  );
}
