"use client";

import { useCallback, useSyncExternalStore } from "react";

import { AppPageHeader } from "@/app/_components/ui/app-page-header";

import { AudioExerciseGenerator } from "./audio-exercise-generator";
import { ExerciseGenerator } from "./exercise-generator";

type GeneratorTab = "text" | "audio";

const TAB_STORAGE_KEY = "aid-generator-tab";
const TAB_UPDATED_EVENT = "aid-generator-tab-updated";

function isGeneratorTab(value: string | null): value is GeneratorTab {
  return value === "text" || value === "audio";
}

function readTab(): GeneratorTab {
  if (typeof window === "undefined") return "text";
  const raw = window.localStorage.getItem(TAB_STORAGE_KEY);
  return isGeneratorTab(raw) ? raw : "text";
}

function writeTab(tab: GeneratorTab): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(TAB_STORAGE_KEY, tab);
  } catch {
    // Quota / disabled storage — tab blijft in-memory tot refresh.
  }
  window.dispatchEvent(new Event(TAB_UPDATED_EVENT));
}

function subscribeTab(callback: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const onStorage = (e: StorageEvent) => {
    if (e.key === TAB_STORAGE_KEY) callback();
  };
  window.addEventListener("storage", onStorage);
  window.addEventListener(TAB_UPDATED_EVENT, callback);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(TAB_UPDATED_EVENT, callback);
  };
}

/**
 * Generator-hub met tabs Tekst (LLM-zinnen) en Audio (Tatoeba-opnames).
 * Actieve tab overleeft refresh via localStorage.
 */
export function GeneratorPageContent() {
  const tab = useSyncExternalStore(subscribeTab, readTab, () => "text");

  const setTab = useCallback((next: GeneratorTab) => {
    writeTab(next);
  }, []);

  const tabButtonClass = (id: GeneratorTab) =>
    `rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
      tab === id
        ? "bg-muted text-foreground"
        : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
    }`;

  return (
    <div className="space-y-6">
      <AppPageHeader
        eyebrow="Mijn materiaal"
        title="Generator"
        description={
          tab === "text"
            ? 'Vraag de chatbot om Spaans→Nederlands vertaaloefeningen voor een onderwerp, bijvoorbeeld "10 zinnen voor in een restaurant". Je reviewt het voorstel en klikt "Groep opslaan".'
            : 'Zoek echte Tatoeba-spraakoefeningen bij een onderwerp. De chatbot vertaalt je vraag naar zoektermen; jij previewt met het luidsprekertje en slaat een groep op.'
        }
      />

      <div
        role="tablist"
        aria-label="Generator-modus"
        className="flex flex-wrap gap-2 border-b border-border pb-2"
      >
        <button
          type="button"
          role="tab"
          aria-selected={tab === "text"}
          onClick={() => setTab("text")}
          className={tabButtonClass("text")}
        >
          Tekst
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "audio"}
          onClick={() => setTab("audio")}
          className={tabButtonClass("audio")}
        >
          Audio
        </button>
      </div>

      {tab === "text" ? (
        <ExerciseGenerator hideHeader />
      ) : (
        <AudioExerciseGenerator />
      )}
    </div>
  );
}
