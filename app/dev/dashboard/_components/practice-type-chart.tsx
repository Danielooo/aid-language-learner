"use client";

import { ResponsiveBar } from "@nivo/bar";

import { dashboardNivoTheme, retentionBarColor } from "@/lib/dashboard/nivo-theme";
import { formatPct } from "@/lib/dashboard/format";

import { ChartShell } from "./chart-shell";

import type { PracticeTypeBar } from "@/lib/dashboard/types";

type PracticeTypePerformanceChartProps = {
  data: PracticeTypeBar[];
  insight?: string;
};

export function PracticeTypePerformanceChart({
  data,
  insight,
}: PracticeTypePerformanceChartProps) {
  const hasData = data.length > 0;

  const chartData = data.map((d) => ({
    type: d.label.length > 24 ? `${d.label.slice(0, 22)}…` : d.label,
    fullLabel: d.label,
    accuracy: d.accuracy,
    reviewCount: d.reviewCount,
  }));

  return (
    <ChartShell
      title="Resultaat per oefening"
      hint={insight}
      metric="grafiek-oefentype"
      isEmpty={!hasData}
      emptyTitle="Nog geen data per oefentype"
      emptyMessage="Oefen met flashcards, typen of sorteren om vergelijkingen te zien."
    >
      <ResponsiveBar
        data={chartData}
        keys={["accuracy"]}
        indexBy="type"
        layout="horizontal"
        theme={dashboardNivoTheme}
        margin={{ top: 8, right: 24, bottom: 32, left: 120 }}
        padding={0.35}
        colors={(bar) => retentionBarColor(bar.data.accuracy as number)}
        axisBottom={{ format: (v) => `${v}%` }}
        label={(d) => `${d.value}%`}
        tooltip={({ indexValue, value, data: barData }) => (
          <div className="rounded border border-border bg-card px-2 py-1 text-xs">
            <strong>{barData.fullLabel}</strong>
            <br />
            Accuracy: {formatPct(value as number)} · {barData.reviewCount} oefeningen
          </div>
        )}
      />
    </ChartShell>
  );
}
