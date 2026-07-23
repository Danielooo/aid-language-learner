"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";

import { fetchJson } from "@/lib/api/fetch-json";
import { queryKeys } from "@/lib/query-keys";

import type { DashboardStatsResponse } from "@/lib/dashboard/types";

export function useDashboardStats() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: queryKeys.dashboardStats(),
    queryFn: () => fetchJson<DashboardStatsResponse>("/api/dashboard-stats"),
  });

  return {
    stats: query.data ?? null,
    loading: query.isPending,
    error: query.error
      ? query.error instanceof Error
        ? query.error.message
        : "Onbekende fout"
      : null,
    refresh: async () => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.dashboardStats(),
      });
    },
  };
}
