"use client";

import { useQuery } from "@tanstack/react-query";

import { fetchJson } from "@/lib/api/fetch-json";
import { queryKeys } from "@/lib/query-keys";

import type { TopicsResponse } from "@/types/quiz";

export function useQuizTopics() {
  return useQuery({
    queryKey: queryKeys.quizTopics(),
    queryFn: () => fetchJson<TopicsResponse>("/api/quiz/topics"),
  });
}
