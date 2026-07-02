"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import {
  ALL_TOPICS,
  FLASHCARD_ANSWER_CORRECT,
  FLASHCARD_ANSWER_INCORRECT,
} from "@/app/dev/_components/quiz/constants";
import { ExerciseErrorState } from "@/app/dev/_components/quiz/exercise-error-state";
import { HistoryList } from "@/app/dev/_components/quiz/history-list";
import { ScoreBar } from "@/app/dev/_components/quiz/score-bar";
import { useQuizStorage } from "@/app/dev/exercise-generator-quiz/_components/use-quiz-storage";
import {
  isQuizShortcut,
  QUIZ_SHORTCUTS,
} from "@/lib/keyboard/quiz-shortcuts";

import { animateCardExit, Flashcard } from "./flashcard";
import { TopicPickerGrid } from "./topic-picker-grid";

import type { FlashcardPhase } from "./flashcard";
import type { ExerciseQuizItem } from "@/app/api/dev/exercise-generator-quiz/route";
import type {
  TopicStat,
  TopicsResponse,
} from "@/app/api/dev/exercise-generator-quiz/topics/route";

const TOPIC_KEY = "aid:exercises-quiz-flashcards:topic";

type DeckScreen = "topic-picker" | "playing";

function topicDisplayLabel(topic: string): string {
  return topic === ALL_TOPICS ? "Alle topics" : topic;
}

export function FlashcardDeck() {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const cardContainerRef = useRef<HTMLDivElement>(null);

  const [screen, setScreen] = useState<DeckScreen>("topic-picker");
  const [item, setItem] = useState<ExerciseQuizItem | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorStatus, setErrorStatus] = useState<number | null>(null);
  const [phase, setPhase] = useState<FlashcardPhase>("front");
  const [animating, setAnimating] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const [topicStats, setTopicStats] = useState<TopicStat[]>([]);
  const [topicsLoading, setTopicsLoading] = useState(true);
  const [selectedTopic, setSelectedTopic] = useState<string>(ALL_TOPICS);
  const [topicHydrated, setTopicHydrated] = useState(false);

  const { score, attempts, recordAttempt, reset, hydrated } = useQuizStorage();

  const fetchNext = useCallback(async (topic: string) => {
    setLoading(true);
    setError(null);
    setErrorStatus(null);
    setPhase("front");
    setAnimating(false);
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
        if (stored && stored.length > 0) setSelectedTopic(stored);
      } catch {
        // localStorage geblokkeerd.
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
        if (!cancelled) setTopicStats(data.stats ?? []);
      } catch {
        if (!cancelled) setTopicStats([]);
      } finally {
        if (!cancelled) setTopicsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (screen === "playing" && !loading && item) {
      containerRef.current?.focus();
    }
  }, [screen, loading, item]);

  function persistTopic(topic: string) {
    setSelectedTopic(topic);
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(TOPIC_KEY, topic);
      } catch {
        // Keuze geldt alleen voor deze sessie.
      }
    }
  }

  function handleTopicSelect(topic: string) {
    persistTopic(topic);
    setScreen("playing");
    setError(null);
    setErrorStatus(null);
    void fetchNext(topic);
  }

  const handleChangeTopic = useCallback(() => {
    setScreen("topic-picker");
    setItem(null);
    setPhase("front");
    setAnimating(false);
    setError(null);
    setErrorStatus(null);
  }, []);

  const handleFlip = useCallback(() => {
    if (animating || loading) return;
    setPhase((p) => (p === "front" ? "back" : "front"));
  }, [animating, loading]);

  const handleSkip = useCallback(() => {
    if (animating || loading) return;
    void fetchNext(selectedTopic);
  }, [animating, loading, fetchNext, selectedTopic]);

  const handleGrade = useCallback(
    async (isCorrect: boolean) => {
      if (!item || phase !== "back" || animating || loading) return;

      setAnimating(true);
      const cardEl = cardContainerRef.current?.querySelector(
        "[data-flashcard-root]",
      ) as HTMLElement | null;

      await animateCardExit(cardEl, isCorrect);

      recordAttempt({
        exerciseId: item.id,
        source_text: item.source_text,
        target_text: item.target_text,
        topic: item.topic,
        userAnswer: isCorrect
          ? FLASHCARD_ANSWER_CORRECT
          : FLASHCARD_ANSWER_INCORRECT,
        isCorrect,
        at: Date.now(),
      });

      void fetchNext(selectedTopic);
    },
    [
      item,
      phase,
      animating,
      loading,
      recordAttempt,
      fetchNext,
      selectedTopic,
    ],
  );

  function handleReset() {
    if (window.confirm("Score en geschiedenis echt wissen?")) reset();
  }

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const target = e.target;
      const inInput =
        target instanceof HTMLElement &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable);

      if (e.key === "Escape") {
        e.preventDefault();
        if (screen === "playing") {
          handleChangeTopic();
        } else {
          router.push("/dev/exercises-quiz");
        }
        return;
      }

      if (screen === "playing" && !loading && !animating && item) {
        if (isQuizShortcut(e, QUIZ_SHORTCUTS.skip)) {
          e.preventDefault();
          handleSkip();
          return;
        }

        if (phase === "back") {
          if (isQuizShortcut(e, QUIZ_SHORTCUTS.gradeCorrect)) {
            e.preventDefault();
            void handleGrade(true);
            return;
          }

          if (isQuizShortcut(e, QUIZ_SHORTCUTS.gradeIncorrect)) {
            e.preventDefault();
            void handleGrade(false);
            return;
          }
        }
      }

      if (inInput) return;

      if (screen !== "playing" || loading || animating) return;
      if (!item) return;

      if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        handleFlip();
      }
    }

    window.addEventListener("keydown", onKeyDown, { capture: true });
    return () =>
      window.removeEventListener("keydown", onKeyDown, { capture: true });
  }, [
    screen,
    loading,
    animating,
    item,
    phase,
    router,
    handleGrade,
    handleFlip,
    handleSkip,
    handleChangeTopic,
  ]);

  return (
    <div ref={containerRef} tabIndex={-1} className="space-y-6 outline-none">
      <header className="space-y-1">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <Link
            href="/dev/exercises-quiz"
            className="underline hover:text-foreground"
          >
            ← Oefeningen-quiz
          </Link>
          <span aria-hidden>·</span>
          <span>
            {screen === "topic-picker"
              ? "Esc = terug naar overzicht"
              : "Esc = wijzig topic"}
          </span>
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Flashcards
        </h1>
        <p className="text-sm text-muted-foreground">
          {screen === "topic-picker"
            ? "Kies een topic om te oefenen met kaartjes."
            : "Bekijk de Spaanse zin, draai de kaart om en beoordeel jezelf."}
        </p>
      </header>

      {screen === "topic-picker" && (
        <section className="space-y-4 rounded-2xl border border-border bg-gradient-to-b from-muted/30 to-background p-6 sm:p-8">
          <div className="space-y-1">
            <h2 className="text-sm font-semibold text-foreground">
              Kies je topic
            </h2>
            <p className="text-xs text-muted-foreground">
              Selecteer een categorie om alleen die oefeningen te tonen.
            </p>
          </div>
          <TopicPickerGrid
            stats={topicStats}
            loading={!topicHydrated || topicsLoading}
            selectedTopic={selectedTopic}
            onSelect={handleTopicSelect}
          />
        </section>
      )}

      {screen === "playing" && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-accent/15 px-2.5 py-1 text-xs font-medium text-accent">
                {topicDisplayLabel(selectedTopic)}
              </span>
              <button
                type="button"
                onClick={handleChangeTopic}
                className="cursor-pointer text-xs text-muted-foreground underline hover:text-foreground"
              >
                Wijzig topic
              </button>
            </div>
          </div>

          <ScoreBar score={score} hydrated={hydrated} onReset={handleReset} />

          <section className="rounded-2xl border border-border bg-gradient-to-b from-muted/30 to-background p-6 sm:p-8">
            {loading && <FlashcardSkeleton />}
            {!loading && error && (
              <ExerciseErrorState
                message={error}
                status={errorStatus}
                onRetry={() => void fetchNext(selectedTopic)}
              />
            )}
            {!loading && !error && item && (
              <div ref={cardContainerRef}>
                <Flashcard
                  item={item}
                  phase={phase}
                  onFlip={handleFlip}
                  onGradeCorrect={() => void handleGrade(true)}
                  onGradeIncorrect={() => void handleGrade(false)}
                  onSkip={handleSkip}
                  animating={animating}
                />
              </div>
            )}
          </section>
        </>
      )}

      <details
        className="rounded-md border border-border bg-card text-card-foreground"
        open={showHistory}
        onToggle={(e) => setShowHistory(e.currentTarget.open)}
      >
        <summary className="cursor-pointer px-4 py-2 text-xs font-medium text-muted-foreground">
          Recente pogingen ({attempts.length})
        </summary>
        <HistoryList
          attempts={attempts}
          emptyMessage="Nog geen pogingen — beoordeel een kaart om te beginnen."
        />
      </details>
    </div>
  );
}

function FlashcardSkeleton() {
  return (
    <div className="mx-auto w-full max-w-lg space-y-4">
      <div className="h-64 animate-pulse rounded-2xl bg-muted/60 sm:h-72" />
      <div className="grid grid-cols-2 gap-2">
        <div className="h-12 animate-pulse rounded-xl bg-muted/60" />
        <div className="h-12 animate-pulse rounded-xl bg-muted/60" />
      </div>
    </div>
  );
}
