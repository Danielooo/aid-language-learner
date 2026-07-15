import type { ReactNode } from "react";

export type DevTool = {
  href: string;
  title: string;
  description: ReactNode;
};

export const DEV_TOOLS: DevTool[] = [
  {
    href: "/dev/credentials",
    title: "Test credentials",
    description:
      "Leest CRED.md en toont testaccounts met kopieerknoppen per veld en per gebruiker. Alleen lokaal beschikbaar.",
  },
  {
    href: "/dev/tatoeba-audio-search",
    title: "Audio files ophalen",
    description:
      "Haal Tatoeba-records op, zoek op onderwerp via een Zoek model, verrijk en sla audio-oefeningen op in Supabase. Multi-turn met undo-stack op de selectie.",
  },
  {
    href: "/dev/exercises-admin",
    title: "Oefeningen — admin",
    description:
      "Dashboard voor alle oefeningen in Supabase: bekijken, inline bewerken, AI-verrijken, verwijderen en server-side paginatie. Koppel met de generator om nieuwe oefeningen toe te voegen.",
  },
  {
    href: "/dev/mijn-leerplan",
    title: "Mijn leerplan",
    description:
      "Kies welke topics je actief oefent. Vink aan wat je wilt leren; alleen actieve topics komen in quiz en spaced repetition.",
  },
  {
    href: "/dev/exercise-generator",
    title: "Oefeningen-generator",
    description:
      "Vercel AI SDK met tool-calling. Vraag de chatbot om N Spaans→Nederlands vertaalzinnen voor een onderwerp; review in tabel en persist naar Supabase. Beheer je eigen oefeningen via Mijn oefeningen.",
  },
  {
    href: "/dev/my-exercises",
    title: "Mijn oefeningen",
    description:
      "Overzicht van je eigen opgeslagen oefeningen: bekijken, inline bewerken, AI-verrijken en verwijderen. Wissel via tabs met de generator.",
  },
  {
    href: "/dev/exercises-quiz",
    title: "Oefeningen-quiz",
    description:
      "Kies een quiz-vorm voor je oefeningen: flashcards, typen of sorteren.",
  },
  {
    href: "/dev/dashboard",
    title: "Dashboard",
    description:
      "Prestatie-overzicht op basis van je oefen-historie uit de generator-quiz: totalen, accuracy per topic, zwakke oefeningen en een 7-daagse trend.",
  },
];
