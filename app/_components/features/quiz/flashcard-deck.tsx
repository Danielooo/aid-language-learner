"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import { AppPageHeader } from "@/app/_components/ui/app-page-header";

import {
  ALL_TOPICS,
  FLASHCARD_ANSWER_CORRECT,
  FLASHCARD_ANSWER_INCORRECT,
} from "@/app/_components/features/quiz/constants";
import { ExerciseErrorState } from "@/app/_components/features/quiz/exercise-error-state";
import { ExerciseChat } from "@/app/_components/features/quiz/exercise-chat";
import { useQuizStorage } from "@/app/_components/features/quiz/use-quiz-storage";
import { selectionModeLabel } from "@/lib/quiz/selection-config";
import { buildAttemptPayload } from "@/lib/quiz/record-quiz-attempt";

import { ExercisePicker } from "./exercise-picker";
import { QuizBackToOverviewButton } from "./quiz-back-to-overview-button";
import { QuizLeaveSessionDialog } from "./quiz-leave-session-dialog";
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
import { useQuizSession } from "./hooks/use-quiz-session";
import { useQuizLeaveGuard } from "./hooks/use-quiz-leave-guard";
import { useItemResponseTime } from "./hooks/use-item-response-time";
import { useQuizTopics } from "./hooks/use-quiz-topics";

import type { FlashcardPhase } from "./flashcard";
import type { QuizSelectionMode } from "@/lib/quiz/selection-config";

const TOPIC_KEY = "aid:exercises-quiz-flashcards:topic";

type DeckScreen =
  | "selection"
  | "topic-picker"
  | "exercise-picker"
  | "playing";

function topicDisplayLabel(topic: string, mode: QuizSelectionMode): string {
  if (mode === "custom") return "Zelf kiezen";
  return topic === ALL_TOPICS ? "Alle topics" : topic;
}

export function FlashcardDeck() {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const cardContainerRef = useRef<HTMLDivElement>(null);

  const [screen, setScreen] = useState<DeckScreen>("selection");
  const [phase, setPhase] = useState<FlashcardPhase>("front");
  const [animating, setAnimating] = useState(false);

  const { data: topicsData, isPending: topicsLoading } = useQuizTopics();
  const topicStats = topicsData?.stats ?? [];
  const [selectedTopic, setSelectedTopic] = useState<string>(ALL_TOPICS);
  const [topicHydrated, setTopicHydrated] = useState(false);
  const [selectedExerciseIds, setSelectedExerciseIds] = useState<Set<string>>(
    new Set(),
  );

  const {
    mode: selectionMode,
    setMode: setSelectionMode,
    hydrated: selectionHydrated,
    fromQuery: selectionFromQuery,
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
    fetchPrevious,
    recordAnswer,
    startMistakeReview,
    finishSession,
    recordSrsReview,
    canGoPrevious,
  } = useQuizSession();

  const { recordAttempt } = useQuizStorage();
  const getResponseTimeMs = useItemResponseTime(item?.id);

  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = window.localStorage.getItem(TOPIC_KEY);
        // SSR-hydratie: localStorage is pas na mount beschikbaar, dus deze
        // eenmalige sync setState is hier bewust (geen cascade-risico).
        // eslint-disable-next-line react-hooks/set-state-in-effect
        if (stored && stored.length > 0) setSelectedTopic(stored);
      } catch {
        // localStorage geblokkeerd.
      }
    }
    setTopicHydrated(true);
  }, []);

  useEffect(() => {
    if (screen === "playing" && !loading && item) {
      containerRef.current?.focus({ preventScroll: true });
    }
  }, [screen, loading, item]);

  // Hub-deeplink (?modus=) → sla de selectiestap over.
  useEffect(() => {
    if (!selectionHydrated || !selectionFromQuery) return;
    if (selectionMode === "custom") return;
    setScreen((current) =>
      current === "selection" ? "topic-picker" : current,
    );
  }, [selectionHydrated, selectionFromQuery, selectionMode]);

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

  const handlePrevious = useCallback(() => {
    if (animating || loading || !canGoPrevious) return;
    setPhase("front");
    setAnimating(false);
    void fetchPrevious();
  }, [animating, loading, canGoPrevious, fetchPrevious]);

  const handleBackToOverview = useCallback(() => {
    resetSession();
    router.push("/oefenen");
  }, [resetSession, router]);

  const {
    confirmOpen: leaveConfirmOpen,
    requestLeave,
    confirmLeave,
    dismissLeave,
    handleEscape,
  } = useQuizLeaveGuard({
    isMidSession: screen === "playing" && showPlayingUi,
    onLeave: handleBackToOverview,
  });

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
    queueTotal > 0
      ? formatQueueProgressLabel(
          queueProgress,
          queueTotal,
          sessionPhase === "review",
        )
      : null;

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== "Escape") return;
      e.preventDefault();
      handleEscape();
    }

    window.addEventListener("keydown", onKeyDown, { capture: true });
    return () =>
      window.removeEventListener("keydown", onKeyDown, { capture: true });
  }, [handleEscape]);

  const headerTitle =
    screen === "playing"
      ? topicDisplayLabel(selectedTopic, selectionMode)
      : "Flashcards";

  return (
    <div ref={containerRef} tabIndex={-1} className="space-y-6 outline-none">
      <AppPageHeader
        title={headerTitle}
        description={
          screen === "playing"
            ? "Bekijk de Spaanse zin, draai de kaart om en beoordeel jezelf."
            : "Kies hoe en welke oefeningen je wilt oefenen."
        }
        actions={<QuizBackToOverviewButton onClick={requestLeave} />}
      />

      <QuizLeaveSessionDialog
        open={leaveConfirmOpen}
        onStay={dismissLeave}
        onLeave={confirmLeave}
      />

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
          <section className="relative rounded-2xl border border-border bg-gradient-to-b from-muted/30 to-background p-6 pt-10 sm:p-8 sm:pt-10">
            {progressLabel ? (
              <span className="absolute right-4 top-3 text-sm font-medium tabular-nums text-foreground sm:right-6 sm:top-4">
                {progressLabel}
              </span>
            ) : null}
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
                  onPrevious={handlePrevious}
                  canGoPrevious={canGoPrevious}
                  animating={animating}
                />
              </div>
            )}
          </section>

          {showPlayingUi && !sessionLoading && !loading && !error && item && (
            <ExerciseChat
              key={item.id}
              exercise={item}
              // Na omdraaien mag de chat de vertaling gebruiken (zonder
              // zelfbeoordeling — isCorrect blijft onbekend tot Goed/Fout).
              feedback={
                phase === "back"
                  ? { correctAnswer: item.target_text }
                  : null
              }
              userAnswer=""
            />
          )}
        </>
      )}
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
