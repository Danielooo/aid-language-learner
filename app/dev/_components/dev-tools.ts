import type { ReactNode } from "react";

export type DevToolCategory = "lab" | "use";
export type DevView = DevToolCategory | "both";

export type DevTool = {
  href: string;
  title: string;
  description: ReactNode;
  category: DevToolCategory;
};

export const DEV_TOOLS: DevTool[] = [
  {
    href: "/dev/tatoeba",
    title: "Tatoeba",
    description:
      "Zinnen-corpus met vertalingen. Filter op brontaal, vereiste vertaling, tag en zoekterm.",
    category: "lab",
  },
  {
    href: "/dev/tatoeba-quiz",
    title: "Tatoeba-quiz",
    description:
      "Random Spaanse zin vertalen naar het Nederlands. Lenient vergelijking (hoofdletters/leestekens negeren), score en historie in localStorage.",
    category: "lab",
  },
  {
    href: "/dev/exercise-generator-quiz",
    title: "Oefeningen-generator-quiz",
    description:
      "Quiz op je gegenereerde oefeningen uit Supabase. Topic-filter, lenient vergelijking, score en historie in localStorage.",
    category: "lab",
  },
  {
    href: "/dev/tatoeba-audio",
    title: "Tatoeba-audio",
    description:
      "Verkent wat er mogelijk is met audio-bestanden van Tatoeba: ophalen via twee endpoints (audio-eerst én zin-eerst), afspelen via de CDN-URL, en doorzetten naar de publieke Supabase-bucket tatoeba-audio. Zes debug-panels tonen alle JSON heen-en-weer.",
    category: "lab",
  },
  {
    href: "/dev/wiktionary",
    title: "Wiktionary",
    description:
      "Definities per taal-sectie. Toont de ruwheid (HTML, coverage-gaps) die de AI moet interpreteren.",
    category: "lab",
  },
  {
    href: "/dev/wiktionary-chat",
    title: "Wiktionary-chatbot",
    description:
      "Vercel AI SDK demo (les 11). Stelt vragen over één woord; Wiktionary-data wordt vooraf in de system prompt geplakt. Inclusief raw-JSON debug-panels.",
    category: "lab",
  },
  {
    href: "/dev/tatoeba-audio-search",
    title: "Audio files ophalen",
    description:
      "Haal Tatoeba-records op, zoek op onderwerp via een Zoek model, verrijk en sla audio-oefeningen op in Supabase. Multi-turn met undo-stack op de selectie.",
    category: "use",
  },
  {
    href: "/dev/exercises-admin",
    title: "Oefeningen — admin",
    description:
      "Dashboard voor alle oefeningen in Supabase: bekijken, inline bewerken, AI-verrijken, verwijderen en server-side paginatie. Koppel met de generator om nieuwe oefeningen toe te voegen.",
    category: "use",
  },
  {
    href: "/dev/exercise-generator",
    title: "Oefeningen-generator",
    description:
      "Vercel AI SDK met tool-calling. Vraag de chatbot om N Spaans→Nederlands vertaalzinnen voor een onderwerp; review in tabel en persist naar Supabase. Beheer je eigen oefeningen via Mijn oefeningen.",
    category: "use",
  },
  {
    href: "/dev/my-exercises",
    title: "Mijn oefeningen",
    description:
      "Overzicht van je eigen opgeslagen oefeningen: bekijken, inline bewerken, AI-verrijken en verwijderen. Wissel via tabs met de generator.",
    category: "use",
  },
  {
    href: "/dev/exercises-quiz",
    title: "Oefeningen-quiz",
    description:
      "Kies een quiz-vorm voor je oefeningen: flashcards, typen of sorteren.",
    category: "use",
  },
  {
    href: "/dev/dashboard",
    title: "Dashboard",
    description:
      "Prestatie-overzicht op basis van je oefen-historie uit de generator-quiz: totalen, accuracy per topic, zwakke oefeningen en een 7-daagse trend.",
    category: "use",
  },
];

export function getToolsByCategory(category: DevToolCategory): DevTool[] {
  return DEV_TOOLS.filter((tool) => tool.category === category);
}
