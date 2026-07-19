"use client";

import Link from "next/link";

import { APP_ROUTES } from "@/lib/routes";

import { MetricTooltip } from "./metric-tooltip";

type ProgressSummaryProps = {
  masteredCount: number;
  totalExercises: number;
  dueNowCount: number;
};

export function ProgressSummary({
  masteredCount,
  totalExercises,
  dueNowCount,
}: ProgressSummaryProps) {
  const percentMastered =
    totalExercises === 0 ? 0 : Math.round((masteredCount / totalExercises) * 100);

  return (
    <section className="space-y-4 rounded-lg border border-border bg-card p-5 text-card-foreground">
      <header className="flex items-center gap-2">
        <h2 className="text-sm font-semibold">Samenvatting</h2>
        <MetricTooltip term="voortgang-samenvatting" />
      </header>

      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:gap-6">
        <p className="text-5xl font-semibold tabular-nums tracking-tight text-foreground">
          {percentMastered}
          <span className="text-3xl">%</span>
        </p>
        <div className="space-y-1 pb-1">
          <p className="text-sm text-foreground">
            {masteredCount.toLocaleString("nl-NL")} van{" "}
            {totalExercises.toLocaleString("nl-NL")} beheerst
          </p>
          {dueNowCount > 0 ? (
            <p className="text-sm">
              <Link
                href={APP_ROUTES.oefenen}
                className="font-medium text-foreground underline-offset-4 hover:underline"
              >
                {dueNowCount.toLocaleString("nl-NL")} aan de beurt · Oefenen
              </Link>
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">Niets aan de beurt</p>
          )}
        </div>
      </div>
    </section>
  );
}
