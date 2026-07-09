"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { isAnswerCorrect } from "@/lib/quiz/compare";

import { useQuizStorage } from "./use-quiz-storage";

import type { QuizSentence } from "@/app/api/dev/tatoeba-quiz/route";

type Feedback = {
  isCorrect: boolean;
  correctAnswers: string[];
};

export function Quiz() {
  const [sentence, setSentence] = useState<QuizSentence | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [answer, setAnswer] = useState("");
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [showHistory, setShowHistory] = useState(false);

  const inputRef = useRef<HTMLTextAreaElement>(null);

  const { score, attempts, recordAttempt, reset, hydrated } = useQuizStorage();

  const fetchNext = useCallback(async () => {
    setLoading(true);
    setError(null);
    setFeedback(null);
    setAnswer("");
    try {
      // cache: "no-store" → elke klik echt een nieuwe random zin.
      const res = await fetch("/api/dev/tatoeba-quiz", { cache: "no-store" });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? `Status ${res.status}`);
      }
      const data = (await res.json()) as QuizSentence;
      setSentence(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Onbekende fout");
      setSentence(null);
    } finally {
      setLoading(false);
    }
  }, []);

  // Eerste zin laden zodra de component mount.
  useEffect(() => {
    // fetchNext zet synchroon loading-state; acceptabel voor dev-tool.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchNext();
  }, [fetchNext]);

  // Focus terug naar input na nieuwe zin (UX: direct typen kunnen).
  useEffect(() => {
    if (!loading && sentence && !feedback) {
      inputRef.current?.focus();
    }
  }, [loading, sentence, feedback]);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!sentence || feedback) return;
    const correct = isAnswerCorrect(answer, sentence.dutch);
    const fb: Feedback = { isCorrect: correct, correctAnswers: sentence.dutch };
    setFeedback(fb);
    recordAttempt({
      sentenceId: sentence.id,
      spanish: sentence.spanish,
      dutchOptions: sentence.dutch,
      userAnswer: answer,
      isCorrect: correct,
      at: Date.now(),
    });
  }

  function handleReset() {
    if (window.confirm("Score en geschiedenis echt wissen?")) reset();
  }

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Tatoeba-quiz — vertaal het Spaans
        </h1>
        <p className="text-sm text-muted-foreground">
          Random Spaanse zin via{" "}
          <code className="font-mono text-xs">
            GET /api/dev/tatoeba-quiz
          </code>
          . Hoofdletters en leestekens tellen niet mee.
        </p>
      </header>

      <ScoreBar score={score} hydrated={hydrated} onReset={handleReset} />

      <section className="rounded-lg border border-border bg-card p-5 text-card-foreground">
        {loading && <SkeletonRow />}
        {!loading && error && (
          <div className="space-y-3 text-sm">
            <p className="font-medium text-destructive">Kon geen zin laden.</p>
            <p className="font-mono text-xs text-muted-foreground">{error}</p>
            <button
              type="button"
              onClick={() => void fetchNext()}
              className="inline-flex h-9 cursor-pointer items-center rounded-md border border-input bg-background px-3 text-sm hover:bg-muted"
            >
              Opnieuw proberen
            </button>
          </div>
        )}
        {!loading && !error && sentence && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Spaans
              </p>
              <p className="text-xl font-medium leading-snug text-foreground">
                {sentence.spanish}
              </p>
              <p className="text-[10px] text-muted-foreground/70">
                #{sentence.id} · {sentence.attribution.license} · @
                {sentence.attribution.owner}
              </p>
            </div>

            <label htmlFor="answer" className="flex flex-col gap-1.5">
              <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Jouw Nederlandse vertaling
              </span>
              <textarea
                id="answer"
                ref={inputRef}
                name="answer"
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                disabled={feedback !== null}
                rows={2}
                placeholder="Typ hier je vertaling..."
                className="w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm disabled:opacity-70"
              />
            </label>

            {feedback && <FeedbackBanner feedback={feedback} />}

            <div className="flex flex-wrap gap-2">
              {!feedback && (
                <>
                  <button
                    type="submit"
                    disabled={answer.trim().length === 0}
                    className="inline-flex h-10 cursor-pointer items-center justify-center rounded-md bg-accent px-4 text-sm font-medium text-accent-foreground transition-colors hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Controleren
                  </button>
                  <button
                    type="button"
                    onClick={() => void fetchNext()}
                    className="inline-flex h-10 cursor-pointer items-center justify-center rounded-md border border-input bg-background px-4 text-sm hover:bg-muted"
                  >
                    Skip
                  </button>
                </>
              )}
              {feedback && (
                <button
                  type="button"
                  onClick={() => void fetchNext()}
                  className="inline-flex h-10 cursor-pointer items-center justify-center rounded-md bg-accent px-4 text-sm font-medium text-accent-foreground transition-colors hover:bg-accent/90"
                  autoFocus
                >
                  Volgende zin
                </button>
              )}
            </div>
          </form>
        )}
      </section>

      <details
        className="rounded-md border border-border bg-card text-card-foreground"
        open={showHistory}
        onToggle={(e) => setShowHistory(e.currentTarget.open)}
      >
        <summary className="cursor-pointer px-4 py-2 text-xs font-medium text-muted-foreground">
          Recente pogingen ({attempts.length})
        </summary>
        <HistoryList attempts={attempts} />
      </details>
    </div>
  );
}

function ScoreBar({
  score,
  hydrated,
  onReset,
}: {
  score: { correct: number; incorrect: number; total: number };
  hydrated: boolean;
  onReset: () => void;
}) {
  const pct = score.total === 0 ? 0 : Math.round((score.correct / score.total) * 100);
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

function FeedbackBanner({ feedback }: { feedback: Feedback }) {
  if (feedback.isCorrect) {
    return (
      <div className="rounded-md border border-emerald-500/40 bg-emerald-500/10 p-3 text-sm text-emerald-700 dark:text-emerald-300">
        <p className="font-medium">Goed!</p>
        {feedback.correctAnswers.length > 1 && (
          <p className="mt-1 text-xs opacity-80">
            Andere geldige vertalingen:{" "}
            {feedback.correctAnswers.slice(1).join(" · ")}
          </p>
        )}
      </div>
    );
  }
  return (
    <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
      <p className="font-medium">Niet goed.</p>
      <p className="mt-1 text-xs">
        Geldig{feedback.correctAnswers.length > 1 ? "e vertalingen" : "e vertaling"}:{" "}
        <span className="font-medium">
          {feedback.correctAnswers.join(" · ")}
        </span>
      </p>
    </div>
  );
}

function HistoryList({
  attempts,
}: {
  attempts: ReadonlyArray<{
    sentenceId: number;
    spanish: string;
    dutchOptions: string[];
    userAnswer: string;
    isCorrect: boolean;
    at: number;
  }>;
}) {
  if (attempts.length === 0) {
    return (
      <p className="px-4 pb-4 text-xs text-muted-foreground">
        Nog geen pogingen — controleer een zin om te beginnen.
      </p>
    );
  }
  return (
    <ul className="divide-y divide-border px-4 pb-3 text-xs">
      {attempts.map((a) => (
        <li
          key={`${a.sentenceId}-${a.at}`}
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
            <span className="font-medium text-foreground">{a.spanish}</span>
          </div>
          <div className="ml-1 text-muted-foreground">
            <span className="opacity-70">jij:</span>{" "}
            <span>{a.userAnswer || "(leeg)"}</span>
            {!a.isCorrect && (
              <>
                {" "}
                <span className="opacity-70">→ moest:</span>{" "}
                <span>{a.dutchOptions.join(" · ")}</span>
              </>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}

function SkeletonRow() {
  return (
    <div className="space-y-3">
      <div className="h-3 w-16 animate-pulse rounded bg-muted" />
      <div className="h-6 w-3/4 animate-pulse rounded bg-muted" />
      <div className="h-20 w-full animate-pulse rounded bg-muted" />
    </div>
  );
}
