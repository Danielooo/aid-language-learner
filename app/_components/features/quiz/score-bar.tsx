type ScoreBarProps = {
  score: { correct: number; incorrect: number; total: number };
  hydrated: boolean;
  onReset: () => void;
};

export function ScoreBar({ score, hydrated, onReset }: ScoreBarProps) {
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
      <button
        type="button"
        onClick={onReset}
        disabled={!hydrated || score.total === 0}
        className="cursor-pointer text-xs text-muted-foreground hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
      >
        Reset score
      </button>
    </div>
  );
}
