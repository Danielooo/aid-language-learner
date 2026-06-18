"use client";

import { ExercisesListPage } from "@/app/dev/_components/exercises-list-page";

export function ExercisesAdminPage() {
  return (
    <ExercisesListPage
      apiBase="/api/dev/exercises-admin"
      pagePath="/dev/exercises-admin"
      tableScope="exercises-admin"
      topicsUrl="/api/dev/tatoeba-audio/existing-topics"
      emptyMessage="Geen oefeningen in de database."
    />
  );
}
