export type SrsStepBar = {
  stepIndex: number;
  label: string;
  description: string;
  count: number;
  dueCount: number;
  waitingCount: number;
  percentage: number;
};

export type ActivityDay = {
  day: string;
  count: number;
  correct: number;
  incorrect: number;
  /** null wanneer count onder de nauwkeurigheidsdrempel ligt */
  accuracyPct: number | null;
};

export type AccuracySummary = {
  correct: number;
  incorrect: number;
  total: number;
  accuracyPct: number;
};

export type AttemptSnapshot = Pick<AttemptRow, "created_at" | "is_correct">;

export type DashboardStatsResponse = {
  totalExercises: number;
  dueNowCount: number;
  relearningCount: number;
  srsStepDistribution: SrsStepBar[];
  streakDays: number;
  activityDays: ActivityDay[];
  attemptSnapshots: AttemptSnapshot[];
};

export type ProgressRow = {
  exercise_id: string;
  repetition_count: number;
  interval_days: number;
  last_reviewed_at: string | null;
  next_review_at: string;
  is_suspended: boolean;
};

export type AttemptRow = {
  created_at: string;
  is_correct: boolean;
  topic: string | null;
};
