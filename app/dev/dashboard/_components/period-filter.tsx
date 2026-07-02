import { DASHBOARD_PERIODS, type DashboardPeriod } from "@/lib/dashboard/types";

const LABELS: Record<DashboardPeriod, string> = {
  "7d": "7 dagen",
  "30d": "30 dagen",
  "90d": "90 dagen",
  all: "Alles",
};

type PeriodFilterProps = {
  value: DashboardPeriod;
  onChange: (period: DashboardPeriod) => void;
};

export function PeriodFilter({ value, onChange }: PeriodFilterProps) {
  return (
    <div
      className="inline-flex rounded-md border border-border bg-card p-1 text-xs"
      role="group"
      aria-label="Periode"
    >
      {DASHBOARD_PERIODS.map((period) => (
        <button
          key={period}
          type="button"
          onClick={() => onChange(period)}
          className={`rounded px-2.5 py-1 transition-colors ${
            value === period
              ? "bg-accent text-accent-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {LABELS[period]}
        </button>
      ))}
    </div>
  );
}
