"use client";

import { useCallback, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { fetchTopicExerciseIds } from "@/lib/quiz/fetch-topic-exercise-ids";
import { fisherYatesShuffle } from "@/lib/quiz/shuffle";
import { queryKeys } from "@/lib/query-keys";

import type { ExerciseListItem } from "@/types/quiz";
import type { ExerciseQuizItem } from "@/types/quiz";
import type { QuizSelectionMode } from "@/lib/quiz/selection-config";

export type QuizSessionPhase =
  | "playing"
  | "main-complete"
  | "review"
  | "all-complete";

export type QuizSessionConfig = {
  selectionMode: QuizSelectionMode;
  topic: string;
};

export type StartSessionOptions = {
  exerciseFilter?: (item: ExerciseListItem) => boolean;
  /** Due-count snapshot bij picker-klik (Herhaalschema); N blijft vast tot sessie-einde. */
  srsDueTotal?: number;
};

function buildFetchUrl(config: QuizSessionConfig, exerciseId?: string): string {
  if (exerciseId) {
    return `/api/quiz?id=${encodeURIComponent(exerciseId)}`;
  }

  const params = new URLSearchParams();

  if (config.selectionMode === "srs") {
    params.set("mode", "srs");
    if (config.topic !== "all") {
      params.set("topic", config.topic);
    }
  }

  const qs = params.toString();
  return qs.length > 0 ? `/api/quiz?${qs}` : "/api/quiz";
}

/** Topic altijd via ID-queue; SRS alleen tijdens fouten-review. */
function shouldUseIdQueue(
  mode: QuizSelectionMode,
  phase: QuizSessionPhase,
): boolean {
  if (mode === "topic") return true;
  if (mode === "srs" && phase === "review") return true;
  return false;
}

/**
 * Beheert de oefening-queue voor topic- en SRS-selectie.
 * Decks roepen `startSession` aan na topic-keuze en `fetchNext`
 * voor elke volgende kaart.
 */
export function useQuizSession() {
  const queryClient = useQueryClient();
  const configRef = useRef<QuizSessionConfig | null>(null);
  const queueRef = useRef<string[]>([]);
  const queueIndexRef = useRef(0);
  const queueTotalRef = useRef(0);
  const initialQueueTotalRef = useRef(0);
  /** Aantal beoordeelde due-oefeningen in deze SRS-sessie (goed of fout). */
  const srsGradedCountRef = useRef(0);
  const mistakeIdsRef = useRef<Set<string>>(new Set());
  const skippedIneligibleRef = useRef(0);
  const sessionPhaseRef = useRef<QuizSessionPhase>("playing");
  const currentItemIdRef = useRef<string | null>(null);

  // Spiegel van configRef.current.selectionMode als state, omdat refs
  // niet tijdens render gelezen mogen worden (react-hooks/refs).
  const [activeSelectionMode, setActiveSelectionMode] =
    useState<QuizSelectionMode | null>(null);

  const [item, setItem] = useState<ExerciseQuizItem | null>(null);
  const [loading, setLoading] = useState(false);
  const [sessionLoading, setSessionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorStatus, setErrorStatus] = useState<number | null>(null);
  const [srsComplete, setSrsComplete] = useState(false);
  const [sessionPhase, setSessionPhaseState] =
    useState<QuizSessionPhase>("playing");

  const setSessionPhase = useCallback((phase: QuizSessionPhase) => {
    sessionPhaseRef.current = phase;
    setSessionPhaseState(phase);
  }, []);
  const [queueRemaining, setQueueRemaining] = useState(0);
  const [queueProgress, setQueueProgress] = useState(0);
  const [queueTotal, setQueueTotal] = useState(0);
  const [initialQueueTotal, setInitialQueueTotal] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [mistakeCount, setMistakeCount] = useState(0);
  const [skippedIneligible, setSkippedIneligible] = useState(0);

  const adoptItem = useCallback((data: ExerciseQuizItem) => {
    currentItemIdRef.current = data.id;
    setItem(data);
  }, []);

  const syncQueueState = useCallback((queueLength: number, index: number) => {
    queueTotalRef.current = queueLength;
    setQueueTotal(queueLength);
    setQueueProgress(index);
    setQueueRemaining(Math.max(0, queueLength - index));
  }, []);

  /** Label tijdens SRS-play: graded + 1 (1-based), N = vaste snapshot. */
  const syncSrsPlayingProgress = useCallback(() => {
    const total = queueTotalRef.current;
    if (total <= 0) return;
    const progress = Math.min(srsGradedCountRef.current + 1, total);
    setQueueProgress(progress);
    setQueueRemaining(Math.max(0, total - progress));
  }, []);

  /**
   * Einde SRS-hoofdrond: score + Fouten opnieuw doen (main-complete),
   * of empty-state als er niets beoordeeld is.
   */
  const completeSrsMainRound = useCallback(() => {
    currentItemIdRef.current = null;
    setItem(null);
    setError(null);
    setErrorStatus(null);

    if (srsGradedCountRef.current === 0) {
      setSrsComplete(true);
      return;
    }

    setMistakeCount(mistakeIdsRef.current.size);
    setSessionPhase("main-complete");
  }, [setSessionPhase]);

  const resetSession = useCallback(() => {
    configRef.current = null;
    setActiveSelectionMode(null);
    queueRef.current = [];
    queueIndexRef.current = 0;
    queueTotalRef.current = 0;
    initialQueueTotalRef.current = 0;
    srsGradedCountRef.current = 0;
    mistakeIdsRef.current = new Set();
    skippedIneligibleRef.current = 0;
    currentItemIdRef.current = null;
    setItem(null);
    setError(null);
    setErrorStatus(null);
    setSrsComplete(false);
    setSessionLoading(false);
    setSessionPhase("playing");
    setQueueRemaining(0);
    setQueueProgress(0);
    setQueueTotal(0);
    setInitialQueueTotal(0);
    setCorrectCount(0);
    setMistakeCount(0);
    setSkippedIneligible(0);
  }, [setSessionPhase]);

  const completeQueue = useCallback(() => {
    const config = configRef.current;
    if (!config) return;

    setItem(null);
    setQueueRemaining(0);

    if (sessionPhaseRef.current === "review") {
      setSessionPhase("all-complete");
      return;
    }

    if (config.selectionMode === "topic") {
      setMistakeCount(mistakeIdsRef.current.size);
      setSessionPhase("main-complete");
    }
  }, [setSessionPhase]);

  const startSession = useCallback(
    async (
      config: QuizSessionConfig,
      options?: StartSessionOptions,
    ): Promise<boolean> => {
      configRef.current = config;
      setActiveSelectionMode(config.selectionMode);
      queueRef.current = [];
      queueIndexRef.current = 0;
      srsGradedCountRef.current = 0;
      mistakeIdsRef.current = new Set();
      skippedIneligibleRef.current = 0;
      currentItemIdRef.current = null;
      setSrsComplete(false);
      setSessionPhase("playing");
      setError(null);
      setErrorStatus(null);
      setItem(null);
      setCorrectCount(0);
      setMistakeCount(0);
      setSkippedIneligible(0);
      syncQueueState(0, 0);
      setInitialQueueTotal(0);
      initialQueueTotalRef.current = 0;

      if (config.selectionMode === "topic") {
        setSessionLoading(true);
        try {
          const result = await fetchTopicExerciseIds(
            config.topic,
            options?.exerciseFilter,
          );
          skippedIneligibleRef.current = result.skippedIneligible;
          setSkippedIneligible(result.skippedIneligible);

          if (result.ids.length === 0) {
            const topicLabel =
              config.topic === "all" ? "dit topic" : `topic "${config.topic}"`;
            setError(
              result.skippedIneligible > 0
                ? `Geen geschikte oefeningen gevonden in ${topicLabel}.`
                : `Geen oefeningen gevonden in ${topicLabel}.`,
            );
            setErrorStatus(404);
            return false;
          }

          queueRef.current = result.ids;
          queueIndexRef.current = 0;
          initialQueueTotalRef.current = result.ids.length;
          setInitialQueueTotal(result.ids.length);
          syncQueueState(result.ids.length, 0);
          return true;
        } catch (e) {
          setError(e instanceof Error ? e.message : "Onbekende fout");
          setErrorStatus(500);
          return false;
        } finally {
          setSessionLoading(false);
        }
      }

      if (config.selectionMode === "srs") {
        const due = Math.max(0, options?.srsDueTotal ?? 0);
        if (due > 0) {
          initialQueueTotalRef.current = due;
          setInitialQueueTotal(due);
          // Progress 0 tot de eerste kaart geladen is (dan → 1 van N).
          syncQueueState(due, 0);
        }
      }

      return true;
    },
    [syncQueueState, setSessionPhase],
  );

  const fetchNext = useCallback(async () => {
    const config = configRef.current;
    if (!config) return;

    const phase = sessionPhaseRef.current;

    if (
      config.selectionMode === "srs" &&
      phase === "playing" &&
      queueTotalRef.current > 0 &&
      srsGradedCountRef.current >= queueTotalRef.current
    ) {
      completeSrsMainRound();
      return;
    }

    // Toon “x van N” al tijdens laden (zelfde ritme als topic-queue).
    if (config.selectionMode === "srs" && phase === "playing") {
      syncSrsPlayingProgress();
    }

    setLoading(true);
    setError(null);
    setErrorStatus(null);

    try {
      if (shouldUseIdQueue(config.selectionMode, phase)) {
        const queue = queueRef.current;
        const index = queueIndexRef.current;

        if (index >= queue.length) {
          completeQueue();
          return;
        }

        const exerciseId = queue[index];
        queueIndexRef.current = index + 1;
        syncQueueState(queue.length, index + 1);

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
        adoptItem(data);
        return;
      }

      const url = buildFetchUrl(config);
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as {
          error?: string;
          code?: string;
        };
        if (config.selectionMode === "srs" && body.code === "SRS_NOTHING_DUE") {
          completeSrsMainRound();
          return;
        }
        setErrorStatus(res.status);
        throw new Error(body.error ?? `Status ${res.status}`);
      }
      const data = (await res.json()) as ExerciseQuizItem;
      adoptItem(data);
      if (config.selectionMode === "srs" && phase === "playing") {
        syncSrsPlayingProgress();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Onbekende fout");
      setItem(null);
    } finally {
      setLoading(false);
    }
  }, [
    completeQueue,
    completeSrsMainRound,
    syncQueueState,
    syncSrsPlayingProgress,
    adoptItem,
  ]);

  /** Haalt oefeningen op met optionele validatie (bijv. sort-eligibility). */
  const fetchNextValidated = useCallback(
    async (
      isValid: (item: ExerciseQuizItem) => boolean,
      maxRetries = 8,
      invalidMessage?: string,
    ) => {
      const config = configRef.current;
      if (!config) return;

      const phase = sessionPhaseRef.current;

      if (shouldUseIdQueue(config.selectionMode, phase)) {
        await fetchNext();
        return;
      }

      if (
        config.selectionMode === "srs" &&
        phase === "playing" &&
        queueTotalRef.current > 0 &&
        srsGradedCountRef.current >= queueTotalRef.current
      ) {
        completeSrsMainRound();
        return;
      }

      if (config.selectionMode === "srs" && phase === "playing") {
        syncSrsPlayingProgress();
      }

      setLoading(true);
      setError(null);
      setErrorStatus(null);

      try {
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
              completeSrsMainRound();
              return;
            }
            setErrorStatus(res.status);
            throw new Error(body.error ?? `Status ${res.status}`);
          }
          const data = (await res.json()) as ExerciseQuizItem;
          if (isValid(data)) {
            adoptItem(data);
            if (config.selectionMode === "srs" && phase === "playing") {
              syncSrsPlayingProgress();
            }
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
    [fetchNext, adoptItem, completeSrsMainRound, syncSrsPlayingProgress],
  );

  const recordAnswer = useCallback((exerciseId: string, isCorrect: boolean) => {
    const config = configRef.current;
    if (!config) return;

    if (config.selectionMode === "srs") {
      // Alleen hoofdfase telt voor score / fouten-review / N-progress.
      if (sessionPhaseRef.current === "playing") {
        srsGradedCountRef.current += 1;
        const graded = srsGradedCountRef.current;
        const total = queueTotalRef.current;
        if (total > 0) {
          setQueueProgress(Math.min(graded, total));
          setQueueRemaining(Math.max(0, total - graded));
        }

        if (isCorrect) {
          setCorrectCount((prev) => prev + 1);
        } else {
          mistakeIdsRef.current.add(exerciseId);
          setMistakeCount(mistakeIdsRef.current.size);
        }
      }
      return;
    }

    if (config.selectionMode !== "topic") return;

    if (isCorrect) {
      setCorrectCount((prev) => prev + 1);
      return;
    }

    if (sessionPhaseRef.current === "playing") {
      mistakeIdsRef.current.add(exerciseId);
      setMistakeCount(mistakeIdsRef.current.size);
    }
  }, []);

  const startMistakeReview = useCallback(() => {
    const config = configRef.current;
    if (
      !config ||
      (config.selectionMode !== "topic" && config.selectionMode !== "srs")
    ) {
      return;
    }

    const mistakes = [...mistakeIdsRef.current];
    if (mistakes.length === 0) {
      setSessionPhase("all-complete");
      return;
    }

    const shuffled = fisherYatesShuffle(mistakes);
    queueRef.current = shuffled;
    queueIndexRef.current = 0;
    syncQueueState(shuffled.length, 0);
    setSessionPhase("review");
    setItem(null);
    setError(null);
    setErrorStatus(null);
  }, [syncQueueState, setSessionPhase]);

  const finishSession = useCallback(() => {
    setSessionPhase("all-complete");
    setItem(null);
  }, [setSessionPhase]);

  const recordSrsReview = useCallback(
    async (exerciseId: string, isCorrect: boolean) => {
      const config = configRef.current;
      if (!config || config.selectionMode !== "srs") return;
      // Geen dubbele schedule-write tijdens fouten-review.
      if (sessionPhaseRef.current !== "playing") return;

      try {
        await fetch("/api/exercise-progress", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ exerciseId, isCorrect }),
        });
        void queryClient.invalidateQueries({
          queryKey: queryKeys.dashboardStats(),
        });
        void queryClient.invalidateQueries({
          queryKey: queryKeys.exerciseProgress(),
        });
        void queryClient.invalidateQueries({
          queryKey: queryKeys.exerciseProgress("topics"),
        });
      } catch {
        // SRS-update is best-effort; quiz-poging staat al in quiz_attempts.
      }
    },
    [queryClient],
  );

  const isTopicSessionActive =
    activeSelectionMode === "topic" &&
    (sessionPhase === "playing" || sessionPhase === "review");

  const showPlayingUi =
    !srsComplete &&
    sessionPhase !== "main-complete" &&
    sessionPhase !== "all-complete";

  return {
    item,
    loading,
    sessionLoading,
    error,
    errorStatus,
    srsComplete,
    sessionPhase,
    queueRemaining,
    queueProgress,
    queueTotal,
    initialQueueTotal,
    correctCount,
    mistakeCount,
    skippedIneligible,
    isTopicSessionActive,
    showPlayingUi,
    startSession,
    resetSession,
    fetchNext,
    fetchNextValidated,
    recordAnswer,
    startMistakeReview,
    finishSession,
    recordSrsReview,
    selectionMode: activeSelectionMode,
  };
}
