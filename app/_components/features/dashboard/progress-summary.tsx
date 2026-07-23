"use client";

import { MetricTooltip } from "./metric-tooltip";

type ProgressSummaryProps = {
  totalExercises: number;
  dueNowCount: number;
  /** Herhalingen in de “Vandaag”-staaf (alleen later vandaag, niet open). */
  upcomingTodayCount?: number;
};

/**
 * % = deel van je herhaalschema dat nu bij is (niet aan de beurt).
 * 100% = geen open SRS-oefeningen meer.
 */
export function ProgressSummary({
  totalExercises,
  dueNowCount,
  upcomingTodayCount = 0,
}: ProgressSummaryProps) {
  const openCount = Math.min(dueNowCount, totalExercises);
  const doneCount = Math.max(0, totalExercises - openCount);
  const percentDone =
    totalExercises === 0
      ? 0
      : Math.round((doneCount / totalExercises) * 100);
  const isCaughtUp = totalExercises > 0 && openCount === 0;
  const hasLaterToday = isCaughtUp && upcomingTodayCount > 0;

  return (
    <section className="space-y-4 rounded-lg border border-border bg-card p-5 text-card-foreground">
      <header className="flex items-center gap-2">
        <h2 className="text-sm font-semibold">Herhaalschema</h2>
        <MetricTooltip term="voortgang-samenvatting" />
      </header>

      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:gap-6">
        <p className="text-5xl font-semibold tabular-nums tracking-tight text-foreground">
          {percentDone}
          <span className="text-3xl">%</span>
        </p>
        <p className="pb-1 text-sm text-muted-foreground">
          {totalExercises === 0
            ? "Geen oefeningen"
            : hasLaterToday
              ? "Alles bij · later vandaag gepland"
              : isCaughtUp
                ? "Alles bij"
                : `${openCount.toLocaleString("nl-NL")} open`}
        </p>
      </div>
    </section>
  );
}
