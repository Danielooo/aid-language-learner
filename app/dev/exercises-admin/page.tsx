import { Suspense } from "react";

import { ExercisesAdminPage } from "./_components/exercises-admin-page";
import { DEV_EXERCISE_TOOLS_REQUIRE_AUTH } from "@/lib/dev/exercise-generator-auth";

export const dynamic = "force-dynamic";

export default function ExercisesAdminRoutePage() {
  return (
    <div className="space-y-4">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Oefeningen — admin
        </h1>
        <p className="text-sm text-muted-foreground">
          Overzicht van alle oefeningen in Supabase. Bekijk, bewerk,
          verrijk of verwijder records met server-side paginatie.
          Bewerkingen, verrijking en verwijderen worden direct in de
          database opgeslagen — wijzigingen zijn meteen zichtbaar na
          verversen of na een voltooide actie.
        </p>
        {!DEV_EXERCISE_TOOLS_REQUIRE_AUTH && (
          <p className="text-xs text-muted-foreground">
            Dev-modus · admin-overzicht (alle oefeningen, ongeacht eigenaar)
          </p>
        )}
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
