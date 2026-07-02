"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import { ALL_TOPICS } from "@/app/dev/_components/quiz/constants";
import { ExerciseErrorState } from "@/app/dev/_components/quiz/exercise-error-state";
import { HistoryList } from "@/app/dev/_components/quiz/history-list";
import { ScoreBar } from "@/app/dev/_components/quiz/score-bar";
import { ExerciseChat } from "@/app/dev/exercise-generator-quiz/_components/exercise-chat";
import { useQuizStorage } from "@/app/dev/exercise-generator-quiz/_components/use-quiz-storage";
import {
  isQuizShortcut,
  QUIZ_SHORTCUTS,
} from "@/lib/keyboard/quiz-shortcuts";
import {
  MAX_SORT_FETCH_RETRIES,
  MIN_SORT_WORDS,
  SORT_DIRECTION_KEY,
  SORT_TOPIC_KEY,
  getSortExerciseData,
  isSortExerciseEligible,
} from "@/lib/quiz/sort-config";
import {
  isValidTranslationDirection,
} from "@/lib/quiz/typing-config";

import { SortExercise, SortExerciseSkeleton } from "./sort-exercise";
import { SortSetupScreen } from "./sort-setup-screen";
import { TopicPickerGrid } from "./topic-picker-grid";

import type { SortFeedback } from "./sort-exercise";
import type { ExerciseQuizItem } from "@/app/api/dev/exercise-generator-quiz/route";
import type {
  TopicStat,
  TopicsResponse,
} from "@/app/api/dev/exercise-generator-quiz/topics/route";
import type { TranslationDirection } from "@/lib/quiz/typing-config";

type DeckScreen = "setup" | "topic-picker" | "playing";

function topicDisplayLabel(topic: string): string {
  return topic === ALL_TOPICS ? "Alle topics" : topic;
}

function directionDisplayLabel(direction: TranslationDirection): string {
  return direction === "es-to-nl" ? "ES → NL" : "NL → ES";
}

async function fetchExerciseItem(
  topic: string,
): Promise<{ data: ExerciseQuizItem; status: number }> {
  const url =
    topic === ALL_TOPICS
      ? "/api/dev/exercise-generator-quiz"
      : `/api/dev/exercise-generator-quiz?topic=${encodeURIComponent(topic)}`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    const err = new Error(body.error ?? `Status ${res.status}`);
    (err as Error & { status?: number }).status = res.status;
    throw err;
  }
  return { data: (await res.json()) as ExerciseQuizItem, status: res.status };
}

export function SortQuizDeck() {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);

  const [screen, setScreen] = useState<DeckScreen>("setup");
  const [direction, setDirection] = useState<TranslationDirection>("es-to-nl");
  const [configHydrated, setConfigHydrated] = useState(false);

  const [item, setItem] = useState<ExerciseQuizItem | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorStatus, setErrorStatus] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<SortFeedback | null>(null);
  const [lastAnswer, setLastAnswer] = useState("");
  const [showHistory, setShowHistory] = useState(false);

  const [topicStats, setTopicStats] = useState<TopicStat[]>([]);
  const [topicsLoading, setTopicsLoading] = useState(true);
  const [selectedTopic, setSelectedTopic] = useState<string>(ALL_TOPICS);
  const [topicHydrated, setTopicHydrated] = useState(false);

  const { score, attempts, recordAttempt, reset, hydrated } = useQuizStorage();

  const fetchNext = useCallback(
    async (topic: string, sortDirection: TranslationDirection) => {
      setLoading(true);
      setError(null);
      setErrorStatus(null);
      setFeedback(null);
      setLastAnswer("");

      try {
        let data: ExerciseQuizItem | null = null;

        for (let attempt = 0; attempt < MAX_SORT_FETCH_RETRIES; attempt += 1) {
          const { data: candidate } = await fetchExerciseItem(topic);
          const exerciseData = getSortExerciseData(candidate, sortDirection);
          if (isSortExerciseEligible(exerciseData)) {
            data = candidate;
            break;
          }
          data = candidate;
        }

        if (!data) {
          throw new Error("Geen oefening gevonden.");
        }

        const exerciseData = getSortExerciseData(data, sortDirection);
        if (!isSortExerciseEligible(exerciseData)) {
          setError(
            `Geen geschikte oefening met minimaal ${MIN_SORT_WORDS} woorden gevonden. Probeer een ander topic.`,
          );
          setItem(null);
          return;
        }

        setItem(data);
      } catch (e) {
        const status =
          e instanceof Error && "status" in e
            ? (e as Error & { status?: number }).status
            : undefined;
        if (status) setErrorStatus(status);
        setError(e instanceof Error ? e.message : "Onbekende fout");
        setItem(null);
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const storedDirection = window.localStorage.getItem(SORT_DIRECTION_KEY);
        if (storedDirection && isValidTranslationDirection(storedDirection)) {
          setDirection(storedDirection);
        }

        const storedTopic = window.localStorage.getItem(SORT_TOPIC_KEY);
        if (storedTopic && storedTopic.length > 0) setSelectedTopic(storedTopic);
      } catch {
        // localStorage geblokkeerd.
      }
    }
    setConfigHydrated(true);
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

  function persistDirection(next: TranslationDirection) {
    setDirection(next);
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(SORT_DIRECTION_KEY, next);
      } catch {
        // Keuze geldt alleen voor deze sessie.
      }
    }
  }

  function persistTopic(topic: string) {
    setSelectedTopic(topic);
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(SORT_TOPIC_KEY, topic);
      } catch {
        // Keuze geldt alleen voor deze sessie.
      }
    }
  }

  function handleSetupContinue() {
    setScreen("topic-picker");
  }

  function handleTopicSelect(topic: string) {
    persistTopic(topic);
    setScreen("playing");
    setError(null);
    setErrorStatus(null);
    void fetchNext(topic, direction);
  }

  const handleChangeTopic = useCallback(() => {
    setScreen("topic-picker");
    setItem(null);
    setFeedback(null);
    setLastAnswer("");
    setError(null);
    setErrorStatus(null);
  }, []);

  const handleChangeSetup = useCallback(() => {
    setScreen("setup");
    setItem(null);
    setFeedback(null);
    setLastAnswer("");
    setError(null);
    setErrorStatus(null);
  }, []);

  const handleSkip = useCallback(() => {
    if (loading) return;
    void fetchNext(selectedTopic, direction);
  }, [loading, fetchNext, selectedTopic, direction]);

  const handleSubmit = useCallback(
    (userAnswer: string, result: SortFeedback) => {
      if (!item) return;
      setFeedback(result);
      setLastAnswer(userAnswer);
      recordAttempt({
        exerciseId: item.id,
        source_text: item.source_text,
        target_text: item.target_text,
        topic: item.topic,
        userAnswer,
        isCorrect: result.isCorrect,
        at: Date.now(),
      });
    },
    [item, recordAttempt],
  );

  const handleNext = useCallback(() => {
    if (loading) return;
    void fetchNext(selectedTopic, direction);
  }, [loading, fetchNext, selectedTopic, direction]);

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
        } else if (screen === "topic-picker") {
          handleChangeSetup();
        } else {
          router.push("/dev/exercises-quiz");
        }
        return;
      }

      if (screen !== "playing" || loading || !item) return;

      if (e.key === "Enter" && !e.shiftKey && !inInput) {
        e.preventDefault();
        if (feedback) {
          handleNext();
        }
        return;
      }

      if (!feedback && isQuizShortcut(e, QUIZ_SHORTCUTS.skip)) {
        e.preventDefault();
        handleSkip();
      }
    }

    window.addEventListener("keydown", onKeyDown, { capture: true });
    return () =>
      window.removeEventListener("keydown", onKeyDown, { capture: true });
  }, [
    screen,
    loading,
    item,
    feedback,
    router,
    handleChangeTopic,
    handleChangeSetup,
    handleNext,
    handleSkip,
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
            {screen === "setup"
              ? "Esc = terug naar overzicht"
              : screen === "topic-picker"
                ? "Esc = terug naar instellingen"
                : "Esc = wijzig topic"}
          </span>
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Sorteren
        </h1>
        <p className="text-sm text-muted-foreground">
          {screen === "setup"
            ? "Kies de vertaalrichting voor je sorteer-quiz."
            : screen === "topic-picker"
              ? "Kies een topic om woorden in volgorde te zetten."
              : "Sleep woorden of typ de eerste letter(s) per positie."}
        </p>
      </header>

      {screen !== "playing" && (
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span className="rounded-full bg-muted px-2 py-0.5">
            {directionDisplayLabel(direction)}
          </span>
          {screen === "topic-picker" && (
            <button
              type="button"
              onClick={handleChangeSetup}
              className="cursor-pointer underline hover:text-foreground"
            >
              Wijzig instellingen
            </button>
          )}
        </div>
      )}

      {screen === "setup" && configHydrated && (
        <SortSetupScreen
          direction={direction}
          onDirectionChange={persistDirection}
          onContinue={handleSetupContinue}
        />
      )}

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
              <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
                {directionDisplayLabel(direction)}
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
            {loading && <SortExerciseSkeleton />}
            {!loading && error && (
              <ExerciseErrorState
                message={error}
                status={errorStatus}
                onRetry={() => void fetchNext(selectedTopic, direction)}
              />
            )}
            {!loading && !error && item && (
              <SortExercise
                key={item.id}
                item={item}
                direction={direction}
                feedback={feedback}
                onSubmit={handleSubmit}
                onSkip={handleSkip}
                onNext={handleNext}
              />
            )}
          </section>

          {!loading && !error && item && (
            <ExerciseChat
              key={item.id}
              exercise={item}
              feedback={feedback}
              userAnswer={lastAnswer}
            />
          )}
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
          emptyMessage="Nog geen pogingen — beantwoord een oefening om te beginnen."
        />
      </details>
    </div>
  );
}
