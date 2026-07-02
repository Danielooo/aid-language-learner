import { getExerciseUserAccess } from "@/lib/dev/exercise-access";
import { DEV_EXERCISE_TOOLS_REQUIRE_AUTH } from "@/lib/dev/exercise-generator-auth";
import {
  EXERCISE_QUIZ_SELECT,
  toExerciseQuizItem,
} from "@/lib/quiz/exercise-quiz-item";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getSupabaseServerClient } from "@/lib/supabase/server";

// Random oefening uit `exercises` voor de generator-quiz. RLS filtert
// automatisch op (`owner_id is null` OR `owner_id = auth.uid()`), dus
// de user ziet de seed-set + zijn eigen gegenereerde oefeningen.
//
// Query-modes:
//   * (default) random — optioneel ?topic=
//   * ?id=<uuid> — één specifieke oefening
//   * ?mode=srs — volgende due oefening voor spaced repetition

export const dynamic = "force-dynamic";

export type ExerciseQuizItem = {
  id: string;
  source_text: string;
  target_text: string;
  topic: string | null;
  created_at: string;
  alternative_translations: string[];
  mp3_url: string | null;
  tatoeba_author: string | null;
  tatoeba_license: string | null;
  tatoeba_attribution_url: string | null;
};

async function resolveSupabase() {
  const serverSupabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await serverSupabase.auth.getUser();
  if (DEV_EXERCISE_TOOLS_REQUIRE_AUTH && !user) {
    return { error: Response.json({ error: "Niet ingelogd." }, { status: 401 }) };
  }

  const supabase =
    !DEV_EXERCISE_TOOLS_REQUIRE_AUTH && !user
      ? getSupabaseAdmin()
      : serverSupabase;
  const seedOnly = !DEV_EXERCISE_TOOLS_REQUIRE_AUTH && !user;

  return { supabase, seedOnly };
}

function applySeedFilter<T extends { is: (col: string, val: null) => T }>(
  query: T,
  seedOnly: boolean,
): T {
  return seedOnly ? query.is("owner_id", null) : query;
}

async function fetchById(
  supabase: Awaited<ReturnType<typeof resolveSupabase>>["supabase"] & object,
  id: string,
  seedOnly: boolean,
) {
  let query = supabase
    .from("exercises")
    .select(EXERCISE_QUIZ_SELECT)
    .eq("id", id);
  query = applySeedFilter(query, seedOnly);

  const { data, error } = await query.maybeSingle();
  if (error) return { error: Response.json({ error: error.message }, { status: 500 }) };
  if (!data) {
    return {
      error: Response.json({ error: "Oefening niet gevonden." }, { status: 404 }),
    };
  }
  return { item: toExerciseQuizItem(supabase, data) };
}

async function fetchSrsDue(topic: string | null) {
  const access = await getExerciseUserAccess();
  if (!access.ok) return { error: access.response };

  const now = new Date().toISOString();

  let dueQuery = access.supabase
    .from("exercise_progress")
    .select(`exercise_id, exercises!inner(${EXERCISE_QUIZ_SELECT})`)
    .eq("user_id", access.userId)
    .eq("is_suspended", false)
    .lte("next_review_at", now)
    .order("next_review_at", { ascending: true })
    .limit(20);

  if (topic) {
    dueQuery = dueQuery.eq("exercises.topic", topic);
  }

  const { data: dueRows, error: dueError } = await dueQuery;
  if (dueError) {
    return { error: Response.json({ error: dueError.message }, { status: 500 }) };
  }

  if (dueRows && dueRows.length > 0) {
    const pick = dueRows[Math.floor(Math.random() * dueRows.length)];
    const exercise = pick.exercises as unknown as Parameters<typeof toExerciseQuizItem>[1];
    return { item: toExerciseQuizItem(access.supabase, exercise) };
  }

  return {
    error: Response.json(
      {
        error: topic
          ? `Geen oefeningen klaar voor herhaling in topic "${topic}".`
          : "Geen oefeningen klaar voor herhaling.",
        code: "SRS_NOTHING_DUE",
      },
      { status: 404 },
    ),
  };
}

async function fetchRandom(
  supabase: Awaited<ReturnType<typeof resolveSupabase>>["supabase"] & object,
  seedOnly: boolean,
  topic: string | null,
  excludeIds: string[],
) {
  let countQuery = supabase
    .from("exercises")
    .select("id", { count: "exact", head: true });
  countQuery = applySeedFilter(countQuery, seedOnly);
  if (topic) countQuery = countQuery.eq("topic", topic);
  for (const id of excludeIds) {
    countQuery = countQuery.neq("id", id);
  }

  const { count, error: countError } = await countQuery;
  if (countError) {
    return { error: Response.json({ error: countError.message }, { status: 500 }) };
  }

  if (!count || count === 0) {
    return {
      error: Response.json(
        {
          error: topic
            ? `Geen oefeningen gevonden voor topic "${topic}".`
            : "Nog geen oefeningen beschikbaar. Genereer er eerst een paar via /dev/exercise-generator.",
        },
        { status: 404 },
      ),
    };
  }

  const offset = Math.floor(Math.random() * count);

  let rowQuery = supabase
    .from("exercises")
    .select(EXERCISE_QUIZ_SELECT)
    .range(offset, offset);
  rowQuery = applySeedFilter(rowQuery, seedOnly);
  if (topic) rowQuery = rowQuery.eq("topic", topic);
  for (const id of excludeIds) {
    rowQuery = rowQuery.neq("id", id);
  }

  const { data, error } = await rowQuery;
  if (error) {
    return { error: Response.json({ error: error.message }, { status: 500 }) };
  }

  const row = data?.[0];
  if (!row) {
    return {
      error: Response.json(
        { error: "Random select gaf geen rij terug, probeer opnieuw." },
        { status: 404 },
      ),
    };
  }

  return { item: toExerciseQuizItem(supabase, row) };
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const topicParam = url.searchParams.get("topic");
  const idParam = url.searchParams.get("id");
  const modeParam = url.searchParams.get("mode");
  const excludeParam = url.searchParams.get("exclude");

  const topic =
    topicParam && topicParam.trim().length > 0 && topicParam !== "all"
      ? topicParam.trim()
      : null;
  const excludeIds =
    excludeParam?.split(",").map((s) => s.trim()).filter((s) => s.length > 0) ?? [];

  const resolved = await resolveSupabase();
  if ("error" in resolved && resolved.error) return resolved.error;
  const { supabase, seedOnly } = resolved;

  if (idParam) {
    const result = await fetchById(supabase, idParam, seedOnly);
    if ("error" in result && result.error) return result.error;
    return Response.json(result.item);
  }

  if (modeParam === "srs") {
    const result = await fetchSrsDue(topic);
    if ("error" in result && result.error) return result.error;
    return Response.json(result.item);
  }

  const result = await fetchRandom(supabase, seedOnly, topic, excludeIds);
  if ("error" in result && result.error) return result.error;
  return Response.json(result.item);
}
