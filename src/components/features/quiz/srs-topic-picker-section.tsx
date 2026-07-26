"use client";

import { ALL_TOPICS } from "@/components/features/quiz/constants";

import { useExerciseProgress } from "./hooks/use-exercise-progress";
import { SrsCompleteState } from "./srs-complete-state";
import { SrsExplainer } from "./srs-explainer";
import { TopicPickerGrid } from "./topic-picker-grid";

import type { TopicStat } from "@/types/quiz";

type SrsTopicPickerSectionProps = {
  topicStats: TopicStat[];
  topicsLoading: boolean;
  selectedTopic: string;
  /** dueCount = snapshot op klikmoment (picker-weergave). */
  onSelect: (topic: string, dueCount: number) => void;
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
    <section className="border-border from-muted/30 to-background space-y-4 rounded-2xl border bg-gradient-to-b p-6 sm:p-8">
      <div className="space-y-1">
        <h2 className="text-foreground text-sm font-semibold">
          Kies een categorie
        </h2>
        <p className="text-muted-foreground text-xs">
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
          onSelect={(topic) =>
            onSelect(topic, getDueCountForTopic(dueByTopic, topic))
          }
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
