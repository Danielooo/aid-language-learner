import { MASTERED_REPETITION_THRESHOLD } from "@/lib/srs/mastery";
import {
  getSrsStepIndex,
  getSrsStepInfo,
  isInRelearning,
  SRS_MAIN_LADDER_STEPS,
} from "@/lib/srs/schedule";

import {
  ACTIVITY_CALENDAR_DAYS,
  computeActivityDays,
  computeAttemptStreakDays,
} from "./attempt-metrics";
import { toDayKey } from "./streak";

import type {
  ActivityBar,
  AttemptRow,
  DashboardStatsResponse,
  ExerciseTopicRow,
  ProgressRow,
  SrsStepBar,
  TopicProgressBuckets,
  TopicProgressRow,
  TopicProgressStatus,
  UpcomingDay,
} from "./types";

export const UPCOMING_HORIZON_DAYS = 7;
export const ACTIVITY_BARS_DAYS = 14;

function emptyBuckets(): TopicProgressBuckets {
  return { nogNiet: 0, bezig: 0, gevorderd: 0, beheerst: 0 };
}

/** Deelt een oefening in op basis van repetition_count (geen progress = 0). */
function bucketKeyForRepetition(
  repetitionCount: number,
): keyof TopicProgressBuckets {
  if (repetitionCount >= MASTERED_REPETITION_THRESHOLD) return "beheerst";
  if (repetitionCount >= 4) return "gevorderd";
  if (repetitionCount >= 1) return "bezig";
  return "nogNiet";
}

function toCardState(row: ProgressRow) {
  return {
    repetitionCount: row.repetition_count,
    intervalDays: row.interval_days,
    lastReviewedAt: row.last_reviewed_at
      ? new Date(row.last_reviewed_at)
      : null,
    nextReviewAt: new Date(row.next_review_at),
  };
}

function isRelearningRow(row: ProgressRow): boolean {
  if (row.is_suspended) return false;
  return isInRelearning(toCardState(row));
}

function isDueRow(row: ProgressRow, now: Date): boolean {
  if (row.is_suspended) return false;
  return isRelearningRow(row) || new Date(row.next_review_at) <= now;
}

function isMasteredRow(row: ProgressRow): boolean {
  if (row.is_suspended) return false;
  return row.repetition_count >= MASTERED_REPETITION_THRESHOLD;
}

function formatSrsStepLabel(stepIndex: number): string {
  return `${stepIndex}× goed`;
}

/** Vanaf ~4× goed gemiddeld — sluit aan op bucket “Gevorderd”. */
const VER_GEVORDERD_PERCENT = Math.round(
  (4 / MASTERED_REPETITION_THRESHOLD) * 100,
);

function topicStatusFromPercent(
  percentMastered: number,
  hasStarted: boolean,
): TopicProgressStatus {
  if (percentMastered >= 100) return "beheerst";
  if (percentMastered >= VER_GEVORDERD_PERCENT) return "ver-gevorderd";
  if (percentMastered > 0 || hasStarted) return "bezig";
  return "nog-starten";
}

function addDaysToDayKey(dayKey: string, days: number): string {
  const [year, month, day] = dayKey.split("-").map(Number);
  const utc = new Date(Date.UTC(year!, month! - 1, day! + days, 12, 0, 0));
  return toDayKey(utc);
}

function formatUpcomingLabel(dayKey: string, todayKey: string): string {
  if (dayKey === todayKey) return "Vandaag";
  if (dayKey === addDaysToDayKey(todayKey, 1)) return "Morgen";

  const [year, month, day] = dayKey.split("-").map(Number);
  const date = new Date(Date.UTC(year!, month! - 1, day!, 12, 0, 0));
  return new Intl.DateTimeFormat("nl-NL", {
    weekday: "short",
    timeZone: "Europe/Amsterdam",
  }).format(date);
}

export function computeSrsStepDistribution(
  progressRows: ReadonlyArray<ProgressRow>,
  now = new Date(),
): SrsStepBar[] {
  const activeRows = progressRows.filter((row) => !row.is_suspended);
  const dueCounts = new Map<number, number>();
  const waitingCounts = new Map<number, number>();

  for (let i = 0; i < SRS_MAIN_LADDER_STEPS.length; i++) {
    dueCounts.set(i, 0);
    waitingCounts.set(i, 0);
  }

  for (const row of activeRows) {
    const stepIndex = getSrsStepIndex(row.repetition_count);
    if (isDueRow(row, now)) {
      dueCounts.set(stepIndex, (dueCounts.get(stepIndex) ?? 0) + 1);
    } else {
      waitingCounts.set(stepIndex, (waitingCounts.get(stepIndex) ?? 0) + 1);
    }
  }

  const total = activeRows.length;

  return SRS_MAIN_LADDER_STEPS.map((_, stepIndex) => {
    const dueCount = dueCounts.get(stepIndex) ?? 0;
    const waitingCount = waitingCounts.get(stepIndex) ?? 0;
    const count = dueCount + waitingCount;
    const { description } = getSrsStepInfo(stepIndex);
    return {
      stepIndex,
      label: formatSrsStepLabel(stepIndex),
      description,
      count,
      dueCount,
      waitingCount,
      percentage: total === 0 ? 0 : Math.round((count / total) * 100),
    };
  });
}

/** Voortgang per topic: % tot alles beheerst (9× goed per oefening). */
export function computeTopicProgress(
  exercises: ReadonlyArray<ExerciseTopicRow>,
  progressRows: ReadonlyArray<ProgressRow>,
  now = new Date(),
): TopicProgressRow[] {
  const progressByExerciseId = new Map(
    progressRows.map((row) => [row.exercise_id, row] as const),
  );

  const byTopic = new Map<
    string,
    {
      totalCount: number;
      masteredCount: number;
      dueCount: number;
      /** True zodra er minstens één progress-rij is (ook bij alleen fouten). */
      hasProgress: boolean;
      /** Som van min(repetition, 9) — teller voor % tot beheersing. */
      masteryProgressSum: number;
      buckets: TopicProgressBuckets;
    }
  >();

  for (const exercise of exercises) {
    const progress = progressByExerciseId.get(exercise.id);
    if (progress?.is_suspended) continue;

    const bucket = byTopic.get(exercise.topic) ?? {
      totalCount: 0,
      masteredCount: 0,
      dueCount: 0,
      hasProgress: false,
      masteryProgressSum: 0,
      buckets: emptyBuckets(),
    };
    bucket.totalCount += 1;

    const repetitionCount = progress?.repetition_count ?? 0;
    bucket.buckets[bucketKeyForRepetition(repetitionCount)] += 1;
    bucket.masteryProgressSum += Math.min(
      repetitionCount,
      MASTERED_REPETITION_THRESHOLD,
    );

    if (progress) {
      bucket.hasProgress = true;
      if (isMasteredRow(progress)) bucket.masteredCount += 1;
      if (isDueRow(progress, now)) bucket.dueCount += 1;
    } else {
      // Geen progress-rij = direct aan de beurt
      bucket.dueCount += 1;
    }

    byTopic.set(exercise.topic, bucket);
  }

  return Array.from(byTopic.entries())
    .map(([topic, bucket]) => {
      const denom = bucket.totalCount * MASTERED_REPETITION_THRESHOLD;
      const percentMastered =
        denom === 0 ? 0 : Math.round((bucket.masteryProgressSum / denom) * 100);
      const hasStarted =
        bucket.hasProgress || bucket.buckets.nogNiet < bucket.totalCount;
      return {
        topic,
        totalCount: bucket.totalCount,
        masteredCount: bucket.masteredCount,
        dueCount: bucket.dueCount,
        percentMastered,
        status: topicStatusFromPercent(percentMastered, hasStarted),
        buckets: bucket.buckets,
      };
    })
    .sort((a, b) => {
      if (a.percentMastered !== b.percentMastered) {
        return a.percentMastered - b.percentMastered;
      }
      return a.topic.localeCompare(b.topic, "nl");
    });
}

/**
 * Herhalingen per kalenderdag (Europe/Amsterdam).
 * Eerste staaf = nu aan de beurt (achterstallig + due).
 * Daarna: later vandaag, morgen, … (`horizonDays` kalenderdagen).
 */
export function computeUpcomingByDay(
  exercises: ReadonlyArray<ExerciseTopicRow>,
  progressRows: ReadonlyArray<ProgressRow>,
  now = new Date(),
  horizonDays = UPCOMING_HORIZON_DAYS,
): UpcomingDay[] {
  const todayKey = toDayKey(now);
  const lastKey = addDaysToDayKey(todayKey, horizonDays - 1);
  const progressByExerciseId = new Map(
    progressRows.map((row) => [row.exercise_id, row] as const),
  );

  const OPEN_DAY_KEY = "__open__";
  const counts = new Map<string, number>();

  for (const exercise of exercises) {
    const progress = progressByExerciseId.get(exercise.id);
    if (progress?.is_suspended) continue;

    if (!progress || isDueRow(progress, now)) {
      counts.set(OPEN_DAY_KEY, (counts.get(OPEN_DAY_KEY) ?? 0) + 1);
      continue;
    }

    const reviewDay = toDayKey(new Date(progress.next_review_at));
    if (reviewDay > lastKey) continue;

    counts.set(reviewDay, (counts.get(reviewDay) ?? 0) + 1);
  }

  const out: UpcomingDay[] = [
    {
      day: OPEN_DAY_KEY,
      label: "Open",
      count: counts.get(OPEN_DAY_KEY) ?? 0,
    },
  ];
  for (let i = 0; i < horizonDays; i++) {
    const day = addDaysToDayKey(todayKey, i);
    out.push({
      day,
      label: formatUpcomingLabel(day, todayKey),
      count: counts.get(day) ?? 0,
    });
  }
  return out;
}

export function computeActivityBars(
  attemptRows: ReadonlyArray<AttemptRow>,
  now = new Date(),
  days = ACTIVITY_BARS_DAYS,
): ActivityBar[] {
  return computeActivityDays(attemptRows, days, now).map(
    ({ day, count, correct, incorrect }) => ({
      day,
      count,
      correct,
      incorrect,
    }),
  );
}

export function buildDashboardStats(
  progressRows: ReadonlyArray<ProgressRow>,
  attemptRows: ReadonlyArray<AttemptRow> = [],
  now = new Date(),
  exercises: ReadonlyArray<ExerciseTopicRow> = [],
): DashboardStatsResponse {
  const progressByExerciseId = new Map(
    progressRows.map((row) => [row.exercise_id, row] as const),
  );

  // Schema-totalen: alle oefeningen in actieve topics, behalve geschorst
  const schemaExercises = exercises.filter((exercise) => {
    const progress = progressByExerciseId.get(exercise.id);
    return !progress?.is_suspended;
  });

  let dueNowCount = 0;
  let relearningCount = 0;
  let masteredCount = 0;

  for (const exercise of schemaExercises) {
    const progress = progressByExerciseId.get(exercise.id);
    if (!progress) {
      dueNowCount += 1;
      continue;
    }
    if (isDueRow(progress, now)) dueNowCount += 1;
    if (isRelearningRow(progress)) relearningCount += 1;
    if (isMasteredRow(progress)) masteredCount += 1;
  }

  // Fallback wanneer caller nog geen exercises doorgeeft (oude tests)
  const totalExercises =
    exercises.length > 0
      ? schemaExercises.length
      : progressRows.filter((row) => !row.is_suspended).length;

  const fallbackMastered =
    exercises.length > 0
      ? masteredCount
      : progressRows.filter((row) => isMasteredRow(row)).length;

  const fallbackDue =
    exercises.length > 0
      ? dueNowCount
      : progressRows.filter((row) => isDueRow(row, now)).length;

  const fallbackRelearning =
    exercises.length > 0
      ? relearningCount
      : progressRows.filter((row) => isRelearningRow(row)).length;

  return {
    totalExercises,
    masteredCount: fallbackMastered,
    dueNowCount: fallbackDue,
    relearningCount: fallbackRelearning,
    topicProgress: computeTopicProgress(exercises, progressRows, now),
    upcomingByDay: computeUpcomingByDay(exercises, progressRows, now),
    activityBars: computeActivityBars(attemptRows, now),
    srsStepDistribution: computeSrsStepDistribution(progressRows, now),
    streakDays: computeAttemptStreakDays(attemptRows, now),
    activityDays: computeActivityDays(attemptRows, ACTIVITY_CALENDAR_DAYS, now),
    attemptSnapshots: attemptRows.map(({ created_at, is_correct }) => ({
      created_at,
      is_correct,
    })),
  };
}
