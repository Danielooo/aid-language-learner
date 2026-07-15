"use client";

import { useAppProfile } from "@/app/(app)/_components/app-profile-provider";
import { AppPageHeader } from "@/app/_components/ui/app-page-header";
import { useExerciseSummaryStats } from "@/lib/dashboard/use-exercise-summary-stats";

export function VoortgangHeader() {
  const { displayLabel } = useAppProfile();
  const { stats, loading } = useExerciseSummaryStats();

  return (
    <AppPageHeader
      eyebrow="Persoonlijk overzicht"
      title="Voortgang"
      accountLabel={displayLabel}
      stats={stats.map((stat) => ({ ...stat, loading }))}
    />
  );
}
