"use client";

type QuizBackToOverviewButtonProps = {
  onClick: () => void;
  /** Esc-hint tonen (alleen als Esc ook echt gebonden is). Default: true. */
  showEscHint?: boolean;
};

/**
 * Consistente terug-actie voor alle Oefenen-modi (Flashcards / Sorteren / Typen).
 * Esc wordt in de deck-keydown-handler naar dezelfde handler geleid.
 */
export function QuizBackToOverviewButton({
  onClick,
  showEscHint = true,
}: QuizBackToOverviewButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex h-9 items-center gap-2 rounded-md border border-border px-3 text-sm text-foreground hover:bg-muted"
    >
      Terug naar overzicht
      {showEscHint ? (
        <kbd className="rounded border border-border bg-background px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
          Esc
        </kbd>
      ) : null}
    </button>
  );
}
