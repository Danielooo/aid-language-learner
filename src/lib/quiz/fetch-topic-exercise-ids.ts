import { fisherYatesShuffle } from "@/lib/quiz/shuffle";

import type { ExerciseListItem } from "@/types/quiz";

const PAGE_SIZE = 200;

export type FetchTopicExerciseIdsResult = {
  ids: string[];
  total: number;
  skippedIneligible: number;
};

/**
 * Haalt alle oefening-IDs voor een topic op via paginatie.
 * Optionele filter voor deck-specifieke eligibility (bijv. sort ≥4 woorden).
 */
export async function fetchTopicExerciseIds(
  topic: string,
  filter?: (item: ExerciseListItem) => boolean,
): Promise<FetchTopicExerciseIdsResult> {
  const allItems: ExerciseListItem[] = [];
  let page = 1;
  let total = 0;

  while (true) {
    const params = new URLSearchParams();
    if (topic !== "all") {
      params.set("topic", topic);
    }
    params.set("page", String(page));
    params.set("pageSize", String(PAGE_SIZE));

    const res = await fetch(`/api/quiz/list?${params.toString()}`, {
      cache: "no-store",
    });
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      throw new Error(body.error ?? `Status ${res.status}`);
    }

    const data = (await res.json()) as {
      exercises: ExerciseListItem[];
      total: number;
    };
    allItems.push(...data.exercises);
    total = data.total;

    if (allItems.length >= total || data.exercises.length === 0) {
      break;
    }
    page += 1;
  }

  let skippedIneligible = 0;
  const ids: string[] = [];

  for (const item of allItems) {
    if (filter && !filter(item)) {
      skippedIneligible += 1;
      continue;
    }
    ids.push(item.id);
  }

  return {
    ids: fisherYatesShuffle(ids),
    total,
    skippedIneligible,
  };
}
