"use client";

import Link from "next/link";

import { SrsExplainer } from "@/app/dev/exercises-quiz/_components/srs-explainer";
import { formatCount } from "@/lib/dashboard/format";

import { MetricTooltip } from "./metric-tooltip";
import { SrsStepDistributionChart } from "./srs-step-distribution-chart";
import { useDashboardStats } from "../_hooks/use-dashboard-stats";

export function Dashboard() {
  const { stats, loading, error } = useDashboardStats();

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
      <div className="flex flex-wrap items-center justify-end gap-3">
        <Link
          href="/dev/exercises-quiz"
          className="inline-flex h-9 items-center rounded-md bg-accent px-3 text-xs font-medium text-accent-foreground hover:bg-accent/90"
        >
          Verder oefenen
        </Link>
      </div>

      <section className="grid gap-3 sm:grid-cols-3">
        <SummaryStat metric="summary-totaal" value={formatCount(stats.totalExercises)} />
        <SummaryStat metric="summary-due" value={formatCount(stats.dueNowCount)} />
        <SummaryStat metric="summary-relearning" value={formatCount(stats.relearningCount)} />
      </section>

      <SrsStepDistributionChart
        data={stats.srsStepDistribution}
        totalExercises={stats.totalExercises}
      />

      <SrsExplainer compact />
    </div>
  );
}

type SummaryStatProps = {
  metric: "summary-totaal" | "summary-due" | "summary-relearning";
  value: string;
};

const SUMMARY_LABELS: Record<SummaryStatProps["metric"], string> = {
  "summary-totaal": "In SRS",
  "summary-due": "Nu aan de beurt",
  "summary-relearning": "In herkansing",
};

function SummaryStat({ metric, value }: SummaryStatProps) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-center gap-2">
        <p className="text-xs text-muted-foreground">{SUMMARY_LABELS[metric]}</p>
        <MetricTooltip term={metric} />
      </div>
      <p className="mt-1 text-2xl font-semibold tabular-nums text-foreground">{value}</p>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="h-20 animate-pulse rounded-lg border border-border bg-muted/40"
          />
        ))}
      </div>
      <div className="h-80 animate-pulse rounded-lg border border-border bg-muted/40" />
    </div>
  );
}
