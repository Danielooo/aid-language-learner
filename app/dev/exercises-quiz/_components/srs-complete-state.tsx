"use client";

import { ALL_TOPICS } from "@/app/dev/_components/quiz/constants";

import { SrsExplainer } from "./srs-explainer";

type SrsCompleteStateProps = {
  topic?: string;
  onBack: () => void;
};

function topicLabel(topic: string | undefined): string {
  if (!topic || topic === ALL_TOPICS) return "alle categorieën";
  return `topic "${topic}"`;
}

export function SrsCompleteState({ topic, onBack }: SrsCompleteStateProps) {
  return (
    <div className="mx-auto max-w-lg space-y-6 text-center">
      <div className="space-y-2">
        <p className="text-4xl" aria-hidden>
          ✓
        </p>
        <h2 className="text-xl font-semibold text-foreground">
          Je bent klaar voor nu!
        </h2>
        <p className="text-sm text-muted-foreground">
          Er staan geen oefeningen klaar voor herhaling in{" "}
          {topicLabel(topic)}. Kom later terug wanneer je volgende herhalingen
          due zijn.
        </p>
      </div>

      <SrsExplainer compact />

      <button
        type="button"
        onClick={onBack}
        className="cursor-pointer rounded-xl border border-border px-5 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
      >
        Terug naar instellingen
      </button>
    </div>
  );
}
