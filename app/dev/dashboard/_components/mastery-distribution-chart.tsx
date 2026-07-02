"use client";

import { ResponsivePie } from "@nivo/pie";

import { dashboardNivoTheme } from "@/lib/dashboard/nivo-theme";

import { ChartShell } from "./chart-shell";

import type { MasterySlice } from "@/lib/dashboard/types";

type MasteryDistributionChartProps = {
  data: MasterySlice[];
};

export function MasteryDistributionChart({ data }: MasteryDistributionChartProps) {
  const total = data.reduce((sum, d) => sum + d.count, 0);
  const pieData = data
    .filter((d) => d.count > 0)
    .map((d) => ({
      id: d.label,
      label: d.label,
      value: d.count,
      color: d.color,
    }));

  return (
    <ChartShell
      title="Hoe goed je woorden kent"
      hint={`${total} woorden in je oefenlijst`}
      metric="grafiek-verdeling"
      isEmpty={total === 0}
      emptyTitle="Nog geen woorden om te oefenen"
      emptyMessage="Start met herhalen om hier te zien hoe je woordenschat groeit."
    >
      <ResponsivePie
        data={pieData}
        theme={dashboardNivoTheme}
        margin={{ top: 8, right: 120, bottom: 8, left: 8 }}
        innerRadius={0.55}
        padAngle={1}
        cornerRadius={3}
        colors={{ datum: "data.color" }}
        enableArcLinkLabels={false}
        arcLabelsSkipAngle={12}
        arcLabel={(d) => `${d.value}`}
        legends={[
          {
            anchor: "right",
            direction: "column",
            translateX: 100,
            itemWidth: 100,
            itemHeight: 18,
            symbolSize: 10,
          },
        ]}
      />
    </ChartShell>
  );
}
