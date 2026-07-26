"use client";

import Link from "next/link";

import { ALL_TOPICS } from "@/components/features/quiz/constants";
import { APP_ROUTES } from "@/lib/routes";

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
        <h2 className="text-foreground text-xl font-semibold">
          Je bent klaar voor nu!
        </h2>
        <p className="text-muted-foreground text-sm">
          Er staan geen oefeningen klaar voor herhaling in {topicLabel(topic)}.
          Kom later terug wanneer je volgende herhalingen due zijn.
        </p>
      </div>

      <SrsExplainer compact />

      <div className="flex flex-col items-center gap-2 sm:flex-row sm:justify-center">
        <Link
          href={APP_ROUTES.oefenen}
          className="bg-accent text-accent-foreground hover:bg-accent/90 rounded-xl px-5 py-2.5 text-sm font-medium transition-colors"
        >
          Terug naar Oefenen
        </Link>
        <button
          type="button"
          onClick={onBack}
          className="border-border text-foreground hover:bg-muted cursor-pointer rounded-xl border px-5 py-2.5 text-sm font-medium transition-colors"
        >
          Terug naar instellingen
        </button>
      </div>
    </div>
  );
}
