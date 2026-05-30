"use client";

import { useCallback, useEffect, useState } from "react";

// Persistente quiz-state in localStorage. Bewust géén Context of
// reducer: één enkele consument (de Quiz client-component), één key
// per ding. SSR-veilig via een mounted-flag — Next.js prerender'ed de
// client-component op de server zonder window/localStorage.

const SCORE_KEY = "aid:tatoeba-quiz:score";
const HISTORY_KEY = "aid:tatoeba-quiz:history";
const HISTORY_LIMIT = 50;

export type QuizScore = {
  correct: number;
  incorrect: number;
  total: number;
};

export type QuizAttempt = {
  sentenceId: number;
  spanish: string;
  dutchOptions: string[];
  userAnswer: string;
  isCorrect: boolean;
  at: number;
};

const EMPTY_SCORE: QuizScore = { correct: 0, incorrect: 0, total: 0 };

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (raw === null) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    // Corrupte JSON of getItem-error: behandel als afwezig.
    return fallback;
  }
}

function writeJson<T>(key: string, value: T): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage vol of geblokkeerd: stilzwijgend negeren — quiz draait
    // in-memory door.
  }
}

export function useQuizStorage() {
  const [score, setScore] = useState<QuizScore>(EMPTY_SCORE);
  const [attempts, setAttempts] = useState<QuizAttempt[]>([]);
  const [hydrated, setHydrated] = useState(false);

  // Hydratie pas in useEffect zodat SSR-output deterministisch is.
  useEffect(() => {
    setScore(readJson<QuizScore>(SCORE_KEY, EMPTY_SCORE));
    setAttempts(readJson<QuizAttempt[]>(HISTORY_KEY, []));
    setHydrated(true);
  }, []);

  const recordAttempt = useCallback((attempt: QuizAttempt) => {
    setScore((prev) => {
      const next: QuizScore = {
        correct: prev.correct + (attempt.isCorrect ? 1 : 0),
        incorrect: prev.incorrect + (attempt.isCorrect ? 0 : 1),
        total: prev.total + 1,
      };
      writeJson(SCORE_KEY, next);
      return next;
    });
    setAttempts((prev) => {
      const next = [attempt, ...prev].slice(0, HISTORY_LIMIT);
      writeJson(HISTORY_KEY, next);
      return next;
    });
  }, []);

  const reset = useCallback(() => {
    setScore(EMPTY_SCORE);
    setAttempts([]);
    writeJson(SCORE_KEY, EMPTY_SCORE);
    writeJson(HISTORY_KEY, []);
  }, []);

  return { score, attempts, recordAttempt, reset, hydrated };
}
