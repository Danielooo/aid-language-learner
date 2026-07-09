"use client";

import { ResponsiveCalendar } from "@nivo/calendar";
import { useMemo, useState } from "react";

import { ACTIVITY_ACCURACY_MIN_ATTEMPTS } from "@/lib/dashboard/attempt-metrics";
import {
  ACTIVITY_ACCURACY_NEUTRAL_VALUE,
  ACTIVITY_NEUTRAL_COLOR,
  activityAccuracyColorScale,
  chartColors,
  dashboardNivoTheme,
  getActivityAccuracyColor,
} from "@/lib/dashboard/nivo-theme";
import { cn } from "@/lib/utils";

import { ChartShell } from "./chart-shell";

import type { ActivityDay } from "@/lib/dashboard/types";

type ActivityCalendarChartProps = {
  data: ActivityDay[];
  streakDays: number;
};

type ViewMode = "pogingen" | "nauwkeurigheid";

const VIEW_OPTIONS: { value: ViewMode; label: string }[] = [
  { value: "pogingen", label: "Pogingen" },
  { value: "nauwkeurigheid", label: "Nauwkeurigheid" },
];

const ACCURACY_LEGEND_ITEMS = [
  { label: "Veel goed", color: chartColors.activityAccuracy.good },
  { label: "Gemengd", color: chartColors.activityAccuracy.neutral },
  { label: "Veel fout", color: chartColors.activityAccuracy.poor },
  {
    label: `< ${ACTIVITY_ACCURACY_MIN_ATTEMPTS} pogingen`,
    color: ACTIVITY_NEUTRAL_COLOR,
  },
] as const;

const ACTIVITY_LEGEND_ITEMS = [
  { label: "Veel pogingen", color: chartColors.activity[3] },
  { label: "Weinig pogingen", color: chartColors.activity[0] },
  { label: "Geen pogingen", color: ACTIVITY_NEUTRAL_COLOR },
] as const;

function toAccuracyCalendarValue(day: ActivityDay): number {
  if (day.accuracyPct != null) return day.accuracyPct;
  return ACTIVITY_ACCURACY_NEUTRAL_VALUE;
}

function accuracySwatchColor(day: ActivityDay): string {
  if (day.accuracyPct != null) return getActivityAccuracyColor(day.accuracyPct);
  return ACTIVITY_NEUTRAL_COLOR;
}

function formatAccuracyTooltip(day: ActivityDay): string {
  if (day.accuracyPct != null) {
    return `${day.correct} goed · ${day.incorrect} fout · ${day.accuracyPct}% nauwkeurigheid`;
  }

  return `${day.count} ${day.count === 1 ? "poging" : "pogingen"} — te weinig voor betrouwbare kleur (min. ${ACTIVITY_ACCURACY_MIN_ATTEMPTS})`;
}

export function ActivityCalendarChart({ data, streakDays }: ActivityCalendarChartProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("pogingen");
  const accuracyMode = viewMode === "nauwkeurigheid";

  const dayByKey = useMemo(() => new Map(data.map((day) => [day.day, day])), [data]);

  const calendarData = useMemo(
    () =>
      data
        .filter((day) => day.count > 0)
        .map((day) => ({
          day: day.day,
          value: accuracyMode ? toAccuracyCalendarValue(day) : day.count,
        })),
    [accuracyMode, data],
  );

  const totalAttempts = data.reduce((sum, day) => sum + day.count, 0);
  const from = data[0]?.day ?? new Date().toISOString().slice(0, 10);
  const to = data[data.length - 1]?.day ?? from;

  const streakLabel =
    streakDays === 0
      ? "Geen actieve streak"
      : streakDays === 1
        ? "Streak: 1 dag"
        : `Streak: ${streakDays} dagen`;

  const legendItems = accuracyMode ? ACCURACY_LEGEND_ITEMS : ACTIVITY_LEGEND_ITEMS;

  return (
    <ChartShell
      title="Oefenactiviteit"
      hint={streakLabel}
      metric="grafiek-activiteit"
      isEmpty={totalAttempts === 0}
      emptyTitle="Nog geen oefenactiviteit"
      emptyMessage="Start met oefenen om hier je dagelijkse activiteit te zien."
      className="min-h-[12rem]"
    >
      <div className="flex h-48 flex-col gap-2">
        <div className="flex min-h-[2.5rem] flex-wrap items-center justify-end gap-3 px-1">
          <div className="flex min-h-5 flex-wrap items-center gap-3">
            {legendItems.map((item) => (
              <div key={item.label} className="flex items-center gap-1.5 text-xs text-muted-foreground">
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
            aria-label="Weergave oefenactiviteit"
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
          <ResponsiveCalendar
            data={calendarData}
            from={from}
            to={to}
            theme={dashboardNivoTheme}
            emptyColor={ACTIVITY_NEUTRAL_COLOR}
            colors={chartColors.activity}
            colorScale={accuracyMode ? activityAccuracyColorScale : undefined}
            margin={{ top: 8, right: 8, bottom: 8, left: 16 }}
            yearSpacing={32}
            monthBorderColor="var(--border)"
            dayBorderWidth={2}
            dayBorderColor="var(--card)"
            tooltip={({ day, color }) => {
              const dayData = dayByKey.get(day);
              if (!dayData) return null;

              const swatchColor = accuracyMode ? accuracySwatchColor(dayData) : color;

              return (
                <div className="rounded-md border border-border bg-card px-2.5 py-2 text-xs shadow-md">
                  <strong className="block text-foreground">{day}</strong>
                  <span className="text-muted-foreground">
                    {accuracyMode
                      ? formatAccuracyTooltip(dayData)
                      : `${dayData.count} ${dayData.count === 1 ? "poging" : "pogingen"}`}
                  </span>
                  <span
                    className="mt-1 block h-2 w-8 rounded-sm"
                    style={{ backgroundColor: swatchColor }}
                  />
                </div>
              );
            }}
          />
        </div>
      </div>
    </ChartShell>
  );
}
