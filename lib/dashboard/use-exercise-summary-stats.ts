"use client";

import { useDashboardStats } from "@/app/_components/features/dashboard/use-dashboard-stats";

function formatStreak(days: number): string {
  if (days === 0) return "0d";
  if (days === 1) return "1d";
  return `${days}d`;
}

/** Gedeelde header-stats: in schema, aan de beurt en streak. */
export function useExerciseSummaryStats() {
  const { stats, loading } = useDashboardStats();

  const totalExercises = stats?.totalExercises.toLocaleString("nl-NL") ?? "—";
  const dueCount = stats?.dueNowCount.toLocaleString("nl-NL") ?? "—";
  const streak = stats != null ? formatStreak(stats.streakDays) : "—";
  const hasDue = (stats?.dueNowCount ?? 0) > 0;

  return {
    loading,
    stats: [
      { label: "In schema", value: totalExercises, loading },
      {
        label: "Aan de beurt",
        value: dueCount,
        accent: hasDue,
        loading,
      },
      { label: "Streak", value: streak, loading },
    ],
  };
}
