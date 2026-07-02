"use client";

import Link from "next/link";

import { formatCount, formatPct } from "@/lib/dashboard/format";

import { HardestWordsTable } from "./hardest-words-table";
import { KpiCard } from "./kpi-card";
import { MasteredWordsChart } from "./mastered-words-chart";
import { MasteryDistributionChart } from "./mastery-distribution-chart";
import { PeriodFilter } from "./period-filter";
import { PracticeTypePerformanceChart } from "./practice-type-chart";
import { RetentionByIntervalChart } from "./retention-by-interval-chart";
import { RetentionTrendChart } from "./retention-trend-chart";
import { StudyCalendarHeatmap } from "./study-calendar-heatmap";
import { WorkloadForecastChart } from "./workload-forecast-chart";
import { useDashboardStats } from "../_hooks/use-dashboard-stats";

export function Dashboard() {
  const { stats, loading, error, period, setPeriod } = useDashboardStats();

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

  const { kpis, insights } = stats;
  const retentionInsight = insights.find((i) => i.includes("interval"));
  const practiceInsight = insights.find(
    (i) => i.includes("gaat sterk") || i.includes("blijft achter"),
  );
  const workloadInsight = insights.find((i) => i.includes("workload"));

  const lastRetention7 =
    [...stats.retentionOverTime].reverse().find((p) => p.retention7d != null)
      ?.retention7d ?? null;

  const retentionTone =
    kpis.retention30d == null
      ? "neutral"
      : kpis.retention30d >= 85
        ? "positive"
        : kpis.retention30d < 75
          ? "negative"
          : "neutral";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <PeriodFilter value={period} onChange={setPeriod} />
        <Link
          href="/dev/exercises-quiz"
          className="inline-flex h-9 items-center rounded-md bg-accent px-3 text-xs font-medium text-accent-foreground hover:bg-accent/90"
        >
          Verder oefenen
        </Link>
      </div>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <KpiCard
          metric="kpi-retentie"
          value={formatPct(kpis.retention30d)}
          tone={retentionTone}
        />
        <KpiCard
          metric="kpi-beheerst"
          value={formatCount(kpis.masteredWords)}
          sub={
            kpis.masteredWordsDeltaWeek !== 0
              ? `${kpis.masteredWordsDeltaWeek > 0 ? "+" : ""}${kpis.masteredWordsDeltaWeek} deze week`
              : undefined
          }
        />
        <KpiCard metric="kpi-gemiddelde" value={`${kpis.averageMasteryScore}`} />
        <KpiCard metric="kpi-gepland" value={formatCount(kpis.reviewsNext7Days)} />
        <KpiCard
          metric="kpi-consistentie"
          value={`${kpis.activeDaysLast30}/${kpis.activeDaysTotal30}`}
          sub={`Reeks: ${kpis.currentStreak} dagen · langste: ${kpis.longestStreak} dagen`}
        />
      </section>

      <section className="space-y-1">
        <h2 className="text-sm font-semibold text-foreground">Voortgang</h2>
        <div className="grid gap-4 lg:grid-cols-2">
          <MasteredWordsChart
            data={stats.masteredOverTime}
            deltaWeek={kpis.masteredWordsDeltaWeek}
          />
          <MasteryDistributionChart data={stats.masteryDistribution} />
        </div>
      </section>

      <section className="space-y-1">
        <h2 className="text-sm font-semibold text-foreground">Hoe goed je onthoudt</h2>
        <div className="grid gap-4 lg:grid-cols-2">
          <RetentionTrendChart
            data={stats.retentionOverTime}
            retention7d={lastRetention7}
            retention30d={kpis.retention30d}
          />
          <RetentionByIntervalChart
            data={stats.retentionByInterval}
            insight={retentionInsight}
          />
        </div>
      </section>

      <section className="space-y-1">
        <h2 className="text-sm font-semibold text-foreground">Oefenen en planning</h2>
        <div className="grid gap-4 lg:grid-cols-2">
          <StudyCalendarHeatmap
            data={stats.studyHeatmap}
            activeDays={kpis.activeDaysLast30}
            activeDaysTotal={kpis.activeDaysTotal30}
            currentStreak={kpis.currentStreak}
            longestStreak={kpis.longestStreak}
          />
          <WorkloadForecastChart
            data={stats.workloadForecast}
            reviewsNext7={kpis.reviewsNext7Days}
            insight={workloadInsight}
          />
        </div>
      </section>

      <section className="space-y-1">
        <h2 className="text-sm font-semibold text-foreground">Waar het lastig gaat</h2>
        <div className="grid gap-4 lg:grid-cols-2">
          <HardestWordsTable data={stats.hardestWords} />
          <PracticeTypePerformanceChart
            data={stats.performanceByPracticeType}
            insight={practiceInsight}
          />
        </div>
      </section>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-9 w-64 animate-pulse rounded-md bg-muted/50" />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="h-20 animate-pulse rounded-lg border border-border bg-muted/40"
          />
        ))}
      </div>
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="h-72 animate-pulse rounded-lg border border-border bg-muted/40"
        />
      ))}
    </div>
  );
}
