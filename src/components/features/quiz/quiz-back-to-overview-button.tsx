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
      className="border-border text-foreground hover:bg-muted inline-flex h-9 items-center gap-2 rounded-md border px-3 text-sm"
    >
      Terug naar overzicht
      {showEscHint ? (
        <kbd className="border-border bg-background text-muted-foreground rounded border px-1.5 py-0.5 font-mono text-[10px]">
          Esc
        </kbd>
      ) : null}
    </button>
  );
}
