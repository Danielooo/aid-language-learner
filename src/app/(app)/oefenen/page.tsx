import { ExercisesQuizPage } from "@/components/features/quiz/exercises-quiz-page";

import type { Metadata } from "next";

export const metadata: Metadata = { title: "Oefenen" };

export default function OefenenPage() {
  return <ExercisesQuizPage />;
}
