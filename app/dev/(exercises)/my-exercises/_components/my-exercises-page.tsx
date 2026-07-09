"use client";

import Link from "next/link";

import { ExercisesListPage } from "@/app/_components/features/exercises/exercises-list-page";

export function MyExercisesPage() {
  return (
    <ExercisesListPage
      apiBase="/api/dev/my-exercises"
      pagePath="/dev/my-exercises"
      tableScope="my-exercises"
      topicsUrl="/api/dev/my-exercises/topics"
      emptyMessage={
        <>
          Nog geen oefeningen opgeslagen.{" "}
          <Link
            href="/dev/exercise-generator"
            className="font-medium text-accent underline-offset-2 hover:underline"
          >
            Ga naar Genereren
          </Link>{" "}
          om je eerste set te maken.
        </>
      }
    />
  );
}
