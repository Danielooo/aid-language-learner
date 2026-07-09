import { ExerciseGenerator } from "@/app/_components/features/generator/exercise-generator";

// Lab-variant van de oefeningen-generator: zelfde component als
// /oefeningen/generator, maar met debug-panels aan.
export default function ExerciseGeneratorPage() {
  return <ExerciseGenerator showDebug />;
}
