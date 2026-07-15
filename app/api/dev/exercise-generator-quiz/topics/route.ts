import { ALL_TOPICS } from "@/app/_components/features/quiz/constants";
import { getExerciseUserAccess } from "@/lib/dev/exercise-access";
import {
  activeTopicsToArray,
  getActiveTopicsForUser,
  isTopicActive,
} from "@/lib/topics/active-topics";

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
  const access = await getExerciseUserAccess();
  if (!access.ok) return access.response;

  const activeTopics = await getActiveTopicsForUser(access.supabase, access.userId);
  const activeList = activeTopicsToArray(activeTopics);

  if (!activeList) {
    const payload: TopicsResponse = {
      topics: [],
      stats: [{ topic: ALL_TOPICS, count: 0 }],
    };
    return Response.json(payload);
  }

  const { data, error } = await access.supabase
    .from("exercises")
    .select("topic")
    .not("topic", "is", null)
    .in("topic", activeList);

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  const countByTopic = new Map<string, number>();
  for (const row of data ?? []) {
    if (typeof row.topic !== "string" || row.topic.trim().length === 0) continue;
    const key = row.topic.trim();
    if (!isTopicActive(activeTopics, key)) continue;
    countByTopic.set(key, (countByTopic.get(key) ?? 0) + 1);
  }

  const topics = Array.from(countByTopic.keys()).sort((a, b) =>
    a.localeCompare(b, "nl"),
  );
  const totalCount = topics.reduce(
    (sum, topic) => sum + (countByTopic.get(topic) ?? 0),
    0,
  );

  const stats: TopicStat[] = [
    { topic: ALL_TOPICS, count: totalCount },
    ...topics.map((topic) => ({
      topic,
      count: countByTopic.get(topic) ?? 0,
    })),
  ];

  const payload: TopicsResponse = { topics, stats };
  return Response.json(payload);
}
