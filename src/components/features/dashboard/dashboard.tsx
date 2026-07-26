"use client";

import { ActivityBarsChart } from "./activity-bars-chart";
import { ProgressSummary } from "./progress-summary";
import { TopicProgressList } from "./topic-progress-list";
import { UpcomingReviewsChart } from "./upcoming-reviews-chart";

import type { DashboardStatsResponse } from "@/lib/dashboard/types";

type DashboardProps = {
  stats: DashboardStatsResponse | null;
  loading: boolean;
  error: string | null;
  onRetry?: () => void;
};

export function Dashboard({ stats, loading, error, onRetry }: DashboardProps) {
  if (loading) {
    return <DashboardSkeleton />;
  }

  if (error || !stats) {
    return (
      <section className="border-border bg-card rounded-lg border border-dashed p-6 text-center">
        <p className="text-sm font-medium">Voortgang kon niet geladen worden</p>
        <p className="text-muted-foreground mt-1 text-xs">
          {error ?? "Onbekende fout"}
        </p>
        {onRetry ? (
          <button
            type="button"
            onClick={onRetry}
            className="border-border bg-background text-foreground hover:bg-muted mt-4 inline-flex items-center justify-center rounded-md border px-3 py-1.5 text-sm font-medium"
          >
            Opnieuw proberen
          </button>
        ) : null}
      </section>
    );
  }

  const upcomingTodayCount =
    stats.upcomingByDay.find((day) => day.label === "Vandaag")?.count ?? 0;

  return (
    <div className="space-y-6">
      <ProgressSummary
        totalExercises={stats.totalExercises}
        dueNowCount={stats.dueNowCount}
        upcomingTodayCount={upcomingTodayCount}
      />

      <section className="grid gap-6 lg:grid-cols-2">
        <UpcomingReviewsChart data={stats.upcomingByDay} />
        <ActivityBarsChart
          data={stats.activityBars}
          streakDays={stats.streakDays}
        />
      </section>

      <TopicProgressList topics={stats.topicProgress} />
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="border-border bg-muted/40 h-32 animate-pulse rounded-lg border" />
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="border-border bg-muted/40 h-52 animate-pulse rounded-lg border" />
        <div className="border-border bg-muted/40 h-52 animate-pulse rounded-lg border" />
      </div>
      <div className="border-border bg-muted/40 h-44 animate-pulse rounded-md border" />
    </div>
  );
}
