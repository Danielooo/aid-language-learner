"use client";

import Link from "next/link";

import { ALL_TOPICS } from "@/app/_components/features/quiz/constants";

import type { TopicStat } from "@/app/api/dev/exercise-generator-quiz/topics/route";

type ActiveTopicsEmptyBannerProps = {
  topicStats: TopicStat[];
  loading: boolean;
};

export function hasActivePracticeTopics(
  topicStats: TopicStat[],
  loading: boolean,
): boolean {
  if (loading) return true;
  return topicStats.some(
    (stat) => stat.topic !== ALL_TOPICS && stat.count > 0,
  );
}

export function ActiveTopicsEmptyBanner({
  topicStats,
  loading,
}: ActiveTopicsEmptyBannerProps) {
  if (loading || hasActivePracticeTopics(topicStats, loading)) {
    return null;
  }

  return (
    <div className="rounded-xl border border-dashed border-accent/40 bg-accent/5 px-4 py-4 text-sm text-muted-foreground">
      <p>
        Je hebt nog geen actieve topics. Ga naar{" "}
        <Link
          href="/leerplan"
          className="font-medium text-accent underline-offset-2 hover:underline"
        >
          Mijn leerplan
        </Link>{" "}
        om te kiezen wat je wilt oefenen.
      </p>
    </div>
  );
}
