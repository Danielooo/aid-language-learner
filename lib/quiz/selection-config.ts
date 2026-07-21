/** Hoe oefeningen worden gekozen in de quiz-flow. */

export const QUIZ_SELECTION_MODES = ["topic", "srs", "custom"] as const;

export type QuizSelectionMode = (typeof QUIZ_SELECTION_MODES)[number];

export const QUIZ_SELECTION_MODE_KEY = "aid:exercises-quiz:selection-mode";

/** Legacy waarde uit eerdere versies. */
const LEGACY_RANDOM_MODE = "random";

export function normalizeQuizSelectionMode(value: string): QuizSelectionMode | null {
  if (value === LEGACY_RANDOM_MODE) return "topic";
  return isValidQuizSelectionMode(value) ? value : null;
}

export function isValidQuizSelectionMode(
  value: string,
): value is QuizSelectionMode {
  return (QUIZ_SELECTION_MODES as readonly string[]).includes(value);
}

export function selectionModeLabel(mode: QuizSelectionMode): string {
  switch (mode) {
    case "topic":
      return "Topic oefenen";
    case "srs":
      return "Herhaalschema";
    case "custom":
      return "Zelf kiezen";
  }
}

export function selectionModeDescription(mode: QuizSelectionMode): string {
  switch (mode) {
    case "topic":
      return "Kies een topic en oefen alle oefeningen één keer. Daarna kun je fouten opnieuw doen.";
    case "srs":
      return "Herhaal alleen oefeningen die nu aan herhaling toe zijn.";
    case "custom":
      return "Selecteer zelf welke oefeningen je wilt doen.";
  }
}
