import { assertAdmin } from "@/lib/dev/assert-admin";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

// Distinct topic-lijst uit global `public.exercises` (owner_id IS NULL)
// voor Tatoeba-enrich / admin-corpus tooling.

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
  await assertAdmin();
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from("exercises")
    .select("topic")
    .is("owner_id", null)
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
