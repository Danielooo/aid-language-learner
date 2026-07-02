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

export const chartColors = {
  good: "#10b981",
  attention: "#f59e0b",
  weak: "#ef4444",
  progress: "#3b82f6",
  secondary: "#8b5cf6",
  neutral: "#94a3b8",
};

export function retentionBarColor(pct: number | null): string {
  if (pct == null) return chartColors.neutral;
  if (pct >= 85) return chartColors.good;
  if (pct >= 75) return chartColors.attention;
  return chartColors.weak;
}
