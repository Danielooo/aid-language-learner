"use client";

import { ResponsivePie } from "@nivo/pie";
import { useMemo, useState } from "react";

import {
  ACCURACY_PERIOD_OPTIONS,
  computeAccuracySummary,
  filterAttemptsByPeriod,
  getAccuracyPeriodLabel,
} from "@/lib/dashboard/attempt-metrics";
import { chartColors, dashboardNivoTheme } from "@/lib/dashboard/nivo-theme";

import { ChartShell } from "./chart-shell";

import type { AccuracyPeriod } from "@/lib/dashboard/attempt-metrics";
import type { AttemptSnapshot } from "@/lib/dashboard/types";

type AccuracyPieChartProps = {
  attempts: AttemptSnapshot[];
};

export function AccuracyPieChart({ attempts }: AccuracyPieChartProps) {
  const [period, setPeriod] = useState<AccuracyPeriod>("30d");

  const periodOption = ACCURACY_PERIOD_OPTIONS.find((option) => option.value === period);
  const filteredAttempts = useMemo(
    () => filterAttemptsByPeriod(attempts, period),
    [attempts, period],
  );
  const summary = useMemo(
    () => computeAccuracySummary(filteredAttempts),
    [filteredAttempts],
  );

  const pieData = [
    { id: "Goed", label: "Goed", value: summary.correct, color: chartColors.correct },
    { id: "Fout", label: "Fout", value: summary.incorrect, color: chartColors.incorrect },
  ].filter((d) => d.value > 0);

  const periodLabel = getAccuracyPeriodLabel(period);

  return (
    <ChartShell
      title="Goed vs fout"
      hint={
        summary.total > 0
          ? `${summary.accuracyPct}% nauwkeurigheid · ${summary.total.toLocaleString("nl-NL")} pogingen · ${periodLabel}`
          : undefined
      }
      metric="grafiek-accuracy"
      isEmpty={summary.total === 0}
      emptyTitle={periodOption?.emptyTitle ?? "Nog geen quiz-pogingen"}
      emptyMessage={
        periodOption?.emptyMessage ?? "Maak oefeningen om hier je accuraatheid te zien."
      }
      className="min-h-[16rem]"
    >
      <div className="flex h-64 flex-col gap-2">
        <div className="flex justify-end px-1">
          <select
            aria-label="Periode voor nauwkeurigheid"
            value={period}
            onChange={(event) => setPeriod(event.target.value as AccuracyPeriod)}
            className="cursor-pointer rounded-md border border-input bg-background px-2 py-1 text-xs text-foreground"
          >
            {ACCURACY_PERIOD_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <div className="min-h-0 flex-1">
          <ResponsivePie
            data={pieData}
            theme={dashboardNivoTheme}
            margin={{ top: 16, right: 16, bottom: 16, left: 16 }}
            innerRadius={0.55}
            padAngle={2}
            cornerRadius={4}
            activeOuterRadiusOffset={6}
            colors={{ datum: "data.color" }}
            borderWidth={1}
            borderColor={{ from: "color", modifiers: [["darker", 0.2]] }}
            enableArcLinkLabels={false}
            arcLabel={(d) => `${d.value}`}
            arcLabelsTextColor="var(--primary-foreground)"
            legends={[
              {
                anchor: "bottom",
                direction: "row",
                translateY: 40,
                itemWidth: 80,
                itemHeight: 18,
                symbolSize: 10,
                symbolShape: "circle",
              },
            ]}
            tooltip={({ datum }) => (
              <div className="rounded-md border border-border bg-card px-2.5 py-2 text-xs shadow-md">
                <strong className="block text-foreground">{datum.label}</strong>
                <span className="text-muted-foreground">
                  {datum.value} van {summary.total} pogingen (
                  {summary.total === 0
                    ? 0
                    : Math.round((datum.value / summary.total) * 100)}
                  %)
                </span>
              </div>
            )}
          />
        </div>
      </div>
    </ChartShell>
  );
}
