"use client";

import Link from "next/link";

import { ALL_TOPICS } from "@/components/features/quiz/constants";

import type { TopicStat } from "@/types/quiz";

type ActiveTopicsEmptyBannerProps = {
  topicStats: TopicStat[];
  loading: boolean;
};

export function hasActivePracticeTopics(
  topicStats: TopicStat[],
  loading: boolean,
): boolean {
  if (loading) return true;
  return topicStats.some((stat) => stat.topic !== ALL_TOPICS && stat.count > 0);
}

export function ActiveTopicsEmptyBanner({
  topicStats,
  loading,
}: ActiveTopicsEmptyBannerProps) {
  if (loading || hasActivePracticeTopics(topicStats, loading)) {
    return null;
  }

  return (
    <div className="border-accent/40 bg-accent/5 text-muted-foreground rounded-xl border border-dashed px-4 py-4 text-sm">
      <p>
        Je hebt nog geen actieve topics. Ga naar{" "}
        <Link
          href="/leerplan"
          className="text-accent font-medium underline-offset-2 hover:underline"
        >
          Mijn leerplan
        </Link>{" "}
        om te kiezen wat je wilt oefenen.
      </p>
    </div>
  );
}
