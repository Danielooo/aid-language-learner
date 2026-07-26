import { FlashcardDeck } from "@/app/_components/features/quiz/flashcard-deck";

import type { Metadata } from "next";

export const metadata: Metadata = { title: "Flashcards" };

export default function FlashcardsPage() {
  return <FlashcardDeck />;
}
