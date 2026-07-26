"use client";

import { useQuery } from "@tanstack/react-query";

import { fetchJson } from "@/lib/api/fetch-json";
import { queryKeys } from "@/lib/query-keys";

import type { ProgressStatsResponse } from "@/types/progress";

export function useExerciseProgress(breakdown?: "topics") {
  return useQuery({
    queryKey: queryKeys.exerciseProgress(breakdown),
    queryFn: () => {
      const url =
        breakdown === "topics"
          ? "/api/exercise-progress?breakdown=topics"
          : "/api/exercise-progress";
      return fetchJson<ProgressStatsResponse>(url);
    },
  });
}
