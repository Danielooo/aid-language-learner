"use client";

import { useSearchParams } from "next/navigation";

import { AppPageHeader } from "@/components/ui/app-page-header";

import { AudioExerciseGenerator } from "./audio-exercise-generator";
import { ExerciseGenerator } from "./exercise-generator";

type GeneratorTab = "text" | "audio";

function isGeneratorTab(value: string | null): value is GeneratorTab {
  return value === "text" || value === "audio";
}

/**
 * Generator-hub met tabs Tekst (LLM-zinnen) en Audio (Tatoeba-opnames).
 * Actieve tab via ?tab=audio zoals Community (niet localStorage).
 */
export function GeneratorPageContent() {
  const searchParams = useSearchParams();
  const rawTab = searchParams.get("tab");
  const tab: GeneratorTab = isGeneratorTab(rawTab) ? rawTab : "text";

  const tabButtonClass = (id: GeneratorTab) =>
    `rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
      tab === id
        ? "bg-muted text-foreground"
        : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
    }`;

  return (
    <div className="space-y-6">
      <AppPageHeader
        title="Generator"
        description={
          tab === "text" ? (
            'Kies of je een nieuw topic maakt of toevoegt aan bestaand. Vraag daarna de chatbot om Spaans→Nederlands oefeningen, review het voorstel en klik "Topic opslaan".'
          ) : (
            <>
              Kies of je een nieuw topic maakt of toevoegt aan bestaand.
              Genereer daarna spraakoefeningen, beluister ze met het
              luidsprekertje en sla op. De audiobestanden komen uit de{" "}
              <a
                href="https://api.tatoeba.org"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-foreground underline underline-offset-2"
              >
                Tatoeba-API
              </a>
              .
            </>
          )
        }
      />

      <div
        role="tablist"
        aria-label="Generator-modus"
        className="border-border flex flex-wrap gap-2 border-b pb-2"
      >
        <a
          role="tab"
          aria-selected={tab === "text"}
          href="?tab=text"
          className={tabButtonClass("text")}
        >
          Tekst
        </a>
        <a
          role="tab"
          aria-selected={tab === "audio"}
          href="?tab=audio"
          className={tabButtonClass("audio")}
        >
          Audio
        </a>
      </div>

      <div className="space-y-4">
        {tab === "text" ? <ExerciseGenerator /> : <AudioExerciseGenerator />}
      </div>
    </div>
  );
}
