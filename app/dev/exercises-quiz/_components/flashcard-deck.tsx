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
import { selectionModeLabel } from "@/lib/quiz/selection-config";
import { buildAttemptPayload } from "@/lib/quiz/record-quiz-attempt";

import { ExercisePicker } from "./exercise-picker";
import { ActiveTopicsEmptyBanner } from "./active-topics-empty-banner";
import { animateCardExit, Flashcard } from "./flashcard";
import {
  QuizSelectionScreen,
  useQuizSelectionMode,
} from "./quiz-selection-screen";
import {
  formatQueueProgressLabel,
  SessionCompleteState,
} from "./session-complete-state";
import { SrsCompleteState } from "./srs-complete-state";
import { SrsTopicPickerSection } from "./srs-topic-picker-section";
import { TopicPickerGrid } from "./topic-picker-grid";
import { useQuizSession } from "../_hooks/use-quiz-session";
import { useItemResponseTime } from "../_hooks/use-item-response-time";

import type { FlashcardPhase } from "./flashcard";
import type {
  TopicStat,
  TopicsResponse,
} from "@/app/api/dev/exercise-generator-quiz/topics/route";
import type { QuizSelectionMode } from "@/lib/quiz/selection-config";

const TOPIC_KEY = "aid:exercises-quiz-flashcards:topic";

type DeckScreen =
  | "selection"
  | "topic-picker"
  | "exercise-picker"
  | "playing";

function topicDisplayLabel(topic: string): string {
  return topic === ALL_TOPICS ? "Alle topics" : topic;
}

export function FlashcardDeck() {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const cardContainerRef = useRef<HTMLDivElement>(null);

  const [screen, setScreen] = useState<DeckScreen>("selection");
  const [phase, setPhase] = useState<FlashcardPhase>("front");
  const [animating, setAnimating] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const [topicStats, setTopicStats] = useState<TopicStat[]>([]);
  const [topicsLoading, setTopicsLoading] = useState(true);
  const [selectedTopic, setSelectedTopic] = useState<string>(ALL_TOPICS);
  const [topicHydrated, setTopicHydrated] = useState(false);
  const [selectedExerciseIds, setSelectedExerciseIds] = useState<Set<string>>(
    new Set(),
  );

  const {
    mode: selectionMode,
    setMode: setSelectionMode,
    hydrated: selectionHydrated,
  } = useQuizSelectionMode();

  const {
    item,
    loading,
    sessionLoading,
    error,
    errorStatus,
    sessionComplete,
    srsComplete,
    sessionPhase,
    queueRemaining,
    queueProgress,
    queueTotal,
    initialQueueTotal,
    correctCount,
    mistakeCount,
    skippedIneligible,
    showPlayingUi,
    startSession,
    resetSession,
    fetchNext,
    recordAnswer,
    recordSkip,
    startMistakeReview,
    finishSession,
    recordSrsReview,
    suspendExercise,
  } = useQuizSession();

  const { score, attempts, recordAttempt, reset, hydrated } = useQuizStorage();
  const getResponseTimeMs = useItemResponseTime(item?.id);

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

  async function beginSession(
    mode: typeof selectionMode,
    topic: string,
    customIds?: string[],
  ) {
    setPhase("front");
    setAnimating(false);
    setScreen("playing");
    const ok = await startSession({
      selectionMode: mode,
      topic,
      customExerciseIds: customIds,
    });
    if (ok) void fetchNext();
  }

  function handleSelectMode(mode: QuizSelectionMode) {
    setSelectionMode(mode);
    if (mode === "custom") {
      setScreen("exercise-picker");
      return;
    }
    setScreen("topic-picker");
  }

  function handleTopicSelect(topic: string) {
    persistTopic(topic);
    beginSession(selectionMode, topic);
  }

  function handleCustomStart() {
    if (selectedExerciseIds.size === 0) return;
    beginSession(selectionMode, selectedTopic, [...selectedExerciseIds]);
  }

  function toggleExerciseId(id: string) {
    setSelectedExerciseIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const handleChangeSetup = useCallback(() => {
    resetSession();
    setScreen("selection");
    setPhase("front");
    setAnimating(false);
  }, [resetSession]);

  const handleFlip = useCallback(() => {
    if (animating || loading) return;
    setPhase((p) => (p === "front" ? "back" : "front"));
  }, [animating, loading]);

  const handleSkip = useCallback(() => {
    if (animating || loading || !item) return;
    if (selectionMode === "topic") {
      recordSkip(item.id);
    }
    setPhase("front");
    void fetchNext();
  }, [animating, loading, item, selectionMode, recordSkip, fetchNext]);

  const handleGrade = useCallback(
    async (isCorrect: boolean) => {
      if (!item || phase !== "back" || animating || loading) return;

      setAnimating(true);
      const cardEl = cardContainerRef.current?.querySelector(
        "[data-flashcard-root]",
      ) as HTMLElement | null;

      await animateCardExit(cardEl, isCorrect);

      recordAttempt(
        buildAttemptPayload({
          exerciseId: item.id,
          source_text: item.source_text,
          target_text: item.target_text,
          topic: item.topic,
          userAnswer: isCorrect
            ? FLASHCARD_ANSWER_CORRECT
            : FLASHCARD_ANSWER_INCORRECT,
          isCorrect,
          at: Date.now(),
          selectionMode,
          practiceType: "flashcard",
          isMistakeReview: sessionPhase === "review",
          responseTimeMs: getResponseTimeMs(),
        }),
      );

      recordAnswer(item.id, isCorrect);

      if (selectionMode === "srs") {
        void recordSrsReview(item.id, isCorrect);
      }

      setPhase("front");
      void fetchNext();
      setAnimating(false);
    },
    [
      item,
      phase,
      animating,
      loading,
      recordAttempt,
      recordAnswer,
      fetchNext,
      selectionMode,
      sessionPhase,
      getResponseTimeMs,
      recordSrsReview,
    ],
  );

  const handleSuspend = useCallback(async () => {
    if (!item) return;
    if (!window.confirm("Deze oefening niet meer tonen in spaced repetition?")) {
      return;
    }
    await suspendExercise(item.id);
    setPhase("front");
    void fetchNext();
  }, [item, suspendExercise, fetchNext]);

  const handleStartMistakeReview = useCallback(() => {
    startMistakeReview();
    setPhase("front");
    void fetchNext();
  }, [startMistakeReview, fetchNext]);

  const handleFinishSession = useCallback(() => {
    if (sessionPhase === "main-complete") {
      if (mistakeCount === 0) {
        handleChangeSetup();
        return;
      }
      finishSession();
      return;
    }
    handleChangeSetup();
  }, [sessionPhase, mistakeCount, finishSession, handleChangeSetup]);

  const progressLabel =
    (selectionMode === "topic" || selectionMode === "custom") && queueTotal > 0
      ? formatQueueProgressLabel(
          queueProgress,
          queueTotal,
          sessionPhase === "review",
        )
      : null;

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
          handleChangeSetup();
        } else if (screen === "topic-picker" || screen === "exercise-picker") {
          setScreen("selection");
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
    handleChangeSetup,
  ]);

  const escHint =
    screen === "selection"
      ? "Esc = terug naar overzicht"
      : screen === "playing"
        ? "Esc = wijzig instellingen"
        : "Esc = terug naar moduskeuze";

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
          <span>{escHint}</span>
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Flashcards
        </h1>
        <p className="text-sm text-muted-foreground">
          {screen === "playing"
            ? "Bekijk de Spaanse zin, draai de kaart om en beoordeel jezelf."
            : "Kies hoe en welke oefeningen je wilt oefenen."}
        </p>
      </header>

      {screen === "selection" && selectionHydrated && (
        <QuizSelectionScreen
          selectedMode={selectionMode}
          onSelect={handleSelectMode}
        />
      )}

      {screen === "topic-picker" && selectionMode === "srs" && (
        <div className="space-y-4">
          <ActiveTopicsEmptyBanner
            topicStats={topicStats}
            loading={!topicHydrated || topicsLoading}
          />
          <SrsTopicPickerSection
          topicStats={topicStats}
          topicsLoading={!topicHydrated || topicsLoading}
          selectedTopic={selectedTopic}
          onSelect={handleTopicSelect}
          onBack={() => setScreen("selection")}
        />
        </div>
      )}

      {screen === "topic-picker" && selectionMode !== "srs" && (
        <section className="space-y-4 rounded-2xl border border-border bg-gradient-to-b from-muted/30 to-background p-6 sm:p-8">
          <div className="space-y-1">
            <h2 className="text-sm font-semibold text-foreground">
              Kies je topic
            </h2>
            <p className="text-xs text-muted-foreground">
              {selectionModeLabel(selectionMode)} — selecteer een categorie.
            </p>
          </div>
          <ActiveTopicsEmptyBanner
            topicStats={topicStats}
            loading={!topicHydrated || topicsLoading}
          />
          <TopicPickerGrid
            stats={topicStats}
            loading={!topicHydrated || topicsLoading}
            selectedTopic={selectedTopic}
            onSelect={handleTopicSelect}
          />
        </section>
      )}

      {screen === "exercise-picker" && (
        <div className="space-y-4">
          <ActiveTopicsEmptyBanner
            topicStats={topicStats}
            loading={!topicHydrated || topicsLoading}
          />
          <ExercisePicker
          topicStats={topicStats}
          topicsLoading={!topicHydrated || topicsLoading}
          selectedTopic={selectedTopic}
          onTopicChange={persistTopic}
          selectedIds={selectedExerciseIds}
          onToggle={toggleExerciseId}
          onSelectAll={(ids) =>
            setSelectedExerciseIds((prev) => new Set([...prev, ...ids]))
          }
          onClear={() => setSelectedExerciseIds(new Set())}
          onStart={handleCustomStart}
        />
        </div>
      )}

      {screen === "playing" && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-accent/15 px-2.5 py-1 text-xs font-medium text-accent">
                {selectionModeLabel(selectionMode)}
              </span>
              {selectionMode !== "custom" && (
                <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
                  {topicDisplayLabel(selectedTopic)}
                </span>
              )}
              {progressLabel && (
                <span className="text-xs text-muted-foreground">
                  {progressLabel}
                </span>
              )}
              {selectionMode === "custom" && queueRemaining > 0 && !progressLabel && (
                <span className="text-xs text-muted-foreground">
                  Nog {queueRemaining} in wachtrij
                </span>
              )}
              <button
                type="button"
                onClick={handleChangeSetup}
                className="cursor-pointer text-xs text-muted-foreground underline hover:text-foreground"
              >
                Wijzig instellingen
              </button>
            </div>
            {selectionMode === "srs" && item && (
              <button
                type="button"
                onClick={() => void handleSuspend()}
                className="cursor-pointer text-xs text-muted-foreground underline hover:text-foreground"
              >
                Niet meer tonen
              </button>
            )}
          </div>

          <ScoreBar score={score} hydrated={hydrated} onReset={handleReset} />

          <section className="rounded-2xl border border-border bg-gradient-to-b from-muted/30 to-background p-6 sm:p-8">
            {sessionComplete && (
              <div className="mx-auto max-w-lg space-y-4 text-center">
                <p className="text-lg font-semibold text-foreground">
                  Alle geselecteerde oefeningen voltooid!
                </p>
                <button
                  type="button"
                  onClick={handleChangeSetup}
                  className="cursor-pointer rounded-xl bg-accent px-5 py-2.5 text-sm font-medium text-accent-foreground"
                >
                  Nieuwe sessie starten
                </button>
              </div>
            )}
            {(sessionPhase === "main-complete" ||
              sessionPhase === "all-complete") && (
              <SessionCompleteState
                phase={sessionPhase}
                correctCount={correctCount}
                totalCount={initialQueueTotal}
                mistakeCount={mistakeCount}
                skippedIneligible={skippedIneligible}
                onStartMistakeReview={handleStartMistakeReview}
                onFinish={handleFinishSession}
              />
            )}
            {srsComplete && (
              <SrsCompleteState
                topic={selectedTopic}
                onBack={handleChangeSetup}
              />
            )}
            {showPlayingUi && sessionLoading && <FlashcardSkeleton />}
            {showPlayingUi && !sessionLoading && loading && <FlashcardSkeleton />}
            {showPlayingUi && !sessionLoading && !loading && error && (
              <ExerciseErrorState
                message={error}
                status={errorStatus}
                onRetry={() => void fetchNext()}
              />
            )}
            {showPlayingUi && !sessionLoading && !loading && !error && item && (
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
