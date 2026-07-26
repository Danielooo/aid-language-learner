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
        <p className="text-foreground text-lg font-semibold">Ronde voltooid</p>

        <ScoreSummary correctCount={correctCount} totalCount={totalCount} />

        {skippedIneligible > 0 && (
          <p className="text-muted-foreground text-xs">
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
              className="bg-accent text-accent-foreground hover:bg-accent/90 cursor-pointer rounded-xl px-5 py-2.5 text-sm font-medium transition-colors"
            >
              Fouten opnieuw doen
            </button>
          )}
          <button
            type="button"
            onClick={onFinish}
            className="border-border bg-background text-foreground hover:bg-muted cursor-pointer rounded-xl border px-5 py-2.5 text-sm font-medium transition-colors"
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
        <p className="text-foreground text-lg font-semibold">Sessie afgerond</p>
        <p className="text-muted-foreground text-sm">
          Goed gedaan! Je hebt alle oefeningen in deze sessie doorlopen. Foute
          antwoorden komen automatisch sneller terug in je herhaalschema.
        </p>
        <div className="flex flex-col items-center gap-2 sm:flex-row sm:justify-center">
          <button
            type="button"
            onClick={onFinish}
            className="bg-accent text-accent-foreground hover:bg-accent/90 cursor-pointer rounded-xl px-5 py-2.5 text-sm font-medium transition-colors"
          >
            Nog een ronde
          </button>
          <Link
            href={APP_ROUTES.oefenen}
            className="border-border bg-background text-foreground hover:bg-muted rounded-xl border px-5 py-2.5 text-sm font-medium transition-colors"
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
    <div className="border-border bg-card text-card-foreground space-y-2 rounded-2xl border p-5">
      <p className="text-foreground text-3xl font-semibold tracking-tight">
        {pct}%
      </p>
      <div
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Percentage goed"
        className="bg-muted h-2 overflow-hidden rounded-full"
      >
        <div
          className="bg-accent h-full rounded-full transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-muted-foreground text-sm">
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
        className="text-muted-foreground hover:text-foreground text-xs font-medium underline-offset-2 hover:underline"
      >
        Terug naar Oefenen
      </Link>
    </p>
  );
}

/** Voortgangstekst voor topic-sessies. */
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
