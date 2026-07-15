import { cn } from "@/lib/utils";

import type { ReactNode } from "react";

export type AppPageHeaderStat = {
  label: string;
  value: string;
  accent?: boolean;
  loading?: boolean;
};

type AppPageHeaderProps = {
  eyebrow: string;
  title: string;
  /** Zichtbare accountnaam (Naam), zonder @-prefix. */
  accountLabel?: string;
  description?: ReactNode;
  meta?: ReactNode;
  actions?: ReactNode;
  stats?: AppPageHeaderStat[];
  hideStats?: boolean;
};

function StatItem({
  label,
  value,
  accent,
  loading,
}: AppPageHeaderStat) {
  if (loading) {
    return (
      <div className="space-y-1.5">
        <div className="h-7 w-12 animate-pulse rounded bg-muted" />
        <div className="h-3 w-16 animate-pulse rounded bg-muted/70" />
      </div>
    );
  }

  return (
    <div className="space-y-0.5">
      <p
        className={cn(
          "text-xl font-semibold tabular-nums tracking-tight",
          accent ? "text-accent" : "text-foreground",
        )}
      >
        {value}
      </p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

export function AppPageHeader({
  eyebrow,
  title,
  accountLabel,
  description,
  meta,
  actions,
  stats,
  hideStats = false,
}: AppPageHeaderProps) {
  const showStats = !hideStats && stats && stats.length > 0;

  return (
    <header className="space-y-4">
      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {eyebrow}
      </p>

      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          {title}
        </h1>
        <div className="flex flex-wrap items-center gap-3">
          {actions}
          {accountLabel && (
            <p className="text-sm text-muted-foreground">{accountLabel}</p>
          )}
        </div>
      </div>

      <div className="border-b border-border" />

      {meta && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          {meta}
        </div>
      )}

      {description && (
        <p className="text-sm text-muted-foreground">{description}</p>
      )}

      {showStats && (
        <div className="grid grid-cols-3 gap-4 sm:max-w-md">
          {stats.map((stat) => (
            <StatItem key={stat.label} {...stat} />
          ))}
        </div>
      )}
    </header>
  );
}
