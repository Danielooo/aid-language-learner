"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import { AppPageHeader } from "@/app/_components/ui/app-page-header";

import { ALL_TOPICS } from "@/app/_components/features/quiz/constants";
import { ExerciseErrorState } from "@/app/_components/features/quiz/exercise-error-state";
import { HistoryList } from "@/app/_components/features/quiz/history-list";
import { ScoreBar } from "@/app/_components/features/quiz/score-bar";
import { ExerciseChat } from "@/app/_components/features/quiz/exercise-chat";
import { useQuizStorage } from "@/app/_components/features/quiz/use-quiz-storage";
import {
  isQuizShortcut,
  QUIZ_SHORTCUTS,
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
import { QuizSubPageMeta } from "./quiz-sub-page-meta";
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

function topicDisplayLabel(topic: string): string {
  return topic === ALL_TOPICS ? "Alle topics" : topic;
}

function directionDisplayLabel(direction: TranslationDirection): string {
  return direction === "es-to-nl" ? "ES → NL" : "NL → ES";
}

export function SortQuizDeck() {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);

  const [screen, setScreen] = useState<DeckScreen>("setup");
  const [direction, setDirection] = useState<TranslationDirection>("es-to-nl");
  const [configHydrated, setConfigHydrated] = useState(false);

  const [feedback, setFeedback] = useState<SortFeedback | null>(null);
  const [lastAnswer, setLastAnswer] = useState("");
  const [showHistory, setShowHistory] = useState(false);

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
    fetchNextValidated,
    recordAnswer,
    recordSkip,
    startMistakeReview,
    finishSession,
    recordSrsReview,
    suspendExercise,
  } = useQuizSession();

  const { score, attempts, recordAttempt, reset, hydrated } = useQuizStorage();
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

  const handleBackToSetup = useCallback(() => {
    setScreen("setup");
  }, []);

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

  const handleSuspend = useCallback(async () => {
    if (!item) return;
    if (!window.confirm("Deze oefening niet meer tonen in spaced repetition?")) {
      return;
    }
    await suspendExercise(item.id);
    loadNext();
  }, [item, suspendExercise, loadNext]);

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
        } else if (screen === "selection") {
          handleBackToSetup();
        } else if (screen === "topic-picker" || screen === "exercise-picker") {
          setScreen("selection");
        } else {
          router.push("/oefenen");
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
    handleChangeSetup,
    handleBackToSetup,
    handleNext,
    handleSkip,
  ]);

  const escHint =
    screen === "setup"
      ? "Esc = terug naar overzicht"
      : screen === "selection"
        ? "Esc = terug naar instellingen"
        : screen === "playing"
          ? "Esc = wijzig instellingen"
          : "Esc = terug naar moduskeuze";

  return (
    <div ref={containerRef} tabIndex={-1} className="space-y-6 outline-none">
      <AppPageHeader
        title="Sorteren"
        meta={<QuizSubPageMeta escHint={escHint} />}
        description={
          screen === "playing"
            ? "Sleep woorden of typ de eerste letter(s) per positie."
            : "Kies richting, selectie en oefeningen voor je sorteer-quiz."
        }
      />

      {screen !== "playing" && (
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span className="rounded-full bg-muted px-2 py-0.5">
            {directionDisplayLabel(direction)}
          </span>
          {screen !== "setup" && (
            <span className="rounded-full bg-muted px-2 py-0.5">
              {selectionModeLabel(selectionMode)}
            </span>
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
              <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
                {directionDisplayLabel(direction)}
              </span>
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
