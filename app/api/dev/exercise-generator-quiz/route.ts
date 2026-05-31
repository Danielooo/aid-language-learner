import { getSupabaseAdmin } from "@/lib/supabase/admin";

// Random oefening uit `dev_exercises` voor de generator-quiz. Eén plek
// die de tabel kent; client component praat alleen met deze route.
//
// Random select via 2 roundtrips: eerst `count` op (eventueel topic-
// gefilterde) rijen, dan `select limit 1 offset N` met N willekeurig.
// Geen `order by random()` of RPC: voor een dev-tabeltje van max een
// paar honderd rijen is dit ruim snel genoeg en hoeven we geen migratie
// toe te voegen.

export const dynamic = "force-dynamic";

export type ExerciseQuizItem = {
  id: string;
  source_text: string;
  target_text: string;
  topic: string | null;
  created_at: string;
};

export async function GET(req: Request) {
  const url = new URL(req.url);
  const topicParam = url.searchParams.get("topic");
  // Lege string of "all" → geen filter. Trim om per ongeluk-spaces uit
  // de querystring weg te halen.
  const topic =
    topicParam && topicParam.trim().length > 0 && topicParam !== "all"
      ? topicParam.trim()
      : null;

  let supabase;
  try {
    supabase = getSupabaseAdmin();
  } catch (err) {
    return Response.json(
      {
        error: err instanceof Error ? err.message : "Supabase client init faalde.",
      },
      { status: 500 },
    );
  }

  const countQuery = supabase
    .from("dev_exercises")
    .select("id", { count: "exact", head: true });

  const { count, error: countError } = topic
    ? await countQuery.eq("topic", topic)
    : await countQuery;

  if (countError) {
    return Response.json(
      { error: countError.message },
      { status: 500 },
    );
  }

  if (!count || count === 0) {
    return Response.json(
      {
        error: topic
          ? `Geen oefeningen gevonden voor topic "${topic}".`
          : "Nog geen oefeningen in dev_exercises. Genereer er eerst een paar via /dev/exercise-generator.",
      },
      { status: 404 },
    );
  }

  const offset = Math.floor(Math.random() * count);

  const rowQuery = supabase
    .from("dev_exercises")
    .select("id, source_text, target_text, topic, created_at")
    .range(offset, offset);

  const { data, error } = topic
    ? await rowQuery.eq("topic", topic)
    : await rowQuery;

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  const row = data?.[0];
  if (!row) {
    return Response.json(
      { error: "Random select gaf geen rij terug, probeer opnieuw." },
      { status: 404 },
    );
  }

  const payload: ExerciseQuizItem = {
    id: row.id,
    source_text: row.source_text,
    target_text: row.target_text,
    topic: row.topic,
    created_at: row.created_at,
  };

  return Response.json(payload);
}
