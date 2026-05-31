"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

import { isAnswerCorrect } from "@/lib/quiz/compare";

import { useQuizStorage } from "./use-quiz-storage";

import type { ExerciseQuizItem } from "@/app/api/dev/exercise-generator-quiz/route";
import type { TopicsResponse } from "@/app/api/dev/exercise-generator-quiz/topics/route";

type Feedback = {
  isCorrect: boolean;
  correctAnswer: string;
};

// "all" is de sentinel voor "geen topic-filter". We sturen dan ook
// geen `topic` query param mee. Aparte localStorage-key zodat de
// keuze blijft hangen tussen sessies, los van de score-historie.
const ALL_TOPICS = "all";
const TOPIC_KEY = "aid:exercise-generator-quiz:topic";

export function Quiz() {
  const [item, setItem] = useState<ExerciseQuizItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [errorStatus, setErrorStatus] = useState<number | null>(null);
  const [answer, setAnswer] = useState("");
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [showHistory, setShowHistory] = useState(false);

  const [topics, setTopics] = useState<string[]>([]);
  const [topicsLoading, setTopicsLoading] = useState(true);
  const [selectedTopic, setSelectedTopic] = useState<string>(ALL_TOPICS);
  const [topicHydrated, setTopicHydrated] = useState(false);

  const inputRef = useRef<HTMLTextAreaElement>(null);

  const { score, attempts, recordAttempt, reset, hydrated } = useQuizStorage();

  const fetchNext = useCallback(async (topic: string) => {
    setLoading(true);
    setError(null);
    setErrorStatus(null);
    setFeedback(null);
    setAnswer("");
    try {
      const url =
        topic === ALL_TOPICS
          ? "/api/dev/exercise-generator-quiz"
          : `/api/dev/exercise-generator-quiz?topic=${encodeURIComponent(topic)}`;
      // cache: "no-store" → elke klik echt een nieuwe random oefening.
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        setErrorStatus(res.status);
        throw new Error(body.error ?? `Status ${res.status}`);
      }
      const data = (await res.json()) as ExerciseQuizItem;
      setItem(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Onbekende fout");
      setItem(null);
    } finally {
      setLoading(false);
    }
  }, []);

  // Topic-keuze hydrateren uit localStorage en topic-lijst ophalen.
  // We doen dit eenmalig op mount; de lijst is klein en verandert
  // alleen als je via /dev/exercise-generator nieuwe rijen genereert.
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = window.localStorage.getItem(TOPIC_KEY);
        if (stored && stored.length > 0) setSelectedTopic(stored);
      } catch {
        // localStorage geblokkeerd — niet erg, default blijft ALL_TOPICS.
      }
    }
    setTopicHydrated(true);

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/dev/exercise-generator-quiz/topics", {
          cache: "no-store",
        });
        if (!res.ok) throw new Error(`Status ${res.status}`);
        const data = (await res.json()) as TopicsResponse;
        if (!cancelled) setTopics(data.topics);
      } catch {
        // Topics ophalen mag stilletjes falen: dropdown valt dan terug
        // op alleen "Alle topics", quiz zelf blijft werken.
        if (!cancelled) setTopics([]);
      } finally {
        if (!cancelled) setTopicsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Eerste oefening laden zodra de topic-keuze gehydrateerd is. Volgende
  // fetches gebeuren via knop-handlers met de actuele topic.
  useEffect(() => {
    if (!topicHydrated) return;
    void fetchNext(selectedTopic);
    // We willen alleen op de initiële hydratie + bij topic-change opnieuw
    // ophalen, niet bij elke render van fetchNext.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topicHydrated, selectedTopic]);

  // Focus terug naar input na nieuwe oefening (UX: direct typen kunnen).
  useEffect(() => {
    if (!loading && item && !feedback) {
      inputRef.current?.focus();
    }
  }, [loading, item, feedback]);

  function handleTopicChange(next: string) {
    setSelectedTopic(next);
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(TOPIC_KEY, next);
      } catch {
        // Niets aan te doen — keuze geldt dan alleen voor deze sessie.
      }
    }
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!item || feedback) return;
    const correct = isAnswerCorrect(answer, [item.target_text]);
    const fb: Feedback = { isCorrect: correct, correctAnswer: item.target_text };
    setFeedback(fb);
    recordAttempt({
      exerciseId: item.id,
      source_text: item.source_text,
      target_text: item.target_text,
      topic: item.topic,
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
          Generator-quiz — vertaal je eigen oefeningen
        </h1>
        <p className="text-sm text-muted-foreground">
          Random oefening uit{" "}
          <code className="font-mono text-xs">dev_exercises</code> via{" "}
          <code className="font-mono text-xs">
            GET /api/dev/exercise-generator-quiz
          </code>
          . Vul met de{" "}
          <Link
            href="/dev/exercise-generator"
            className="underline hover:text-foreground"
          >
            Oefeningen-generator
          </Link>
          . Hoofdletters en leestekens tellen niet mee.
        </p>
      </header>

      <TopicSelector
        topics={topics}
        topicsLoading={topicsLoading}
        selected={selectedTopic}
        onChange={handleTopicChange}
      />

      <ScoreBar score={score} hydrated={hydrated} onReset={handleReset} />

      <section className="rounded-lg border border-border bg-card p-5 text-card-foreground">
        {loading && <SkeletonRow />}
        {!loading && error && (
          <ErrorState
            message={error}
            status={errorStatus}
            onRetry={() => void fetchNext(selectedTopic)}
          />
        )}
        {!loading && !error && item && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Spaans
                </p>
                {item.topic && (
                  <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                    {item.topic}
                  </span>
                )}
              </div>
              <p className="text-xl font-medium leading-snug text-foreground">
                {item.source_text}
              </p>
              <p className="font-mono text-[10px] text-muted-foreground/70">
                #{item.id.slice(0, 8)}
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
                    onClick={() => void fetchNext(selectedTopic)}
                    className="inline-flex h-10 cursor-pointer items-center justify-center rounded-md border border-input bg-background px-4 text-sm hover:bg-muted"
                  >
                    Skip
                  </button>
                </>
              )}
              {feedback && (
                <button
                  type="button"
                  onClick={() => void fetchNext(selectedTopic)}
                  className="inline-flex h-10 cursor-pointer items-center justify-center rounded-md bg-accent px-4 text-sm font-medium text-accent-foreground transition-colors hover:bg-accent/90"
                  autoFocus
                >
                  Volgende oefening
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

function TopicSelector({
  topics,
  topicsLoading,
  selected,
  onChange,
}: {
  topics: string[];
  topicsLoading: boolean;
  selected: string;
  onChange: (next: string) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-md border border-border bg-card px-4 py-3 text-sm text-card-foreground">
      <label
        htmlFor="topic-select"
        className="text-xs font-medium uppercase tracking-wide text-muted-foreground"
      >
        Topic
      </label>
      <select
        id="topic-select"
        value={selected}
        onChange={(e) => onChange(e.target.value)}
        disabled={topicsLoading}
        className="cursor-pointer rounded-md border border-input bg-background px-2 py-1 text-sm disabled:cursor-not-allowed disabled:opacity-50"
      >
        <option value={ALL_TOPICS}>Alle topics</option>
        {topics.map((t) => (
          <option key={t} value={t}>
            {t}
          </option>
        ))}
      </select>
      {topicsLoading && (
        <span className="text-xs text-muted-foreground">topics laden…</span>
      )}
      {!topicsLoading && topics.length === 0 && (
        <span className="text-xs text-muted-foreground">
          Geen topics beschikbaar
        </span>
      )}
    </div>
  );
}

function ErrorState({
  message,
  status,
  onRetry,
}: {
  message: string;
  status: number | null;
  onRetry: () => void;
}) {
  // 404 op een lege tabel is geen "fout" maar een onboarding-moment:
  // verwijs door naar de generator zodat er überhaupt rijen bestaan.
  if (status === 404) {
    return (
      <div className="space-y-3 text-sm">
        <p className="font-medium text-foreground">{message}</p>
        <Link
          href="/dev/exercise-generator"
          className="inline-flex h-9 items-center rounded-md bg-accent px-3 text-sm font-medium text-accent-foreground transition-colors hover:bg-accent/90"
        >
          Naar de oefeningen-generator
        </Link>
      </div>
    );
  }
  return (
    <div className="space-y-3 text-sm">
      <p className="font-medium text-destructive">Kon geen oefening laden.</p>
      <p className="font-mono text-xs text-muted-foreground">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="inline-flex h-9 cursor-pointer items-center rounded-md border border-input bg-background px-3 text-sm hover:bg-muted"
      >
        Opnieuw proberen
      </button>
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
        <p className="mt-1 text-xs opacity-80">
          Vertaling: <span className="font-medium">{feedback.correctAnswer}</span>
        </p>
      </div>
    );
  }
  return (
    <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
      <p className="font-medium">Niet goed.</p>
      <p className="mt-1 text-xs">
        Geldige vertaling:{" "}
        <span className="font-medium">{feedback.correctAnswer}</span>
      </p>
    </div>
  );
}

function HistoryList({
  attempts,
}: {
  attempts: ReadonlyArray<{
    exerciseId: string;
    source_text: string;
    target_text: string;
    topic: string | null;
    userAnswer: string;
    isCorrect: boolean;
    at: number;
  }>;
}) {
  if (attempts.length === 0) {
    return (
      <p className="px-4 pb-4 text-xs text-muted-foreground">
        Nog geen pogingen — controleer een oefening om te beginnen.
      </p>
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
          </div>
          <div className="ml-1 text-muted-foreground">
            <span className="opacity-70">jij:</span>{" "}
            <span>{a.userAnswer || "(leeg)"}</span>
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

function SkeletonRow() {
  return (
    <div className="space-y-3">
      <div className="h-3 w-16 animate-pulse rounded bg-muted" />
      <div className="h-6 w-3/4 animate-pulse rounded bg-muted" />
      <div className="h-20 w-full animate-pulse rounded bg-muted" />
    </div>
  );
}
