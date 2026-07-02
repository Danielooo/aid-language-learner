"use client";

import { useState } from "react";

import { ResponsiveBar } from "@nivo/bar";

import { chartColors, dashboardNivoTheme } from "@/lib/dashboard/nivo-theme";

import { ChartShell } from "./chart-shell";

import type { WorkloadDay } from "@/lib/dashboard/types";

type WorkloadForecastChartProps = {
  data: WorkloadDay[];
  reviewsNext7: number;
  insight?: string;
};

export function WorkloadForecastChart({
  data,
  reviewsNext7,
  insight,
}: WorkloadForecastChartProps) {
  const [days, setDays] = useState<14 | 30>(14);
  const slice = data.slice(0, days);
  const hasData = slice.some((d) => d.scheduledReviewCount > 0);

  const peak = [...slice].sort(
    (a, b) => b.scheduledReviewCount - a.scheduledReviewCount,
  )[0];
  const avg =
    slice.length === 0
      ? 0
      : Math.round(
          slice.reduce((s, d) => s + d.scheduledReviewCount, 0) / slice.length,
        );

  const chartData = slice.map((d) => ({
    date: d.date.slice(5),
    reviews: d.scheduledReviewCount,
    overdue: d.overdueCount,
  }));

  return (
    <ChartShell
      title="Wat er op de planning staat"
      hint={
        insight ??
        `Te doen komende 7 dagen: ${reviewsNext7} · Gemiddeld per dag: ${avg}${
          peak ? ` · Drukste dag: ${peak.date} (${peak.scheduledReviewCount})` : ""
        }`
      }
      metric="grafiek-workload"
      isEmpty={!hasData}
      emptyTitle="Geen geplande herhalingen"
      emptyMessage="Voeg oefeningen toe om te zien wat er op je planning staat."
    >
      <>
        <div className="mb-2 flex gap-1">
          {([14, 30] as const).map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setDays(n)}
              className={`rounded px-2 py-0.5 text-[10px] ${
                days === n
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {n} dagen
            </button>
          ))}
        </div>
        <ResponsiveBar
          data={chartData}
          keys={["reviews"]}
          indexBy="date"
          theme={dashboardNivoTheme}
          margin={{ top: 8, right: 8, bottom: 48, left: 40 }}
          padding={0.3}
          colors={(bar) =>
            (bar.data.reviews as number) >= avg * 1.5
              ? chartColors.attention
              : chartColors.progress
          }
          axisBottom={{ tickRotation: -45 }}
        />
      </>
    </ChartShell>
  );
}
