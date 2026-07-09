"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

import { ALL_TOPICS } from "@/app/_components/features/quiz/constants";
import { ExerciseErrorState } from "@/app/_components/features/quiz/exercise-error-state";
import { HistoryList } from "@/app/_components/features/quiz/history-list";
import { ScoreBar } from "@/app/_components/features/quiz/score-bar";
import { TopicSelector } from "@/app/_components/features/quiz/topic-selector";
import { isAnswerCorrect } from "@/lib/quiz/compare";

import { ExerciseChat } from "@/app/_components/features/quiz/exercise-chat";
import { useQuizStorage } from "@/app/_components/features/quiz/use-quiz-storage";

import type { ExerciseQuizItem } from "@/app/api/dev/exercise-generator-quiz/route";
import type { TopicsResponse } from "@/app/api/dev/exercise-generator-quiz/topics/route";

type Feedback = {
  isCorrect: boolean;
  correctAnswer: string;
};

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

  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = window.localStorage.getItem(TOPIC_KEY);
        // SSR-hydratie: localStorage is pas na mount leesbaar.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        if (stored && stored.length > 0) setSelectedTopic(stored);
      } catch {
        // localStorage geblokkeerd — default blijft ALL_TOPICS.
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
        if (!cancelled) setTopics([]);
      } finally {
        if (!cancelled) setTopicsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!topicHydrated) return;
    // fetchNext zet synchronoon loading-state; acceptabel voor deze dev-tool.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchNext(selectedTopic);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topicHydrated, selectedTopic]);

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
        // Keuze geldt alleen voor deze sessie.
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
          <code className="font-mono text-xs">exercises</code> via{" "}
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
          <ExerciseErrorState
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

      {!loading && !error && item && (
        <ExerciseChat
          key={item.id}
          exercise={item}
          feedback={feedback}
          userAnswer={answer}
        />
      )}

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

function SkeletonRow() {
  return (
    <div className="space-y-3">
      <div className="h-3 w-16 animate-pulse rounded bg-muted" />
      <div className="h-6 w-3/4 animate-pulse rounded bg-muted" />
      <div className="h-20 w-full animate-pulse rounded bg-muted" />
    </div>
  );
}
