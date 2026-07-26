import { SortQuizDeck } from "@/components/features/quiz/sort-quiz-deck";

import type { Metadata } from "next";

export const metadata: Metadata = { title: "Sorteren" };

export default function SorterenPage() {
  return <SortQuizDeck />;
}
