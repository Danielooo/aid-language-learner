"use client";

import { useCallback, useEffect, useState } from "react";

import type { DashboardStatsResponse } from "@/lib/dashboard/types";

export function useDashboardStats() {
  const [stats, setStats] = useState<DashboardStatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/dev/dashboard-stats", { cache: "no-store" });
      if (!res.ok) throw new Error(`Status ${res.status}`);
      const data = (await res.json()) as DashboardStatsResponse;
      setStats(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Onbekende fout");
      setStats(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchStats();
  }, [fetchStats]);

  return {
    stats,
    loading,
    error,
    refresh: fetchStats,
  };
}
