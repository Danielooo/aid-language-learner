import { buildDashboardStats } from "@/lib/dashboard/metrics";
import { createMockDashboardStats } from "@/lib/dashboard/mock-data";
import { getExerciseUserAccess } from "@/lib/dev/exercise-access";
import { DEV_EXERCISE_TOOLS_REQUIRE_AUTH } from "@/lib/dev/exercise-generator-auth";
import { getActiveTopicsForUser, isTopicActive } from "@/lib/topics/active-topics";

import type { ProgressRow } from "@/lib/dashboard/types";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const useMock = url.searchParams.get("mock") === "true";

  if (useMock || process.env.NEXT_PUBLIC_DASHBOARD_USE_MOCK === "true") {
    return Response.json(createMockDashboardStats());
  }

  const access = await getExerciseUserAccess();
  if (!access.ok) {
    if (DEV_EXERCISE_TOOLS_REQUIRE_AUTH) {
      return access.response;
    }
    return Response.json(createMockDashboardStats());
  }

  const activeTopics = await getActiveTopicsForUser(access.supabase, access.userId);

  const [progressRes, exerciseTopicsRes] = await Promise.all([
    access.supabase
      .from("exercise_progress")
      .select(
        "exercise_id, repetition_count, interval_days, last_reviewed_at, next_review_at, is_suspended",
      )
      .eq("user_id", access.userId),
    access.supabase.from("exercises").select("id, topic"),
  ]);

  if (progressRes.error) {
    return Response.json({ error: progressRes.error.message }, { status: 500 });
  }
  if (exerciseTopicsRes.error) {
    return Response.json({ error: exerciseTopicsRes.error.message }, { status: 500 });
  }

  const topicByExerciseId = new Map<string, string | null>();
  for (const row of exerciseTopicsRes.data ?? []) {
    topicByExerciseId.set(row.id, row.topic);
  }

  const progressRows = ((progressRes.data ?? []) as unknown as ProgressRow[]).filter(
    (row) => {
      const topic = topicByExerciseId.get(row.exercise_id) ?? null;
      return isTopicActive(activeTopics, topic);
    },
  );

  return Response.json(buildDashboardStats(progressRows));
}
