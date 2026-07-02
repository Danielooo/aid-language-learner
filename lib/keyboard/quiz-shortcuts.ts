export const QUIZ_SHORTCUTS = {
  hint: "h",
  skip: "s",
  gradeCorrect: "g",
  gradeIncorrect: "f",
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
