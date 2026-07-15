export type ExerciseProgressDto = {
  exerciseId: string;
  easeFactor: number;
  intervalDays: number;
  repetitionCount: number;
  nextReviewAt: string;
  lastReviewedAt: string | null;
  isSuspended: boolean;
};

export type ProgressStatsResponse = {
  dueCount: number;
  trackedCount: number;
  suspendedCount: number;
  dueByTopic?: Record<string, number>;
};
