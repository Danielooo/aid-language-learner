"use client";

import { useMemo, useState } from "react";

import { MetricTooltip } from "./metric-tooltip";
import { TopicProgressModal } from "./topic-progress-modal";

import type {
  TopicProgressRow,
  TopicProgressStatus,
} from "@/lib/dashboard/types";

type TopicProgressListProps = {
  topics: TopicProgressRow[];
};

type StartedStatus = Exclude<TopicProgressStatus, "nog-starten">;

type StartedTopicRow = TopicProgressRow & { status: StartedStatus };

const STATUS_BAR_CLASS: Record<StartedStatus, string> = {
  bezig: "bg-[#3b82f6]",
  "ver-gevorderd": "bg-chart-neutral",
  beheerst: "bg-chart-correct",
};

function isStartedTopic(topic: TopicProgressRow): topic is StartedTopicRow {
  return topic.status !== "nog-starten";
}

export function TopicProgressList({ topics }: TopicProgressListProps) {
  const [selected, setSelected] = useState<TopicProgressRow | null>(null);

  const startedTopics = useMemo(() => topics.filter(isStartedTopic), [topics]);

  if (startedTopics.length === 0) {
    return (
      <section className="space-y-3">
        <header className="flex items-center gap-2">
          <h2 className="text-sm font-semibold">Per topic</h2>
          <MetricTooltip term="voortgang-topics" />
        </header>
        <div className="border-border text-muted-foreground rounded-md border border-dashed px-4 py-6 text-sm">
          Nog geen voortgang per topic. Oefen via het herhaalschema om hier iets
          te zien.
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-3">
      <header className="flex items-center gap-2">
        <h2 className="text-sm font-semibold">Per topic</h2>
        <MetricTooltip term="voortgang-topics" />
      </header>

      <div className="border-border overflow-hidden rounded-md border">
        <ul className="divide-border divide-y">
          {startedTopics.map((topic) => (
            <li key={topic.topic}>
              <button
                type="button"
                onClick={() => setSelected(topic)}
                className="hover:bg-muted/40 focus-visible:bg-muted/40 flex w-full items-start gap-4 px-4 py-3 text-left transition-colors focus-visible:outline-none"
              >
                <div className="min-w-0 flex-1 space-y-2">
                  <p className="text-foreground truncate text-sm font-medium">
                    {topic.topic}
                  </p>
                  <div
                    className="bg-muted h-3 overflow-hidden rounded-full"
                    role="progressbar"
                    aria-valuenow={topic.percentMastered}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={`${topic.topic}: ${topic.percentMastered}% klaar`}
                  >
                    <div
                      className={`h-full rounded-full transition-[width] ${STATUS_BAR_CLASS[topic.status]}`}
                      style={{ width: `${topic.percentMastered}%` }}
                    />
                  </div>
                </div>
                <p className="text-foreground shrink-0 pt-0.5 text-lg font-semibold tabular-nums">
                  {topic.percentMastered}%
                </p>
              </button>
            </li>
          ))}
        </ul>
      </div>

      <TopicProgressModal
        topic={selected}
        open={selected != null}
        onClose={() => setSelected(null)}
      />
    </section>
  );
}
