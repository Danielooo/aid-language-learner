import { DEV_EXERCISE_TOOLS_REQUIRE_AUTH } from "@/lib/dev/exercise-generator-auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getSupabaseServerClient } from "@/lib/supabase/server";

// Distinct topic-lijst uit `exercises` voor de topic-dropdown in
// de generator-quiz. PostgREST kent geen DISTINCT; we halen alle
// `topic`-kolommen op en deduppen JS-side. RLS zorgt dat we alleen
// publieke seed-rijen + eigen rijen zien — dus de dropdown bevat
// nooit topics van andere users.

export const dynamic = "force-dynamic";

export type TopicsResponse = {
  topics: string[];
};

export async function GET() {
  const serverSupabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await serverSupabase.auth.getUser();
  if (DEV_EXERCISE_TOOLS_REQUIRE_AUTH && !user) {
    return Response.json({ error: "Niet ingelogd." }, { status: 401 });
  }

  const supabase =
    !DEV_EXERCISE_TOOLS_REQUIRE_AUTH && !user
      ? getSupabaseAdmin()
      : serverSupabase;

  let topicsQuery = supabase
    .from("exercises")
    .select("topic")
    .not("topic", "is", null);
  if (!DEV_EXERCISE_TOOLS_REQUIRE_AUTH && !user) {
    topicsQuery = topicsQuery.is("owner_id", null);
  }

  const { data, error } = await topicsQuery;

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
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

  const payload: TopicsResponse = { topics };
  return Response.json(payload);
}
