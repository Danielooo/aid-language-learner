/** Hoe oefeningen worden gekozen in de quiz-flow (hub → subpagina). */

export const QUIZ_SELECTION_MODES = ["topic", "srs"] as const;

export type QuizSelectionMode = (typeof QUIZ_SELECTION_MODES)[number];

export const QUIZ_SELECTION_MODE_KEY = "aid:exercises-quiz:selection-mode";

/** Legacy waarden uit eerdere versies (worden genegeerd → redirect naar hub). */
const LEGACY_RANDOM_MODE = "random";
const LEGACY_CUSTOM_MODE = "custom";

export function normalizeQuizSelectionMode(
  value: string,
): QuizSelectionMode | null {
  if (value === LEGACY_RANDOM_MODE) return "topic";
  if (value === LEGACY_CUSTOM_MODE) return null;
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
      return "Topic";
    case "srs":
      return "Herhaalschema";
  }
}
