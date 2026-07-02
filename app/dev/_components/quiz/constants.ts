/** Sentinel voor "geen topic-filter" in quiz-dropdowns. */
export const ALL_TOPICS = "all";

/** Herkenbare userAnswer-waarden voor flashcard self-grading. */
export const FLASHCARD_ANSWER_CORRECT = "[flashcard] goed";
export const FLASHCARD_ANSWER_INCORRECT = "[flashcard] fout";

export function isFlashcardAttempt(userAnswer: string): boolean {
  return userAnswer.startsWith("[flashcard]");
}
