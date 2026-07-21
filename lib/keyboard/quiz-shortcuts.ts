export const QUIZ_SHORTCUTS = {
  hint: "h",
  skip: "s",
  gradeCorrect: "g",
  gradeIncorrect: "f",
  playAudio: "p",
  reviewMistakes: "r",
} as const;

/** Flashcards: eenvoudige letters zonder modifiers (tijdens oefenen). */
export const FLASHCARD_SHORTCUTS = {
  gradeCorrect: "g",
  gradeIncorrect: "f",
  previous: "v",
} as const;

/**
 * Typen: `[` / `]` botsen niet met letters in ES/NL-antwoorden en werken
 * mét focus in het invoerveld. Enter = controleren / volgende (apart).
 */
export const TYPING_SHORTCUTS = {
  hint: "[",
  skip: "]",
  previous: "v",
} as const;

function letterToCode(letter: string): string {
  return `Key${letter.toUpperCase()}`;
}

/**
 * Ctrl+Option (macOS) en Ctrl+Alt (Windows/Linux) zijn in de DOM
 * dezelfde combinatie: ctrlKey + altKey. Geen metaKey (⌘) of Shift.
 * Match op e.code i.p.v. e.key — Option wijzigt e.key op macOS.
 */
export function isQuizShortcut(
  e: KeyboardEvent | React.KeyboardEvent,
  key: string,
): boolean {
  return (
    e.ctrlKey &&
    e.altKey &&
    !e.metaKey &&
    !e.shiftKey &&
    e.code === letterToCode(key)
  );
}

/** Enkele letter zonder modifiers (flashcard-sessie). */
export function isPlainLetterShortcut(
  e: KeyboardEvent | React.KeyboardEvent,
  key: string,
): boolean {
  return (
    !e.ctrlKey &&
    !e.altKey &&
    !e.metaKey &&
    !e.shiftKey &&
    e.code === letterToCode(key)
  );
}

/**
 * `[` / `]` tijdens typen. Geen metaKey (⌘); ctrl/alt wel toegestaan zodat
 * AltGr-layouts (Windows) die `[` via AltGr maken, blijven werken.
 */
export function isTypingBracketShortcut(
  e: KeyboardEvent | React.KeyboardEvent,
  key: "[" | "]",
): boolean {
  return !e.metaKey && e.key === key;
}

function isMacPlatform(): boolean {
  if (typeof navigator === "undefined") return false;
  return /Mac|iPhone|iPad/i.test(navigator.platform);
}

/** macOS: "⌃⌥H" — Windows/Linux: "Ctrl+Alt+H" */
export function formatQuizShortcut(key: string): string {
  const upper = key.toUpperCase();
  if (isMacPlatform()) {
    return `⌃⌥${upper}`;
  }
  return `Ctrl+Alt+${upper}`;
}
