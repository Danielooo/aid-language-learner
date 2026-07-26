"use client";

import { useEffect, useState } from "react";

import {
  QUIZ_SELECTION_MODE_KEY,
  normalizeQuizSelectionMode,
} from "@/lib/quiz/selection-config";

import type { QuizSelectionMode } from "@/lib/quiz/selection-config";

/**
 * Leest selectiemodus uit `?modus=` (hub-deeplink) of localStorage.
 * Alleen `topic` | `srs`. Ongeldige/legacy query → `fromQuery` false.
 * `fromQuery` is true wanneer de modus uit de URL kwam.
 */
export function useQuizSelectionMode(defaultMode: QuizSelectionMode = "topic") {
  const [mode, setMode] = useState<QuizSelectionMode>(defaultMode);
  const [hydrated, setHydrated] = useState(false);
  const [fromQuery, setFromQuery] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const queryValue = new URLSearchParams(window.location.search).get(
          "modus",
        );
        const queryMode = queryValue
          ? normalizeQuizSelectionMode(queryValue)
          : null;
        if (queryMode) {
          // Query-param en localStorage zijn pas na mount leesbaar; deze
          // eenmalige sync setState is bewust (SSR-hydratie).
          // eslint-disable-next-line react-hooks/set-state-in-effect
          setMode(queryMode);
          setFromQuery(true);
          window.localStorage.setItem(QUIZ_SELECTION_MODE_KEY, queryMode);
          setHydrated(true);
          return;
        }
        const stored = window.localStorage.getItem(QUIZ_SELECTION_MODE_KEY);
        const normalized = stored ? normalizeQuizSelectionMode(stored) : null;
        if (normalized) setMode(normalized);
      } catch {
        // localStorage geblokkeerd.
      }
    }
    setHydrated(true);
  }, []);

  function persistMode(next: QuizSelectionMode) {
    setMode(next);
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(QUIZ_SELECTION_MODE_KEY, next);
      } catch {
        // Keuze geldt alleen voor deze sessie.
      }
    }
  }

  return { mode, setMode: persistMode, hydrated, fromQuery };
}
