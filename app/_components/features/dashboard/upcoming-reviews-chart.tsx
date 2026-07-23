"use client";

import { ChartShell } from "./chart-shell";

import type { UpcomingDay } from "@/lib/dashboard/types";

type UpcomingReviewsChartProps = {
  data: UpcomingDay[];
};

const BAR_TRACK_HEIGHT_PX = 120;

export function UpcomingReviewsChart({ data }: UpcomingReviewsChartProps) {
  const maxCount = Math.max(0, ...data.map((day) => day.count));
  const hasAny = data.some((day) => day.count > 0);

  return (
    <ChartShell
      title="Komende herhalingen"
      metric="grafiek-komende-herhalingen"
      isEmpty={!hasAny}
      emptyTitle="Geen herhalingen gepland"
      emptyMessage="Oefen via je herhaalschema om hier komende dagen te zien."
      hint="Open = nu aan de beurt · Vandaag = later vandaag"
      contentClassName="h-48 w-full min-h-[12rem]"
    >
      <div className="flex h-full items-end gap-2 pt-2">
        {data.map((day) => {
          const heightPct =
            maxCount === 0 ? 0 : Math.max((day.count / maxCount) * 100, day.count > 0 ? 8 : 0);
          return (
            <div
              key={day.day}
              className="flex min-w-0 flex-1 flex-col items-center gap-1.5"
              title={`${day.label}: ${day.count}`}
            >
              <span className="text-[11px] tabular-nums text-muted-foreground">
                {day.count > 0 ? day.count.toLocaleString("nl-NL") : ""}
              </span>
              <div
                className="flex w-full items-end justify-center"
                style={{ height: BAR_TRACK_HEIGHT_PX }}
              >
                <div
                  className={`w-full max-w-[2.25rem] rounded-t-md ${
                    day.count > 0 ? "bg-[#3b82f6]" : "bg-muted"
                  }`}
                  style={{
                    height: day.count > 0 ? `${heightPct}%` : 4,
                    minHeight: day.count > 0 ? 8 : 4,
                  }}
                />
              </div>
              <span className="w-full truncate text-center text-[10px] font-medium text-foreground">
                {day.label}
              </span>
            </div>
          );
        })}
      </div>
    </ChartShell>
  );
}
