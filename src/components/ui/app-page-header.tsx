import { cn } from "@/lib/utils";

import type { ReactNode } from "react";

export type AppPageHeaderStat = {
  label: string;
  value: string;
  accent?: boolean;
  loading?: boolean;
};

type AppPageHeaderProps = {
  title: string;
  /** Zichtbare accountnaam (Naam), zonder @-prefix. */
  accountLabel?: string;
  description?: ReactNode;
  meta?: ReactNode;
  actions?: ReactNode;
  stats?: AppPageHeaderStat[];
  hideStats?: boolean;
  className?: string;
  titleClassName?: string;
  descriptionClassName?: string;
};

function StatItem({ label, value, accent, loading }: AppPageHeaderStat) {
  if (loading) {
    return (
      <div className="space-y-1.5">
        <div className="bg-muted h-7 w-12 animate-pulse rounded" />
        <div className="bg-muted/70 h-3 w-16 animate-pulse rounded" />
      </div>
    );
  }

  return (
    <div className="space-y-0.5">
      <p
        className={cn(
          "text-xl font-semibold tracking-tight tabular-nums",
          accent ? "text-accent" : "text-foreground",
        )}
      >
        {value}
      </p>
      <p className="text-muted-foreground text-xs">{label}</p>
    </div>
  );
}

export function AppPageHeader({
  title,
  accountLabel,
  description,
  meta,
  actions,
  stats,
  hideStats = false,
  className,
  titleClassName,
  descriptionClassName,
}: AppPageHeaderProps) {
  const showStats = !hideStats && stats && stats.length > 0;

  return (
    <header className={cn("space-y-4", className)}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1
          className={cn(
            "text-foreground text-2xl font-semibold tracking-tight",
            titleClassName,
          )}
        >
          {title}
        </h1>
        <div className="flex flex-wrap items-center gap-3">
          {actions}
          {accountLabel && (
            <p className="text-muted-foreground text-sm">{accountLabel}</p>
          )}
        </div>
      </div>

      <div className="border-border border-b" />

      {meta && (
        <div className="text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
          {meta}
        </div>
      )}

      {description && (
        <p
          className={cn("text-muted-foreground text-sm", descriptionClassName)}
        >
          {description}
        </p>
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
