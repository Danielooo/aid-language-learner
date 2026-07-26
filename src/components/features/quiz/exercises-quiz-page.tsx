"use client";

import { useState } from "react";

import { AppPageHeader } from "@/app/_components/ui/app-page-header";

import {
  FlashcardsIcon,
  QuizModeCard,
  SorterenIcon,
  TypenIcon,
} from "./quiz-mode-card";

import type { QuizSelectionMode } from "@/lib/quiz/selection-config";

const QUIZ_MODES = [
  {
    title: "Flashcards",
    description: "Bekijk en beoordeel.",
    href: "/oefenen/flashcards",
    icon: <FlashcardsIcon />,
  },
  {
    title: "Sorteren",
    description: "Zet in de juiste volgorde.",
    href: "/oefenen/sorteren",
    icon: <SorterenIcon />,
  },
  {
    title: "Typen",
    description: "Typ de vertaling.",
    href: "/oefenen/typen",
    icon: <TypenIcon />,
  },
] as const;

export function ExercisesQuizPage() {
  const [selection, setSelection] = useState<QuizSelectionMode | null>(null);

  return (
    <div className="space-y-6">
      <AppPageHeader
        title="Oefenen"
        description="Kies wat je oefent, en daarna hoe."
      />

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-foreground">
          Wat wil je oefenen?
        </h2>
        <ul
          className="grid w-full max-w-xl grid-cols-1 gap-3 sm:grid-cols-2"
          role="radiogroup"
          aria-label="Selectiewijze"
        >
          <li className="h-full">
            <QuizModeCard
              title="Topic"
              description="Kies een groep uit je leerplan."
              selected={selection === "topic"}
              onSelect={() => setSelection("topic")}
            />
          </li>
          <li className="h-full">
            <QuizModeCard
              title="Herhaalschema"
              description="Alleen wat nu aan herhaling toe is."
              selected={selection === "srs"}
              onSelect={() => setSelection("srs")}
            />
          </li>
        </ul>
      </section>

      {selection && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">
            Hoe wil je oefenen?
          </h2>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {QUIZ_MODES.map((mode) => (
              <li key={mode.title} className="h-full">
                <QuizModeCard
                  title={mode.title}
                  description={mode.description}
                  href={`${mode.href}?modus=${selection}`}
                  icon={mode.icon}
                />
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
