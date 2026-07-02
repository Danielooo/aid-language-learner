import { z } from "zod";

import { buildDashboardStats } from "@/lib/dashboard/metrics";
import { createMockDashboardStats } from "@/lib/dashboard/mock-data";
import { DASHBOARD_PERIODS } from "@/lib/dashboard/types";
import { getExerciseUserAccess } from "@/lib/dev/exercise-access";
import { DEV_EXERCISE_TOOLS_REQUIRE_AUTH } from "@/lib/dev/exercise-generator-auth";
import { getActiveTopicsForUser, isTopicActive } from "@/lib/topics/active-topics";

import type { AttemptRow, DashboardPeriod, ProgressRow } from "@/lib/dashboard/types";

export const dynamic = "force-dynamic";

const ATTEMPT_SELECT =
  "exercise_id, is_correct, created_at, selection_mode, practice_type, direction, typing_mode, is_mistake_review, response_time_ms, interval_days_before, repetition_count_before, is_scheduled_review, exercises ( source_text, target_text, topic )";

const periodSchema = z.enum(DASHBOARD_PERIODS);

export async function GET(req: Request) {
  const url = new URL(req.url);
  const periodParam = url.searchParams.get("period") ?? "30d";
  const useMock = url.searchParams.get("mock") === "true";

  const periodResult = periodSchema.safeParse(periodParam);
  const period: DashboardPeriod = periodResult.success ? periodResult.data : "30d";

  if (useMock || process.env.NEXT_PUBLIC_DASHBOARD_USE_MOCK === "true") {
    return Response.json(createMockDashboardStats(period));
  }

  const access = await getExerciseUserAccess();
  if (!access.ok) {
    if (DEV_EXERCISE_TOOLS_REQUIRE_AUTH) {
      return access.response;
    }
    return Response.json(createMockDashboardStats(period));
  }

  const activeTopics = await getActiveTopicsForUser(access.supabase, access.userId);

  const [attemptsRes, progressRes, exerciseTopicsRes] = await Promise.all([
    access.supabase
      .from("quiz_attempts")
      .select(ATTEMPT_SELECT)
      .eq("user_id", access.userId)
      .order("created_at", { ascending: false })
      .limit(5000),
    access.supabase
      .from("exercise_progress")
      .select(
        "exercise_id, repetition_count, interval_days, last_reviewed_at, next_review_at, is_suspended",
      )
      .eq("user_id", access.userId),
    access.supabase.from("exercises").select("id, topic"),
  ]);

  if (attemptsRes.error) {
    return Response.json({ error: attemptsRes.error.message }, { status: 500 });
  }
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

  const attempts = ((attemptsRes.data ?? []) as unknown as AttemptRow[]).filter(
    (attempt) => {
      const topic =
        attempt.exercises?.topic ?? topicByExerciseId.get(attempt.exercise_id) ?? null;
      return isTopicActive(activeTopics, topic);
    },
  );

  const progressRows = ((progressRes.data ?? []) as unknown as ProgressRow[]).filter(
    (row) => {
      const topic = topicByExerciseId.get(row.exercise_id) ?? null;
      return isTopicActive(activeTopics, topic);
    },
  );

  return Response.json(buildDashboardStats(attempts, progressRows, period));
}
