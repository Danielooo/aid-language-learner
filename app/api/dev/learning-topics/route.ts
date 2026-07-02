import { z } from "zod";

import { getExerciseUserAccess } from "@/lib/dev/exercise-access";

export const dynamic = "force-dynamic";

export type LearningTopicItem = {
  topic: string;
  exerciseCount: number;
  isActive: boolean;
  isOwn: boolean;
  dueCount: number;
};

export type LearningTopicsResponse = {
  topics: LearningTopicItem[];
  activeCount: number;
};

type ExerciseRow = {
  topic: string | null;
  owner_id: string | null;
};

type PreferenceRow = {
  topic: string;
  is_active: boolean;
};

export async function GET(req: Request) {
  const access = await getExerciseUserAccess();
  if (!access.ok) return access.response;

  const url = new URL(req.url);
  const includeGlobal = url.searchParams.get("includeGlobal") === "true";

  const [exercisesRes, prefsRes, dueRes] = await Promise.all([
    access.supabase.from("exercises").select("topic, owner_id").not("topic", "is", null),
    access.supabase
      .from("user_topic_preferences")
      .select("topic, is_active")
      .eq("user_id", access.userId),
    access.supabase
      .from("exercise_progress")
      .select("exercise_id, exercises!inner(topic)")
      .eq("user_id", access.userId)
      .eq("is_suspended", false)
      .lte("next_review_at", new Date().toISOString()),
  ]);

  if (exercisesRes.error) {
    return Response.json({ error: exercisesRes.error.message }, { status: 500 });
  }
  if (prefsRes.error) {
    return Response.json({ error: prefsRes.error.message }, { status: 500 });
  }
  if (dueRes.error) {
    return Response.json({ error: dueRes.error.message }, { status: 500 });
  }

  const prefsByTopic = new Map<string, boolean>();
  for (const pref of (prefsRes.data ?? []) as PreferenceRow[]) {
    prefsByTopic.set(pref.topic, pref.is_active);
  }

  const dueByTopic = new Map<string, number>();
  for (const row of dueRes.data ?? []) {
    const exercise = row.exercises as unknown as { topic: string | null } | null;
    const topic = exercise?.topic?.trim();
    if (!topic) continue;
    dueByTopic.set(topic, (dueByTopic.get(topic) ?? 0) + 1);
  }

  const topicMeta = new Map<string, { exerciseCount: number; isOwn: boolean }>();

  for (const row of (exercisesRes.data ?? []) as ExerciseRow[]) {
    const topic = row.topic?.trim();
    if (!topic) continue;

    const isOwn = row.owner_id === access.userId;
    if (!includeGlobal && !isOwn) continue;

    const existing = topicMeta.get(topic) ?? { exerciseCount: 0, isOwn: false };
    existing.exerciseCount += 1;
    existing.isOwn = existing.isOwn || isOwn;
    topicMeta.set(topic, existing);
  }

  const topics: LearningTopicItem[] = Array.from(topicMeta.entries())
    .sort(([a], [b]) => a.localeCompare(b, "nl"))
    .map(([topic, meta]) => ({
      topic,
      exerciseCount: meta.exerciseCount,
      isActive: prefsByTopic.get(topic) ?? false,
      isOwn: meta.isOwn,
      dueCount: dueByTopic.get(topic) ?? 0,
    }));

  const payload: LearningTopicsResponse = {
    topics,
    activeCount: topics.filter((t) => t.isActive).length,
  };

  return Response.json(payload);
}

const patchSchema = z.object({
  topic: z.string().min(1),
  isActive: z.boolean(),
});

export async function PATCH(req: Request) {
  const access = await getExerciseUserAccess();
  if (!access.ok) return access.response;

  let parsedBody: unknown;
  try {
    parsedBody = await req.json();
  } catch {
    return Response.json({ ok: false, error: "Body is geen geldige JSON." }, { status: 400 });
  }

  const parseResult = patchSchema.safeParse(parsedBody);
  if (!parseResult.success) {
    return Response.json(
      { ok: false, error: "Validatie mislukt.", issues: parseResult.error.issues },
      { status: 400 },
    );
  }

  const { topic, isActive } = parseResult.data;
  const trimmedTopic = topic.trim();

  const { data: exerciseRow, error: exerciseError } = await access.supabase
    .from("exercises")
    .select("id")
    .eq("topic", trimmedTopic)
    .limit(1)
    .maybeSingle();

  if (exerciseError) {
    return Response.json({ ok: false, error: exerciseError.message }, { status: 500 });
  }
  if (!exerciseRow) {
    return Response.json(
      { ok: false, error: `Topic "${trimmedTopic}" niet gevonden.` },
      { status: 404 },
    );
  }

  const { data, error } = await access.supabase
    .from("user_topic_preferences")
    .upsert(
      {
        user_id: access.userId,
        topic: trimmedTopic,
        is_active: isActive,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,topic" },
    )
    .select("topic, is_active")
    .single();

  if (error) {
    return Response.json({ ok: false, error: error.message }, { status: 500 });
  }

  return Response.json({
    ok: true,
    topic: data.topic,
    isActive: data.is_active,
  });
}
