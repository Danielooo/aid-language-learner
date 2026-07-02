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
  progress: "#3b82f6",
};
