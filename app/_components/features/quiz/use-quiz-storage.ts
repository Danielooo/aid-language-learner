"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

// Bron-van-waarheid voor quiz-historie is Supabase (tabel
// `quiz_attempts`). RLS scope't naar `user_id = auth.uid()`, dus elke
// ingelogde user ziet alleen eigen pogingen. Public API is bewust
// ongewijzigd zodat callers (`quiz.tsx`, `dashboard.tsx`) niets hoeven
// aan te passen.
//
// Strategie:
//   * GET op mount → vul `attempts`
//   * POST per `recordAttempt` met optimistische update (UI blijft snel),
//     bij netwerkfout: rollback + console.warn (dev-only, geen toast)
//   * DELETE bij `reset`, ook optimistisch
//   * `score` is een afgeleide van `attempts` — geen aparte teller meer

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
  const [attempts, setAttempts] = useState<QuizAttempt[]>([]);
  const [hydrated, setHydrated] = useState(false);

  // Initiële fetch. AbortController zodat een unmount tijdens de fetch
  // geen "Cannot update state on unmounted component"-warn triggert.
  useEffect(() => {
    const controller = new AbortController();
    (async () => {
      try {
        const res = await fetch("/api/quiz-attempts", {
          cache: "no-store",
          signal: controller.signal,
        });
        if (!res.ok) throw new Error(`Status ${res.status}`);
        const data = (await res.json()) as GetResponse;
        setAttempts(data.attempts);
      } catch (err) {
        if (controller.signal.aborted) return;
        // Stilzwijgend falen mag niet — anders blijft het dashboard
        // op "geen pogingen" hangen zonder uitleg. Loggen volstaat
        // voor dev-only; geen toast-systeem in de codebase.
        console.warn("Quiz-historie ophalen mislukt:", err);
      } finally {
        if (!controller.signal.aborted) setHydrated(true);
      }
    })();
    return () => controller.abort();
  }, []);

  const recordAttempt = useCallback((attempt: QuizAttempt) => {
    // Optimistisch vooraan toevoegen zodat de UI direct reageert
    // (FeedbackBanner verschijnt instant, score-bar telt op).
    setAttempts((prev) => [attempt, ...prev]);

    void (async () => {
      try {
        const res = await fetch("/api/quiz-attempts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(toQuizAttemptPostBody(attempt)),
        });
        if (!res.ok) {
          throw new Error(`Status ${res.status}`);
        }
      } catch (err) {
        // Rollback: trek alleen díe attempt eruit, niet alle pogingen
        // sinds. Matchen op (exerciseId + at) is uniek genoeg voor
        // pogingen die binnen één ms van elkaar liggen niet voorkomen
        // (één user, één klik per submit).
        console.warn("Attempt opslaan mislukt, rollback:", err);
        setAttempts((prev) =>
          prev.filter(
            (a) => !(a.exerciseId === attempt.exerciseId && a.at === attempt.at),
          ),
        );
      }
    })();
  }, []);

  const reset = useCallback(() => {
    const snapshot = attempts;
    setAttempts([]);
    void (async () => {
      try {
        const res = await fetch("/api/quiz-attempts", {
          method: "DELETE",
        });
        if (!res.ok) throw new Error(`Status ${res.status}`);
      } catch (err) {
        console.warn("Reset mislukt, rollback:", err);
        setAttempts(snapshot);
      }
    })();
  }, [attempts]);

  const score = useMemo<QuizScore>(
    () => (attempts.length === 0 ? EMPTY_SCORE : summarize(attempts)),
    [attempts],
  );

  return { score, attempts, recordAttempt, reset, hydrated };
}
