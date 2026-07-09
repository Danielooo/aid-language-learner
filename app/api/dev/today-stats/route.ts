import { computeStreakDays, toDayKey } from "@/lib/dashboard/streak";
import { getExerciseUserAccess } from "@/lib/dev/exercise-access";
import {
  activeTopicsToArray,
  getActiveTopicsForUser,
} from "@/lib/topics/active-topics";

// Compacte stats voor de Vandaag-pagina: due-count (SRS), aantal
// beoordeelde oefeningen vandaag, en de dagelijkse streak.

export const dynamic = "force-dynamic";

export type TodayStatsResponse = {
  dueCount: number;
  reviewedToday: number;
  streakDays: number;
  activeTopicCount: number;
  trackedCount: number;
};

export async function GET() {
  const access = await getExerciseUserAccess();
  if (!access.ok) return access.response;

  const now = new Date();
  const nowIso = now.toISOString();

  const activeTopics = await getActiveTopicsForUser(
    access.supabase,
    access.userId,
  );
  const activeList = activeTopicsToArray(activeTopics);

  let dueCount = 0;
  if (activeList) {
    const dueResult = await access.supabase
      .from("exercise_progress")
      .select("exercise_id, exercises!inner(topic)", {
        count: "exact",
        head: true,
      })
      .eq("user_id", access.userId)
      .eq("is_suspended", false)
      .lte("next_review_at", nowIso)
      .in("exercises.topic", activeList);

    if (dueResult.error) {
      return Response.json({ error: dueResult.error.message }, { status: 500 });
    }
    dueCount = dueResult.count ?? 0;
  }

  const { count: trackedCount, error: trackedError } = await access.supabase
    .from("exercise_progress")
    .select("exercise_id", { count: "exact", head: true })
    .eq("user_id", access.userId);

  if (trackedError) {
    return Response.json({ error: trackedError.message }, { status: 500 });
  }

  // Eén jaar aan attempt-timestamps is ruim genoeg voor streak + vandaag.
  const yearAgo = new Date(now.getTime() - 366 * 24 * 60 * 60 * 1000);
  const { data: attempts, error: attemptsError } = await access.supabase
    .from("quiz_attempts")
    .select("created_at")
    .eq("user_id", access.userId)
    .gte("created_at", yearAgo.toISOString())
    .order("created_at", { ascending: false })
    .limit(5000);

  if (attemptsError) {
    return Response.json({ error: attemptsError.message }, { status: 500 });
  }

  const todayKey = toDayKey(now);
  const dayKeys = new Set<string>();
  let reviewedToday = 0;
  for (const row of attempts ?? []) {
    const key = toDayKey(new Date(row.created_at));
    dayKeys.add(key);
    if (key === todayKey) reviewedToday += 1;
  }

  const payload: TodayStatsResponse = {
    dueCount,
    reviewedToday,
    streakDays: computeStreakDays(dayKeys, now),
    activeTopicCount: activeTopics.size,
    trackedCount: trackedCount ?? 0,
  };

  return Response.json(payload);
}
