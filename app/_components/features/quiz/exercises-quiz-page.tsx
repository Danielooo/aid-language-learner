"use client";

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
  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Oefeningen-quiz
        </h1>
        <p className="text-sm text-muted-foreground">
          Kies een quiz-vorm en hoe je wilt oefenen: willekeurig, spaced
          repetition of een eigen selectie.
        </p>
      </header>

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
