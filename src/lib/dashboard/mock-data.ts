import { buildDashboardStats } from "./metrics";

import type { AttemptRow, ExerciseTopicRow, ProgressRow } from "./types";

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
}

function makeProgress(): ProgressRow[] {
  const now = new Date();
  const rows: ProgressRow[] = [];

  const configs: Array<{
    repetition_count: number;
    interval_days: number;
    dueOffsetDays: number;
    lastReviewedDaysAgo: number | null;
  }> = [
    {
      repetition_count: 0,
      interval_days: 0,
      dueOffsetDays: 0,
      lastReviewedDaysAgo: null,
    },
    {
      repetition_count: 1,
      interval_days: 0,
      dueOffsetDays: 0,
      lastReviewedDaysAgo: 0,
    },
    {
      repetition_count: 2,
      interval_days: 1,
      dueOffsetDays: 1,
      lastReviewedDaysAgo: 1,
    },
    {
      repetition_count: 4,
      interval_days: 3,
      dueOffsetDays: 2,
      lastReviewedDaysAgo: 2,
    },
    {
      repetition_count: 6,
      interval_days: 7,
      dueOffsetDays: 3,
      lastReviewedDaysAgo: 5,
    },
    {
      repetition_count: 8,
      interval_days: 30,
      dueOffsetDays: 10,
      lastReviewedDaysAgo: 10,
    },
    {
      repetition_count: 10,
      interval_days: 90,
      dueOffsetDays: 20,
      lastReviewedDaysAgo: 20,
    },
    {
      repetition_count: 3,
      interval_days: 0,
      dueOffsetDays: 0,
      lastReviewedDaysAgo: 0,
    },
    {
      repetition_count: 9,
      interval_days: 90,
      dueOffsetDays: 30,
      lastReviewedDaysAgo: 15,
    },
    {
      repetition_count: 9,
      interval_days: 90,
      dueOffsetDays: 40,
      lastReviewedDaysAgo: 20,
    },
  ];

  for (let i = 0; i < configs.length; i++) {
    const cfg = configs[i]!;
    const due = new Date(now);
    if (cfg.dueOffsetDays === 0) {
      due.setMinutes(due.getMinutes() + (i === 7 ? 2 : 0));
    } else {
      due.setDate(due.getDate() + cfg.dueOffsetDays);
    }

    rows.push({
      exercise_id: `e${i + 1}`,
      repetition_count: cfg.repetition_count,
      interval_days: cfg.interval_days,
      last_reviewed_at:
        cfg.lastReviewedDaysAgo == null
          ? null
          : daysAgo(cfg.lastReviewedDaysAgo),
      next_review_at: due.toISOString(),
      is_suspended: false,
    });
  }

  return rows;
}

function makeExercises(): ExerciseTopicRow[] {
  // Twee topics; e11 heeft geen progress → telt als aan de beurt
  return [
    { id: "e1", topic: "Begroetingen" },
    { id: "e2", topic: "Begroetingen" },
    { id: "e3", topic: "Begroetingen" },
    { id: "e4", topic: "Begroetingen" },
    { id: "e5", topic: "Eten & drinken" },
    { id: "e6", topic: "Eten & drinken" },
    { id: "e7", topic: "Eten & drinken" },
    { id: "e8", topic: "Eten & drinken" },
    { id: "e9", topic: "Eten & drinken" },
    { id: "e10", topic: "Eten & drinken" },
    { id: "e11", topic: "Begroetingen" },
  ];
}

function makeAttempts(): AttemptRow[] {
  const rows: AttemptRow[] = [];
  const pattern: Array<{
    daysAgo: number;
    count: number;
    correctRatio: number;
  }> = [
    { daysAgo: 0, count: 8, correctRatio: 0.75 },
    { daysAgo: 1, count: 12, correctRatio: 0.67 },
    { daysAgo: 2, count: 5, correctRatio: 0.8 },
    { daysAgo: 3, count: 0, correctRatio: 0 },
    { daysAgo: 4, count: 6, correctRatio: 0.5 },
    { daysAgo: 5, count: 10, correctRatio: 0.7 },
    { daysAgo: 6, count: 4, correctRatio: 0.75 },
    { daysAgo: 10, count: 7, correctRatio: 0.86 },
    { daysAgo: 14, count: 3, correctRatio: 0.67 },
    { daysAgo: 21, count: 9, correctRatio: 0.78 },
    { daysAgo: 30, count: 5, correctRatio: 0.6 },
    { daysAgo: 45, count: 4, correctRatio: 0.5 },
    { daysAgo: 60, count: 6, correctRatio: 0.83 },
    { daysAgo: 90, count: 2, correctRatio: 1 },
  ];

  for (const entry of pattern) {
    for (let i = 0; i < entry.count; i++) {
      const correctCount = Math.round(entry.count * entry.correctRatio);
      rows.push({
        created_at: daysAgo(entry.daysAgo),
        is_correct: i < correctCount,
        topic: "Begroetingen",
      });
    }
  }

  return rows;
}

export function createMockDashboardStats() {
  return buildDashboardStats(
    makeProgress(),
    makeAttempts(),
    new Date(),
    makeExercises(),
  );
}
