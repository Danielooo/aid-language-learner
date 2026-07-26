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

import { QuizBackToOverviewButton } from "./quiz-back-to-overview-button";
import { QuizLeaveSessionDialog } from "./quiz-leave-session-dialog";
import {
  QUIZ_PLAYING_DECK_CLASS,
  QUIZ_PLAYING_DESCRIPTION_CLASS,
  QUIZ_PLAYING_FORM_CLASS,
  QUIZ_PLAYING_HEADER_CLASS,
  QUIZ_PLAYING_SECTION_CLASS,
  QUIZ_PLAYING_TITLE_CLASS,
  QUIZ_PROMPT_SKELETON_CLASS,
  useQuizScrollToTop,
} from "./quiz-playing-layout";
import { QuizQueueProgressBadge } from "./quiz-queue-progress-badge";
import { ActiveTopicsEmptyBanner } from "./active-topics-empty-banner";
import { animateCardExit, Flashcard } from "./flashcard";
import { useQuizSelectionMode } from "./hooks/use-quiz-selection-mode";
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
  const [phase, setPhase] = useState<FlashcardPhase>("front");
  const [animating, setAnimating] = useState(false);

  const { data: topicsData, isPending: topicsLoading } = useQuizTopics();
  const topicStats = topicsData?.stats ?? [];
  const [selectedTopic, setSelectedTopic] = useState<string>(ALL_TOPICS);
  const [topicHydrated, setTopicHydrated] = useState(false);

  const {
    mode: selectionMode,
    hydrated: selectionHydrated,
    fromQuery: selectionFromQuery,
  } = useQuizSelectionMode();

  const {
    item,
    loading,
    sessionLoading,
    error,
    errorStatus,
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
    recordAnswer,
    startMistakeReview,
    finishSession,
    recordSrsReview,
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

  // Zonder ?modus= vanaf de hub → terug naar overzicht.
  useEffect(() => {
    if (!selectionHydrated) return;
    if (!selectionFromQuery) {
      router.replace("/oefenen");
    }
  }, [selectionHydrated, selectionFromQuery, router]);

  useEffect(() => {
    if (screen === "playing" && !loading && item) {
      containerRef.current?.focus({ preventScroll: true });
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

  async function beginSession(topic: string, srsDueTotal?: number) {
    setPhase("front");
    setAnimating(false);
    setScreen("playing");
    const ok = await startSession(
      {
        selectionMode,
        topic,
      },
      selectionMode === "srs" ? { srsDueTotal: srsDueTotal ?? 0 } : undefined,
    );
    if (ok) void fetchNext();
  }

  function handleTopicSelect(topic: string, srsDueTotal?: number) {
    persistTopic(topic);
    void beginSession(topic, srsDueTotal);
  }

  const handleChangeSetup = useCallback(() => {
    resetSession();
    setScreen("topic-picker");
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

      if (selectionMode === "srs" && sessionPhase === "playing") {
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

  const ready = selectionHydrated && selectionFromQuery;
  const headerTitle =
    screen === "playing" ? topicDisplayLabel(selectedTopic) : "Flashcards";

  useQuizScrollToTop(screen === "playing", item?.id ?? null);

  return (
    <div
      ref={containerRef}
      tabIndex={-1}
      className={
        screen === "playing" ? QUIZ_PLAYING_DECK_CLASS : "space-y-6 outline-none"
      }
    >
      <AppPageHeader
        title={headerTitle}
        className={screen === "playing" ? QUIZ_PLAYING_HEADER_CLASS : undefined}
        titleClassName={
          screen === "playing" ? QUIZ_PLAYING_TITLE_CLASS : undefined
        }
        descriptionClassName={
          screen === "playing" ? QUIZ_PLAYING_DESCRIPTION_CLASS : undefined
        }
        description={
          screen === "playing"
            ? "Bekijk de Spaanse zin, draai de kaart om en beoordeel jezelf."
            : "Kies een topic om te oefenen."
        }
        actions={<QuizBackToOverviewButton onClick={requestLeave} />}
      />

      <QuizLeaveSessionDialog
        open={leaveConfirmOpen}
        onStay={dismissLeave}
        onLeave={confirmLeave}
      />

      {ready && screen === "topic-picker" && selectionMode === "srs" && (
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
            onBack={handleBackToOverview}
          />
        </div>
      )}

      {ready && screen === "topic-picker" && selectionMode === "topic" && (
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

      {screen === "playing" && (
        <>
          <section className={QUIZ_PLAYING_SECTION_CLASS}>
            <QuizQueueProgressBadge label={progressLabel} />
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
            {showPlayingUi && (
              <div>
                {sessionLoading && <FlashcardSkeleton />}
                {!sessionLoading && loading && <FlashcardSkeleton />}
                {!sessionLoading && !loading && error && (
                  <ExerciseErrorState
                    message={error}
                    status={errorStatus}
                    onRetry={() => void fetchNext()}
                  />
                )}
                {!sessionLoading && !loading && !error && item && (
                  <div ref={cardContainerRef}>
                    <Flashcard
                      item={item}
                      phase={phase}
                      onFlip={handleFlip}
                      onGradeCorrect={() => void handleGrade(true)}
                      onGradeIncorrect={() => void handleGrade(false)}
                      animating={animating}
                    />
                  </div>
                )}
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
    <div className={QUIZ_PLAYING_FORM_CLASS}>
      <div className={QUIZ_PROMPT_SKELETON_CLASS} />
      <div className="mt-2 h-12 shrink-0 animate-pulse rounded-xl bg-muted/60" />
    </div>
  );
}
