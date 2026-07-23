import type { ExerciseQuizItem } from "@/types/quiz";
import {
  EXERCISE_QUIZ_SELECT,
  toExerciseQuizItem,
} from "@/lib/quiz/exercise-quiz-item";

import type { SupabaseClient } from "@supabase/supabase-js";

type ProgressRow = {
  exercise_id: string;
  next_review_at: string;
  is_suspended: boolean;
};

type ExerciseIdRow = {
  id: string;
  topic: string | null;
};

export type SrsDueCounts = {
  total: number;
  byTopic: Record<string, number>;
};

export type SrsProgressSnapshot = {
  nextReviewAt: Date;
  isSuspended: boolean;
};

function normalizeTopic(topic: string | null | undefined): string | null {
  if (!topic || topic.trim().length === 0) return null;
  return topic.trim();
}

/** Bepaalt of een oefening nu due is voor SRS. */
export function isSrsExerciseDue(
  progress: SrsProgressSnapshot | undefined,
  now: Date,
): boolean {
  if (!progress) return true;
  if (progress.isSuspended) return false;
  return progress.nextReviewAt <= now;
}

async function fetchExercisesInTopics(
  supabase: SupabaseClient,
  userId: string,
  activeList: string[],
  topic: string | null,
): Promise<ExerciseIdRow[]> {
  let query = supabase
    .from("exercises")
    .select("id, topic")
    .eq("owner_id", userId)
    .in("topic", activeList);

  if (topic) {
    query = query.eq("topic", topic);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []) as ExerciseIdRow[];
}

async function fetchProgressByExerciseId(
  supabase: SupabaseClient,
  userId: string,
): Promise<Map<string, SrsProgressSnapshot>> {
  const { data, error } = await supabase
    .from("exercise_progress")
    .select("exercise_id, next_review_at, is_suspended")
    .eq("user_id", userId);

  if (error) throw new Error(error.message);

  const map = new Map<string, SrsProgressSnapshot>();
  for (const row of (data ?? []) as ProgressRow[]) {
    map.set(row.exercise_id, {
      nextReviewAt: new Date(row.next_review_at),
      isSuspended: row.is_suspended,
    });
  }
  return map;
}

function collectDueExerciseIds(
  exercises: ExerciseIdRow[],
  progressByExerciseId: Map<string, SrsProgressSnapshot>,
  now: Date,
  activeListSet: Set<string>,
): { ids: string[]; byTopic: Record<string, number> } {
  const ids: string[] = [];
  const byTopic: Record<string, number> = {};

  for (const exercise of exercises) {
    const topic = normalizeTopic(exercise.topic);
    if (!topic || !activeListSet.has(topic)) continue;

    const progress = progressByExerciseId.get(exercise.id);
    if (!isSrsExerciseDue(progress, now)) continue;

    ids.push(exercise.id);
    byTopic[topic] = (byTopic[topic] ?? 0) + 1;
  }

  return { ids, byTopic };
}

/** Telt due oefeningen in actieve topics (untracked + tracked due). */
export async function countSrsDue(
  supabase: SupabaseClient,
  userId: string,
  activeList: string[],
  options?: { topic?: string | null; now?: Date },
): Promise<SrsDueCounts> {
  const now = options?.now ?? new Date();
  const topic = options?.topic ?? null;
  const activeListSet = new Set(activeList);

  const [exercises, progressByExerciseId] = await Promise.all([
    fetchExercisesInTopics(supabase, userId, activeList, topic),
    fetchProgressByExerciseId(supabase, userId),
  ]);

  const { ids, byTopic } = collectDueExerciseIds(
    exercises,
    progressByExerciseId,
    now,
    activeListSet,
  );

  return {
    total: ids.length,
    byTopic,
  };
}

/** Kiest een willekeurige due oefening uit actieve topics. */
export async function pickRandomSrsDueExercise(
  supabase: SupabaseClient,
  userId: string,
  activeList: string[],
  options?: { topic?: string | null; now?: Date },
): Promise<ExerciseQuizItem | null> {
  const now = options?.now ?? new Date();
  const topic = options?.topic ?? null;
  const activeListSet = new Set(activeList);

  const [exercises, progressByExerciseId] = await Promise.all([
    fetchExercisesInTopics(supabase, userId, activeList, topic),
    fetchProgressByExerciseId(supabase, userId),
  ]);

  const { ids } = collectDueExerciseIds(
    exercises,
    progressByExerciseId,
    now,
    activeListSet,
  );

  if (ids.length === 0) return null;

  const pickId = ids[Math.floor(Math.random() * ids.length)];

  const { data, error } = await supabase
    .from("exercises")
    .select(EXERCISE_QUIZ_SELECT)
    .eq("id", pickId)
    .eq("owner_id", userId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;

  return toExerciseQuizItem(supabase, data);
}
