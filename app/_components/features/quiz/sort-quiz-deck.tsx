"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import { AppPageHeader } from "@/app/_components/ui/app-page-header";

import { ALL_TOPICS } from "@/app/_components/features/quiz/constants";
import { ExerciseErrorState } from "@/app/_components/features/quiz/exercise-error-state";
import { ExerciseChat } from "@/app/_components/features/quiz/exercise-chat";
import { useQuizStorage } from "@/app/_components/features/quiz/use-quiz-storage";
import { selectionModeLabel } from "@/lib/quiz/selection-config";
import { buildAttemptPayload } from "@/lib/quiz/record-quiz-attempt";
import {
  MAX_SORT_FETCH_RETRIES,
  MIN_SORT_WORDS,
  SORT_DIRECTION_KEY,
  SORT_TOPIC_KEY,
  getSortExerciseData,
  isSortExerciseEligible,
} from "@/lib/quiz/sort-config";
import { isValidTranslationDirection } from "@/lib/quiz/typing-config";

import { QuizBackToOverviewButton } from "./quiz-back-to-overview-button";
import { QuizLeaveSessionDialog } from "./quiz-leave-session-dialog";
import { ActiveTopicsEmptyBanner } from "./active-topics-empty-banner";
import { useQuizSelectionMode } from "./hooks/use-quiz-selection-mode";
import { SortExercise, SortExerciseSkeleton } from "./sort-exercise";
import { SortSetupScreen } from "./sort-setup-screen";
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

import type { SortFeedback } from "./sort-exercise";
import type { ExerciseListItem } from "@/types/quiz";
import type { ExerciseQuizItem } from "@/types/quiz";
import type { TranslationDirection } from "@/lib/quiz/typing-config";

type DeckScreen = "setup" | "topic-picker" | "playing";

function topicDisplayLabel(topic: string): string {
  return topic === ALL_TOPICS ? "Alle topics" : topic;
}

export function SortQuizDeck() {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);

  const [screen, setScreen] = useState<DeckScreen>("setup");
  const [direction, setDirection] = useState<TranslationDirection>("es-to-nl");
  const [configHydrated, setConfigHydrated] = useState(false);

  const [feedback, setFeedback] = useState<SortFeedback | null>(null);
  const [lastAnswer, setLastAnswer] = useState("");

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
    fetchNextValidated,
    recordAnswer,
    startMistakeReview,
    finishSession,
    recordSrsReview,
  } = useQuizSession();

  const { recordAttempt } = useQuizStorage();
  const getResponseTimeMs = useItemResponseTime(item?.id);

  const isSortEligible = useCallback(
    (candidate: ExerciseQuizItem) => {
      const exerciseData = getSortExerciseData(candidate, direction);
      return isSortExerciseEligible(exerciseData);
    },
    [direction],
  );

  const resetExerciseState = useCallback(() => {
    setFeedback(null);
    setLastAnswer("");
  }, []);

  const sortExerciseFilter = useCallback(
    (listItem: ExerciseListItem) => {
      const candidate: ExerciseQuizItem = {
        id: listItem.id,
        source_text: listItem.source_text,
        target_text: listItem.target_text,
        topic: listItem.topic,
        created_at: "",
        alternative_translations: [],
        mp3_url: null,
        tatoeba_author: null,
        tatoeba_license: null,
        tatoeba_attribution_url: null,
      };
      return isSortExerciseEligible(getSortExerciseData(candidate, direction));
    },
    [direction],
  );

  const loadNext = useCallback(() => {
    resetExerciseState();
    if (selectionMode === "topic") {
      void fetchNext();
      return;
    }
    void fetchNextValidated(
      isSortEligible,
      MAX_SORT_FETCH_RETRIES,
      `Geen geschikte oefening met minimaal ${MIN_SORT_WORDS} woorden gevonden. Probeer andere instellingen.`,
    );
  }, [
    fetchNext,
    fetchNextValidated,
    isSortEligible,
    resetExerciseState,
    selectionMode,
  ]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const storedDirection = window.localStorage.getItem(SORT_DIRECTION_KEY);
        if (storedDirection && isValidTranslationDirection(storedDirection)) {
          // SSR-hydratie: localStorage kan pas na mount gelezen worden;
          // eenmalige sync setState is hier bewust.
          // eslint-disable-next-line react-hooks/set-state-in-effect
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

  async function beginSession(topic: string) {
    resetExerciseState();
    setScreen("playing");
    const ok = await startSession(
      {
        selectionMode,
        topic,
      },
      selectionMode === "topic" ? { exerciseFilter: sortExerciseFilter } : undefined,
    );
    if (!ok) return;
    if (selectionMode === "topic") {
      void fetchNext();
    } else {
      void fetchNextValidated(
        (candidate) => isSortExerciseEligible(getSortExerciseData(candidate, direction)),
        MAX_SORT_FETCH_RETRIES,
        `Geen geschikte oefening met minimaal ${MIN_SORT_WORDS} woorden gevonden. Probeer andere instellingen.`,
      );
    }
  }

  function handleSetupContinue() {
    setScreen("topic-picker");
  }

  function handleTopicSelect(topic: string) {
    persistTopic(topic);
    void beginSession(topic);
  }

  const handleChangeSetup = useCallback(() => {
    resetSession();
    resetExerciseState();
    setScreen("setup");
  }, [resetSession, resetExerciseState]);

  const handleBackToOverview = useCallback(() => {
    resetSession();
    resetExerciseState();
    router.push("/oefenen");
  }, [resetSession, resetExerciseState, router]);

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

  const handleSubmit = useCallback(
    (userAnswer: string, result: SortFeedback) => {
      if (!item) return;
      setFeedback(result);
      setLastAnswer(userAnswer);
      recordAttempt(
        buildAttemptPayload({
          exerciseId: item.id,
          source_text: item.source_text,
          target_text: item.target_text,
          topic: item.topic,
          userAnswer,
          isCorrect: result.isCorrect,
          at: Date.now(),
          selectionMode,
          practiceType: "sort",
          direction,
          isMistakeReview: sessionPhase === "review",
          responseTimeMs: getResponseTimeMs(),
        }),
      );
      recordAnswer(item.id, result.isCorrect);
      if (selectionMode === "srs") {
        void recordSrsReview(item.id, result.isCorrect);
      }
    },
    [item, recordAttempt, recordAnswer, selectionMode, sessionPhase, direction, getResponseTimeMs, recordSrsReview],
  );

  const handleNext = useCallback(() => {
    if (loading) return;
    loadNext();
  }, [loading, loadNext]);

  const handleStartMistakeReview = useCallback(() => {
    startMistakeReview();
    resetExerciseState();
    void fetchNext();
  }, [startMistakeReview, resetExerciseState, fetchNext]);

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
    screen === "playing" ? topicDisplayLabel(selectedTopic) : "Sorteren";

  const playingDescription =
    screen === "playing"
      ? "Sleep of typ de woorden in de juiste volgorde."
      : screen === "setup"
        ? "Kies vertaalrichting."
        : "Kies een topic om te oefenen.";

  return (
    <div ref={containerRef} tabIndex={-1} className="space-y-6 outline-none">
      <AppPageHeader
        title={headerTitle}
        description={playingDescription}
        actions={<QuizBackToOverviewButton onClick={requestLeave} />}
      />

      <QuizLeaveSessionDialog
        open={leaveConfirmOpen}
        onStay={dismissLeave}
        onLeave={confirmLeave}
      />

      {ready && screen === "setup" && configHydrated && (
        <SortSetupScreen
          direction={direction}
          onDirectionChange={persistDirection}
          onContinue={handleSetupContinue}
        />
      )}

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
            onBack={() => setScreen("setup")}
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
          <section className="relative rounded-2xl border border-border bg-gradient-to-b from-muted/30 to-background p-6 pt-10 sm:p-8 sm:pt-10">
            {progressLabel ? (
              <span className="absolute right-4 top-3 text-sm font-medium tabular-nums text-foreground sm:right-6 sm:top-4">
                {progressLabel}
              </span>
            ) : null}
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
            {showPlayingUi && sessionLoading && <SortExerciseSkeleton />}
            {showPlayingUi && !sessionLoading && loading && <SortExerciseSkeleton />}
            {showPlayingUi && !sessionLoading && !loading && error && (
              <ExerciseErrorState
                message={error}
                status={errorStatus}
                onRetry={loadNext}
              />
            )}
            {showPlayingUi && !sessionLoading && !loading && !error && item && (
              <SortExercise
                key={item.id}
                item={item}
                direction={direction}
                feedback={feedback}
                onSubmit={handleSubmit}
                onNext={handleNext}
              />
            )}
          </section>

          {showPlayingUi && !sessionLoading && !loading && !error && item && (
            <ExerciseChat
              key={item.id}
              exercise={item}
              feedback={feedback}
              userAnswer={lastAnswer}
            />
          )}
        </>
      )}
    </div>
  );
}
