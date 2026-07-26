export const dashboardNivoTheme = {
  background: "transparent",
  text: {
    fontSize: 11,
    fill: "var(--foreground)",
  },
  axis: {
    ticks: {
      text: {
        fontSize: 10,
        fill: "var(--muted-foreground)",
      },
    },
    legend: {
      text: {
        fontSize: 11,
        fill: "var(--foreground)",
      },
    },
  },
  grid: {
    line: {
      stroke: "var(--border)",
      strokeOpacity: 0.6,
    },
  },
  tooltip: {
    container: {
      background: "var(--card)",
      color: "var(--foreground)",
      fontSize: 12,
      borderRadius: "6px",
      border: "1px solid var(--border)",
      boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
    },
  },
  legends: {
    text: {
      fontSize: 11,
      fill: "var(--muted-foreground)",
    },
  },
};

// Hex-endpoints voor interpolatie; visueel afgestemd op --chart-* in globals.css
const CHART_CORRECT_HEX = "#22c55e";
const CHART_INCORRECT_HEX = "#ef4444";
const CHART_NEUTRAL_HEX = "#eab308";

export const chartColors = {
  progress: "#3b82f6",
  correct: "var(--chart-correct)",
  incorrect: "var(--chart-incorrect)",
  activity: ["#dbeafe", "#93c5fd", "#3b82f6", "#1d4ed8"],
  srsDue: "#3b82f6",
  srsWaiting: "var(--chart-correct)",
  activityAccuracy: {
    poor: "var(--chart-incorrect)",
    neutral: "var(--chart-neutral)",
    good: "var(--chart-correct)",
  },
};

export const ACTIVITY_NEUTRAL_COLOR = "var(--muted)";

/** Sentinel voor dagen met te weinig pogingen in de nauwkeurigheidsweergave. */
export const ACTIVITY_ACCURACY_NEUTRAL_VALUE = -1;

export type ActivityAccuracyColorScale = ((
  value: number | { valueOf(): number },
) => string) & {
  ticks: (count?: number) => number[];
};

export function createActivityAccuracyColorScale(): ActivityAccuracyColorScale {
  const scale = ((value: number | { valueOf(): number }) => {
    const numericValue = typeof value === "number" ? value : value.valueOf();
    if (numericValue === ACTIVITY_ACCURACY_NEUTRAL_VALUE)
      return ACTIVITY_NEUTRAL_COLOR;
    return getActivityAccuracyColor(numericValue);
  }) as ActivityAccuracyColorScale;

  scale.ticks = (count = 4) => {
    if (count <= 1) return [100];
    const step = 100 / (count - 1);
    return Array.from({ length: count }, (_, index) =>
      Math.round(index * step),
    );
  };

  return scale;
}

export const activityAccuracyColorScale = createActivityAccuracyColorScale();

function hexToRgb(hex: string): [number, number, number] {
  const normalized = hex.replace("#", "");
  const value = Number.parseInt(normalized, 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (channel: number) => channel.toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function lerpChannel(a: number, b: number, t: number): number {
  return Math.round(a + (b - a) * t);
}

function lerpHex(from: string, to: string, t: number): string {
  const [r1, g1, b1] = hexToRgb(from);
  const [r2, g2, b2] = hexToRgb(to);
  return rgbToHex(
    lerpChannel(r1, r2, t),
    lerpChannel(g1, g2, t),
    lerpChannel(b1, b2, t),
  );
}

/** Groen (100%) → geel (50%) → rood (0%). */
export function getActivityAccuracyColor(pct: number): string {
  const clamped = Math.max(0, Math.min(100, pct));

  if (clamped >= 50) {
    return lerpHex(CHART_NEUTRAL_HEX, CHART_CORRECT_HEX, (clamped - 50) / 50);
  }

  return lerpHex(CHART_INCORRECT_HEX, CHART_NEUTRAL_HEX, clamped / 50);
}
