"use client";

import { useAppProfile } from "@/app/(app)/_components/app-profile-provider";
import { AppPageHeader } from "@/app/_components/ui/app-page-header";
import { useExerciseSummaryStats } from "@/lib/dashboard/use-exercise-summary-stats";

export function VoortgangHeader() {
  const { username } = useAppProfile();
  const { stats, loading } = useExerciseSummaryStats();

  return (
    <AppPageHeader
      eyebrow="Persoonlijk overzicht"
      title="Voortgang"
      username={username}
      stats={stats.map((stat) => ({ ...stat, loading }))}
    />
  );
}
