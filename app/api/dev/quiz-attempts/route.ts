import { z } from "zod";

import { getSupabaseServerClient } from "@/lib/supabase/server";

// CRUD voor `quiz_attempts`. Eén plek die de tabel kent; de quiz-
// hook (`useQuizStorage`) en het dashboard praten alleen met deze
// route. Sinds auth ingevoerd is staan alle CRUD onder RLS-policy
// `user_id = auth.uid()`. We checken zelf ook expliciet op user
// zodat we 401 kunnen geven (RLS zou anders een lege array
// teruggeven, wat moeilijker te debuggen is).
//
// Vorm van de GET-payload is bewust identiek aan het bestaande
// `QuizAttempt`-type uit `use-quiz-storage.ts`, zodat de pure helpers
// in `app/dev/dashboard/_components/stats.ts` ongewijzigd blijven.

export const dynamic = "force-dynamic";

export type QuizAttemptDto = {
  exerciseId: string;
  source_text: string;
  target_text: string;
  topic: string | null;
  userAnswer: string;
  isCorrect: boolean;
  at: number;
};

// Default-cap op 500: ruim voldoende voor het dashboard (KPI + 7-daagse
// trend + zwakke-oefeningen-top-5) maar verkleint de payload als de
// tabel ooit hard groeit. Quiz-historie toont alle attempts, maar de
// huidige UI lijst alleen de laatste 50 zichtbaar — geen overhead.
const DEFAULT_LIMIT = 500;
const MAX_LIMIT = 5000;

// PostgREST embed via FK. Bij een eenduidige FK (exercise_id →
// exercises.id) returnt het de relatie als single object, niet als
// array.
const SELECT_WITH_EXERCISE =
  "id, exercise_id, user_answer, is_correct, created_at, exercises ( source_text, target_text, topic )";

type AttemptRowWithExercise = {
  id: string;
  exercise_id: string;
  user_answer: string;
  is_correct: boolean;
  created_at: string;
  exercises: {
    source_text: string;
    target_text: string;
    topic: string | null;
  } | null;
};

const postSchema = z.object({
  exerciseId: z.uuid(),
  userAnswer: z.string(),
  isCorrect: z.boolean(),
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
    return Response.json({ error: "Niet ingelogd." }, { status: 401 });
  }

  // RLS filtert al op user_id = auth.uid(); de extra .eq is verbose maar
  // maakt de query expliciet en future-proof als RLS ooit zou wijzigen.
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

  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return Response.json(
      { ok: false, error: "Niet ingelogd." },
      { status: 401 },
    );
  }

  const { exerciseId, userAnswer, isCorrect } = parseResult.data;

  const { data, error } = await supabase
    .from("quiz_attempts")
    .insert({
      exercise_id: exerciseId,
      user_answer: userAnswer,
      is_correct: isCorrect,
      user_id: user.id,
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
    return Response.json(
      { ok: false, error: "Niet ingelogd." },
      { status: 401 },
    );
  }

  // Filter expliciet op user_id zodat we — ook als RLS faalt — alleen
  // eigen rijen wissen. PostgREST eist een filter op DELETE.
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
