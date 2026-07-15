import { requireExerciseUser } from "@/lib/exercises/require-exercise-user";

export const dynamic = "force-dynamic";

export type MyExerciseTopicsSuccess = {
  ok: true;
  topics: string[];
};

export type MyExerciseTopicsFailure = {
  ok: false;
  error: string;
};

export type MyExerciseTopicsResponse =
  | MyExerciseTopicsSuccess
  | MyExerciseTopicsFailure;

export async function GET(): Promise<Response> {
  const auth = await requireExerciseUser();
  if (!auth.ok) return auth.response;

  const { supabase, userId } = auth;
  const { data, error } = await supabase
    .from("exercises")
    .select("topic")
    .eq("owner_id", userId)
    .not("topic", "is", null);

  if (error) {
    return Response.json(
      { ok: false, error: error.message } satisfies MyExerciseTopicsFailure,
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

  return Response.json({ ok: true, topics } satisfies MyExerciseTopicsSuccess);
}
