"use client";

import { ResponsiveBar } from "@nivo/bar";

import { chartColors, dashboardNivoTheme } from "@/lib/dashboard/nivo-theme";

import { ChartShell } from "./chart-shell";

import type { SrsStepBar } from "@/lib/dashboard/types";

type SrsStepDistributionChartProps = {
  data: SrsStepBar[];
  totalExercises: number;
};

export function SrsStepDistributionChart({
  data,
  totalExercises,
}: SrsStepDistributionChartProps) {
  const chartData = data.map((d) => ({
    step: d.label,
    count: d.count,
    description: d.description,
  }));

  return (
    <ChartShell
      title="Oefeningen per SRS-stap"
      hint={`${totalExercises.toLocaleString("nl-NL")} oefeningen in je herhaalschema`}
      metric="grafiek-srs-stappen"
      isEmpty={totalExercises === 0}
      emptyTitle="Nog geen oefeningen in SRS"
      emptyMessage="Start met spaced repetition om hier je voortgang per interval te zien."
      className="min-h-[20rem]"
    >
      <ResponsiveBar
        data={chartData}
        keys={["count"]}
        indexBy="step"
        layout="horizontal"
        theme={dashboardNivoTheme}
        margin={{ top: 8, right: 24, bottom: 24, left: 120 }}
        padding={0.3}
        colors={chartColors.progress}
        axisBottom={{ format: (v) => String(v) }}
        label={(d) => String(d.value)}
        labelSkipWidth={16}
        tooltip={({ indexValue, value, data: barData }) => (
          <div className="rounded-md border border-border bg-card px-2.5 py-2 text-xs shadow-md">
            <strong className="block text-foreground">{indexValue}</strong>
            <span className="text-muted-foreground">
              {(barData as { description?: string }).description}
            </span>
            <div className="mt-1 font-medium text-foreground">{value} oefeningen</div>
          </div>
        )}
      />
    </ChartShell>
  );
}
