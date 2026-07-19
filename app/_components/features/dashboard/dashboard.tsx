"use client";

import { ActivityBarsChart } from "./activity-bars-chart";
import { ProgressSummary } from "./progress-summary";
import { TopicProgressList } from "./topic-progress-list";
import { UpcomingReviewsChart } from "./upcoming-reviews-chart";
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
      <ProgressSummary
        masteredCount={stats.masteredCount}
        totalExercises={stats.totalExercises}
        dueNowCount={stats.dueNowCount}
      />

      <TopicProgressList topics={stats.topicProgress} />

      <section className="grid gap-6 lg:grid-cols-2">
        <UpcomingReviewsChart data={stats.upcomingByDay} />
        <ActivityBarsChart data={stats.activityBars} streakDays={stats.streakDays} />
      </section>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-32 animate-pulse rounded-lg border border-border bg-muted/40" />
      <div className="h-44 animate-pulse rounded-md border border-border bg-muted/40" />
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="h-52 animate-pulse rounded-lg border border-border bg-muted/40" />
        <div className="h-52 animate-pulse rounded-lg border border-border bg-muted/40" />
      </div>
    </div>
  );
}
