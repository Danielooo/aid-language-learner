"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { useRef } from "react";

import { ALL_TOPICS } from "@/app/_components/features/quiz/constants";

import type { TopicStat } from "@/types/quiz";

gsap.registerPlugin(useGSAP);

type TopicPickerGridProps = {
  stats: TopicStat[];
  loading: boolean;
  selectedTopic: string;
  onSelect: (topic: string) => void;
  /** Toon due-counts i.p.v. totaal aantal oefeningen (spaced repetition). */
  srsMode?: boolean;
  dueByTopic?: Record<string, number>;
};

function topicLabel(topic: string): string {
  return topic === ALL_TOPICS ? "Alle topics" : topic;
}

export function TopicPickerGrid({
  stats,
  loading,
  selectedTopic,
  onSelect,
  srsMode = false,
  dueByTopic = {},
}: TopicPickerGridProps) {
  const gridRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (loading || stats.length === 0) return;
      const cards = gridRef.current?.querySelectorAll("[data-topic-card]");
      if (!cards?.length) return;

      const reducedMotion =
        typeof window !== "undefined" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      if (reducedMotion) {
        gsap.set(cards, { opacity: 1, y: 0 });
        return;
      }

      gsap.fromTo(
        cards,
        { opacity: 0, y: 16 },
        {
          opacity: 1,
          y: 0,
          duration: 0.35,
          ease: "power2.out",
          stagger: 0.05,
        },
      );
    },
    { scope: gridRef, dependencies: [loading, stats], revertOnUpdate: true },
  );

  if (loading) {
    return (
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="h-28 animate-pulse rounded-2xl border border-border bg-muted/40"
          />
        ))}
      </div>
    );
  }

  if (stats.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Geen topics beschikbaar. Genereer eerst oefeningen via de
        oefeningen-generator.
      </p>
    );
  }

  return (
    <div
      ref={gridRef}
      className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
      role="listbox"
      aria-label="Kies een topic"
    >
      {stats.map((stat) => {
        const isSelected = stat.topic === selectedTopic;
        const isAll = stat.topic === ALL_TOPICS;
        const dueCount = srsMode
          ? isAll
            ? Object.values(dueByTopic).reduce((sum, n) => sum + n, 0)
            : (dueByTopic[stat.topic] ?? 0)
          : null;
        const isDone = srsMode && dueCount === 0;

        return (
          <button
            key={stat.topic}
            type="button"
            data-topic-card
            role="option"
            aria-selected={isSelected}
            disabled={isDone}
            onClick={() => {
              if (!isDone) onSelect(stat.topic);
            }}
            className={`group flex min-h-28 flex-col items-start justify-between rounded-2xl border p-5 text-left transition-all ${
              isDone
                ? "cursor-not-allowed border-border bg-muted/20 opacity-60"
                : "cursor-pointer hover:-translate-y-0.5 hover:shadow-md"
            } ${
              isSelected && !isDone
                ? "border-accent bg-gradient-to-br from-accent/20 via-accent/5 to-card shadow-md ring-2 ring-accent/30"
                : isDone
                  ? ""
                  : "border-border bg-card hover:border-accent/30 hover:bg-muted/30"
            }`}
          >
            <div className="space-y-1">
              <span
                className={`text-[10px] font-medium uppercase tracking-wide ${
                  isAll ? "text-accent" : "text-muted-foreground"
                }`}
              >
                {isAll ? "Alles" : "Topic"}
              </span>
              <h3 className="text-base font-semibold leading-snug text-foreground">
                {topicLabel(stat.topic)}
              </h3>
            </div>
            <p className="text-xs text-muted-foreground">
              {srsMode ? (
                isDone ? (
                  <span className="font-medium text-muted-foreground">Klaar</span>
                ) : (
                  <>
                    <span className="font-medium text-accent">{dueCount}</span>{" "}
                    {dueCount === 1 ? "klaar voor herhaling" : "klaar voor herhaling"}
                  </>
                )
              ) : (
                <>
                  {stat.count}{" "}
                  {stat.count === 1 ? "oefening" : "oefeningen"}
                </>
              )}
            </p>
          </button>
        );
      })}
    </div>
  );
}
