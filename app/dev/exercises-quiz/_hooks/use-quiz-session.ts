"use client";

import { useCallback, useRef, useState } from "react";

import { fisherYatesShuffle } from "@/lib/quiz/shuffle";

import type { ExerciseQuizItem } from "@/app/api/dev/exercise-generator-quiz/route";
import type { QuizSelectionMode } from "@/lib/quiz/selection-config";

export type QuizSessionConfig = {
  selectionMode: QuizSelectionMode;
  topic: string;
  customExerciseIds?: string[];
};

function buildFetchUrl(config: QuizSessionConfig, exerciseId?: string): string {
  if (exerciseId) {
    return `/api/dev/exercise-generator-quiz?id=${encodeURIComponent(exerciseId)}`;
  }

  const params = new URLSearchParams();

  if (config.selectionMode === "srs") {
    params.set("mode", "srs");
    if (config.topic !== "all") {
      params.set("topic", config.topic);
    }
  } else if (config.selectionMode === "random") {
    if (config.topic !== "all") {
      params.set("topic", config.topic);
    }
  }

  const qs = params.toString();
  return qs.length > 0
    ? `/api/dev/exercise-generator-quiz?${qs}`
    : "/api/dev/exercise-generator-quiz";
}

/**
 * Beheert de oefening-queue voor random, SRS en custom selectie.
 * Decks roepen `startSession` aan na topic/picker-keuze en `fetchNext`
 * voor elke volgende kaart.
 */
export function useQuizSession() {
  const configRef = useRef<QuizSessionConfig | null>(null);
  const queueRef = useRef<string[]>([]);
  const queueIndexRef = useRef(0);

  const [item, setItem] = useState<ExerciseQuizItem | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorStatus, setErrorStatus] = useState<number | null>(null);
  const [sessionComplete, setSessionComplete] = useState(false);
  const [srsComplete, setSrsComplete] = useState(false);
  const [queueRemaining, setQueueRemaining] = useState(0);

  const startSession = useCallback((config: QuizSessionConfig) => {
    configRef.current = config;
    setSessionComplete(false);
    setSrsComplete(false);
    setError(null);
    setErrorStatus(null);
    setItem(null);

    if (config.selectionMode === "custom" && config.customExerciseIds) {
      const shuffled = fisherYatesShuffle([...config.customExerciseIds]);
      queueRef.current = shuffled;
      queueIndexRef.current = 0;
      setQueueRemaining(shuffled.length);
    } else {
      queueRef.current = [];
      queueIndexRef.current = 0;
      setQueueRemaining(0);
    }
  }, []);

  const resetSession = useCallback(() => {
    configRef.current = null;
    queueRef.current = [];
    queueIndexRef.current = 0;
    setItem(null);
    setError(null);
    setErrorStatus(null);
    setSessionComplete(false);
    setSrsComplete(false);
    setQueueRemaining(0);
  }, []);

  const fetchNext = useCallback(async () => {
    const config = configRef.current;
    if (!config) return;

    setLoading(true);
    setError(null);
    setErrorStatus(null);

    try {
      if (config.selectionMode === "custom") {
        const queue = queueRef.current;
        const index = queueIndexRef.current;

        if (index >= queue.length) {
          setSessionComplete(true);
          setItem(null);
          setQueueRemaining(0);
          return;
        }

        const exerciseId = queue[index];
        queueIndexRef.current = index + 1;
        setQueueRemaining(queue.length - index - 1);

        const url = buildFetchUrl(config, exerciseId);
        const res = await fetch(url, { cache: "no-store" });
        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as {
            error?: string;
          };
          setErrorStatus(res.status);
          throw new Error(body.error ?? `Status ${res.status}`);
        }
        const data = (await res.json()) as ExerciseQuizItem;
        setItem(data);
        return;
      }

      const url = buildFetchUrl(config);
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as {
          error?: string;
          code?: string;
        };
        if (
          config.selectionMode === "srs" &&
          body.code === "SRS_NOTHING_DUE"
        ) {
          setSrsComplete(true);
          setItem(null);
          setError(null);
          setErrorStatus(null);
          return;
        }
        setErrorStatus(res.status);
        throw new Error(body.error ?? `Status ${res.status}`);
      }
      const data = (await res.json()) as ExerciseQuizItem;
      setItem(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Onbekende fout");
      setItem(null);
    } finally {
      setLoading(false);
    }
  }, []);

  /** Haalt oefeningen op met optionele validatie (bijv. sort-eligibility). */
  const fetchNextValidated = useCallback(
    async (
      isValid: (item: ExerciseQuizItem) => boolean,
      maxRetries = 8,
      invalidMessage?: string,
    ) => {
      const config = configRef.current;
      if (!config) return;

      setLoading(true);
      setError(null);
      setErrorStatus(null);

      try {
        if (config.selectionMode === "custom") {
          await fetchNext();
          return;
        }

        let lastInvalid: ExerciseQuizItem | null = null;

        for (let attempt = 0; attempt < maxRetries; attempt += 1) {
          const url = buildFetchUrl(config);
          const res = await fetch(url, { cache: "no-store" });
          if (!res.ok) {
            const body = (await res.json().catch(() => ({}))) as {
              error?: string;
              code?: string;
            };
            if (
              config.selectionMode === "srs" &&
              body.code === "SRS_NOTHING_DUE"
            ) {
              setSrsComplete(true);
              setItem(null);
              setError(null);
              setErrorStatus(null);
              return;
            }
            setErrorStatus(res.status);
            throw new Error(body.error ?? `Status ${res.status}`);
          }
          const data = (await res.json()) as ExerciseQuizItem;
          if (isValid(data)) {
            setItem(data);
            return;
          }
          lastInvalid = data;
        }

        if (lastInvalid && !isValid(lastInvalid)) {
          setError(
            invalidMessage ??
              "Geen geschikte oefening gevonden. Probeer andere instellingen.",
          );
          setItem(null);
          return;
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Onbekende fout");
        setItem(null);
      } finally {
        setLoading(false);
      }
    },
    [fetchNext],
  );

  const recordSrsReview = useCallback(
    async (exerciseId: string, isCorrect: boolean) => {
      const config = configRef.current;
      if (!config || config.selectionMode !== "srs") return;

      try {
        await fetch("/api/dev/exercise-progress", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ exerciseId, isCorrect }),
        });
      } catch {
        // SRS-update is best-effort; quiz-poging staat al in quiz_attempts.
      }
    },
    [],
  );

  const suspendExercise = useCallback(async (exerciseId: string) => {
    try {
      await fetch("/api/dev/exercise-progress", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ exerciseId, isSuspended: true }),
      });
    } catch {
      // Stil falen — gebruiker kan doorgaan met de quiz.
    }
  }, []);

  return {
    item,
    loading,
    error,
    errorStatus,
    sessionComplete,
    srsComplete,
    queueRemaining,
    startSession,
    resetSession,
    fetchNext,
    fetchNextValidated,
    recordSrsReview,
    suspendExercise,
    selectionMode: configRef.current?.selectionMode ?? null,
  };
}
