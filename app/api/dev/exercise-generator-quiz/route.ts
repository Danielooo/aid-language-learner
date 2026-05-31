import { getSupabaseServerClient } from "@/lib/supabase/server";

// Random oefening uit `exercises` voor de generator-quiz. RLS filtert
// automatisch op (`owner_id is null` OR `owner_id = auth.uid()`), dus
// de user ziet de seed-set + zijn eigen gegenereerde oefeningen.
//
// Random select via 2 roundtrips: eerst `count` op (eventueel topic-
// gefilterde) rijen, dan `select limit 1 offset N` met N willekeurig.
// Geen `order by random()` of RPC: voor een tabel van max een paar
// honderd rijen per user is dit ruim snel genoeg.

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

  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return Response.json({ error: "Niet ingelogd." }, { status: 401 });
  }

  const countQuery = supabase
    .from("exercises")
    .select("id", { count: "exact", head: true });

  const { count, error: countError } = topic
    ? await countQuery.eq("topic", topic)
    : await countQuery;

  if (countError) {
    return Response.json({ error: countError.message }, { status: 500 });
  }

  if (!count || count === 0) {
    return Response.json(
      {
        error: topic
          ? `Geen oefeningen gevonden voor topic "${topic}".`
          : "Nog geen oefeningen beschikbaar. Genereer er eerst een paar via /dev/exercise-generator.",
      },
      { status: 404 },
    );
  }

  const offset = Math.floor(Math.random() * count);

  const rowQuery = supabase
    .from("exercises")
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
