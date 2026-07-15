"use client";

import { useAppProfile } from "@/app/(app)/_components/app-profile-provider";
import { AppPageHeader } from "@/app/_components/ui/app-page-header";
import { useExerciseSummaryStats } from "@/lib/dashboard/use-exercise-summary-stats";

import { QuizModeCard } from "./quiz-mode-card";
import { SrsDueCard } from "./srs-due-card";

const QUIZ_MODES = [
  {
    title: "Flashcards",
    description:
      "Oefen met kaartjes: bronzin en vertaling om en om bekijken en zelf beoordelen.",
    href: "/oefenen/flashcards",
    comingSoon: false,
  },
  {
    title: "Typen",
    description:
      "Typ de vertaling van een oefening — volledig of met ontbrekend woord.",
    href: "/oefenen/typen",
    comingSoon: false,
  },
  {
    title: "Sorteren",
    description: "Zet woorden of letters in de juiste volgorde.",
    href: "/oefenen/sorteren",
    comingSoon: false,
  },
] as const;

export function ExercisesQuizPage() {
  const { displayLabel } = useAppProfile();
  const { stats, loading } = useExerciseSummaryStats();

  return (
    <div className="space-y-6">
      <AppPageHeader
        eyebrow="Oefenen"
        title="Oefenen"
        accountLabel={displayLabel}
        description="Kies een quiz-vorm en hoe je wilt oefenen: willekeurig, spaced repetition of een eigen selectie."
        stats={stats.map((stat) => ({ ...stat, loading }))}
      />

      <SrsDueCard />

      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {QUIZ_MODES.map((mode) => (
          <li key={mode.title}>
            <QuizModeCard
              title={mode.title}
              description={mode.description}
              href={"href" in mode ? mode.href : undefined}
              comingSoon={mode.comingSoon}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}
