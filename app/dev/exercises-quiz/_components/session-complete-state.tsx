"use client";

import { useEffect } from "react";

import {
  formatQuizShortcut,
  isQuizShortcut,
  QUIZ_SHORTCUTS,
} from "@/lib/keyboard/quiz-shortcuts";

import type { QuizSessionPhase } from "../_hooks/use-quiz-session";

type SessionCompleteStateProps = {
  phase: QuizSessionPhase;
  correctCount: number;
  totalCount: number;
  mistakeCount: number;
  skippedIneligible?: number;
  onStartMistakeReview: () => void;
  onFinish: () => void;
};

export function SessionCompleteState({
  phase,
  correctCount,
  totalCount,
  mistakeCount,
  skippedIneligible = 0,
  onStartMistakeReview,
  onFinish,
}: SessionCompleteStateProps) {
  useEffect(() => {
    if (phase !== "main-complete" || mistakeCount === 0) return;

    function onKeyDown(e: KeyboardEvent) {
      const target = e.target;
      const inInput =
        target instanceof HTMLElement &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable);
      if (inInput) return;

      if (isQuizShortcut(e, QUIZ_SHORTCUTS.reviewMistakes)) {
        e.preventDefault();
        onStartMistakeReview();
      }
    }

    window.addEventListener("keydown", onKeyDown, { capture: true });
    return () =>
      window.removeEventListener("keydown", onKeyDown, { capture: true });
  }, [phase, mistakeCount, onStartMistakeReview]);

  if (phase === "main-complete") {
    return (
      <div className="mx-auto max-w-lg space-y-4 text-center">
        <p className="text-lg font-semibold text-foreground">
          Ronde voltooid
        </p>
        <p className="text-sm text-muted-foreground">
          {correctCount} van {totalCount} oefeningen goed
          {mistakeCount > 0
            ? ` · ${mistakeCount} fout${mistakeCount === 1 ? "" : "en"}`
            : ""}
        </p>
        {skippedIneligible > 0 && (
          <p className="text-xs text-muted-foreground">
            {skippedIneligible} oefening
            {skippedIneligible === 1 ? "" : "en"} overgeslagen (niet geschikt
            voor deze quiz).
          </p>
        )}
        <div className="flex flex-col items-center gap-2 sm:flex-row sm:justify-center">
          {mistakeCount > 0 && (
            <button
              type="button"
              onClick={onStartMistakeReview}
              className="cursor-pointer rounded-xl bg-accent px-5 py-2.5 text-sm font-medium text-accent-foreground transition-colors hover:bg-accent/90"
            >
              Fouten opnieuw doen ({formatQuizShortcut(QUIZ_SHORTCUTS.reviewMistakes)})
            </button>
          )}
          <button
            type="button"
            onClick={onFinish}
            className="cursor-pointer rounded-xl border border-border bg-background px-5 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
          >
            {mistakeCount > 0 ? "Klaar" : "Nieuwe sessie starten"}
          </button>
        </div>
      </div>
    );
  }

  if (phase === "all-complete") {
    return (
      <div className="mx-auto max-w-lg space-y-4 text-center">
        <p className="text-lg font-semibold text-foreground">Sessie afgerond</p>
        <p className="text-sm text-muted-foreground">
          Goed gedaan! Je hebt alle oefeningen in deze sessie doorlopen.
        </p>
        <button
          type="button"
          onClick={onFinish}
          className="cursor-pointer rounded-xl bg-accent px-5 py-2.5 text-sm font-medium text-accent-foreground transition-colors hover:bg-accent/90"
        >
          Nieuwe sessie starten
        </button>
      </div>
    );
  }

  return null;
}

/** Voortgangstekst voor topic- en custom-sessies. */
export function formatQueueProgressLabel(
  progress: number,
  total: number,
  isReview: boolean,
): string | null {
  if (total <= 0) return null;
  if (isReview) {
    return `Fout ${progress} van ${total}`;
  }
  return `${progress} van ${total}`;
}
