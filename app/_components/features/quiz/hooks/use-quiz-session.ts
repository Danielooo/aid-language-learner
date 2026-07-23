"use client";

import { useCallback, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { fetchTopicExerciseIds } from "@/lib/quiz/fetch-topic-exercise-ids";
import { fisherYatesShuffle } from "@/lib/quiz/shuffle";
import { queryKeys } from "@/lib/query-keys";

import type { ExercisePickerItem } from "@/types/quiz";
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
  customExerciseIds?: string[];
};

export type StartSessionOptions = {
  exerciseFilter?: (item: ExercisePickerItem) => boolean;
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
  return qs.length > 0
    ? `/api/quiz?${qs}`
    : "/api/quiz";
}

function usesQueue(mode: QuizSelectionMode): boolean {
  return mode === "custom" || mode === "topic";
}

/**
 * Beheert de oefening-queue voor topic, SRS en custom selectie.
 * Decks roepen `startSession` aan na topic/picker-keuze en `fetchNext`
 * voor elke volgende kaart.
 */
export function useQuizSession() {
  const queryClient = useQueryClient();
  const configRef = useRef<QuizSessionConfig | null>(null);
  const queueRef = useRef<string[]>([]);
  const queueIndexRef = useRef(0);
  const queueTotalRef = useRef(0);
  const initialQueueTotalRef = useRef(0);
  const mistakeIdsRef = useRef<Set<string>>(new Set());
  const skippedIneligibleRef = useRef(0);
  const sessionPhaseRef = useRef<QuizSessionPhase>("playing");
  /** Bezochte oefeningen (SRS e.d.) zodat Vorige ook zonder queue werkt. */
  const visitHistoryRef = useRef<string[]>([]);
  const currentItemIdRef = useRef<string | null>(null);
  const navigatingBackRef = useRef(false);

  // Spiegel van configRef.current.selectionMode als state, omdat refs
  // niet tijdens render gelezen mogen worden (react-hooks/refs).
  const [activeSelectionMode, setActiveSelectionMode] =
    useState<QuizSelectionMode | null>(null);

  const [item, setItem] = useState<ExerciseQuizItem | null>(null);
  const [loading, setLoading] = useState(false);
  const [sessionLoading, setSessionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorStatus, setErrorStatus] = useState<number | null>(null);
  const [sessionComplete, setSessionComplete] = useState(false);
  const [srsComplete, setSrsComplete] = useState(false);
  const [sessionPhase, setSessionPhaseState] = useState<QuizSessionPhase>("playing");

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
  const [visitHistoryLength, setVisitHistoryLength] = useState(0);

  const rememberCurrentBeforeAdvance = useCallback(() => {
    if (navigatingBackRef.current) {
      navigatingBackRef.current = false;
      return;
    }
    const currentId = currentItemIdRef.current;
    if (!currentId) return;
    visitHistoryRef.current.push(currentId);
    setVisitHistoryLength(visitHistoryRef.current.length);
  }, []);

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

  const resetSession = useCallback(() => {
    configRef.current = null;
    setActiveSelectionMode(null);
    queueRef.current = [];
    queueIndexRef.current = 0;
    queueTotalRef.current = 0;
    initialQueueTotalRef.current = 0;
    mistakeIdsRef.current = new Set();
    skippedIneligibleRef.current = 0;
    visitHistoryRef.current = [];
    currentItemIdRef.current = null;
    navigatingBackRef.current = false;
    setVisitHistoryLength(0);
    setItem(null);
    setError(null);
    setErrorStatus(null);
    setSessionComplete(false);
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

    if (config.selectionMode === "custom") {
      setSessionComplete(true);
      return;
    }

    if (config.selectionMode === "topic") {
      if (sessionPhaseRef.current === "review") {
        setSessionPhase("all-complete");
      } else {
        setMistakeCount(mistakeIdsRef.current.size);
        setSessionPhase("main-complete");
      }
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
      mistakeIdsRef.current = new Set();
      skippedIneligibleRef.current = 0;
      visitHistoryRef.current = [];
      currentItemIdRef.current = null;
      navigatingBackRef.current = false;
      setVisitHistoryLength(0);
      setSessionComplete(false);
      setSrsComplete(false);
      setSessionPhase("playing");
      setError(null);
      setErrorStatus(null);
      setItem(null);
      setCorrectCount(0);
      setMistakeCount(0);
      setSkippedIneligible(0);
      syncQueueState(0, 0);

      if (config.selectionMode === "custom" && config.customExerciseIds) {
        const shuffled = fisherYatesShuffle([...config.customExerciseIds]);
        queueRef.current = shuffled;
        queueIndexRef.current = 0;
        initialQueueTotalRef.current = shuffled.length;
        setInitialQueueTotal(shuffled.length);
        syncQueueState(shuffled.length, 0);
        return true;
      }

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

      return true;
    },
    [syncQueueState, setSessionPhase],
  );

  const fetchNext = useCallback(async () => {
    const config = configRef.current;
    if (!config) return;

    setLoading(true);
    setError(null);
    setErrorStatus(null);

    try {
      if (usesQueue(config.selectionMode)) {
        const queue = queueRef.current;
        const index = queueIndexRef.current;

        if (index >= queue.length) {
          completeQueue();
          return;
        }

        const exerciseId = queue[index];
        queueIndexRef.current = index + 1;
        syncQueueState(queue.length, index + 1);
        rememberCurrentBeforeAdvance();

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

      rememberCurrentBeforeAdvance();
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
          currentItemIdRef.current = null;
          setItem(null);
          setError(null);
          setErrorStatus(null);
          return;
        }
        setErrorStatus(res.status);
        throw new Error(body.error ?? `Status ${res.status}`);
      }
      const data = (await res.json()) as ExerciseQuizItem;
      adoptItem(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Onbekende fout");
      setItem(null);
    } finally {
      setLoading(false);
    }
  }, [completeQueue, syncQueueState, rememberCurrentBeforeAdvance, adoptItem]);

  /** Haalt oefeningen op met optionele validatie (bijv. sort-eligibility). */
  const fetchNextValidated = useCallback(
    async (
      isValid: (item: ExerciseQuizItem) => boolean,
      maxRetries = 8,
      invalidMessage?: string,
    ) => {
      const config = configRef.current;
      if (!config) return;

      if (usesQueue(config.selectionMode)) {
        await fetchNext();
        return;
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
              setSrsComplete(true);
              currentItemIdRef.current = null;
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
            rememberCurrentBeforeAdvance();
            adoptItem(data);
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
    [fetchNext, rememberCurrentBeforeAdvance, adoptItem],
  );

  const recordAnswer = useCallback((exerciseId: string, isCorrect: boolean) => {
    const config = configRef.current;
    if (!config || config.selectionMode !== "topic") return;

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
    if (!config || config.selectionMode !== "topic") return;

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

  /**
   * Ga één oefening terug.
   * Topic/custom: queue-index. SRS: bezoekhistorie van deze sessie.
   * Score wordt niet teruggedraaid; alleen navigatie.
   */
  const fetchPrevious = useCallback(async () => {
    const config = configRef.current;
    if (!config) return false;

    setSessionComplete(false);
    setSrsComplete(false);
    if (
      sessionPhaseRef.current === "main-complete" ||
      sessionPhaseRef.current === "all-complete"
    ) {
      setSessionPhase("playing");
    }

    if (usesQueue(config.selectionMode)) {
      // queueIndex staat voorbij de huidige kaart; vorige = index - 2.
      if (queueIndexRef.current <= 1) return false;

      queueIndexRef.current -= 2;
      // Huidige kaart niet opnieuw op de historie pushen.
      navigatingBackRef.current = true;
      if (visitHistoryRef.current.length > 0) {
        visitHistoryRef.current.pop();
        setVisitHistoryLength(visitHistoryRef.current.length);
      }
      await fetchNext();
      return true;
    }

    if (visitHistoryRef.current.length === 0) return false;

    const previousId = visitHistoryRef.current.pop()!;
    setVisitHistoryLength(visitHistoryRef.current.length);
    navigatingBackRef.current = true;

    setLoading(true);
    setError(null);
    setErrorStatus(null);
    try {
      const url = buildFetchUrl(config, previousId);
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
      navigatingBackRef.current = false;
      return true;
    } catch (e) {
      navigatingBackRef.current = false;
      setError(e instanceof Error ? e.message : "Onbekende fout");
      setItem(null);
      return false;
    } finally {
      setLoading(false);
    }
  }, [fetchNext, setSessionPhase, adoptItem]);

  const canGoPrevious =
    sessionPhase !== "main-complete" &&
    sessionPhase !== "all-complete" &&
    (activeSelectionMode === "topic" || activeSelectionMode === "custom"
      ? queueProgress > 1
      : activeSelectionMode === "srs" && visitHistoryLength > 0);

  const isTopicSessionActive =
    activeSelectionMode === "topic" &&
    (sessionPhase === "playing" || sessionPhase === "review");

  const showPlayingUi =
    !sessionComplete &&
    !srsComplete &&
    sessionPhase !== "main-complete" &&
    sessionPhase !== "all-complete";

  return {
    item,
    loading,
    sessionLoading,
    error,
    errorStatus,
    sessionComplete,
    srsComplete,
    sessionPhase,
    queueRemaining,
    queueProgress,
    queueTotal,
    initialQueueTotal,
    correctCount,
    mistakeCount,
    skippedIneligible,
    canGoPrevious,
    isTopicSessionActive,
    showPlayingUi,
    startSession,
    resetSession,
    fetchNext,
    fetchPrevious,
    fetchNextValidated,
    recordAnswer,
    startMistakeReview,
    finishSession,
    recordSrsReview,
    selectionMode: activeSelectionMode,
  };
}
