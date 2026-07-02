import { getPublicAudioUrl } from "@/app/api/dev/exercises-admin/types";
import { DEV_EXERCISE_TOOLS_REQUIRE_AUTH } from "@/lib/dev/exercise-generator-auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
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
  alternative_translations: string[];
  mp3_url: string | null;
  tatoeba_author: string | null;
  tatoeba_license: string | null;
  tatoeba_attribution_url: string | null;
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

  const serverSupabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await serverSupabase.auth.getUser();
  if (DEV_EXERCISE_TOOLS_REQUIRE_AUTH && !user) {
    return Response.json({ error: "Niet ingelogd." }, { status: 401 });
  }

  // TIJDELIJK: zonder sessie alleen seed-rijen via admin (RLS is authenticated-only).
  const supabase =
    !DEV_EXERCISE_TOOLS_REQUIRE_AUTH && !user
      ? getSupabaseAdmin()
      : serverSupabase;
  const seedOnly = !DEV_EXERCISE_TOOLS_REQUIRE_AUTH && !user;

  let countQuery = supabase
    .from("exercises")
    .select("id", { count: "exact", head: true });
  if (seedOnly) countQuery = countQuery.is("owner_id", null);

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

  let rowQuery = supabase
    .from("exercises")
    .select(
      "id, source_text, target_text, topic, created_at, alternative_translations, audio_path, tatoeba_author, tatoeba_license, tatoeba_attribution_url",
    )
    .range(offset, offset);
  if (seedOnly) rowQuery = rowQuery.is("owner_id", null);

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

  const mp3Url =
    row.audio_path != null && row.audio_path.length > 0
      ? getPublicAudioUrl(supabase, row.audio_path)
      : null;

  const payload: ExerciseQuizItem = {
    id: row.id,
    source_text: row.source_text,
    target_text: row.target_text,
    topic: row.topic,
    created_at: row.created_at,
    alternative_translations: row.alternative_translations ?? [],
    mp3_url: mp3Url,
    tatoeba_author: row.tatoeba_author ?? null,
    tatoeba_license: row.tatoeba_license ?? null,
    tatoeba_attribution_url: row.tatoeba_attribution_url ?? null,
  };

  return Response.json(payload);
}
