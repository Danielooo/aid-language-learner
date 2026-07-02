import { z } from "zod";

import { getExerciseUserAccess } from "@/lib/dev/exercise-access";
import {
  createNewSrsCard,
  reviewSrsCard,
} from "@/lib/srs/schedule";
import {
  activeTopicsToArray,
  getActiveTopicsForUser,
  isTopicActive,
} from "@/lib/topics/active-topics";

// CRUD voor `exercise_progress` (spaced repetition). De quiz-decks
// roepen POST aan na elke poging in SRS-modus; GET levert due-counts
// voor de selectieschermen.

export const dynamic = "force-dynamic";

export type ExerciseProgressDto = {
  exerciseId: string;
  easeFactor: number;
  intervalDays: number;
  repetitionCount: number;
  nextReviewAt: string;
  lastReviewedAt: string | null;
  isSuspended: boolean;
};

export type ProgressStatsResponse = {
  dueCount: number;
  trackedCount: number;
  suspendedCount: number;
  dueByTopic?: Record<string, number>;
};

type ProgressRow = {
  exercise_id: string;
  ease_factor: number;
  interval_days: number;
  repetition_count: number;
  next_review_at: string;
  last_reviewed_at: string | null;
  is_suspended: boolean;
};

function toDto(row: ProgressRow): ExerciseProgressDto {
  return {
    exerciseId: row.exercise_id,
    easeFactor: Number(row.ease_factor),
    intervalDays: row.interval_days,
    repetitionCount: row.repetition_count,
    nextReviewAt: row.next_review_at,
    lastReviewedAt: row.last_reviewed_at,
    isSuspended: row.is_suspended,
  };
}

function rowFromCard(exerciseId: string, userId: string, card: ReturnType<typeof reviewSrsCard>) {
  return {
    user_id: userId,
    exercise_id: exerciseId,
    ease_factor: card.easeFactor,
    interval_days: card.intervalDays,
    repetition_count: card.repetitionCount,
    next_review_at: card.nextReviewAt.toISOString(),
    last_reviewed_at: card.lastReviewedAt?.toISOString() ?? null,
    is_suspended: card.isSuspended,
  };
}

export async function GET(req: Request) {
  const access = await getExerciseUserAccess();
  if (!access.ok) return access.response;

  const url = new URL(req.url);
  const topicParam = url.searchParams.get("topic");
  const breakdown = url.searchParams.get("breakdown");
  const topic =
    topicParam && topicParam.trim().length > 0 && topicParam !== "all"
      ? topicParam.trim()
      : null;

  const now = new Date().toISOString();
  const activeTopics = await getActiveTopicsForUser(access.supabase, access.userId);
  const activeList = activeTopicsToArray(activeTopics);

  if (topic && !isTopicActive(activeTopics, topic)) {
    const payload: ProgressStatsResponse = {
      dueCount: 0,
      trackedCount: 0,
      suspendedCount: 0,
      ...(breakdown === "topics" ? { dueByTopic: {} } : {}),
    };
    return Response.json(payload);
  }

  let dueCount = 0;
  let dueError: { message: string } | null = null;

  if (activeList) {
    let dueQuery = access.supabase
      .from("exercise_progress")
      .select("exercise_id, exercises!inner(topic)", { count: "exact", head: true })
      .eq("user_id", access.userId)
      .eq("is_suspended", false)
      .lte("next_review_at", now)
      .in("exercises.topic", activeList);

    if (topic) {
      dueQuery = dueQuery.eq("exercises.topic", topic);
    }

    const dueResult = await dueQuery;
    dueCount = dueResult.count ?? 0;
    dueError = dueResult.error;
  }

  if (dueError) {
    return Response.json({ error: dueError.message }, { status: 500 });
  }

  const { count: trackedCount, error: trackedError } = await access.supabase
    .from("exercise_progress")
    .select("exercise_id", { count: "exact", head: true })
    .eq("user_id", access.userId);

  if (trackedError) {
    return Response.json({ error: trackedError.message }, { status: 500 });
  }

  const { count: suspendedCount, error: suspendedError } = await access.supabase
    .from("exercise_progress")
    .select("exercise_id", { count: "exact", head: true })
    .eq("user_id", access.userId)
    .eq("is_suspended", true);

  if (suspendedError) {
    return Response.json({ error: suspendedError.message }, { status: 500 });
  }

  let dueByTopic: Record<string, number> | undefined;
  if (breakdown === "topics") {
    dueByTopic = {};

    if (activeList) {
      const { data: dueRows, error: rowsError } = await access.supabase
        .from("exercise_progress")
        .select("exercise_id, exercises!inner(topic)")
        .eq("user_id", access.userId)
        .eq("is_suspended", false)
        .lte("next_review_at", now)
        .in("exercises.topic", activeList);

      if (rowsError) {
        return Response.json({ error: rowsError.message }, { status: 500 });
      }

      for (const row of dueRows ?? []) {
        const exercise = row.exercises as unknown as { topic: string | null } | null;
        const key =
          typeof exercise?.topic === "string" && exercise.topic.trim().length > 0
            ? exercise.topic.trim()
            : null;
        if (!key || !isTopicActive(activeTopics, key)) continue;
        dueByTopic[key] = (dueByTopic[key] ?? 0) + 1;
      }
    }
  }

  const payload: ProgressStatsResponse = {
    dueCount: dueCount ?? 0,
    trackedCount: trackedCount ?? 0,
    suspendedCount: suspendedCount ?? 0,
    ...(dueByTopic !== undefined ? { dueByTopic } : {}),
  };

  return Response.json(payload);
}

const postSchema = z.object({
  exerciseId: z.uuid(),
  isCorrect: z.boolean(),
});

export async function POST(req: Request) {
  const access = await getExerciseUserAccess();
  if (!access.ok) return access.response;

  let parsedBody: unknown;
  try {
    parsedBody = await req.json();
  } catch {
    return Response.json({ ok: false, error: "Body is geen geldige JSON." }, { status: 400 });
  }

  const parseResult = postSchema.safeParse(parsedBody);
  if (!parseResult.success) {
    return Response.json(
      { ok: false, error: "Validatie mislukt.", issues: parseResult.error.issues },
      { status: 400 },
    );
  }

  const { exerciseId, isCorrect } = parseResult.data;

  const { data: existing, error: fetchError } = await access.supabase
    .from("exercise_progress")
    .select(
      "exercise_id, ease_factor, interval_days, repetition_count, next_review_at, last_reviewed_at, is_suspended",
    )
    .eq("user_id", access.userId)
    .eq("exercise_id", exerciseId)
    .maybeSingle();

  if (fetchError) {
    return Response.json({ ok: false, error: fetchError.message }, { status: 500 });
  }

  const currentState = existing
    ? {
        easeFactor: Number(existing.ease_factor),
        intervalDays: existing.interval_days,
        repetitionCount: existing.repetition_count,
        nextReviewAt: new Date(existing.next_review_at),
        lastReviewedAt: existing.last_reviewed_at
          ? new Date(existing.last_reviewed_at)
          : null,
        isSuspended: existing.is_suspended,
      }
    : createNewSrsCard();

  const updated = reviewSrsCard(currentState, isCorrect);
  const row = rowFromCard(exerciseId, access.userId, updated);

  const { data, error } = await access.supabase
    .from("exercise_progress")
    .upsert(row, { onConflict: "user_id,exercise_id" })
    .select(
      "exercise_id, ease_factor, interval_days, repetition_count, next_review_at, last_reviewed_at, is_suspended",
    )
    .single();

  if (error) {
    return Response.json({ ok: false, error: error.message }, { status: 500 });
  }

  return Response.json({ ok: true, progress: toDto(data as ProgressRow) });
}

const patchSchema = z.object({
  exerciseId: z.uuid(),
  isSuspended: z.boolean(),
});

export async function PATCH(req: Request) {
  const access = await getExerciseUserAccess();
  if (!access.ok) return access.response;

  let parsedBody: unknown;
  try {
    parsedBody = await req.json();
  } catch {
    return Response.json({ ok: false, error: "Body is geen geldige JSON." }, { status: 400 });
  }

  const parseResult = patchSchema.safeParse(parsedBody);
  if (!parseResult.success) {
    return Response.json(
      { ok: false, error: "Validatie mislukt.", issues: parseResult.error.issues },
      { status: 400 },
    );
  }

  const { exerciseId, isSuspended } = parseResult.data;

  const { data, error } = await access.supabase
    .from("exercise_progress")
    .upsert(
      {
        user_id: access.userId,
        exercise_id: exerciseId,
        is_suspended: isSuspended,
        next_review_at: new Date().toISOString(),
      },
      { onConflict: "user_id,exercise_id" },
    )
    .select(
      "exercise_id, ease_factor, interval_days, repetition_count, next_review_at, last_reviewed_at, is_suspended",
    )
    .single();

  if (error) {
    return Response.json({ ok: false, error: error.message }, { status: 500 });
  }

  return Response.json({ ok: true, progress: toDto(data as ProgressRow) });
}
