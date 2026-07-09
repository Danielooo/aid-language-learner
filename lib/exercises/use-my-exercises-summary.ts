"use client";

import { useEffect, useState } from "react";

import type { MyExercisesListResponse } from "@/app/api/dev/my-exercises/route";

type TopicsResponse =
  | { ok: true; topics: string[] }
  | { ok: false; error: string };

type SummaryState = {
  savedCount: number | null;
  topicCount: number | null;
  loading: boolean;
};

/** Lichte fetch voor header-stats op de Oefeningen-pagina. */
export function useMyExercisesSummary() {
  const [state, setState] = useState<SummaryState>({
    savedCount: null,
    topicCount: null,
    loading: true,
  });

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const [listRes, topicsRes] = await Promise.all([
          fetch("/api/dev/my-exercises?page=1&pageSize=1", { cache: "no-store" }),
          fetch("/api/dev/my-exercises/topics", { cache: "no-store" }),
        ]);

        if (!listRes.ok || !topicsRes.ok) {
          throw new Error("Kon oefeningen niet laden");
        }

        const listData = (await listRes.json()) as MyExercisesListResponse;
        const topicsData = (await topicsRes.json()) as TopicsResponse;

        if (cancelled) return;

        const savedCount =
          listData.ok === true ? listData.total : null;
        const topicCount =
          topicsData.ok === true ? topicsData.topics.length : null;

        setState({ savedCount, topicCount, loading: false });
      } catch {
        if (!cancelled) {
          setState({ savedCount: null, topicCount: null, loading: false });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const formatCount = (value: number | null) =>
    value != null ? value.toLocaleString("nl-NL") : "—";

  return {
    loading: state.loading,
    stats: [
      {
        label: "Opgeslagen",
        value: formatCount(state.savedCount),
        loading: state.loading,
      },
      {
        label: "Topics",
        value: formatCount(state.topicCount),
        loading: state.loading,
      },
    ],
    savedCount: state.savedCount,
  };
}
