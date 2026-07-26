"use client";

import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { queryKeys } from "@/lib/query-keys";
import { fetchJson } from "@/lib/api/fetch-json";

import type { QuizAttemptPayload } from "@/lib/quiz/record-quiz-attempt";
import { toQuizAttemptPostBody } from "@/lib/quiz/record-quiz-attempt";

export type QuizScore = {
  correct: number;
  incorrect: number;
  total: number;
};

export type QuizAttempt = QuizAttemptPayload;

type GetResponse = {
  attempts: QuizAttempt[];
};

const EMPTY_SCORE: QuizScore = { correct: 0, incorrect: 0, total: 0 };

function summarize(list: ReadonlyArray<QuizAttempt>): QuizScore {
  const correct = list.reduce((n, a) => n + (a.isCorrect ? 1 : 0), 0);
  return {
    correct,
    incorrect: list.length - correct,
    total: list.length,
  };
}

export function useQuizStorage() {
  const queryClient = useQueryClient();

  const { data: attempts = [], isLoading: isLoadingAttempts } = useQuery({
    queryKey: queryKeys.quizAttempts(),
    queryFn: async () => {
      const data = await fetchJson<GetResponse>("/api/quiz-attempts");
      return data.attempts;
    },
  });

  const recordMutation = useMutation({
    mutationFn: async (attempt: QuizAttempt) => {
      await fetchJson("/api/quiz-attempts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(toQuizAttemptPostBody(attempt)),
      });
      return attempt;
    },
    onMutate: async (attempt) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.quizAttempts() });
      const prev = queryClient.getQueryData<QuizAttempt[]>(
        queryKeys.quizAttempts(),
      );
      queryClient.setQueryData<QuizAttempt[]>(
        queryKeys.quizAttempts(),
        (old = []) => [attempt, ...old],
      );
      return { prev };
    },
    onError: (_err, _attempt, context) => {
      if (context?.prev) {
        queryClient.setQueryData(queryKeys.quizAttempts(), context.prev);
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.dashboardStats(),
      });
    },
  });

  const resetMutation = useMutation({
    mutationFn: async () => {
      await fetchJson("/api/quiz-attempts", { method: "DELETE" });
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: queryKeys.quizAttempts() });
      const prev = queryClient.getQueryData<QuizAttempt[]>(
        queryKeys.quizAttempts(),
      );
      queryClient.setQueryData<QuizAttempt[]>(queryKeys.quizAttempts(), []);
      return { prev };
    },
    onError: (_err, _vars, context) => {
      if (context?.prev) {
        queryClient.setQueryData(queryKeys.quizAttempts(), context.prev);
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.dashboardStats(),
      });
    },
  });

  const score = useMemo<QuizScore>(
    () => (attempts.length === 0 ? EMPTY_SCORE : summarize(attempts)),
    [attempts],
  );

  return {
    score,
    attempts,
    recordAttempt: (attempt: QuizAttempt) => recordMutation.mutate(attempt),
    reset: () => resetMutation.mutate(),
    hydrated: !isLoadingAttempts,
  };
}
