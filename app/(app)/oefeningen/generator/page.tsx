import { ExerciseGenerator } from "@/app/_components/features/generator/exercise-generator";

import type { Metadata } from "next";

export const metadata: Metadata = { title: "Oefeningen-generator" };

export default function GeneratorPage() {
  return <ExerciseGenerator />;
}
