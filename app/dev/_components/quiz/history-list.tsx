import { isFlashcardAttempt } from "./constants";

export type HistoryAttempt = {
  exerciseId: string;
  source_text: string;
  target_text: string;
  topic: string | null;
  userAnswer: string;
  isCorrect: boolean;
  at: number;
};

type HistoryListProps = {
  attempts: ReadonlyArray<HistoryAttempt>;
  emptyMessage?: string;
};

function formatUserAnswer(attempt: HistoryAttempt): string {
  if (isFlashcardAttempt(attempt.userAnswer)) {
    return "zelf beoordeeld";
  }
  return attempt.userAnswer || "(leeg)";
}

export function HistoryList({
  attempts,
  emptyMessage = "Nog geen pogingen — controleer een oefening om te beginnen.",
}: HistoryListProps) {
  if (attempts.length === 0) {
    return (
      <p className="px-4 pb-4 text-xs text-muted-foreground">{emptyMessage}</p>
    );
  }
  return (
    <ul className="divide-y divide-border px-4 pb-3 text-xs">
      {attempts.map((a) => (
        <li
          key={`${a.exerciseId}-${a.at}`}
          className="flex flex-col gap-0.5 py-2"
        >
          <div className="flex items-center gap-2">
            <span
              className={
                a.isCorrect
                  ? "rounded bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700 dark:text-emerald-300"
                  : "rounded bg-destructive/15 px-1.5 py-0.5 text-[10px] font-medium text-destructive"
              }
            >
              {a.isCorrect ? "goed" : "fout"}
            </span>
            <span className="font-medium text-foreground">{a.source_text}</span>
            {a.topic && (
              <span className="rounded bg-muted px-1 py-0.5 text-[9px] uppercase tracking-wide text-muted-foreground">
                {a.topic}
              </span>
            )}
            {isFlashcardAttempt(a.userAnswer) && (
              <span className="rounded bg-muted px-1 py-0.5 text-[9px] uppercase tracking-wide text-muted-foreground">
                flashcard
              </span>
            )}
          </div>
          <div className="ml-1 text-muted-foreground">
            <span className="opacity-70">jij:</span>{" "}
            <span>{formatUserAnswer(a)}</span>
            {!a.isCorrect && (
              <>
                {" "}
                <span className="opacity-70">→ moest:</span>{" "}
                <span>{a.target_text}</span>
              </>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}
