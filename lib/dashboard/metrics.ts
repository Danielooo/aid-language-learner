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

import type {
  AttemptRow,
  DashboardStatsResponse,
  ProgressRow,
  SrsStepBar,
} from "./types";

function toCardState(row: ProgressRow) {
  return {
    repetitionCount: row.repetition_count,
    intervalDays: row.interval_days,
    lastReviewedAt: row.last_reviewed_at ? new Date(row.last_reviewed_at) : null,
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

function formatSrsStepLabel(stepIndex: number): string {
  return `${stepIndex}× goed`;
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

export function buildDashboardStats(
  progressRows: ReadonlyArray<ProgressRow>,
  attemptRows: ReadonlyArray<AttemptRow> = [],
  now = new Date(),
): DashboardStatsResponse {
  const activeRows = progressRows.filter((row) => !row.is_suspended);
  const dueNowCount = activeRows.filter((row) => isDueRow(row, now)).length;
  const relearningCount = activeRows.filter((row) => isRelearningRow(row)).length;

  return {
    totalExercises: activeRows.length,
    dueNowCount,
    relearningCount,
    srsStepDistribution: computeSrsStepDistribution(progressRows, now),
    streakDays: computeAttemptStreakDays(attemptRows, now),
    activityDays: computeActivityDays(attemptRows, ACTIVITY_CALENDAR_DAYS, now),
    attemptSnapshots: attemptRows.map(({ created_at, is_correct }) => ({
      created_at,
      is_correct,
    })),
  };
}
