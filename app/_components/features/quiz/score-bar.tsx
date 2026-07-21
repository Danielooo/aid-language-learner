type ScoreBarProps = {
  score: { correct: number; incorrect: number; total: number };
  hydrated: boolean;
  /** Bijv. "3 van 10" — zelfde regel als Goed/Fout/Totaal. */
  progressLabel?: string | null;
};

export function ScoreBar({ score, hydrated, progressLabel }: ScoreBarProps) {
  const pct =
    score.total === 0 ? 0 : Math.round((score.correct / score.total) * 100);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border bg-muted/30 px-4 py-2 text-sm">
      <div className="flex flex-wrap items-center gap-3">
        <span>
          Goed:{" "}
          <strong className="text-foreground">
            {hydrated ? score.correct : "…"}
          </strong>
        </span>
        <span aria-hidden>·</span>
        <span>
          Fout:{" "}
          <strong className="text-foreground">
            {hydrated ? score.incorrect : "…"}
          </strong>
        </span>
        <span aria-hidden>·</span>
        <span>
          Totaal:{" "}
          <strong className="text-foreground">
            {hydrated ? score.total : "…"}
          </strong>
        </span>
        {hydrated && score.total > 0 && (
          <span className="text-muted-foreground">({pct}%)</span>
        )}
      </div>
      {progressLabel ? (
        <span className="text-sm font-medium tabular-nums text-foreground">
          {progressLabel}
        </span>
      ) : null}
    </div>
  );
}
