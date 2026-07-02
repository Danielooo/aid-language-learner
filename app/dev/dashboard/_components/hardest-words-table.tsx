"use client";

import Link from "next/link";

import { formatPct } from "@/lib/dashboard/format";

import { ChartShell } from "./chart-shell";

import type { HardWordRow } from "@/lib/dashboard/types";

type HardestWordsTableProps = {
  data: HardWordRow[];
};

export function HardestWordsTable({ data }: HardestWordsTableProps) {
  const hasData = data.length > 0;
  const exerciseIds = data.map((d) => d.exerciseId).join(",");

  return (
    <ChartShell
      title="Woorden die lastig zijn"
      hint="Gesorteerd op fouten, reactietijd en woordscore"
      metric="grafiek-moeilijk"
      isEmpty={!hasData}
      emptyTitle="Nog geen lastige woorden gevonden"
      emptyMessage="Dat betekent dat je nog weinig hebt geoefend, of dat je woorden goed gaan."
    >
      <div className="space-y-3">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] text-left text-xs">
            <thead>
              <tr className="border-b border-border text-muted-foreground">
                <th className="py-2 pr-3 font-medium">Woord</th>
                <th className="py-2 pr-3 font-medium">Vertaling</th>
                <th className="py-2 pr-3 font-medium">Fout%</th>
                <th className="py-2 pr-3 font-medium">Fouten</th>
                <th className="py-2 pr-3 font-medium">Score</th>
              </tr>
            </thead>
            <tbody>
              {data.map((row) => (
                <tr key={row.exerciseId} className="border-b border-border/60">
                  <td className="py-2 pr-3 font-medium text-foreground">{row.word}</td>
                  <td className="py-2 pr-3 text-muted-foreground">{row.translation}</td>
                  <td className="py-2 pr-3 tabular-nums">
                    {formatPct(Math.round(row.errorRate * 100))}
                  </td>
                  <td className="py-2 pr-3 tabular-nums">{row.mistakeCount}</td>
                  <td className="py-2 pr-3 tabular-nums">{row.masteryScore}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {hasData && (
          <Link
            href={`/dev/exercises-quiz?custom=${encodeURIComponent(exerciseIds)}`}
            className="inline-flex h-8 items-center rounded-md bg-accent px-3 text-xs font-medium text-accent-foreground hover:bg-accent/90"
          >
            Oefen moeilijke woorden
          </Link>
        )}
      </div>
    </ChartShell>
  );
}
