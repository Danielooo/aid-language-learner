"use client";

import Link from "next/link";

import { APP_ROUTES } from "@/lib/routes";

import type { QuizSessionPhase } from "./hooks/use-quiz-session";

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
  if (phase === "main-complete") {
    return (
      <div className="mx-auto max-w-lg space-y-5 text-center">
        <p className="text-lg font-semibold text-foreground">
          Ronde voltooid
        </p>

        <ScoreSummary correctCount={correctCount} totalCount={totalCount} />

        {skippedIneligible > 0 && (
          <p className="text-xs text-muted-foreground">
            {skippedIneligible} oefening
            {skippedIneligible === 1 ? "" : "en"} overgeslagen (niet geschikt
            voor deze sessie).
          </p>
        )}
        <div className="flex flex-col items-center gap-2 sm:flex-row sm:justify-center">
          {mistakeCount > 0 && (
            <button
              type="button"
              onClick={onStartMistakeReview}
              className="cursor-pointer rounded-xl bg-accent px-5 py-2.5 text-sm font-medium text-accent-foreground transition-colors hover:bg-accent/90"
            >
              Fouten opnieuw doen
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
        <BackToOefenenLink />
      </div>
    );
  }

  if (phase === "all-complete") {
    return (
      <div className="mx-auto max-w-lg space-y-5 text-center">
        <p className="text-lg font-semibold text-foreground">Sessie afgerond</p>
        <p className="text-sm text-muted-foreground">
          Goed gedaan! Je hebt alle oefeningen in deze sessie doorlopen. Foute
          antwoorden komen automatisch sneller terug in je herhaalschema.
        </p>
        <div className="flex flex-col items-center gap-2 sm:flex-row sm:justify-center">
          <button
            type="button"
            onClick={onFinish}
            className="cursor-pointer rounded-xl bg-accent px-5 py-2.5 text-sm font-medium text-accent-foreground transition-colors hover:bg-accent/90"
          >
            Nog een ronde
          </button>
          <Link
            href={APP_ROUTES.oefenen}
            className="rounded-xl border border-border bg-background px-5 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
          >
            Terug naar Oefenen
          </Link>
        </div>
      </div>
    );
  }

  return null;
}

/** Compacte score met voortgangsbalk: percentage goed van de ronde. */
function ScoreSummary({
  correctCount,
  totalCount,
}: {
  correctCount: number;
  totalCount: number;
}) {
  const pct =
    totalCount > 0 ? Math.round((correctCount / totalCount) * 100) : 0;
  const mistakes = totalCount - correctCount;

  return (
    <div className="space-y-2 rounded-2xl border border-border bg-card p-5 text-card-foreground">
      <p className="text-3xl font-semibold tracking-tight text-foreground">
        {pct}%
      </p>
      <div
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Percentage goed"
        className="h-2 overflow-hidden rounded-full bg-muted"
      >
        <div
          className="h-full rounded-full bg-accent transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-sm text-muted-foreground">
        {correctCount} van {totalCount} goed
        {mistakes > 0 ? ` · ${mistakes} fout${mistakes === 1 ? "" : "en"}` : ""}
      </p>
    </div>
  );
}

function BackToOefenenLink() {
  return (
    <p>
      <Link
        href={APP_ROUTES.oefenen}
        className="text-xs font-medium text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
      >
        Terug naar Oefenen
      </Link>
    </p>
  );
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
