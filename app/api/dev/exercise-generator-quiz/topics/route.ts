import { ALL_TOPICS } from "@/app/dev/_components/quiz/constants";
import { DEV_EXERCISE_TOOLS_REQUIRE_AUTH } from "@/lib/dev/exercise-generator-auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getSupabaseServerClient } from "@/lib/supabase/server";

// Distinct topic-lijst uit `exercises` voor de topic-dropdown in
// de generator-quiz. PostgREST kent geen DISTINCT; we halen alle
// `topic`-kolommen op en deduppen JS-side. RLS zorgt dat we alleen
// publieke seed-rijen + eigen rijen zien — dus de dropdown bevat
// nooit topics van andere users.

export const dynamic = "force-dynamic";

export type TopicStat = {
  topic: string;
  count: number;
};

export type TopicsResponse = {
  topics: string[];
  stats: TopicStat[];
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
  const seedOnly = !DEV_EXERCISE_TOOLS_REQUIRE_AUTH && !user;

  let countQuery = supabase
    .from("exercises")
    .select("id", { count: "exact", head: true });
  if (seedOnly) countQuery = countQuery.is("owner_id", null);

  let topicsQuery = supabase
    .from("exercises")
    .select("topic")
    .not("topic", "is", null);
  if (seedOnly) topicsQuery = topicsQuery.is("owner_id", null);

  const [{ count: totalCount, error: countError }, { data, error }] =
    await Promise.all([countQuery, topicsQuery]);

  if (countError) {
    return Response.json({ error: countError.message }, { status: 500 });
  }
  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  const countByTopic = new Map<string, number>();
  for (const row of data ?? []) {
    if (typeof row.topic !== "string" || row.topic.trim().length === 0) continue;
    const key = row.topic.trim();
    countByTopic.set(key, (countByTopic.get(key) ?? 0) + 1);
  }

  const topics = Array.from(countByTopic.keys()).sort((a, b) =>
    a.localeCompare(b, "nl"),
  );

  const stats: TopicStat[] = [
    { topic: ALL_TOPICS, count: totalCount ?? 0 },
    ...topics.map((topic) => ({
      topic,
      count: countByTopic.get(topic) ?? 0,
    })),
  ];

  const payload: TopicsResponse = { topics, stats };
  return Response.json(payload);
}
