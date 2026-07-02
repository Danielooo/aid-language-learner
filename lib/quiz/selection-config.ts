/** Hoe oefeningen worden gekozen in de quiz-flow. */

export const QUIZ_SELECTION_MODES = ["random", "srs", "custom"] as const;

export type QuizSelectionMode = (typeof QUIZ_SELECTION_MODES)[number];

export const QUIZ_SELECTION_MODE_KEY = "aid:exercises-quiz:selection-mode";

export function isValidQuizSelectionMode(
  value: string,
): value is QuizSelectionMode {
  return (QUIZ_SELECTION_MODES as readonly string[]).includes(value);
}

export function selectionModeLabel(mode: QuizSelectionMode): string {
  switch (mode) {
    case "random":
      return "Willekeurig";
    case "srs":
      return "Spaced repetition";
    case "custom":
      return "Zelf kiezen";
  }
}

export function selectionModeDescription(mode: QuizSelectionMode): string {
  switch (mode) {
    case "random":
      return "Kies een topic en oefen met willekeurige oefeningen.";
    case "srs":
      return "Herhaal alleen oefeningen die nu aan herhaling toe zijn.";
    case "custom":
      return "Selecteer zelf welke oefeningen je wilt doen.";
  }
}
