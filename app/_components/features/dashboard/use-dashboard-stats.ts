"use client";

import { useCallback, useEffect, useState } from "react";

import type { DashboardStatsResponse } from "@/lib/dashboard/types";

export function useDashboardStats() {
  const [stats, setStats] = useState<DashboardStatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Geen synchrone setState vóór de eerste await: `loading` start op true
  // en `refresh` zet 'm expliciet, zodat het effect geen cascade triggert.
  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/dev/dashboard-stats", { cache: "no-store" });
      if (!res.ok) throw new Error(`Status ${res.status}`);
      const data = (await res.json()) as DashboardStatsResponse;
      setStats(data);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Onbekende fout");
      setStats(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // `load` zet pas state ná de fetch-await (asynchroon); de linter kan
    // dat onderscheid niet zien.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    await load();
  }, [load]);

  return {
    stats,
    loading,
    error,
    refresh,
  };
}
