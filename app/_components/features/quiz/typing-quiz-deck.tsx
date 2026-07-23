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
  TYPING_DIRECTION_KEY,
  TYPING_MODE_KEY,
  TYPING_TOPIC_KEY,
  isValidTranslationDirection,
  isValidTypingMode,
} from "@/lib/quiz/typing-config";

import { ExercisePicker } from "./exercise-picker";
import { QuizBackToOverviewButton } from "./quiz-back-to-overview-button";
import { QuizLeaveSessionDialog } from "./quiz-leave-session-dialog";
import { ActiveTopicsEmptyBanner } from "./active-topics-empty-banner";
import { QuizSetupScreen } from "./quiz-setup-screen";
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
import {
  TypingExercise,
  TypingExerciseSkeleton,
  evaluateTypingAnswer,
} from "./typing-exercise";
import { useQuizSession } from "./hooks/use-quiz-session";
import { useQuizLeaveGuard } from "./hooks/use-quiz-leave-guard";
import { useItemResponseTime } from "./hooks/use-item-response-time";
import { useQuizTopics } from "./hooks/use-quiz-topics";

import type { TypingFeedback } from "./typing-exercise";
import type { QuizSelectionMode } from "@/lib/quiz/selection-config";
import type {
  TranslationDirection,
  TypingMode,
} from "@/lib/quiz/typing-config";

type DeckScreen =
  | "setup"
  | "selection"
  | "topic-picker"
  | "exercise-picker"
  | "playing";

function topicDisplayLabel(topic: string, mode: QuizSelectionMode): string {
  if (mode === "custom") return "Zelf kiezen";
  return topic === ALL_TOPICS ? "Alle topics" : topic;
}

export function TypingQuizDeck() {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);

  const [screen, setScreen] = useState<DeckScreen>("setup");
  const [mode, setMode] = useState<TypingMode>("full");
  const [direction, setDirection] = useState<TranslationDirection>("es-to-nl");
  const [configHydrated, setConfigHydrated] = useState(false);

  const [answer, setAnswer] = useState("");
  const [feedback, setFeedback] = useState<TypingFeedback | null>(null);
  const [hintVisible, setHintVisible] = useState(false);

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

  const resetExerciseState = useCallback(() => {
    setFeedback(null);
    setAnswer("");
    setHintVisible(false);
  }, []);

  const loadNext = useCallback(() => {
    resetExerciseState();
    void fetchNext();
  }, [fetchNext, resetExerciseState]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const storedMode = window.localStorage.getItem(TYPING_MODE_KEY);
        // SSR-hydratie: localStorage kan pas na mount gelezen worden;
        // eenmalige sync setState is hier bewust.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        if (storedMode && isValidTypingMode(storedMode)) setMode(storedMode);

        const storedDirection = window.localStorage.getItem(TYPING_DIRECTION_KEY);
        if (storedDirection && isValidTranslationDirection(storedDirection)) {
          setDirection(storedDirection);
        }

        const storedTopic = window.localStorage.getItem(TYPING_TOPIC_KEY);
        if (storedTopic && storedTopic.length > 0) setSelectedTopic(storedTopic);
      } catch {
        // localStorage geblokkeerd.
      }
    }
    setConfigHydrated(true);
    setTopicHydrated(true);
  }, []);

  useEffect(() => {
    if (screen === "playing" && !loading && item) {
      containerRef.current?.focus({ preventScroll: true });
    }
  }, [screen, loading, item]);

  function persistMode(next: TypingMode) {
    setMode(next);
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(TYPING_MODE_KEY, next);
      } catch {
        // Keuze geldt alleen voor deze sessie.
      }
    }
  }

  function persistDirection(next: TranslationDirection) {
    setDirection(next);
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(TYPING_DIRECTION_KEY, next);
      } catch {
        // Keuze geldt alleen voor deze sessie.
      }
    }
  }

  function persistTopic(topic: string) {
    setSelectedTopic(topic);
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(TYPING_TOPIC_KEY, topic);
      } catch {
        // Keuze geldt alleen voor deze sessie.
      }
    }
  }

  async function beginSession(
    selMode: typeof selectionMode,
    topic: string,
    customIds?: string[],
  ) {
    resetExerciseState();
    setScreen("playing");
    const ok = await startSession({
      selectionMode: selMode,
      topic,
      customExerciseIds: customIds,
    });
    if (ok) void fetchNext();
  }

  function handleSetupContinue() {
    // Hub-deeplink (?modus=) → sla de selectiestap over.
    if (selectionFromQuery && selectionMode !== "custom") {
      setScreen("topic-picker");
      return;
    }
    setScreen("selection");
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
    resetExerciseState();
    setScreen("selection");
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

  const handlePrevious = useCallback(() => {
    if (loading || !canGoPrevious) return;
    resetExerciseState();
    void fetchPrevious();
  }, [loading, canGoPrevious, resetExerciseState, fetchPrevious]);

  const handleSubmit = useCallback(() => {
    if (!item || feedback) return;
    const result = evaluateTypingAnswer(mode, direction, item, answer);
    setFeedback(result);
    recordAttempt(
      buildAttemptPayload({
        exerciseId: item.id,
        source_text: item.source_text,
        target_text: item.target_text,
        topic: item.topic,
        userAnswer: answer,
        isCorrect: result.isCorrect,
        at: Date.now(),
        selectionMode,
        practiceType: "typing",
        direction,
        typingMode: mode,
        isMistakeReview: sessionPhase === "review",
        responseTimeMs: getResponseTimeMs(),
      }),
    );
    recordAnswer(item.id, result.isCorrect);
    if (selectionMode === "srs") {
      void recordSrsReview(item.id, result.isCorrect);
    }
  }, [
    item,
    feedback,
    mode,
    direction,
    answer,
    recordAttempt,
    recordAnswer,
    selectionMode,
    sessionPhase,
    getResponseTimeMs,
    recordSrsReview,
  ]);

  const handleNext = useCallback(() => {
    if (loading) return;
    loadNext();
  }, [loading, loadNext]);

  const handleShowHint = useCallback(() => {
    if (mode === "blank") setHintVisible(true);
  }, [mode]);

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

  const headerTitle =
    screen === "playing"
      ? topicDisplayLabel(selectedTopic, selectionMode)
      : "Typen";

  const playingDescription =
    screen === "playing"
      ? mode === "blank"
        ? "Vul het ontbrekende woord in en controleer je antwoord."
        : "Typ de vertaling en controleer je antwoord."
      : "Kies modus, selectie en oefeningen.";

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

      {screen === "setup" && configHydrated && (
        <QuizSetupScreen
          mode={mode}
          direction={direction}
          onModeChange={persistMode}
          onDirectionChange={persistDirection}
          onContinue={handleSetupContinue}
        />
      )}

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
            {showPlayingUi && sessionLoading && <TypingExerciseSkeleton />}
            {showPlayingUi && !sessionLoading && loading && (
              <TypingExerciseSkeleton />
            )}
            {showPlayingUi && !sessionLoading && !loading && error && (
              <ExerciseErrorState
                message={error}
                status={errorStatus}
                onRetry={loadNext}
              />
            )}
            {showPlayingUi && !sessionLoading && !loading && !error && item && (
              <TypingExercise
                item={item}
                mode={mode}
                direction={direction}
                answer={answer}
                feedback={feedback}
                hintVisible={hintVisible}
                onAnswerChange={setAnswer}
                onSubmit={handleSubmit}
                onNext={handleNext}
                onShowHint={handleShowHint}
                onPrevious={handlePrevious}
                canGoPrevious={canGoPrevious && !loading}
              />
            )}
          </section>

          {showPlayingUi && !sessionLoading && !loading && !error && item && (
            <ExerciseChat
              key={item.id}
              exercise={item}
              feedback={feedback}
              userAnswer={answer}
            />
          )}
        </>
      )}
    </div>
  );
}
