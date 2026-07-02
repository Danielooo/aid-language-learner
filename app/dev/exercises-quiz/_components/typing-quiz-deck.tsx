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
import { useQuizSession } from "../_hooks/use-quiz-session";
import { useItemResponseTime } from "../_hooks/use-item-response-time";

import type { TypingFeedback } from "./typing-exercise";
import type {
  TopicStat,
  TopicsResponse,
} from "@/app/api/dev/exercise-generator-quiz/topics/route";
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

function topicDisplayLabel(topic: string): string {
  return topic === ALL_TOPICS ? "Alle topics" : topic;
}

function modeDisplayLabel(mode: TypingMode): string {
  return mode === "full" ? "Volledig typen" : "Ontbrekend woord";
}

function directionDisplayLabel(direction: TranslationDirection): string {
  return direction === "es-to-nl" ? "ES → NL" : "NL → ES";
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
      if (e.key === "Escape") {
        e.preventDefault();
        if (screen === "playing") {
          handleChangeSetup();
        } else if (screen === "selection") {
          handleBackToSetup();
        } else if (screen === "topic-picker" || screen === "exercise-picker") {
          setScreen("selection");
        } else {
          router.push("/dev/exercises-quiz");
        }
        return;
      }

      if (screen !== "playing" || loading || !item) return;

      if (!feedback && isQuizShortcut(e, QUIZ_SHORTCUTS.skip)) {
        e.preventDefault();
        handleSkip();
        return;
      }

      if (
        mode === "blank" &&
        !feedback &&
        isQuizShortcut(e, QUIZ_SHORTCUTS.hint)
      ) {
        e.preventDefault();
        handleShowHint();
        return;
      }

      if (e.key === "Enter" && !e.shiftKey && !e.ctrlKey && !e.altKey && !e.metaKey) {
        e.preventDefault();
        if (feedback) {
          handleNext();
        } else if (answer.trim().length > 0) {
          handleSubmit();
        }
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
    answer,
    mode,
    router,
    handleChangeSetup,
    handleBackToSetup,
    handleNext,
    handleSubmit,
    handleSkip,
    handleShowHint,
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
          Typen
        </h1>
        <p className="text-sm text-muted-foreground">
          {screen === "playing"
            ? "Typ de vertaling en controleer je antwoord."
            : "Kies modus, selectie en oefeningen voor je typ-quiz."}
        </p>
      </header>

      {screen !== "playing" && (
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span className="rounded-full bg-muted px-2 py-0.5">
            {modeDisplayLabel(mode)}
          </span>
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
                {modeDisplayLabel(mode)}
              </span>
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
                onSkip={handleSkip}
                onNext={handleNext}
                onShowHint={handleShowHint}
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
