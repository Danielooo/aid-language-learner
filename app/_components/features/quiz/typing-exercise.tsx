"use client";

import { useEffect, useMemo, useRef } from "react";

import { ExerciseAudioAttribution } from "@/app/_components/features/quiz/exercise-audio-attribution";
import { ExerciseAudioControls } from "@/app/_components/features/quiz/exercise-audio-controls";
import { shuffleAnagram } from "@/lib/quiz/anagram";
import { pickBlankWord } from "@/lib/quiz/blank-word";
import { isAnswerCorrect, normalizeForCompare } from "@/lib/quiz/compare";
import { getPromptAndAnswer } from "@/lib/quiz/typing-config";

import { FlashcardActionButton } from "./flashcard-action-button";

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
      inputRef.current?.focus({ preventScroll: true });
    }
  }, [feedback, item.id]);

  function handleFormSubmit(e: React.FormEvent<HTMLFormElement>) {
    // Geen Enter-submit: controleren/volgende alleen via knoppen.
    e.preventDefault();
  }

  const canCheck = answer.trim().length > 0;
  const hasFeedback = feedback !== null;

  return (
    <form onSubmit={handleFormSubmit} className="mx-auto w-full max-w-lg">
      {/* Prompt-kaart — zelfde taal als flashcard-voorkant */}
      <div className="relative flex min-h-64 flex-col items-center justify-center rounded-2xl border border-accent/25 bg-gradient-to-br from-accent/15 via-accent/5 to-card p-6 text-center shadow-lg shadow-accent/10 sm:min-h-72">
        <div className="flex w-full flex-col items-center gap-3">
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {promptAndAnswer.promptLabel}
          </span>
          <p className="text-2xl font-semibold leading-snug text-foreground sm:text-3xl">
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
        </div>
        <p className="absolute bottom-4 text-[11px] text-muted-foreground/80">
          {mode === "blank"
            ? "Vul het ontbrekende woord in"
            : "Typ de vertaling hieronder"}
        </p>
      </div>

      {mode === "blank" && blank && (
        <div className="mt-4 space-y-2 rounded-xl border border-border/60 bg-muted/20 px-4 py-3 text-center">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {promptAndAnswer.answerLabel}
          </p>
          <p className="text-xl font-semibold leading-snug text-foreground sm:text-2xl">
            {blank.display}
          </p>
          {/* Vaste hint-hoogte zodat layout niet verspringt bij tonen */}
          <div className="min-h-[2.75rem]">
            {hintVisible ? (
              <p className="rounded-md border border-border bg-background/80 px-3 py-2 text-sm text-muted-foreground">
                Hint (anagram):{" "}
                <span className="font-mono font-medium tracking-widest text-foreground">
                  {anagramHint}
                </span>
              </p>
            ) : null}
          </div>
        </div>
      )}

      {mode === "full" ? (
        <label htmlFor="typing-answer" className="mt-4 flex flex-col gap-1.5">
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {`Jouw antwoord (${promptAndAnswer.answerLabel})`}
          </span>
          <textarea
            id="typing-answer"
            ref={inputRef as React.RefObject<HTMLTextAreaElement>}
            name="answer"
            value={answer}
            onChange={(e) => onAnswerChange(e.target.value)}
            disabled={hasFeedback}
            rows={2}
            placeholder="Typ hier je vertaling…"
            className="w-full resize-none rounded-xl border border-input bg-background px-4 py-3 text-base shadow-sm disabled:opacity-70"
          />
        </label>
      ) : (
        <input
          id="typing-answer"
          ref={inputRef as React.RefObject<HTMLInputElement>}
          name="answer"
          type="text"
          value={answer}
          onChange={(e) => onAnswerChange(e.target.value)}
          disabled={hasFeedback}
          placeholder="Typ het ontbrekende woord…"
          aria-label="Ontbrekend woord"
          className="mt-4 w-full rounded-xl border border-input bg-background px-4 py-3 text-center text-lg font-medium shadow-sm disabled:opacity-70"
          autoComplete="off"
        />
      )}

      {/* Vaste feedback-hoogte zodat knoppen niet omlaag springen */}
      <div className="mt-4 min-h-[4.75rem]">
        {feedback ? <FeedbackBanner feedback={feedback} /> : null}
      </div>

      {/* Controleren/Volgende + optioneel Hint */}
      <div
        className={`mt-2 grid gap-2 ${
          mode === "blank"
            ? "grid-cols-1 sm:grid-cols-2"
            : "grid-cols-1"
        }`}
      >
        {hasFeedback ? (
          <FlashcardActionButton
            label="Volgende oefening"
            onClick={onNext}
            variant="accent"
          />
        ) : (
          <FlashcardActionButton
            label="Controleren"
            onClick={onSubmit}
            disabled={!canCheck}
            variant="accent"
          />
        )}
        {mode === "blank" && (
          <FlashcardActionButton
            label="Hint"
            onClick={onShowHint}
            disabled={hasFeedback || hintVisible}
          />
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
      <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-4 text-center text-sm text-emerald-700 dark:text-emerald-300">
        <p className="font-medium">Goed!</p>
        <p className="mt-1 text-xs opacity-80">
          Antwoord:{" "}
          <span className="font-medium">{feedback.correctAnswer}</span>
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-destructive/50 bg-destructive/10 p-4 text-center text-sm text-destructive">
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
    <div className="mx-auto w-full max-w-lg space-y-4">
      <div className="h-64 animate-pulse rounded-2xl bg-muted/60 sm:h-72" />
      <div className="h-12 animate-pulse rounded-xl bg-muted/60" />
      <div className="h-[4.75rem]" />
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        <div className="h-12 animate-pulse rounded-xl bg-muted/60" />
        <div className="h-12 animate-pulse rounded-xl bg-muted/60" />
        <div className="hidden h-12 animate-pulse rounded-xl bg-muted/60 sm:block" />
      </div>
    </div>
  );
}
