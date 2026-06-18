import { Suspense } from "react";

import { MyExercisesPage } from "./_components/my-exercises-page";

export const dynamic = "force-dynamic";

export default function MyExercisesRoutePage() {
  return (
    <div className="space-y-4">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Mijn oefeningen
        </h1>
        <p className="text-sm text-muted-foreground">
          Overzicht van je eigen opgeslagen oefeningen. Bekijk, bewerk,
          verrijk of verwijder records. Wijzigingen worden direct in de
          database opgeslagen.
        </p>
      </header>

      <Suspense
        fallback={
          <p className="text-xs text-muted-foreground">Oefeningen laden...</p>
        }
      >
        <MyExercisesPage />
      </Suspense>
    </div>
  );
}
