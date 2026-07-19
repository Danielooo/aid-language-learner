"use client";

import { useState } from "react";

import { MetricTooltip } from "./metric-tooltip";
import { TopicProgressModal } from "./topic-progress-modal";

import type { TopicProgressRow, TopicProgressStatus } from "@/lib/dashboard/types";

type TopicProgressListProps = {
  topics: TopicProgressRow[];
};

const STATUS_LABEL: Record<TopicProgressStatus, string> = {
  "nog-starten": "Nog starten",
  bezig: "Bezig",
  "ver-gevorderd": "Ver gevorderd",
  beheerst: "Beheerst",
};

const STATUS_BADGE_CLASS: Record<TopicProgressStatus, string> = {
  "nog-starten": "bg-muted text-muted-foreground",
  bezig: "bg-[#3b82f6]/20 text-foreground",
  "ver-gevorderd": "bg-chart-neutral/25 text-foreground",
  beheerst: "bg-chart-correct/20 text-foreground",
};

const STATUS_BAR_CLASS: Record<TopicProgressStatus, string> = {
  "nog-starten": "bg-muted-foreground/40",
  bezig: "bg-[#3b82f6]",
  "ver-gevorderd": "bg-chart-neutral",
  beheerst: "bg-chart-correct",
};

export function TopicProgressList({ topics }: TopicProgressListProps) {
  const [selected, setSelected] = useState<TopicProgressRow | null>(null);

  if (topics.length === 0) {
    return (
      <section className="rounded-md border border-dashed border-border px-4 py-6 text-sm text-muted-foreground">
        Geen actieve topics in je leerplan. Activeer een topic om hier voortgang te zien.
      </section>
    );
  }

  return (
    <section className="space-y-3">
      <header className="flex items-center gap-2">
        <h2 className="text-sm font-semibold">Per topic</h2>
        <MetricTooltip term="voortgang-topics" />
      </header>

      <div className="overflow-hidden rounded-md border border-border">
        <ul className="divide-y divide-border">
          {topics.map((topic) => (
            <li key={topic.topic}>
              <button
                type="button"
                onClick={() => setSelected(topic)}
                className="flex w-full items-start gap-4 px-4 py-3 text-left transition-colors hover:bg-muted/40 focus-visible:bg-muted/40 focus-visible:outline-none"
              >
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex min-w-0 flex-wrap items-center gap-2">
                    <p className="truncate text-sm font-medium text-foreground">{topic.topic}</p>
                    <span
                      className={`inline-flex shrink-0 rounded-md px-2 py-0.5 text-xs font-medium ${STATUS_BADGE_CLASS[topic.status]}`}
                    >
                      {STATUS_LABEL[topic.status]}
                    </span>
                  </div>
                  <div
                    className="h-3 overflow-hidden rounded-full bg-muted"
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
                <p className="shrink-0 pt-0.5 text-lg font-semibold tabular-nums text-foreground">
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
