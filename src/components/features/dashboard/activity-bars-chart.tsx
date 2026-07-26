"use client";

import { ResponsiveBar } from "@nivo/bar";
import { useMemo } from "react";

import { chartColors, dashboardNivoTheme } from "@/lib/dashboard/nivo-theme";

import { ChartShell } from "./chart-shell";

import type { ActivityBar } from "@/lib/dashboard/types";

type ActivityBarsChartProps = {
  data: ActivityBar[];
  streakDays: number;
};

type ActivityChartRow = {
  day: string;
  label: string;
  pogingen: number;
  correct: number;
  incorrect: number;
};

function formatDayLabel(dayKey: string): string {
  const [year, month, day] = dayKey.split("-").map(Number);
  const date = new Date(Date.UTC(year!, month! - 1, day!, 12, 0, 0));
  return new Intl.DateTimeFormat("nl-NL", {
    day: "numeric",
    month: "short",
    timeZone: "Europe/Amsterdam",
  }).format(date);
}

function formatStreakHint(streakDays: number): string {
  if (streakDays <= 0) return "Geen actieve streak";
  if (streakDays === 1) return "Streak: 1 dag";
  return `Streak: ${streakDays} dagen`;
}

export function ActivityBarsChart({
  data,
  streakDays,
}: ActivityBarsChartProps) {
  const rows = useMemo<ActivityChartRow[]>(
    () =>
      data.map((day) => ({
        day: day.day,
        label: formatDayLabel(day.day),
        pogingen: day.count,
        correct: day.correct,
        incorrect: day.incorrect,
      })),
    [data],
  );

  const totalAttempts = data.reduce((sum, day) => sum + day.count, 0);
  const maxCount = Math.max(0, ...data.map((day) => day.count));

  return (
    <ChartShell
      title="Oefenactiviteit"
      hint={formatStreakHint(streakDays)}
      metric="grafiek-activiteit"
      isEmpty={totalAttempts === 0}
      emptyTitle="Nog geen oefenactiviteit"
      emptyMessage="Maak oefeningen om hier je activiteit van de laatste 14 dagen te zien."
      contentClassName="h-48 w-full min-h-[12rem]"
    >
      <ResponsiveBar
        data={rows}
        keys={["pogingen"]}
        indexBy="label"
        margin={{ top: 8, right: 8, bottom: 40, left: 36 }}
        padding={0.35}
        colors={[chartColors.progress]}
        theme={dashboardNivoTheme}
        enableLabel={false}
        axisBottom={{
          tickSize: 0,
          tickPadding: 8,
          tickRotation: -35,
        }}
        axisLeft={{
          tickSize: 0,
          tickPadding: 8,
          tickValues:
            maxCount <= 5
              ? Array.from({ length: maxCount + 1 }, (_, i) => i)
              : undefined,
          format: (value) => `${value}`,
        }}
        gridYValues={
          maxCount <= 5
            ? Array.from({ length: maxCount + 1 }, (_, i) => i)
            : undefined
        }
        tooltip={({ indexValue, value, data: barData }) => {
          const row = barData as ActivityChartRow;
          return (
            <div className="border-border bg-card rounded-md border px-2.5 py-2 text-xs shadow-md">
              <strong className="text-foreground block">{indexValue}</strong>
              <div className="text-foreground mt-1 font-medium">
                {value} {(value as number) === 1 ? "poging" : "pogingen"}
              </div>
              <div className="text-muted-foreground mt-0.5">
                {row.correct} goed, {row.incorrect} fout
              </div>
            </div>
          );
        }}
        role="application"
        ariaLabel="Oefenactiviteit laatste 14 dagen"
      />
    </ChartShell>
  );
}
