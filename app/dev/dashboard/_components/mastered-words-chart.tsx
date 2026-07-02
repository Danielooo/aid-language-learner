"use client";

import { ResponsiveLine } from "@nivo/line";

import { formatChartDateLabel, getChartDateTickValues } from "@/lib/dashboard/format";
import { chartColors, dashboardNivoTheme } from "@/lib/dashboard/nivo-theme";

import { ChartShell } from "./chart-shell";

import type { MasteredWordsPoint } from "@/lib/dashboard/types";

type MasteredWordsChartProps = {
  data: MasteredWordsPoint[];
  deltaWeek: number;
};

export function MasteredWordsChart({ data, deltaWeek }: MasteredWordsChartProps) {
  const hasData = data.some((p) => p.masteredWordsCount > 0);
  const latest = data.length > 0 ? data[data.length - 1].masteredWordsCount : 0;

  const dateKeys = data.map((p) => p.date);

  const series = [
    {
      id: "Beheerst",
      color: chartColors.good,
      data: data.map((p) => ({ x: p.date, y: p.masteredWordsCount })),
    },
  ];

  return (
    <ChartShell
      title="Goed onthouden over tijd"
      hint={`Nu goed onthouden: ${latest}${deltaWeek !== 0 ? ` · ${deltaWeek > 0 ? "+" : ""}${deltaWeek} deze week` : ""}`}
      metric="grafiek-beheerst"
      isEmpty={!hasData}
      emptyTitle="Je hebt nog geen goed onthouden woorden"
      emptyMessage="Blijf oefenen met herhalingen. Woorden verschijnen hier zodra je ze stabiel kent."
    >
      <ResponsiveLine
        data={series}
        theme={dashboardNivoTheme}
        margin={{ top: 8, right: 16, bottom: 40, left: 40 }}
        xScale={{ type: "point" }}
        yScale={{ type: "linear", min: 0, stacked: false }}
        axisBottom={{
          tickValues: getChartDateTickValues(dateKeys),
          format: formatChartDateLabel,
          tickRotation: -35,
          tickPadding: 8,
        }}
        axisLeft={{ tickSize: 0, tickPadding: 8 }}
        colors={[chartColors.good]}
        pointSize={6}
        pointBorderWidth={2}
        pointBorderColor={{ from: "color", modifiers: [["darker", 0.3]] }}
        useMesh
        enableSlices="x"
      />
    </ChartShell>
  );
}
