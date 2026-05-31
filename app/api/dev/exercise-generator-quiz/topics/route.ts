import { getSupabaseAdmin } from "@/lib/supabase/admin";

// Distinct topic-lijst uit `dev_exercises` voor de topic-dropdown in
// de generator-quiz. PostgREST kent geen DISTINCT; we halen alle
// `topic`-kolommen op en deduppen JS-side. Tabel is dev-only en klein,
// dus dat is prima — wel `not.is null` om vroeg te filteren.

export const dynamic = "force-dynamic";

export type TopicsResponse = {
  topics: string[];
};

export async function GET() {
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

  const { data, error } = await supabase
    .from("dev_exercises")
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
