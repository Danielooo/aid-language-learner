import { buildDashboardStats } from "./metrics";

import type { ProgressRow } from "./types";

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
    { repetition_count: 0, interval_days: 0, dueOffsetDays: 0, lastReviewedDaysAgo: null },
    { repetition_count: 1, interval_days: 0, dueOffsetDays: 0, lastReviewedDaysAgo: 0 },
    { repetition_count: 2, interval_days: 1, dueOffsetDays: 1, lastReviewedDaysAgo: 1 },
    { repetition_count: 4, interval_days: 3, dueOffsetDays: 2, lastReviewedDaysAgo: 2 },
    { repetition_count: 6, interval_days: 7, dueOffsetDays: 3, lastReviewedDaysAgo: 5 },
    { repetition_count: 8, interval_days: 30, dueOffsetDays: 10, lastReviewedDaysAgo: 10 },
    { repetition_count: 10, interval_days: 90, dueOffsetDays: 20, lastReviewedDaysAgo: 20 },
    { repetition_count: 3, interval_days: 0, dueOffsetDays: 0, lastReviewedDaysAgo: 0 },
  ];

  for (let i = 0; i < configs.length; i++) {
    const cfg = configs[i];
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
        cfg.lastReviewedDaysAgo == null ? null : daysAgo(cfg.lastReviewedDaysAgo),
      next_review_at: due.toISOString(),
      is_suspended: false,
    });
  }

  return rows;
}

export function createMockDashboardStats() {
  return buildDashboardStats(makeProgress());
}
