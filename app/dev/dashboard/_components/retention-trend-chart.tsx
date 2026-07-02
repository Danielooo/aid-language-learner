"use client";

import { ResponsiveLine } from "@nivo/line";

import { chartColors, dashboardNivoTheme } from "@/lib/dashboard/nivo-theme";
import { formatPct } from "@/lib/dashboard/format";

import { ChartShell } from "./chart-shell";

import type { RetentionPoint } from "@/lib/dashboard/types";

type RetentionTrendChartProps = {
  data: RetentionPoint[];
  retention7d: number | null;
  retention30d: number | null;
};

export function RetentionTrendChart({
  data,
  retention7d,
  retention30d,
}: RetentionTrendChartProps) {
  const hasData = data.some((p) => p.retention7d != null || p.retention30d != null);

  const series = [
    {
      id: "7 dagen",
      color: chartColors.progress,
      data: data
        .filter((p) => p.retention7d != null)
        .map((p) => ({ x: p.date, y: p.retention7d as number })),
    },
    {
      id: "30 dagen",
      color: chartColors.secondary,
      data: data
        .filter((p) => p.retention30d != null)
        .map((p) => ({ x: p.date, y: p.retention30d as number })),
    },
  ];

  return (
    <ChartShell
      title="Onthouden over tijd"
      hint={`Laatste 7 dagen: ${formatPct(retention7d)} · Laatste 30 dagen: ${formatPct(retention30d)}`}
      metric="grafiek-retentie"
      isEmpty={!hasData}
      emptyTitle="Nog niet genoeg data"
      emptyMessage="Doe meer geplande herhalingen om deze grafiek te vullen."
    >
      <ResponsiveLine
        data={series}
        theme={dashboardNivoTheme}
        margin={{ top: 8, right: 16, bottom: 32, left: 44 }}
        xScale={{ type: "point" }}
        yScale={{ type: "linear", min: 0, max: 100 }}
        axisBottom={{ tickRotation: -35, tickPadding: 8 }}
        axisLeft={{ tickSize: 0, tickPadding: 8, format: (v) => `${v}%` }}
        colors={[chartColors.progress, chartColors.secondary]}
        pointSize={4}
        useMesh
        enableSlices="x"
        legends={[
          {
            anchor: "top-right",
            direction: "row",
            translateY: -4,
            itemWidth: 80,
            itemHeight: 16,
            symbolSize: 8,
          },
        ]}
      />
    </ChartShell>
  );
}
