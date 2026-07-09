"use client";

import { useEffect, useState } from "react";

import {
  QUIZ_SELECTION_MODE_KEY,
  QUIZ_SELECTION_MODES,
  normalizeQuizSelectionMode,
  selectionModeDescription,
  selectionModeLabel,
} from "@/lib/quiz/selection-config";

import { SrsExplainer } from "./srs-explainer";

import type { QuizSelectionMode } from "@/lib/quiz/selection-config";
import type { ProgressStatsResponse } from "@/app/api/dev/exercise-progress/route";

type QuizSelectionScreenProps = {
  selectedMode: QuizSelectionMode;
  onSelect: (mode: QuizSelectionMode) => void;
};

export function QuizSelectionScreen({
  selectedMode,
  onSelect,
}: QuizSelectionScreenProps) {
  const [stats, setStats] = useState<ProgressStatsResponse | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/dev/exercise-progress", { cache: "no-store" });
        if (!res.ok) throw new Error(`Status ${res.status}`);
        const data = (await res.json()) as ProgressStatsResponse;
        if (!cancelled) setStats(data);
      } catch {
        if (!cancelled) setStats(null);
      } finally {
        if (!cancelled) setStatsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section className="space-y-4 rounded-2xl border border-border bg-gradient-to-b from-muted/30 to-background p-6 sm:p-8">
      <div className="space-y-1">
        <h2 className="text-sm font-semibold text-foreground">
          Hoe wil je oefenen?
        </h2>
        <p className="text-xs text-muted-foreground">
          Oefen een heel topic, herhaal met spaced repetition of kies zelf oefeningen.
        </p>
      </div>

      <div
        className="grid gap-3 sm:grid-cols-3"
        role="radiogroup"
        aria-label="Oefenmodus"
      >
        {QUIZ_SELECTION_MODES.map((mode) => {
          const isSelected = mode === selectedMode;
          const dueCount = mode === "srs" ? stats?.dueCount : undefined;

          return (
            <button
              key={mode}
              type="button"
              role="radio"
              aria-checked={isSelected}
              onClick={() => onSelect(mode)}
              className={`flex min-h-32 cursor-pointer flex-col items-start justify-between rounded-2xl border p-5 text-left transition-all hover:-translate-y-0.5 hover:shadow-md ${
                isSelected
                  ? "border-accent bg-gradient-to-br from-accent/20 via-accent/5 to-card shadow-md ring-2 ring-accent/30"
                  : "border-border bg-card hover:border-accent/30 hover:bg-muted/30"
              }`}
            >
              <div className="space-y-1">
                <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                  Modus
                </span>
                <h3 className="text-base font-semibold leading-snug text-foreground">
                  {selectionModeLabel(mode)}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {selectionModeDescription(mode)}
                </p>
              </div>
              {mode === "srs" && (
                <p className="text-xs font-medium text-accent">
                  {statsLoading
                    ? "Laden…"
                    : `${dueCount ?? 0} klaar voor herhaling`}
                </p>
              )}
            </button>
          );
        })}
      </div>

      {selectedMode === "srs" && <SrsExplainer compact />}
    </section>
  );
}

/**
 * Leest opgeslagen selectiemodus uit localStorage (client-only).
 * Een `?modus=` query-param wint van localStorage, zodat bijvoorbeeld
 * de Vandaag-pagina direct naar SRS-herhaling kan deeplinken.
 */
export function useQuizSelectionMode(defaultMode: QuizSelectionMode = "topic") {
  const [mode, setMode] = useState<QuizSelectionMode>(defaultMode);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const fromQuery = new URLSearchParams(window.location.search).get(
          "modus",
        );
        const queryMode = fromQuery
          ? normalizeQuizSelectionMode(fromQuery)
          : null;
        if (queryMode) {
          // Query-param en localStorage zijn pas na mount leesbaar; deze
          // eenmalige sync setState is bewust (SSR-hydratie).
          // eslint-disable-next-line react-hooks/set-state-in-effect
          setMode(queryMode);
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

  return { mode, setMode: persistMode, hydrated };
}
