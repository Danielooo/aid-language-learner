"use client";

import Link from "next/link";
import { Suspense } from "react";

import { useAppProfile } from "@/app/(app)/_components/app-profile-provider";
import { AppPageHeader } from "@/app/_components/ui/app-page-header";
import { useExerciseSummaryStats } from "@/lib/dashboard/use-exercise-summary-stats";
import { useMyExercisesSummary } from "@/lib/exercises/use-my-exercises-summary";
import { APP_ROUTES } from "@/lib/routes";

import { ExercisesListPage } from "./exercises-list-page";

export function OefeningenPageContent() {
  const { displayLabel } = useAppProfile();
  const { stats: exerciseStats, loading: exerciseLoading } =
    useMyExercisesSummary();
  const { stats: srsStats, loading: srsLoading } = useExerciseSummaryStats();

  const inSchemaStat = srsStats.find((stat) => stat.label === "In schema");
  const stats = [
    ...exerciseStats,
    {
      label: "In schema",
      value: inSchemaStat?.value ?? "—",
      loading: srsLoading || exerciseLoading,
    },
  ];

  return (
    <div className="space-y-6">
      <AppPageHeader
        eyebrow="Mijn materiaal"
        title="Oefeningen"
        accountLabel={displayLabel}
        description="Je eigen opgeslagen oefeningen: bekijk, bewerk of verwijder ze."
        actions={
          <Link
            href={APP_ROUTES.generator}
            className="inline-flex min-h-10 items-center rounded-md bg-accent px-4 text-sm font-medium text-accent-foreground transition-colors hover:bg-accent/90"
          >
            + Genereer nieuwe oefeningen
          </Link>
        }
        stats={stats}
      />

      <Suspense
        fallback={
          <p className="text-xs text-muted-foreground">Oefeningen laden...</p>
        }
      >
        <ExercisesListPage
          apiBase="/api/exercises/mine"
          pagePath="/oefeningen"
          tableScope="my-exercises"
          topicsUrl="/api/exercises/mine/topics"
          emptyMessage={
            <>
              Nog geen oefeningen opgeslagen.{" "}
              <Link
                href={APP_ROUTES.generator}
                className="font-medium text-accent underline-offset-2 hover:underline"
              >
                Ga naar de generator
              </Link>{" "}
              om je eerste set te maken.
            </>
          }
        />
      </Suspense>
    </div>
  );
}
