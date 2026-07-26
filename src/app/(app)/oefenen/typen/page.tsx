import { TypingQuizDeck } from "@/components/features/quiz/typing-quiz-deck";

import type { Metadata } from "next";

export const metadata: Metadata = { title: "Typen" };

export default function TypenPage() {
  return <TypingQuizDeck />;
}
