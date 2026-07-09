"use client";

import { ResponsiveBar } from "@nivo/bar";
import { useState } from "react";

import { chartColors, dashboardNivoTheme } from "@/lib/dashboard/nivo-theme";
import { cn } from "@/lib/utils";

import { ChartShell } from "./chart-shell";

import type { BarTooltipProps } from "@nivo/bar";
import type { SrsStepBar } from "@/lib/dashboard/types";

type SrsStepDistributionChartProps = {
  data: SrsStepBar[];
  totalExercises: number;
};

type SrsChartRow = {
  step: string;
  aanDeBeurt: number;
  wachten: number;
  description: string;
  totaal: number;
};

type ViewMode = "totaal" | "verdeeld";

const VIEW_OPTIONS: { value: ViewMode; label: string }[] = [
  { value: "totaal", label: "Totaal" },
  { value: "verdeeld", label: "Verdeeld" },
];

const SPLIT_LEGEND_ITEMS = [
  { key: "aanDeBeurt", label: "Aan de beurt", color: chartColors.srsDue },
  { key: "wachten", label: "Wachten", color: chartColors.srsWaiting },
] as const;

const TOTAL_LEGEND_ITEMS = [{ key: "totaal", label: "Totaal", color: chartColors.srsDue }] as const;

/** As-ticks in hele oefeningaantallen (geen 0,5 of 1,5). */
function exerciseCountAxisTicks(max: number): number[] {
  if (max <= 0) return [0];
  if (max <= 5) return Array.from({ length: max + 1 }, (_, index) => index);

  const targetTickCount = 5;
  const step = Math.max(1, Math.ceil(max / (targetTickCount - 1)));
  const ticks: number[] = [];

  for (let value = 0; value < max; value += step) {
    ticks.push(value);
  }

  if (ticks[ticks.length - 1] !== max) {
    ticks.push(max);
  }

  return ticks;
}

function splitBarColor(bar: { id: string | number }) {
  return bar.id === "aanDeBeurt" ? chartColors.srsDue : chartColors.srsWaiting;
}

function SrsTotalTooltip({ indexValue, value, data: barData }: BarTooltipProps<SrsChartRow>) {
  const row = barData as SrsChartRow;

  return (
    <div className="rounded-md border border-border bg-card px-2.5 py-2 text-xs shadow-md">
      <strong className="block text-foreground">{indexValue}</strong>
      <span className="text-muted-foreground">{row.description}</span>
      <div className="mt-1 font-medium text-foreground">
        {value} {(value as number) === 1 ? "oefening" : "oefeningen"}
      </div>
      <div className="mt-0.5 text-muted-foreground">
        {row.aanDeBeurt} aan de beurt, {row.wachten} wachten
      </div>
    </div>
  );
}

function SrsSplitTooltip({
  indexValue,
  id,
  value,
  data: barData,
}: BarTooltipProps<SrsChartRow>) {
  const row = barData as SrsChartRow;
  const statusLabel = id === "aanDeBeurt" ? "Aan de beurt" : "Wachten";

  return (
    <div className="rounded-md border border-border bg-card px-2.5 py-2 text-xs shadow-md">
      <strong className="block text-foreground">{indexValue}</strong>
      <span className="text-muted-foreground">{row.description}</span>
      <div className="mt-1 font-medium text-foreground">
        {statusLabel}: {value} {(value as number) === 1 ? "oefening" : "oefeningen"}
      </div>
      <div className="mt-0.5 text-muted-foreground">
        {row.totaal} totaal ({row.aanDeBeurt} aan de beurt, {row.wachten} wachten)
      </div>
    </div>
  );
}

export function SrsStepDistributionChart({
  data,
  totalExercises,
}: SrsStepDistributionChartProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("totaal");
  const splitView = viewMode === "verdeeld";

  const dueTotal = data.reduce((sum, step) => sum + step.dueCount, 0);
  const chartData: SrsChartRow[] = data.map((d) => ({
    step: d.label,
    aanDeBeurt: d.dueCount,
    wachten: d.waitingCount,
    description: d.description,
    totaal: d.count,
  }));

  const keys = splitView ? (["aanDeBeurt", "wachten"] as const) : (["totaal"] as const);
  const legendItems = splitView ? SPLIT_LEGEND_ITEMS : TOTAL_LEGEND_ITEMS;
  const maxCount = Math.max(0, ...chartData.map((row) => row.totaal));
  const xAxisTicks = exerciseCountAxisTicks(maxCount);

  return (
    <ChartShell
      title="Voortgang"
      hint={`${totalExercises.toLocaleString("nl-NL")} oefeningen in je herhaalschema · ${dueTotal.toLocaleString("nl-NL")} aan de beurt`}
      metric="grafiek-srs-stappen"
      isEmpty={totalExercises === 0}
      emptyTitle="Nog geen oefeningen in SRS"
      emptyMessage="Start met spaced repetition om hier je voortgang per interval te zien."
      className="min-h-[24rem]"
      contentClassName="h-[24rem] w-full min-h-[24rem]"
    >
      <div className="flex h-full flex-col gap-2">
        <div className="flex flex-wrap items-center justify-end gap-3 px-1">
          <div className="flex flex-wrap items-center gap-4">
            {legendItems.map((item) => (
              <div key={item.key} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span
                  className="inline-block h-2.5 w-2.5 rounded-sm"
                  style={{ backgroundColor: item.color }}
                  aria-hidden
                />
                <span>{item.label}</span>
              </div>
            ))}
          </div>
          <div
            role="radiogroup"
            aria-label="Weergave SRS-stappen"
            className="inline-flex rounded-md border border-border bg-card p-0.5 text-xs"
          >
            {VIEW_OPTIONS.map((option) => {
              const isActive = viewMode === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  role="radio"
                  aria-checked={isActive}
                  onClick={() => setViewMode(option.value)}
                  className={cn(
                    "cursor-pointer rounded-sm px-2.5 py-1 font-medium transition-colors",
                    isActive
                      ? "bg-accent text-accent-foreground"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>
        <div className="min-h-0 flex-1">
          <ResponsiveBar
            data={chartData}
            keys={[...keys]}
            indexBy="step"
            layout="horizontal"
            groupMode={splitView ? "stacked" : "grouped"}
            theme={dashboardNivoTheme}
            margin={{ top: 4, right: 24, bottom: 28, left: 72 }}
            padding={0.3}
            colors={splitView ? splitBarColor : chartColors.srsDue}
            valueScale={{ type: "linear", min: 0, nice: false }}
            axisBottom={{
              tickValues: xAxisTicks,
              format: (value) => value.toLocaleString("nl-NL"),
            }}
            label={(d) => (d.value === 0 ? "" : String(d.value))}
            labelSkipWidth={12}
            labelSkipHeight={12}
            tooltip={splitView ? SrsSplitTooltip : SrsTotalTooltip}
          />
        </div>
      </div>
    </ChartShell>
  );
}
