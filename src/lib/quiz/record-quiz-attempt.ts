import type { QuizSelectionMode } from "@/lib/quiz/selection-config";
import type {
  TypingMode,
  TranslationDirection,
} from "@/lib/quiz/typing-config";

export const PRACTICE_TYPES = ["flashcard", "typing", "sort"] as const;
export type PracticeType = (typeof PRACTICE_TYPES)[number];

export type QuizAttemptMetadata = {
  selectionMode?: QuizSelectionMode | null;
  practiceType?: PracticeType | null;
  direction?: TranslationDirection | null;
  typingMode?: TypingMode | null;
  isMistakeReview?: boolean;
  responseTimeMs?: number | null;
};

export type QuizAttemptExerciseFields = {
  exerciseId: string;
  source_text: string;
  target_text: string;
  topic: string | null;
  userAnswer: string;
  isCorrect: boolean;
  at: number;
};

export type QuizAttemptPayload = QuizAttemptExerciseFields &
  QuizAttemptMetadata;

type BuildAttemptPayloadInput = QuizAttemptExerciseFields & QuizAttemptMetadata;

/** Bouwt een consistent attempt-object voor client-state en API POST. */
export function buildAttemptPayload(
  input: BuildAttemptPayloadInput,
): QuizAttemptPayload {
  return {
    ...input,
    selectionMode: input.selectionMode ?? null,
    practiceType: input.practiceType ?? null,
    direction: input.direction ?? null,
    typingMode: input.typingMode ?? null,
    isMistakeReview: input.isMistakeReview ?? false,
    responseTimeMs: input.responseTimeMs ?? null,
  };
}

/** Body voor POST /api/quiz-attempts (metadata optioneel voor backward compat). */
export function toQuizAttemptPostBody(payload: QuizAttemptPayload) {
  const body: Record<string, unknown> = {
    exerciseId: payload.exerciseId,
    userAnswer: payload.userAnswer,
    isCorrect: payload.isCorrect,
  };

  if (payload.selectionMode) body.selectionMode = payload.selectionMode;
  if (payload.practiceType) body.practiceType = payload.practiceType;
  if (payload.direction) body.direction = payload.direction;
  if (payload.typingMode) body.typingMode = payload.typingMode;
  if (payload.isMistakeReview) body.isMistakeReview = payload.isMistakeReview;
  if (payload.responseTimeMs != null)
    body.responseTimeMs = payload.responseTimeMs;

  return body;
}
