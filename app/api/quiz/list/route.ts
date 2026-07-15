import { getExerciseUserAccess } from "@/lib/exercises/exercise-access";
import {
  activeTopicsToArray,
  getActiveTopicsForUser,
  isTopicActive,
} from "@/lib/topics/active-topics";

// Lichte lijst van oefeningen voor de custom exercise-picker in de quiz.

export const dynamic = "force-dynamic";

import type {
  ExerciseListResponse,
  ExercisePickerItem,
} from "@/types/quiz";

export type { ExerciseListResponse, ExercisePickerItem };

const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 200;

export async function GET(req: Request) {
  const access = await getExerciseUserAccess();
  if (!access.ok) return access.response;

  const url = new URL(req.url);
  const topicParam = url.searchParams.get("topic");
  const searchParam = url.searchParams.get("search");
  const pageParam = url.searchParams.get("page");
  const pageSizeParam = url.searchParams.get("pageSize");

  const topic =
    topicParam && topicParam.trim().length > 0 && topicParam !== "all"
      ? topicParam.trim()
      : null;
  const search = searchParam?.trim() ?? "";
  const page = Math.max(1, Number.parseInt(pageParam ?? "1", 10) || 1);
  const pageSize = Math.min(
    MAX_PAGE_SIZE,
    Math.max(1, Number.parseInt(pageSizeParam ?? String(DEFAULT_PAGE_SIZE), 10) || DEFAULT_PAGE_SIZE),
  );

  const activeTopics = await getActiveTopicsForUser(access.supabase, access.userId);
  const activeList = activeTopicsToArray(activeTopics);

  if (!activeList) {
    const payload: ExerciseListResponse = {
      exercises: [],
      total: 0,
      page,
      pageSize,
    };
    return Response.json(payload);
  }

  if (topic && !isTopicActive(activeTopics, topic)) {
    const payload: ExerciseListResponse = {
      exercises: [],
      total: 0,
      page,
      pageSize,
    };
    return Response.json(payload);
  }

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = access.supabase
    .from("exercises")
    .select("id, source_text, target_text, topic", { count: "exact" })
    .in("topic", activeList)
    .order("created_at", { ascending: false })
    .range(from, to);

  if (topic) query = query.eq("topic", topic);
  if (search.length > 0) {
    const pattern = `%${search}%`;
    query = query.or(
      `source_text.ilike.${pattern},target_text.ilike.${pattern}`,
    );
  }

  const { data, error, count } = await query;

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  const payload: ExerciseListResponse = {
    exercises: (data ?? []).map((row) => ({
      id: row.id,
      source_text: row.source_text,
      target_text: row.target_text,
      topic: row.topic,
    })),
    total: count ?? 0,
    page,
    pageSize,
  };

  return Response.json(payload);
}
