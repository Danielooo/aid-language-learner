"use client";

import { ResponsiveBar } from "@nivo/bar";

import { dashboardNivoTheme, retentionBarColor } from "@/lib/dashboard/nivo-theme";

import { ChartShell } from "./chart-shell";

import type { IntervalRetentionBar } from "@/lib/dashboard/types";

type RetentionByIntervalChartProps = {
  data: IntervalRetentionBar[];
  insight?: string;
};

export function RetentionByIntervalChart({
  data,
  insight,
}: RetentionByIntervalChartProps) {
  const hasData = data.some((d) => d.reviewCount >= 3);

  const chartData = data.map((d) => ({
    interval: d.intervalLabel,
    retention: d.retentionPercentage ?? 0,
    reviewCount: d.reviewCount,
  }));

  return (
    <ChartShell
      title="Onthouden per wachttijd"
      hint={insight}
      metric="grafiek-interval"
      isEmpty={!hasData}
      emptyTitle="Nog niet genoeg data"
      emptyMessage="Doe meer geplande herhalingen om deze grafiek te vullen."
    >
      <ResponsiveBar
        data={chartData}
        keys={["retention"]}
        indexBy="interval"
        theme={dashboardNivoTheme}
        margin={{ top: 8, right: 16, bottom: 40, left: 44 }}
        padding={0.35}
        colors={(bar) => retentionBarColor(bar.data.retention as number)}
        axisLeft={{ format: (v) => `${v}%` }}
        label={(d) => `${d.value}%`}
        labelSkipHeight={12}
      />
    </ChartShell>
  );
}
