export type SrsStepBar = {
  stepIndex: number;
  label: string;
  description: string;
  count: number;
  percentage: number;
};

export type DashboardStatsResponse = {
  totalExercises: number;
  dueNowCount: number;
  relearningCount: number;
  srsStepDistribution: SrsStepBar[];
};

export type ProgressRow = {
  exercise_id: string;
  repetition_count: number;
  interval_days: number;
  last_reviewed_at: string | null;
  next_review_at: string;
  is_suspended: boolean;
};
