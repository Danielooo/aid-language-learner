import { getExerciseUserAccess } from "@/lib/exercises/exercise-access";
import {
  EXERCISE_QUIZ_SELECT,
  toExerciseQuizItem,
} from "@/lib/quiz/exercise-quiz-item";
import { pickRandomSrsDueExercise } from "@/lib/srs/due-exercises";
import {
  activeTopicsToArray,
  getActiveTopicsForUser,
  isTopicActive,
} from "@/lib/topics/active-topics";

// Random oefening uit `exercises` voor de generator-quiz. RLS filtert
// automatisch op (`owner_id is null` OR `owner_id = auth.uid()`), dus
// de user ziet de seed-set + zijn eigen gegenereerde oefeningen.
//
// Query-modes:
//   * (default) random — optioneel ?topic=
//   * ?id=<uuid> — één specifieke oefening
//   * ?mode=srs — volgende due oefening voor spaced repetition

export const dynamic = "force-dynamic";

export type { ExerciseQuizItem } from "@/types/quiz";

async function fetchById(
  access: NonNullable<Awaited<ReturnType<typeof getExerciseUserAccess>> & { ok: true }>,
  id: string,
  activeTopics: Set<string>,
) {
  const { data, error } = await access.supabase
    .from("exercises")
    .select(EXERCISE_QUIZ_SELECT)
    .eq("id", id)
    .maybeSingle();

  if (error) return { error: Response.json({ error: error.message }, { status: 500 }) };
  if (!data) {
    return {
      error: Response.json({ error: "Oefening niet gevonden." }, { status: 404 }),
    };
  }
  if (!isTopicActive(activeTopics, data.topic)) {
    return {
      error: Response.json(
        { error: "Oefening hoort bij een inactief topic." },
        { status: 404 },
      ),
    };
  }
  return { item: toExerciseQuizItem(access.supabase, data) };
}

async function fetchSrsDue(
  access: NonNullable<Awaited<ReturnType<typeof getExerciseUserAccess>> & { ok: true }>,
  topic: string | null,
  activeTopics: Set<string>,
) {
  const activeList = activeTopicsToArray(activeTopics);
  if (!activeList) {
    return {
      error: Response.json(
        {
          error: "Geen actieve topics. Activeer topics via Mijn leerplan.",
          code: "SRS_NOTHING_DUE",
        },
        { status: 404 },
      ),
    };
  }

  if (topic && !isTopicActive(activeTopics, topic)) {
    return {
      error: Response.json(
        {
          error: `Topic "${topic}" is niet actief.`,
          code: "SRS_NOTHING_DUE",
        },
        { status: 404 },
      ),
    };
  }

  try {
    const item = await pickRandomSrsDueExercise(
      access.supabase,
      access.userId,
      activeList,
      { topic },
    );

    if (item) {
      return { item };
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Onbekende fout";
    return { error: Response.json({ error: message }, { status: 500 }) };
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
  access: NonNullable<Awaited<ReturnType<typeof getExerciseUserAccess>> & { ok: true }>,
  topic: string | null,
  excludeIds: string[],
  activeTopics: Set<string>,
) {
  const activeList = activeTopicsToArray(activeTopics);
  if (!activeList) {
    return {
      error: Response.json(
        {
          error:
            "Geen actieve topics. Activeer topics via Mijn leerplan om te oefenen.",
        },
        { status: 404 },
      ),
    };
  }

  if (topic && !isTopicActive(activeTopics, topic)) {
    return {
      error: Response.json(
        { error: `Geen oefeningen gevonden voor topic "${topic}".` },
        { status: 404 },
      ),
    };
  }

  let countQuery = access.supabase
    .from("exercises")
    .select("id", { count: "exact", head: true })
    .in("topic", activeList);
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
            : "Nog geen oefeningen beschikbaar. Genereer er eerst een paar via de generator.",
        },
        { status: 404 },
      ),
    };
  }

  const offset = Math.floor(Math.random() * count);

  let rowQuery = access.supabase
    .from("exercises")
    .select(EXERCISE_QUIZ_SELECT)
    .in("topic", activeList)
    .range(offset, offset);
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

  return { item: toExerciseQuizItem(access.supabase, row) };
}

export async function GET(req: Request) {
  const access = await getExerciseUserAccess();
  if (!access.ok) return access.response;

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

  const activeTopics = await getActiveTopicsForUser(access.supabase, access.userId);

  if (idParam) {
    const result = await fetchById(access, idParam, activeTopics);
    if ("error" in result && result.error) return result.error;
    return Response.json(result.item);
  }

  if (modeParam === "srs") {
    const result = await fetchSrsDue(access, topic, activeTopics);
    if ("error" in result && result.error) return result.error;
    return Response.json(result.item);
  }

  const result = await fetchRandom(access, topic, excludeIds, activeTopics);
  if ("error" in result && result.error) return result.error;
  return Response.json(result.item);
}
