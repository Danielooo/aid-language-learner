import type { DashboardStatsResponse } from "@/lib/dashboard/types";
import { cn } from "@/lib/utils";

type VoortgangHeaderProps = {
  username: string;
  stats: DashboardStatsResponse | null;
  loading?: boolean;
};

function formatStreak(days: number): string {
  if (days === 0) return "0d";
  if (days === 1) return "1d";
  return `${days}d`;
}

function StatItem({
  label,
  value,
  accent,
  loading,
}: {
  label: string;
  value: string;
  accent?: boolean;
  loading?: boolean;
}) {
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

export function VoortgangHeader({ username, stats, loading = false }: VoortgangHeaderProps) {
  const totalExercises = stats?.totalExercises.toLocaleString("nl-NL") ?? "—";
  const dueCount = stats?.dueNowCount.toLocaleString("nl-NL") ?? "—";
  const streak = stats != null ? formatStreak(stats.streakDays) : "—";
  const hasDue = (stats?.dueNowCount ?? 0) > 0;

  return (
    <header className="space-y-4">
      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
        Persoonlijk overzicht
      </p>

      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Voortgang</h1>
        <p className="text-sm text-muted-foreground">@{username}</p>
      </div>

      <div className="border-b border-border" />

      <div className="grid grid-cols-3 gap-4 sm:max-w-md">
        <StatItem label="In schema" value={totalExercises} loading={loading} />
        <StatItem
          label="Aan de beurt"
          value={dueCount}
          accent={hasDue}
          loading={loading}
        />
        <StatItem label="Streak" value={streak} loading={loading} />
      </div>
    </header>
  );
}
