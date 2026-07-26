"use client";

import type { ReactNode } from "react";

import { ChartEmptyState } from "./chart-empty-state";
import { MetricTooltip, type MetricTerm } from "./metric-tooltip";

type ChartShellProps = {
  title: string;
  hint?: string;
  metric?: MetricTerm;
  isEmpty?: boolean;
  emptyTitle?: string;
  emptyMessage?: string;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
};

export function ChartShell({
  title,
  hint,
  metric,
  isEmpty,
  emptyTitle,
  emptyMessage,
  children,
  className = "",
  contentClassName = "h-64 w-full min-h-[16rem]",
}: ChartShellProps) {
  return (
    <section
      className={`border-border bg-card text-card-foreground space-y-3 rounded-lg border p-5 ${className}`}
    >
      <header className="space-y-0.5">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold">{title}</h2>
          {metric && <MetricTooltip term={metric} />}
        </div>
        {hint && <p className="text-muted-foreground text-xs">{hint}</p>}
      </header>
      {isEmpty ? (
        <ChartEmptyState
          title={emptyTitle ?? "Nog niet genoeg data"}
          message={emptyMessage}
        />
      ) : (
        <div className={contentClassName}>{children}</div>
      )}
    </section>
  );
}
