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

export type TopicProgressStatus =
  | "nog-starten"
  | "bezig"
  | "ver-gevorderd"
  | "beheerst";

export type TopicProgressBuckets = {
  /** 0× of geen progress */
  nogNiet: number;
  /** 1–3× goed */
  bezig: number;
  /** 4–8× goed */
  gevorderd: number;
  /** 9×+ goed */
  beheerst: number;
};

export type TopicProgressRow = {
  topic: string;
  totalCount: number;
  masteredCount: number;
  dueCount: number;
  percentMastered: number;
  status: TopicProgressStatus;
  buckets: TopicProgressBuckets;
};

export type UpcomingDay = {
  day: string;
  label: string;
  count: number;
};

export type ActivityBar = {
  day: string;
  count: number;
  correct: number;
  incorrect: number;
};

export type DashboardStatsResponse = {
  totalExercises: number;
  masteredCount: number;
  dueNowCount: number;
  relearningCount: number;
  topicProgress: TopicProgressRow[];
  upcomingByDay: UpcomingDay[];
  activityBars: ActivityBar[];
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

/** Oefening uit actieve topics (voor totalen inclusief zonder progress-rij). */
export type ExerciseTopicRow = {
  id: string;
  topic: string;
};
