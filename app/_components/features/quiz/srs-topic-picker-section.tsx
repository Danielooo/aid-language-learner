"use client";

import { ALL_TOPICS } from "@/app/_components/features/quiz/constants";

import { useExerciseProgress } from "./hooks/use-exercise-progress";
import { SrsCompleteState } from "./srs-complete-state";
import { SrsExplainer } from "./srs-explainer";
import { TopicPickerGrid } from "./topic-picker-grid";

import type { TopicStat } from "@/types/quiz";

type SrsTopicPickerSectionProps = {
  topicStats: TopicStat[];
  topicsLoading: boolean;
  selectedTopic: string;
  onSelect: (topic: string) => void;
  onBack: () => void;
};

export function SrsTopicPickerSection({
  topicStats,
  topicsLoading,
  selectedTopic,
  onSelect,
  onBack,
}: SrsTopicPickerSectionProps) {
  const { data: stats = null, isPending: statsLoading } =
    useExerciseProgress("topics");

  const loading = topicsLoading || statsLoading;
  const dueByTopic = stats?.dueByTopic ?? {};
  const totalDue = stats?.dueCount ?? 0;
  const allDone = !loading && totalDue === 0;

  return (
    <section className="space-y-4 rounded-2xl border border-border bg-gradient-to-b from-muted/30 to-background p-6 sm:p-8">
      <div className="space-y-1">
        <h2 className="text-sm font-semibold text-foreground">
          Kies een categorie
        </h2>
        <p className="text-xs text-muted-foreground">
          Alleen oefeningen die nu aan herhaling toe zijn. Per categorie zie je
          hoeveel er klaarstaan.
        </p>
      </div>

      <SrsExplainer compact />

      {allDone ? (
        <SrsCompleteState onBack={onBack} />
      ) : (
        <TopicPickerGrid
          stats={topicStats}
          loading={loading}
          selectedTopic={selectedTopic}
          onSelect={onSelect}
          srsMode
          dueByTopic={dueByTopic}
        />
      )}
    </section>
  );
}

/** Geeft het aantal due-oefeningen voor een topic (of totaal bij ALL_TOPICS). */
export function getDueCountForTopic(
  dueByTopic: Record<string, number>,
  topic: string,
): number {
  if (topic === ALL_TOPICS) {
    return Object.values(dueByTopic).reduce((sum, n) => sum + n, 0);
  }
  return dueByTopic[topic] ?? 0;
}
