import type { ExerciseQuizItem } from "@/app/api/dev/exercise-generator-quiz/route";

export type TypingMode = "full" | "blank";
export type TranslationDirection = "es-to-nl" | "nl-to-es";

export const TYPING_MODE_KEY = "aid:exercises-quiz-typen:mode";
export const TYPING_DIRECTION_KEY = "aid:exercises-quiz-typen:direction";
export const TYPING_TOPIC_KEY = "aid:exercises-quiz-typen:topic";

export type PromptAndAnswer = {
  prompt: string;
  promptLabel: string;
  answerLabel: string;
  acceptedAnswers: string[];
  primaryAnswer: string;
};

export function getPromptAndAnswer(
  item: ExerciseQuizItem,
  direction: TranslationDirection,
): PromptAndAnswer {
  if (direction === "es-to-nl") {
    const acceptedAnswers = [
      item.target_text,
      ...(item.alternative_translations ?? []),
    ];
    return {
      prompt: item.source_text,
      promptLabel: "Spaans",
      answerLabel: "Nederlands",
      acceptedAnswers,
      primaryAnswer: item.target_text,
    };
  }

  return {
    prompt: item.target_text,
    promptLabel: "Nederlands",
    answerLabel: "Spaans",
    acceptedAnswers: [item.source_text],
    primaryAnswer: item.source_text,
  };
}

export function isValidTypingMode(value: string): value is TypingMode {
  return value === "full" || value === "blank";
}

export function isValidTranslationDirection(
  value: string,
): value is TranslationDirection {
  return value === "es-to-nl" || value === "nl-to-es";
}
