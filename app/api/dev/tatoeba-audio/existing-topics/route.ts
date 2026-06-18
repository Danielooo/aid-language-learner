import { getSupabaseAdmin } from "@/lib/supabase/admin";

// Distinct topic-lijst uit `public.exercises` voor de Tatoeba-audio
// enrich-flow. Gaat via de service-role-client zodat we álle topics zien
// (zowel seed-rijen `owner_id IS NULL` als topics die ingelogde users
// zelf hebben aangemaakt). Past bij de "admin curate corpus"-rol uit
// `IDEEFASE.md` — de Tatoeba-flow schrijft alleen seed-rijen en wil
// zoveel mogelijk hergebruik van bestaande labels biasen in de LLM.
//
// PostgREST kent geen DISTINCT; we halen alle non-null topics op en
// deduppen JS-side. Zelfde patroon als
// `app/api/dev/exercise-generator-quiz/topics/route.ts`, alleen daar
// via de session-client (RLS-scoped) — hier expliciet admin omdat de
// caller (audio-search-page) niet per se ingelogd hoeft te zijn.

export const dynamic = "force-dynamic";

export type ExistingTopicsSuccess = {
  ok: true;
  topics: string[];
};

export type ExistingTopicsFailure = {
  ok: false;
  error: string;
};

export type ExistingTopicsResponse =
  | ExistingTopicsSuccess
  | ExistingTopicsFailure;

export async function GET(): Promise<Response> {
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from("exercises")
    .select("topic")
    .not("topic", "is", null);

  if (error) {
    return Response.json(
      { ok: false, error: error.message } satisfies ExistingTopicsFailure,
      { status: 500 },
    );
  }

  const topics = Array.from(
    new Set(
      (data ?? [])
        .map((row) => row.topic)
        .filter(
          (topic): topic is string =>
            typeof topic === "string" && topic.trim().length > 0,
        ),
    ),
  ).sort((a, b) => a.localeCompare(b, "nl"));

  return Response.json({
    ok: true,
    topics,
  } satisfies ExistingTopicsSuccess);
}
