import { z } from "zod";

import { getExerciseUserAccess } from "@/lib/exercises/exercise-access";
import { countSrsDue, type SrsDueCounts } from "@/lib/srs/due-exercises";
import {
  activeTopicsToArray,
  getActiveTopicsForUser,
} from "@/lib/topics/active-topics";

export const dynamic = "force-dynamic";

import type {
  LearningTopicItem,
  LearningTopicsResponse,
} from "@/types/learning-topics";

export type { LearningTopicItem, LearningTopicsResponse };

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

  const activeTopics = await getActiveTopicsForUser(access.supabase, access.userId);
  const activeList = activeTopicsToArray(activeTopics);

  const [exercisesRes, prefsRes, dueCountsRes] = await Promise.all([
    access.supabase.from("exercises").select("topic, owner_id").not("topic", "is", null),
    access.supabase
      .from("user_topic_preferences")
      .select("topic, is_active")
      .eq("user_id", access.userId),
    activeList
      ? countSrsDue(access.supabase, access.userId, activeList).catch((error: unknown) => ({
          error: error instanceof Error ? error.message : "Onbekende fout",
        }))
      : Promise.resolve({ total: 0, byTopic: {} } satisfies SrsDueCounts),
  ]);

  if (exercisesRes.error) {
    return Response.json({ error: exercisesRes.error.message }, { status: 500 });
  }
  if (prefsRes.error) {
    return Response.json({ error: prefsRes.error.message }, { status: 500 });
  }
  if ("error" in dueCountsRes) {
    return Response.json({ error: dueCountsRes.error }, { status: 500 });
  }

  const prefsByTopic = new Map<string, boolean>();
  for (const pref of (prefsRes.data ?? []) as PreferenceRow[]) {
    prefsByTopic.set(pref.topic, pref.is_active);
  }

  const dueByTopic: Record<string, number> = dueCountsRes.byTopic;

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
      dueCount: (prefsByTopic.get(topic) ?? false) ? (dueByTopic[topic] ?? 0) : 0,
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
