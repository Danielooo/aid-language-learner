"use client";

import { useEffect, useMemo, useRef } from "react";

import { ExerciseAudioAttribution } from "@/app/_components/features/quiz/exercise-audio-attribution";
import { ExerciseAudioControls } from "@/app/_components/features/quiz/exercise-audio-controls";
import {
  QUIZ_SHORTCUTS,
  formatQuizShortcut,
} from "@/lib/keyboard/quiz-shortcuts";
import { shuffleAnagram } from "@/lib/quiz/anagram";
import { pickBlankWord } from "@/lib/quiz/blank-word";
import { isAnswerCorrect, normalizeForCompare } from "@/lib/quiz/compare";
import { getPromptAndAnswer } from "@/lib/quiz/typing-config";

import type { ExerciseQuizItem } from "@/types/quiz";
import type {
  TranslationDirection,
  TypingMode,
} from "@/lib/quiz/typing-config";

export type TypingFeedback = {
  isCorrect: boolean;
  correctAnswer: string;
};

type TypingExerciseProps = {
  item: ExerciseQuizItem;
  mode: TypingMode;
  direction: TranslationDirection;
  answer: string;
  feedback: TypingFeedback | null;
  hintVisible: boolean;
  onAnswerChange: (value: string) => void;
  onSubmit: () => void;
  onSkip: () => void;
  onNext: () => void;
  onShowHint: () => void;
};

export function TypingExercise({
  item,
  mode,
  direction,
  answer,
  feedback,
  hintVisible,
  onAnswerChange,
  onSubmit,
  onSkip,
  onNext,
  onShowHint,
}: TypingExerciseProps) {
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);
  const promptAndAnswer = useMemo(
    () => getPromptAndAnswer(item, direction),
    [item, direction],
  );

  const blank = useMemo(() => {
    if (mode !== "blank") return null;
    return pickBlankWord(promptAndAnswer.primaryAnswer);
  }, [mode, promptAndAnswer.primaryAnswer]);

  const anagramHint = useMemo(() => {
    if (!hintVisible || !blank) return "";
    return shuffleAnagram(blank.word);
  }, [hintVisible, blank]);

  useEffect(() => {
    if (!feedback) {
      inputRef.current?.focus();
    }
  }, [feedback, item.id]);

  function handleFormSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (feedback) {
      onNext();
      return;
    }
    onSubmit();
  }

  return (
    <form onSubmit={handleFormSubmit} className="space-y-4">
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {promptAndAnswer.promptLabel}
          </p>
          {item.topic && (
            <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              {item.topic}
            </span>
          )}
        </div>
        <p className="text-xl font-medium leading-snug text-foreground">
          {promptAndAnswer.prompt}
        </p>
        {item.mp3_url && (
          <ExerciseAudioControls mp3Url={item.mp3_url} variant="large" />
        )}
        {item.mp3_url && (
          <ExerciseAudioAttribution
            author={item.tatoeba_author}
            license={item.tatoeba_license}
            attributionUrl={item.tatoeba_attribution_url}
          />
        )}
        <p className="font-mono text-[10px] text-muted-foreground/70">
          #{item.id.slice(0, 8)}
        </p>
      </div>

      {mode === "blank" && blank && (
        <div className="space-y-1">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {promptAndAnswer.answerLabel} — vul het ontbrekende woord in
          </p>
          <p className="text-lg font-medium leading-snug text-foreground">
            {blank.display}
          </p>
          {hintVisible && (
            <p className="rounded-md border border-border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
              Hint (anagram):{" "}
              <span className="font-mono font-medium tracking-widest text-foreground">
                {anagramHint}
              </span>
            </p>
          )}
        </div>
      )}

      <label htmlFor="typing-answer" className="flex flex-col gap-1.5">
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {mode === "full"
            ? `Jouw ${promptAndAnswer.answerLabel.toLowerCase()}e vertaling`
            : "Ontbrekend woord"}
        </span>
        {mode === "full" ? (
          <textarea
            id="typing-answer"
            ref={inputRef as React.RefObject<HTMLTextAreaElement>}
            name="answer"
            value={answer}
            onChange={(e) => onAnswerChange(e.target.value)}
            disabled={feedback !== null}
            rows={2}
            placeholder="Typ hier je vertaling..."
            className="w-full resize-none rounded-md border border-input bg-background px-3 py-2.5 text-base disabled:opacity-70 sm:text-sm"
          />
        ) : (
          <input
            id="typing-answer"
            ref={inputRef as React.RefObject<HTMLInputElement>}
            name="answer"
            type="text"
            value={answer}
            onChange={(e) => onAnswerChange(e.target.value)}
            disabled={feedback !== null}
            placeholder="Typ het ontbrekende woord..."
            className="w-full rounded-md border border-input bg-background px-3 py-2.5 text-base disabled:opacity-70 sm:text-sm"
            autoComplete="off"
          />
        )}
      </label>

      {feedback && <FeedbackBanner feedback={feedback} />}

      <div className="flex flex-wrap gap-2">
        {!feedback && (
          <>
            <button
              type="submit"
              disabled={answer.trim().length === 0}
              className="inline-flex min-h-11 flex-1 cursor-pointer items-center justify-center rounded-md bg-accent px-4 text-sm font-medium text-accent-foreground transition-colors hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-50 sm:min-h-10 sm:flex-initial"
            >
              Controleren
            </button>
            {mode === "blank" && (
              <button
                type="button"
                onClick={onShowHint}
                className="inline-flex min-h-11 cursor-pointer items-center justify-center rounded-md border border-input bg-background px-4 text-sm hover:bg-muted sm:min-h-10"
              >
                Hint ({formatQuizShortcut(QUIZ_SHORTCUTS.hint)})
              </button>
            )}
            <button
              type="button"
              onClick={onSkip}
              className="inline-flex min-h-11 cursor-pointer items-center justify-center rounded-md border border-input bg-background px-4 text-sm hover:bg-muted sm:min-h-10"
            >
              Skip ({formatQuizShortcut(QUIZ_SHORTCUTS.skip)})
            </button>
          </>
        )}
        {feedback && (
          <button
            type="submit"
            className="inline-flex min-h-11 flex-1 cursor-pointer items-center justify-center rounded-md bg-accent px-4 text-sm font-medium text-accent-foreground transition-colors hover:bg-accent/90 sm:min-h-10 sm:flex-initial"
          >
            Volgende oefening (Enter)
          </button>
        )}
      </div>
    </form>
  );
}

export function evaluateTypingAnswer(
  mode: TypingMode,
  direction: TranslationDirection,
  item: ExerciseQuizItem,
  answer: string,
): TypingFeedback {
  const { acceptedAnswers, primaryAnswer } = getPromptAndAnswer(item, direction);

  if (mode === "full") {
    const isCorrect = isAnswerCorrect(answer, acceptedAnswers);
    return {
      isCorrect,
      correctAnswer: primaryAnswer,
    };
  }

  const blank = pickBlankWord(primaryAnswer);
  const isCorrect =
    normalizeForCompare(answer) === normalizeForCompare(blank.word);

  return {
    isCorrect,
    correctAnswer: blank.word,
  };
}

function FeedbackBanner({ feedback }: { feedback: TypingFeedback }) {
  if (feedback.isCorrect) {
    return (
      <div className="rounded-md border border-emerald-500/40 bg-emerald-500/10 p-3 text-sm text-emerald-700 dark:text-emerald-300">
        <p className="font-medium">Goed!</p>
        <p className="mt-1 text-xs opacity-80">
          Antwoord:{" "}
          <span className="font-medium">{feedback.correctAnswer}</span>
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
      <p className="font-medium">Niet goed.</p>
      <p className="mt-1 text-xs">
        Geldig antwoord:{" "}
        <span className="font-medium">{feedback.correctAnswer}</span>
      </p>
    </div>
  );
}

export function TypingExerciseSkeleton() {
  return (
    <div className="space-y-3">
      <div className="h-3 w-16 animate-pulse rounded bg-muted" />
      <div className="h-6 w-3/4 animate-pulse rounded bg-muted" />
      <div className="h-10 w-full animate-pulse rounded bg-muted" />
    </div>
  );
}
