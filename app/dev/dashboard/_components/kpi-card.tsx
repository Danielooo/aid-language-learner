import { MetricTooltip, getMetricLabel, type MetricTerm } from "./metric-tooltip";

type KpiCardProps = {
  metric: MetricTerm;
  value: string | number;
  sub?: string;
  tone?: "positive" | "negative" | "neutral";
};

export function KpiCard({ metric, value, sub, tone = "neutral" }: KpiCardProps) {
  const toneClass =
    tone === "positive"
      ? "text-emerald-700 dark:text-emerald-300"
      : tone === "negative"
        ? "text-destructive"
        : "text-foreground";

  return (
    <div className="rounded-lg border border-border bg-card p-4 text-card-foreground">
      <div className="flex items-center gap-1.5">
        <p className="text-xs font-medium text-muted-foreground">{getMetricLabel(metric)}</p>
        <MetricTooltip term={metric} />
      </div>
      <p className={`mt-1 text-2xl font-semibold tabular-nums ${toneClass}`}>
        {value}
      </p>
      {sub && <p className="mt-1 text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}
