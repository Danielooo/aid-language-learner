"use client";

import { AccuracyPieChart } from "./accuracy-pie-chart";
import { ActivityCalendarChart } from "./activity-calendar-chart";
import { SrsStepDistributionChart } from "./srs-step-distribution-chart";
import { useDashboardStats } from "./use-dashboard-stats";

import type { DashboardStatsResponse } from "@/lib/dashboard/types";

type DashboardProps = {
  stats: DashboardStatsResponse | null;
  loading: boolean;
  error: string | null;
};

export function DashboardWithStats() {
  const { stats, loading, error } = useDashboardStats();
  return <Dashboard stats={stats} loading={loading} error={error} />;
}

export function Dashboard({ stats, loading, error }: DashboardProps) {

  if (loading) {
    return <DashboardSkeleton />;
  }

  if (error || !stats) {
    return (
      <section className="rounded-lg border border-dashed border-border bg-card p-6 text-center">
        <p className="text-sm font-medium">Dashboard kon niet geladen worden</p>
        <p className="mt-1 text-xs text-muted-foreground">{error ?? "Onbekende fout"}</p>
      </section>
    );
  }

  return (
    <div className="space-y-6">
      <SrsStepDistributionChart
        data={stats.srsStepDistribution}
        totalExercises={stats.totalExercises}
      />

      <section className="grid gap-6 lg:grid-cols-2">
        <ActivityCalendarChart data={stats.activityDays} streakDays={stats.streakDays} />
        <AccuracyPieChart attempts={stats.attemptSnapshots} />
      </section>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-80 animate-pulse rounded-lg border border-border bg-muted/40" />
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="h-64 animate-pulse rounded-lg border border-border bg-muted/40" />
        <div className="h-64 animate-pulse rounded-lg border border-border bg-muted/40" />
      </div>
    </div>
  );
}
