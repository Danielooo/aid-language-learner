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
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return Response.json({ error: "Niet ingelogd." }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("exercises")
    .select("topic")
    .not("topic", "is", null);

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
