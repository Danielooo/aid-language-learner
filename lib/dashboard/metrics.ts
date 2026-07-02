import {
  averageMasteryScore,
  getMasteryLevel,
  masteryLevelLabel,
  MASTERED_REPETITION_THRESHOLD,
  type MasteryLevel,
} from "@/lib/srs/mastery";

import {
  intervalBucketLabel,
  periodStartDate,
  practiceTypeLabel,
  sortIntervalLabels,
  toLocalDateKey,
} from "./format";

import type {
  AttemptRow,
  DashboardKpis,
  DashboardPeriod,
  DashboardStatsResponse,
  HardWordRow,
  IntervalRetentionBar,
  MasteredWordsPoint,
  MasterySlice,
  PracticeTypeBar,
  ProgressRow,
  RetentionPoint,
  StudyDay,
  WorkloadDay,
} from "./types";

const MASTERY_COLORS: Record<MasteryLevel, string> = {
  nieuw: "#94a3b8",
  "aan-het-leren": "#60a5fa",
  zwak: "#f59e0b",
  bekend: "#34d399",
  sterk: "#10b981",
  beheerst: "#059669",
};

function filterAttemptsByPeriod(
  attempts: ReadonlyArray<AttemptRow>,
  period: DashboardPeriod,
  now = new Date(),
): AttemptRow[] {
  const start = periodStartDate(period, now);
  if (!start) return [...attempts];
  return attempts.filter((a) => new Date(a.created_at) >= start);
}

function scheduledAttempts(attempts: ReadonlyArray<AttemptRow>): AttemptRow[] {
  return attempts.filter((a) => a.is_scheduled_review);
}

function rollingRetention(
  daily: Map<string, { correct: number; total: number }>,
  dates: string[],
  window: number,
): (number | null)[] {
  return dates.map((_, index) => {
    const slice = dates.slice(Math.max(0, index - window + 1), index + 1);
    let correct = 0;
    let total = 0;
    for (const date of slice) {
      const bucket = daily.get(date);
      if (!bucket) continue;
      correct += bucket.correct;
      total += bucket.total;
    }
    return total === 0 ? null : Math.round((correct / total) * 100);
  });
}

export function computeRetentionOverTime(
  attempts: ReadonlyArray<AttemptRow>,
  period: DashboardPeriod,
  now = new Date(),
): RetentionPoint[] {
  const scheduled = scheduledAttempts(filterAttemptsByPeriod(attempts, period, now));
  const daily = new Map<string, { correct: number; total: number }>();

  for (const attempt of scheduled) {
    const key = toLocalDateKey(new Date(attempt.created_at));
    const bucket = daily.get(key) ?? { correct: 0, total: 0 };
    bucket.total += 1;
    if (attempt.is_correct) bucket.correct += 1;
    daily.set(key, bucket);
  }

  const start = periodStartDate(period, now) ?? new Date(now.getTime() - 89 * 86400000);
  const dates: string[] = [];
  const cursor = new Date(start);
  cursor.setHours(0, 0, 0, 0);
  const end = new Date(now);
  end.setHours(0, 0, 0, 0);

  while (cursor <= end) {
    dates.push(toLocalDateKey(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }

  const r7 = rollingRetention(daily, dates, 7);
  const r30 = rollingRetention(daily, dates, 30);

  return dates.map((date, i) => ({
    date,
    retention7d: r7[i],
    retention30d: r30[i],
  }));
}

export function computeRetentionByInterval(
  attempts: ReadonlyArray<AttemptRow>,
  period: DashboardPeriod,
  now = new Date(),
): IntervalRetentionBar[] {
  const scheduled = scheduledAttempts(filterAttemptsByPeriod(attempts, period, now));
  const buckets = new Map<string, { correct: number; total: number }>();

  for (const attempt of scheduled) {
    const label = intervalBucketLabel(attempt.interval_days_before);
    const bucket = buckets.get(label) ?? { correct: 0, total: 0 };
    bucket.total += 1;
    if (attempt.is_correct) bucket.correct += 1;
    buckets.set(label, bucket);
  }

  return sortIntervalLabels([...buckets.keys()]).map((intervalLabel) => {
    const bucket = buckets.get(intervalLabel)!;
    return {
      intervalLabel,
      correctCount: bucket.correct,
      reviewCount: bucket.total,
      retentionPercentage:
        bucket.total === 0 ? null : Math.round((bucket.correct / bucket.total) * 100),
    };
  });
}

export function computeMasteryDistribution(
  progressRows: ReadonlyArray<ProgressRow>,
  trackedExerciseIds: Set<string>,
): MasterySlice[] {
  const counts = new Map<MasteryLevel, number>();

  for (const level of Object.keys(MASTERY_COLORS) as MasteryLevel[]) {
    counts.set(level, 0);
  }

  for (const row of progressRows) {
    if (row.is_suspended) continue;
    trackedExerciseIds.add(row.exercise_id);
    const level = getMasteryLevel({
      repetitionCount: row.repetition_count,
      intervalDays: row.interval_days,
      lastReviewedAt: row.last_reviewed_at ? new Date(row.last_reviewed_at) : null,
      hasProgressRow: true,
    });
    counts.set(level, (counts.get(level) ?? 0) + 1);
  }

  const total = [...counts.values()].reduce((s, n) => s + n, 0);

  return (Object.keys(MASTERY_COLORS) as MasteryLevel[]).map((level) => {
    const count = counts.get(level) ?? 0;
    return {
      level,
      label: masteryLevelLabel(level),
      count,
      percentage: total === 0 ? 0 : Math.round((count / total) * 100),
      color: MASTERY_COLORS[level],
    };
  });
}

export function computeMasteredOverTime(
  attempts: ReadonlyArray<AttemptRow>,
  progressRows: ReadonlyArray<ProgressRow>,
  period: DashboardPeriod,
  now = new Date(),
): MasteredWordsPoint[] {
  const masteredEvents = new Map<string, string>();

  for (const attempt of scheduledAttempts(attempts)) {
    if (!attempt.is_correct) continue;
    const before = attempt.repetition_count_before ?? 0;
    if (before >= MASTERED_REPETITION_THRESHOLD - 1) {
      const date = toLocalDateKey(new Date(attempt.created_at));
      if (!masteredEvents.has(attempt.exercise_id)) {
        masteredEvents.set(attempt.exercise_id, date);
      }
    }
  }

  for (const row of progressRows) {
    if (row.is_suspended) continue;
    if (row.repetition_count >= MASTERED_REPETITION_THRESHOLD) {
      if (!masteredEvents.has(row.exercise_id)) {
        masteredEvents.set(
          row.exercise_id,
          row.last_reviewed_at
            ? toLocalDateKey(new Date(row.last_reviewed_at))
            : toLocalDateKey(now),
        );
      }
    }
  }

  const start = periodStartDate(period, now) ?? new Date(now.getTime() - 89 * 86400000);
  const dates: string[] = [];
  const cursor = new Date(start);
  cursor.setHours(0, 0, 0, 0);
  const end = new Date(now);
  end.setHours(0, 0, 0, 0);

  while (cursor <= end) {
    dates.push(toLocalDateKey(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }

  const eventsByDate = new Map<string, number>();
  for (const date of masteredEvents.values()) {
    eventsByDate.set(date, (eventsByDate.get(date) ?? 0) + 1);
  }

  let cumulative = 0;
  const beforePeriod = [...masteredEvents.entries()].filter(([, d]) => d < dates[0]).length;
  cumulative = beforePeriod;

  return dates.map((date) => {
    cumulative += eventsByDate.get(date) ?? 0;
    return {
      date,
      masteredWordsCount: cumulative,
      knownWordsCount: cumulative,
      totalWordsCount: progressRows.filter((r) => !r.is_suspended).length,
    };
  });
}

export function computeStudyHeatmap(
  attempts: ReadonlyArray<AttemptRow>,
  days = 90,
  now = new Date(),
): StudyDay[] {
  const start = new Date(now);
  start.setDate(start.getDate() - (days - 1));
  start.setHours(0, 0, 0, 0);

  const buckets = new Map<string, { total: number; correct: number }>();
  for (const attempt of attempts) {
    const at = new Date(attempt.created_at);
    if (at < start) continue;
    const key = toLocalDateKey(at);
    const bucket = buckets.get(key) ?? { total: 0, correct: 0 };
    bucket.total += 1;
    if (attempt.is_correct) bucket.correct += 1;
    buckets.set(key, bucket);
  }

  const out: StudyDay[] = [];
  const cursor = new Date(start);
  const end = new Date(now);
  end.setHours(0, 0, 0, 0);

  while (cursor <= end) {
    const key = toLocalDateKey(cursor);
    const bucket = buckets.get(key);
    out.push({
      date: key,
      reviewCount: bucket?.total ?? 0,
      accuracy:
        bucket && bucket.total > 0
          ? Math.round((bucket.correct / bucket.total) * 100)
          : null,
    });
    cursor.setDate(cursor.getDate() + 1);
  }

  return out;
}

function computeStreaks(heatmap: ReadonlyArray<StudyDay>): {
  current: number;
  longest: number;
  activeLast30: number;
} {
  let current = 0;
  for (let i = heatmap.length - 1; i >= 0; i--) {
    if (heatmap[i].reviewCount > 0) current += 1;
    else break;
  }

  let longest = 0;
  let run = 0;
  for (const day of heatmap) {
    if (day.reviewCount > 0) {
      run += 1;
      longest = Math.max(longest, run);
    } else {
      run = 0;
    }
  }

  const last30 = heatmap.slice(-30);
  const activeLast30 = last30.filter((d) => d.reviewCount > 0).length;

  return { current, longest, activeLast30 };
}

export function computeWorkloadForecast(
  progressRows: ReadonlyArray<ProgressRow>,
  days = 30,
  now = new Date(),
): WorkloadDay[] {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + days - 1);
  end.setHours(23, 59, 59, 999);

  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);

  const buckets = new Map<string, { scheduled: number; overdue: number }>();

  const cursor = new Date(start);
  while (cursor <= end) {
    buckets.set(toLocalDateKey(cursor), { scheduled: 0, overdue: 0 });
    cursor.setDate(cursor.getDate() + 1);
  }

  for (const row of progressRows) {
    if (row.is_suspended) continue;
    const due = new Date(row.next_review_at);
    if (due > end) continue;

    const key = toLocalDateKey(due);
    if (!buckets.has(key)) continue;

    const bucket = buckets.get(key)!;
    bucket.scheduled += 1;
    if (due < todayStart) bucket.overdue += 1;
    buckets.set(key, bucket);
  }

  return [...buckets.entries()].map(([date, bucket]) => ({
    date,
    scheduledReviewCount: bucket.scheduled,
    overdueCount: bucket.overdue,
  }));
}

export function rankHardestWords(
  attempts: ReadonlyArray<AttemptRow>,
  progressRows: ReadonlyArray<ProgressRow>,
  period: DashboardPeriod,
  limit = 10,
  now = new Date(),
): HardWordRow[] {
  const filtered = filterAttemptsByPeriod(attempts, period, now);
  const progressByExercise = new Map(progressRows.map((r) => [r.exercise_id, r]));

  const buckets = new Map<
    string,
    {
      word: string;
      translation: string;
      topic: string | null;
      mistakes: number;
      total: number;
      responseSum: number;
      responseCount: number;
    }
  >();

  for (const attempt of filtered) {
    const existing = buckets.get(attempt.exercise_id);
    const word = attempt.exercises?.source_text ?? "";
    const translation = attempt.exercises?.target_text ?? "";
    const topic = attempt.exercises?.topic ?? null;

    if (existing) {
      existing.total += 1;
      if (!attempt.is_correct) existing.mistakes += 1;
      if (attempt.response_time_ms != null) {
        existing.responseSum += attempt.response_time_ms;
        existing.responseCount += 1;
      }
      continue;
    }

    buckets.set(attempt.exercise_id, {
      word,
      translation,
      topic,
      mistakes: attempt.is_correct ? 0 : 1,
      total: 1,
      responseSum: attempt.response_time_ms ?? 0,
      responseCount: attempt.response_time_ms != null ? 1 : 0,
    });
  }

  const rows = [...buckets.entries()].map(([exerciseId, bucket]) => {
    const progress = progressByExercise.get(exerciseId);
    const masteryScore = progress
      ? averageMasteryScore([
          {
            repetitionCount: progress.repetition_count,
            intervalDays: progress.interval_days,
            lastReviewedAt: progress.last_reviewed_at
              ? new Date(progress.last_reviewed_at)
              : null,
            hasProgressRow: true,
          },
        ])
      : 0;

    const errorRate = bucket.total === 0 ? 0 : bucket.mistakes / bucket.total;
    const avgResponse =
      bucket.responseCount === 0 ? null : bucket.responseSum / bucket.responseCount;

    const difficultyScore =
      errorRate * 0.45 +
      (avgResponse ? Math.min(avgResponse / 15000, 1) * 0.25 : 0) +
      (100 - masteryScore) * 0.003;

    return {
      row: {
        exerciseId,
        word: bucket.word,
        translation: bucket.translation,
        topic: bucket.topic,
        mistakeCount: bucket.mistakes,
        reviewCount: bucket.total,
        errorRate,
        averageResponseTimeMs: avgResponse,
        masteryScore,
      } satisfies HardWordRow,
      difficultyScore,
    };
  });

  return rows
    .sort((a, b) => {
      if (b.difficultyScore !== a.difficultyScore) {
        return b.difficultyScore - a.difficultyScore;
      }
      if (b.row.errorRate !== a.row.errorRate) return b.row.errorRate - a.row.errorRate;
      return b.row.mistakeCount - a.row.mistakeCount;
    })
    .slice(0, limit)
    .map((entry) => entry.row);
}

export function computePracticeTypePerformance(
  attempts: ReadonlyArray<AttemptRow>,
  period: DashboardPeriod,
  now = new Date(),
): PracticeTypeBar[] {
  const filtered = filterAttemptsByPeriod(attempts, period, now);
  const buckets = new Map<
    string,
    {
      label: string;
      correct: number;
      total: number;
      scheduledCorrect: number;
      scheduledTotal: number;
      responseSum: number;
      responseCount: number;
    }
  >();

  for (const attempt of filtered) {
    if (!attempt.practice_type) continue;
    const key = `${attempt.practice_type}|${attempt.direction ?? ""}|${attempt.typing_mode ?? ""}`;
    const label = practiceTypeLabel(
      attempt.practice_type,
      attempt.direction,
      attempt.typing_mode,
    );
    const bucket = buckets.get(key) ?? {
      label,
      correct: 0,
      total: 0,
      scheduledCorrect: 0,
      scheduledTotal: 0,
      responseSum: 0,
      responseCount: 0,
    };
    bucket.total += 1;
    if (attempt.is_correct) bucket.correct += 1;
    if (attempt.is_scheduled_review) {
      bucket.scheduledTotal += 1;
      if (attempt.is_correct) bucket.scheduledCorrect += 1;
    }
    if (attempt.response_time_ms != null) {
      bucket.responseSum += attempt.response_time_ms;
      bucket.responseCount += 1;
    }
    buckets.set(key, bucket);
  }

  return [...buckets.values()]
    .map((bucket) => ({
      practiceType: bucket.label,
      label: bucket.label,
      accuracy: bucket.total === 0 ? 0 : Math.round((bucket.correct / bucket.total) * 100),
      retention:
        bucket.scheduledTotal === 0
          ? null
          : Math.round((bucket.scheduledCorrect / bucket.scheduledTotal) * 100),
      reviewCount: bucket.total,
      averageResponseTimeMs:
        bucket.responseCount === 0 ? null : Math.round(bucket.responseSum / bucket.responseCount),
    }))
    .sort((a, b) => a.accuracy - b.accuracy);
}

export function computeKpis(
  attempts: ReadonlyArray<AttemptRow>,
  progressRows: ReadonlyArray<ProgressRow>,
  workload: ReadonlyArray<WorkloadDay>,
  heatmap: ReadonlyArray<StudyDay>,
  retentionSeries: ReadonlyArray<RetentionPoint>,
  masteredSeries: ReadonlyArray<MasteredWordsPoint>,
  now = new Date(),
): DashboardKpis {
  const streaks = computeStreaks(heatmap);
  const masteredNow =
    masteredSeries.length > 0
      ? masteredSeries[masteredSeries.length - 1].masteredWordsCount
      : progressRows.filter(
          (r) => !r.is_suspended && r.repetition_count >= MASTERED_REPETITION_THRESHOLD,
        ).length;

  const weekAgo = masteredSeries.length > 7 ? masteredSeries[masteredSeries.length - 8] : null;
  const masteredDelta = weekAgo
    ? masteredNow - weekAgo.masteredWordsCount
    : 0;

  const lastRetention30 =
    [...retentionSeries].reverse().find((p) => p.retention30d != null)?.retention30d ?? null;

  const reviewsNext7 = workload
    .slice(0, 7)
    .reduce((sum, day) => sum + day.scheduledReviewCount, 0);

  const masteryInputs = progressRows
    .filter((r) => !r.is_suspended)
    .map((r) => ({
      repetitionCount: r.repetition_count,
      intervalDays: r.interval_days,
      lastReviewedAt: r.last_reviewed_at ? new Date(r.last_reviewed_at) : null,
      hasProgressRow: true,
    }));

  return {
    retention30d: lastRetention30,
    masteredWords: masteredNow,
    masteredWordsDeltaWeek: masteredDelta,
    averageMasteryScore: averageMasteryScore(masteryInputs),
    reviewsNext7Days: reviewsNext7,
    activeDaysLast30: streaks.activeLast30,
    activeDaysTotal30: 30,
    currentStreak: streaks.current,
    longestStreak: streaks.longest,
  };
}

export function generateInsights(
  retentionByInterval: ReadonlyArray<IntervalRetentionBar>,
  practiceTypes: ReadonlyArray<PracticeTypeBar>,
  workload: ReadonlyArray<WorkloadDay>,
): string[] {
  const insights: string[] = [];

  const weakInterval = [...retentionByInterval]
    .filter((b) => b.reviewCount >= 3 && b.retentionPercentage != null)
    .sort((a, b) => (a.retentionPercentage ?? 100) - (b.retentionPercentage ?? 100))[0];

  if (weakInterval && (weakInterval.retentionPercentage ?? 100) < 80) {
    insights.push(
      `Je retentie daalt rond het ${weakInterval.intervalLabel}-interval (${weakInterval.retentionPercentage}%).`,
    );
  }

  if (practiceTypes.length >= 2) {
    const best = [...practiceTypes].sort((a, b) => b.accuracy - a.accuracy)[0];
    const worst = [...practiceTypes].sort((a, b) => a.accuracy - b.accuracy)[0];
    if (best.label !== worst.label && best.accuracy - worst.accuracy >= 10) {
      insights.push(
        `${best.label} gaat sterk (${best.accuracy}%), maar ${worst.label} blijft achter (${worst.accuracy}%).`,
      );
    }
  }

  const peak = [...workload].sort(
    (a, b) => b.scheduledReviewCount - a.scheduledReviewCount,
  )[0];
  if (peak && peak.scheduledReviewCount >= 20) {
    insights.push(
      `Je workload piekt op ${peak.date} met ${peak.scheduledReviewCount} geplande reviews.`,
    );
  }

  return insights;
}

export function buildDashboardStats(
  attempts: ReadonlyArray<AttemptRow>,
  progressRows: ReadonlyArray<ProgressRow>,
  period: DashboardPeriod,
  now = new Date(),
): DashboardStatsResponse {
  const trackedIds = new Set<string>();
  const masteryDistribution = computeMasteryDistribution(progressRows, trackedIds);
  const masteredOverTime = computeMasteredOverTime(attempts, progressRows, period, now);
  const retentionOverTime = computeRetentionOverTime(attempts, period, now);
  const retentionByInterval = computeRetentionByInterval(attempts, period, now);
  const studyHeatmap = computeStudyHeatmap(attempts, 90, now);
  const workloadForecast = computeWorkloadForecast(progressRows, 30, now);
  const hardestWords = rankHardestWords(attempts, progressRows, period, 10, now);
  const performanceByPracticeType = computePracticeTypePerformance(attempts, period, now);
  const kpis = computeKpis(
    attempts,
    progressRows,
    workloadForecast,
    studyHeatmap,
    retentionOverTime,
    masteredOverTime,
    now,
  );
  const insights = generateInsights(
    retentionByInterval,
    performanceByPracticeType,
    workloadForecast,
  );

  return {
    period,
    kpis,
    masteredOverTime,
    retentionOverTime,
    retentionByInterval,
    masteryDistribution,
    studyHeatmap,
    workloadForecast,
    hardestWords,
    performanceByPracticeType,
    insights,
  };
}
