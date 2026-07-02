import type { MasteryLevel } from "@/lib/srs/mastery";

export const DASHBOARD_PERIODS = ["7d", "30d", "90d", "all"] as const;
export type DashboardPeriod = (typeof DASHBOARD_PERIODS)[number];

export type DashboardKpis = {
  retention30d: number | null;
  masteredWords: number;
  masteredWordsDeltaWeek: number;
  averageMasteryScore: number;
  reviewsNext7Days: number;
  activeDaysLast30: number;
  activeDaysTotal30: number;
  currentStreak: number;
  longestStreak: number;
};

export type MasteredWordsPoint = {
  date: string;
  masteredWordsCount: number;
  knownWordsCount?: number;
  totalWordsCount?: number;
};

export type RetentionPoint = {
  date: string;
  retention7d: number | null;
  retention30d: number | null;
};

export type IntervalRetentionBar = {
  intervalLabel: string;
  correctCount: number;
  reviewCount: number;
  retentionPercentage: number | null;
};

export type MasterySlice = {
  label: string;
  level: MasteryLevel;
  count: number;
  percentage: number;
  color: string;
};

export type StudyDay = {
  date: string;
  reviewCount: number;
  accuracy: number | null;
};

export type WorkloadDay = {
  date: string;
  scheduledReviewCount: number;
  overdueCount: number;
};

export type HardWordRow = {
  exerciseId: string;
  word: string;
  translation: string;
  topic: string | null;
  mistakeCount: number;
  reviewCount: number;
  errorRate: number;
  averageResponseTimeMs: number | null;
  masteryScore: number;
};

export type PracticeTypeBar = {
  practiceType: string;
  label: string;
  accuracy: number;
  retention: number | null;
  reviewCount: number;
  averageResponseTimeMs: number | null;
};

export type DashboardStatsResponse = {
  period: DashboardPeriod;
  kpis: DashboardKpis;
  masteredOverTime: MasteredWordsPoint[];
  retentionOverTime: RetentionPoint[];
  retentionByInterval: IntervalRetentionBar[];
  masteryDistribution: MasterySlice[];
  studyHeatmap: StudyDay[];
  workloadForecast: WorkloadDay[];
  hardestWords: HardWordRow[];
  performanceByPracticeType: PracticeTypeBar[];
  insights: string[];
};

export type AttemptRow = {
  exercise_id: string;
  is_correct: boolean;
  created_at: string;
  selection_mode: string | null;
  practice_type: string | null;
  direction: string | null;
  typing_mode: string | null;
  is_mistake_review: boolean;
  response_time_ms: number | null;
  interval_days_before: number | null;
  repetition_count_before: number | null;
  is_scheduled_review: boolean;
  exercises: {
    source_text: string;
    target_text: string;
    topic: string | null;
  } | null;
};

export type ProgressRow = {
  exercise_id: string;
  repetition_count: number;
  interval_days: number;
  last_reviewed_at: string | null;
  next_review_at: string;
  is_suspended: boolean;
};
