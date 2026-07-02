import { z } from "zod";

import { DEV_EXERCISE_TOOLS_REQUIRE_AUTH } from "@/lib/dev/exercise-generator-auth";
import { PRACTICE_TYPES } from "@/lib/quiz/record-quiz-attempt";
import { QUIZ_SELECTION_MODES } from "@/lib/quiz/selection-config";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getSupabaseServerClient } from "@/lib/supabase/server";

// CRUD voor `quiz_attempts`. Eén plek die de tabel kent; de quiz-
// hook (`useQuizStorage`) en het dashboard praten alleen met deze
// route. Sinds auth ingevoerd is staan alle CRUD onder RLS-policy
// `user_id = auth.uid()`. We checken zelf ook expliciet op user
// zodat we 401 kunnen geven (RLS zou anders een lege array
// teruggeven, wat moeilijker te debuggen is).

export const dynamic = "force-dynamic";

export type QuizAttemptDto = {
  exerciseId: string;
  source_text: string;
  target_text: string;
  topic: string | null;
  userAnswer: string;
  isCorrect: boolean;
  at: number;
  selectionMode?: string | null;
  practiceType?: string | null;
  direction?: string | null;
  typingMode?: string | null;
  isMistakeReview?: boolean;
  responseTimeMs?: number | null;
  isScheduledReview?: boolean;
};

const DEFAULT_LIMIT = 500;
const MAX_LIMIT = 5000;

const SELECT_WITH_EXERCISE =
  "id, exercise_id, user_answer, is_correct, created_at, selection_mode, practice_type, direction, typing_mode, is_mistake_review, response_time_ms, is_scheduled_review, exercises ( source_text, target_text, topic )";

type AttemptRowWithExercise = {
  id: string;
  exercise_id: string;
  user_answer: string;
  is_correct: boolean;
  created_at: string;
  selection_mode: string | null;
  practice_type: string | null;
  direction: string | null;
  typing_mode: string | null;
  is_mistake_review: boolean;
  response_time_ms: number | null;
  is_scheduled_review: boolean;
  exercises: {
    source_text: string;
    target_text: string;
    topic: string | null;
  } | null;
};

type ProgressSnapshot = {
  interval_days: number;
  repetition_count: number;
};

const postSchema = z.object({
  exerciseId: z.uuid(),
  userAnswer: z.string(),
  isCorrect: z.boolean(),
  selectionMode: z.enum(QUIZ_SELECTION_MODES).optional().nullable(),
  practiceType: z.enum(PRACTICE_TYPES).optional().nullable(),
  direction: z.enum(["es-to-nl", "nl-to-es"]).optional().nullable(),
  typingMode: z.enum(["full", "blank"]).optional().nullable(),
  isMistakeReview: z.boolean().optional(),
  responseTimeMs: z.number().int().nonnegative().optional().nullable(),
});

function toDto(row: AttemptRowWithExercise): QuizAttemptDto {
  return {
    exerciseId: row.exercise_id,
    source_text: row.exercises?.source_text ?? "",
    target_text: row.exercises?.target_text ?? "",
    topic: row.exercises?.topic ?? null,
    userAnswer: row.user_answer,
    isCorrect: row.is_correct,
    at: new Date(row.created_at).getTime(),
    selectionMode: row.selection_mode,
    practiceType: row.practice_type,
    direction: row.direction,
    typingMode: row.typing_mode,
    isMistakeReview: row.is_mistake_review,
    responseTimeMs: row.response_time_ms,
    isScheduledReview: row.is_scheduled_review,
  };
}

async function loadSrsSnapshot(
  supabase: Awaited<ReturnType<typeof getSupabaseServerClient>>,
  userId: string,
  exerciseId: string,
): Promise<ProgressSnapshot | null> {
  const { data } = await supabase
    .from("exercise_progress")
    .select("interval_days, repetition_count")
    .eq("user_id", userId)
    .eq("exercise_id", exerciseId)
    .maybeSingle();

  if (!data) return null;
  return {
    interval_days: data.interval_days,
    repetition_count: data.repetition_count,
  };
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const rawLimit = url.searchParams.get("limit");
  const parsedLimit = rawLimit ? Number.parseInt(rawLimit, 10) : DEFAULT_LIMIT;
  const limit =
    Number.isFinite(parsedLimit) && parsedLimit > 0
      ? Math.min(parsedLimit, MAX_LIMIT)
      : DEFAULT_LIMIT;

  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    if (DEV_EXERCISE_TOOLS_REQUIRE_AUTH) {
      return Response.json({ error: "Niet ingelogd." }, { status: 401 });
    }
    return Response.json({ attempts: [] });
  }

  const { data, error } = await supabase
    .from("quiz_attempts")
    .select(SELECT_WITH_EXERCISE)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  const rows = (data ?? []) as unknown as AttemptRowWithExercise[];
  const attempts: QuizAttemptDto[] = rows.map(toDto);
  return Response.json({ attempts });
}

export async function POST(req: Request) {
  let parsedBody: unknown;
  try {
    parsedBody = await req.json();
  } catch {
    return Response.json(
      { ok: false, error: "Body is geen geldige JSON." },
      { status: 400 },
    );
  }

  const parseResult = postSchema.safeParse(parsedBody);
  if (!parseResult.success) {
    return Response.json(
      {
        ok: false,
        error: "Validatie mislukt.",
        issues: parseResult.error.issues,
      },
      { status: 400 },
    );
  }

  const serverSupabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await serverSupabase.auth.getUser();
  const {
    exerciseId,
    userAnswer,
    isCorrect,
    selectionMode,
    practiceType,
    direction,
    typingMode,
    isMistakeReview,
    responseTimeMs,
  } = parseResult.data;

  const isScheduledReview = selectionMode === "srs";

  if (!user) {
    if (DEV_EXERCISE_TOOLS_REQUIRE_AUTH) {
      return Response.json(
        { ok: false, error: "Niet ingelogd." },
        { status: 401 },
      );
    }

    const { data: exercise } = await getSupabaseAdmin()
      .from("exercises")
      .select("source_text, target_text, topic")
      .eq("id", exerciseId)
      .maybeSingle();

    return Response.json({
      ok: true,
      attempt: {
        exerciseId,
        source_text: exercise?.source_text ?? "",
        target_text: exercise?.target_text ?? "",
        topic: exercise?.topic ?? null,
        userAnswer,
        isCorrect,
        at: Date.now(),
        selectionMode: selectionMode ?? null,
        practiceType: practiceType ?? null,
        direction: direction ?? null,
        typingMode: typingMode ?? null,
        isMistakeReview: isMistakeReview ?? false,
        responseTimeMs: responseTimeMs ?? null,
        isScheduledReview,
      } satisfies QuizAttemptDto,
    });
  }

  let intervalDaysBefore: number | null = null;
  let repetitionCountBefore: number | null = null;

  if (isScheduledReview) {
    const snapshot = await loadSrsSnapshot(serverSupabase, user.id, exerciseId);
    intervalDaysBefore = snapshot?.interval_days ?? 0;
    repetitionCountBefore = snapshot?.repetition_count ?? 0;
  }

  const { data, error } = await serverSupabase
    .from("quiz_attempts")
    .insert({
      exercise_id: exerciseId,
      user_answer: userAnswer,
      is_correct: isCorrect,
      user_id: user.id,
      selection_mode: selectionMode ?? null,
      practice_type: practiceType ?? null,
      direction: direction ?? null,
      typing_mode: typingMode ?? null,
      is_mistake_review: isMistakeReview ?? false,
      response_time_ms: responseTimeMs ?? null,
      interval_days_before: intervalDaysBefore,
      repetition_count_before: repetitionCountBefore,
      is_scheduled_review: isScheduledReview,
    })
    .select(SELECT_WITH_EXERCISE)
    .single();

  if (error) {
    return Response.json(
      { ok: false, error: error.message },
      { status: 500 },
    );
  }

  const row = data as unknown as AttemptRowWithExercise;
  return Response.json({ ok: true, attempt: toDto(row) });
}

export async function DELETE() {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    if (DEV_EXERCISE_TOOLS_REQUIRE_AUTH) {
      return Response.json(
        { ok: false, error: "Niet ingelogd." },
        { status: 401 },
      );
    }
    return Response.json({ ok: true, deleted: 0 });
  }

  const { error, count } = await supabase
    .from("quiz_attempts")
    .delete({ count: "exact" })
    .eq("user_id", user.id);

  if (error) {
    return Response.json(
      { ok: false, error: error.message },
      { status: 500 },
    );
  }

  return Response.json({ ok: true, deleted: count ?? 0 });
}
