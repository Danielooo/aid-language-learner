"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import { AppPageHeader } from "@/app/_components/ui/app-page-header";

import { ALL_TOPICS } from "@/app/_components/features/quiz/constants";
import { ExerciseErrorState } from "@/app/_components/features/quiz/exercise-error-state";
import { ScoreBar } from "@/app/_components/features/quiz/score-bar";
import { ExerciseChat } from "@/app/_components/features/quiz/exercise-chat";
import { useQuizStorage } from "@/app/_components/features/quiz/use-quiz-storage";
import {
  isTypingBracketShortcut,
  TYPING_SHORTCUTS,
} from "@/lib/keyboard/quiz-shortcuts";
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

import { ExercisePicker } from "./exercise-picker";
import { QuizBackToOverviewButton } from "./quiz-back-to-overview-button";
import { QuizLeaveSessionDialog } from "./quiz-leave-session-dialog";
import { ActiveTopicsEmptyBanner } from "./active-topics-empty-banner";
import {
  QuizSelectionScreen,
  useQuizSelectionMode,
} from "./quiz-selection-screen";
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
import type { ExercisePickerItem } from "@/types/quiz";
import type { ExerciseQuizItem } from "@/types/quiz";
import type { QuizSelectionMode } from "@/lib/quiz/selection-config";
import type { TranslationDirection } from "@/lib/quiz/typing-config";

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
    fetchNextValidated,
    recordAnswer,
    recordSkip,
    startMistakeReview,
    finishSession,
    recordSrsReview,
    canGoPrevious,
  } = useQuizSession();

  const { score, recordAttempt, hydrated } = useQuizStorage();
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
    (pickerItem: ExercisePickerItem) => {
      const candidate: ExerciseQuizItem = {
        id: pickerItem.id,
        source_text: pickerItem.source_text,
        target_text: pickerItem.target_text,
        topic: pickerItem.topic,
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
    if (selectionMode === "custom" || selectionMode === "topic") {
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

  async function beginSession(
    selMode: typeof selectionMode,
    topic: string,
    customIds?: string[],
  ) {
    resetExerciseState();
    setScreen("playing");
    const ok = await startSession(
      {
        selectionMode: selMode,
        topic,
        customExerciseIds: customIds,
      },
      selMode === "topic" ? { exerciseFilter: sortExerciseFilter } : undefined,
    );
    if (!ok) return;
    if (selMode === "custom" || selMode === "topic") {
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

  const handleSkip = useCallback(() => {
    if (loading || !item) return;
    if (selectionMode === "topic") {
      recordSkip(item.id);
    }
    loadNext();
  }, [loading, item, selectionMode, recordSkip, loadNext]);

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
    (selectionMode === "topic" || selectionMode === "custom") && queueTotal > 0
      ? formatQueueProgressLabel(
          queueProgress,
          queueTotal,
          sessionPhase === "review",
        )
      : null;

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        handleEscape();
        return;
      }

      if (leaveConfirmOpen) return;

      if (screen !== "playing" || loading || !item) return;

      if (
        !feedback &&
        isTypingBracketShortcut(e, TYPING_SHORTCUTS.skip)
      ) {
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
    handleEscape,
    handleSkip,
    leaveConfirmOpen,
  ]);

  const headerTitle =
    screen === "playing"
      ? topicDisplayLabel(selectedTopic, selectionMode)
      : "Sorteren";

  const playingDescription =
    screen === "playing"
      ? "Sleep of typ de woorden in de juiste volgorde."
      : "Kies richting, selectie en oefeningen.";

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
        <SortSetupScreen
          direction={direction}
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
          <ScoreBar
            score={score}
            hydrated={hydrated}
            progressLabel={progressLabel}
          />

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
                onSkip={handleSkip}
                onNext={handleNext}
                onPrevious={handlePrevious}
                canGoPrevious={canGoPrevious && !loading}
                shortcutsEnabled={!leaveConfirmOpen}
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
