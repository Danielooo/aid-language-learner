"use client";

import { ResponsiveCalendar } from "@nivo/calendar";

import { chartColors, dashboardNivoTheme } from "@/lib/dashboard/nivo-theme";

import { ChartShell } from "./chart-shell";

import type { StudyDay } from "@/lib/dashboard/types";

type StudyCalendarHeatmapProps = {
  data: StudyDay[];
  activeDays: number;
  activeDaysTotal: number;
  currentStreak: number;
  longestStreak: number;
};

export function StudyCalendarHeatmap({
  data,
  activeDays,
  activeDaysTotal,
  currentStreak,
  longestStreak,
}: StudyCalendarHeatmapProps) {
  const hasData = data.some((d) => d.reviewCount > 0);
  const from = data[0]?.date ?? new Date().toISOString().slice(0, 10);
  const to = data[data.length - 1]?.date ?? from;

  const calendarData = data.map((d) => ({
    day: d.date,
    value: d.reviewCount,
  }));

  return (
    <ChartShell
      title="Wanneer je oefende"
      hint={`Laatste ${activeDaysTotal} dagen: ${activeDays} dagen geoefend · Reeks: ${currentStreak} dagen · Langste reeks: ${longestStreak} dagen`}
      metric="grafiek-kalender"
      isEmpty={!hasData}
      emptyTitle="Nog geen oefenactiviteit"
      emptyMessage="Oefen regelmatig om je activiteit hier te zien."
      className="lg:col-span-2"
    >
      <div className="h-48 overflow-x-auto">
        <div className="min-w-[640px] h-full">
          <ResponsiveCalendar
            data={calendarData}
            from={from}
            to={to}
            theme={dashboardNivoTheme}
            emptyColor="var(--muted)"
            colors={[chartColors.neutral, "#bbf7d0", "#86efac", "#4ade80", chartColors.good]}
            margin={{ top: 16, right: 8, bottom: 8, left: 24 }}
            yearSpacing={32}
            monthBorderColor="var(--border)"
            dayBorderWidth={1}
            dayBorderColor="var(--background)"
            tooltip={({ day, value, color }) => (
              <div className="rounded border border-border bg-card px-2 py-1 text-xs">
                <strong>{day}</strong>: {value ?? 0} reviews
                <span className="ml-2 inline-block h-2 w-2 rounded-sm" style={{ background: color }} />
              </div>
            )}
          />
        </div>
      </div>
    </ChartShell>
  );
}
