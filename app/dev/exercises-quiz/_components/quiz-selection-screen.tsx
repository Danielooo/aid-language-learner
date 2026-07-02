"use client";

import { useEffect, useState } from "react";

import {
  QUIZ_SELECTION_MODE_KEY,
  QUIZ_SELECTION_MODES,
  isValidQuizSelectionMode,
  selectionModeDescription,
  selectionModeLabel,
} from "@/lib/quiz/selection-config";

import { SrsExplainer } from "./srs-explainer";
import { TopicPickerGrid } from "./topic-picker-grid";

import type { QuizSelectionMode } from "@/lib/quiz/selection-config";
import type { ProgressStatsResponse } from "@/app/api/dev/exercise-progress/route";

type QuizSelectionScreenProps = {
  selectedMode: QuizSelectionMode;
  onSelect: (mode: QuizSelectionMode) => void;
  onContinue: () => void;
};

export function QuizSelectionScreen({
  selectedMode,
  onSelect,
  onContinue,
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
          Kies willekeurige oefeningen, spaced repetition of een eigen selectie.
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

      <div className="flex justify-end">
        <button
          type="button"
          onClick={onContinue}
          className="cursor-pointer rounded-xl bg-accent px-5 py-2.5 text-sm font-medium text-accent-foreground transition-colors hover:bg-accent/90"
        >
          Verder
        </button>
      </div>
    </section>
  );
}

/** Leest opgeslagen selectiemodus uit localStorage (client-only). */
export function useQuizSelectionMode(defaultMode: QuizSelectionMode = "random") {
  const [mode, setMode] = useState<QuizSelectionMode>(defaultMode);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = window.localStorage.getItem(QUIZ_SELECTION_MODE_KEY);
        if (stored && isValidQuizSelectionMode(stored)) setMode(stored);
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
