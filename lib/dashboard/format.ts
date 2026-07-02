export function formatPct(value: number | null, digits = 0): string {
  if (value == null || Number.isNaN(value)) return "—";
  return `${value.toFixed(digits)}%`;
}

export function formatCount(value: number): string {
  return value.toLocaleString("nl-NL");
}

export function retentionColor(pct: number | null): "good" | "attention" | "weak" | "neutral" {
  if (pct == null) return "neutral";
  if (pct >= 85) return "good";
  if (pct >= 75) return "attention";
  return "weak";
}

export function toLocalDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function periodStartDate(period: string, now = new Date()): Date | null {
  if (period === "all") return null;
  const days = period === "7d" ? 7 : period === "30d" ? 30 : 90;
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - (days - 1));
  return start;
}

export function intervalBucketLabel(intervalDays: number | null): string {
  const days = intervalDays ?? 0;
  if (days <= 1) return "1 dag";
  if (days <= 3) return "3 dagen";
  if (days <= 7) return "7 dagen";
  if (days <= 14) return "14 dagen";
  if (days <= 30) return "30 dagen";
  if (days <= 90) return "90 dagen";
  return "180+ dagen";
}

const INTERVAL_ORDER = [
  "1 dag",
  "3 dagen",
  "7 dagen",
  "14 dagen",
  "30 dagen",
  "90 dagen",
  "180+ dagen",
] as const;

export function sortIntervalLabels(labels: string[]): string[] {
  return [...labels].sort(
    (a, b) => INTERVAL_ORDER.indexOf(a as (typeof INTERVAL_ORDER)[number]) -
      INTERVAL_ORDER.indexOf(b as (typeof INTERVAL_ORDER)[number]),
  );
}

/** Kort NL label voor x-as ticks in tijdgrafieken (bijv. "3 jun"). */
export function formatChartDateLabel(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("nl-NL", {
    day: "numeric",
    month: "short",
  });
}

/**
 * Bepaalt welke datums als x-as tick getoond worden, afhankelijk van de periode-lengte.
 * Eerste en laatste datum worden altijd opgenomen.
 */
export function getChartDateTickValues(dates: string[]): string[] {
  if (dates.length === 0) return [];
  if (dates.length <= 7) return dates;

  const step = dates.length <= 30 ? 5 : dates.length <= 90 ? 7 : 14;
  const ticks = new Set<string>();

  for (let i = 0; i < dates.length; i += step) {
    ticks.add(dates[i]);
  }
  ticks.add(dates[0]);
  ticks.add(dates[dates.length - 1]);

  return dates.filter((d) => ticks.has(d));
}

export function practiceTypeLabel(
  practiceType: string | null,
  direction?: string | null,
  typingMode?: string | null,
): string {
  if (!practiceType) return "Onbekend";
  if (practiceType === "flashcard") return "Flashcards";
  if (practiceType === "typing") {
    const mode = typingMode === "blank" ? "invullen" : "volledig";
    const dir = direction === "nl-to-es" ? "nl→es" : "es→nl";
    return `Typen ${mode} (${dir})`;
  }
  if (practiceType === "sort") {
    const dir = direction === "nl-to-es" ? "nl→es" : "es→nl";
    return `Sorteren (${dir})`;
  }
  return practiceType;
}
