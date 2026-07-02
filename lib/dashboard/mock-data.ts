import { buildDashboardStats } from "./metrics";

import type { AttemptRow, DashboardPeriod, ProgressRow } from "./types";

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
}

function makeAttempts(): AttemptRow[] {
  const attempts: AttemptRow[] = [];
  const exercises = [
    { id: "e1", source: "hola", target: "hallo", topic: "begroetingen" },
    { id: "e2", source: "gracias", target: "dank je", topic: "begroetingen" },
    { id: "e3", source: "por favor", target: "alsjeblieft", topic: "beleefdheid" },
  ];

  for (let day = 0; day < 60; day++) {
    for (let i = 0; i < 3 + (day % 5); i++) {
      const ex = exercises[i % exercises.length];
      const isSrs = i % 2 === 0;
      attempts.push({
        exercise_id: ex.id,
        is_correct: Math.random() > 0.25,
        created_at: daysAgo(day),
        selection_mode: isSrs ? "srs" : "topic",
        practice_type: (["flashcard", "typing", "sort"] as const)[i % 3],
        direction: i % 2 === 0 ? "es-to-nl" : "nl-to-es",
        typing_mode: i % 3 === 1 ? "full" : null,
        is_mistake_review: false,
        response_time_ms: 2000 + Math.floor(Math.random() * 8000),
        interval_days_before: [1, 3, 7, 14, 30][i % 5],
        repetition_count_before: 2 + (i % 6),
        is_scheduled_review: isSrs,
        exercises: {
          source_text: ex.source,
          target_text: ex.target,
          topic: ex.topic,
        },
      });
    }
  }

  return attempts;
}

function makeProgress(): ProgressRow[] {
  const now = new Date();
  const rows: ProgressRow[] = [];
  for (let i = 0; i < 12; i++) {
    const due = new Date(now);
    due.setDate(due.getDate() + (i % 14));
    rows.push({
      exercise_id: `e${(i % 3) + 1}`,
      repetition_count: [0, 2, 4, 6, 8, 10][i % 6],
      interval_days: [0, 1, 3, 7, 14, 30][i % 6],
      last_reviewed_at: daysAgo(i % 10),
      next_review_at: due.toISOString(),
      is_suspended: false,
    });
  }
  return rows;
}

export function createMockDashboardStats(period: DashboardPeriod = "30d") {
  return buildDashboardStats(makeAttempts(), makeProgress(), period);
}
