import {
  getSrsStepIndex,
  getSrsStepInfo,
  isInRelearning,
  SRS_MAIN_LADDER_STEPS,
} from "@/lib/srs/schedule";

import type { DashboardStatsResponse, ProgressRow, SrsStepBar } from "./types";

const RELEARNING_GAP_MS = 60 * 60 * 1000;

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
  const state = toCardState(row);
  if (!state.lastReviewedAt) return false;
  if (state.repetitionCount <= 0 || state.intervalDays !== 0) return false;

  const gapMs = state.nextReviewAt.getTime() - state.lastReviewedAt.getTime();
  if (gapMs < 0 || gapMs >= RELEARNING_GAP_MS) return false;

  return isInRelearning({
    repetitionCount: state.repetitionCount,
    intervalDays: state.intervalDays,
    lastReviewedAt: state.lastReviewedAt,
    nextReviewAt: state.nextReviewAt,
  });
}

export function computeSrsStepDistribution(
  progressRows: ReadonlyArray<ProgressRow>,
  now = new Date(),
): SrsStepBar[] {
  const activeRows = progressRows.filter((row) => !row.is_suspended);
  const counts = new Map<number, number>();

  for (let i = 0; i < SRS_MAIN_LADDER_STEPS.length; i++) {
    counts.set(i, 0);
  }

  for (const row of activeRows) {
    if (isRelearningRow(row)) continue;
    const stepIndex = getSrsStepIndex(row.repetition_count);
    counts.set(stepIndex, (counts.get(stepIndex) ?? 0) + 1);
  }

  const total = activeRows.length;

  return SRS_MAIN_LADDER_STEPS.map((_, stepIndex) => {
    const count = counts.get(stepIndex) ?? 0;
    const { label, description } = getSrsStepInfo(stepIndex);
    return {
      stepIndex,
      label,
      description,
      count,
      percentage: total === 0 ? 0 : Math.round((count / total) * 100),
    };
  });
}

export function buildDashboardStats(
  progressRows: ReadonlyArray<ProgressRow>,
  now = new Date(),
): DashboardStatsResponse {
  const activeRows = progressRows.filter((row) => !row.is_suspended);
  const dueNowCount = activeRows.filter(
    (row) => new Date(row.next_review_at) <= now,
  ).length;
  const relearningCount = activeRows.filter((row) => isRelearningRow(row)).length;

  return {
    totalExercises: activeRows.length,
    dueNowCount,
    relearningCount,
    srsStepDistribution: computeSrsStepDistribution(progressRows, now),
  };
}
