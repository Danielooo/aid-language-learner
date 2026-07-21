import { computeStreakDays, toDayKey } from "@/lib/dashboard/streak";

import type { AccuracySummary, ActivityDay, AttemptRow } from "./types";

const DAY_MS = 24 * 60 * 60 * 1000;

export const ACTIVITY_CALENDAR_DAYS = 120;
export const ACTIVITY_ACCURACY_MIN_ATTEMPTS = 10;

type DayBucket = {
  count: number;
  correct: number;
};

function toAccuracyPct(count: number, correct: number): number | null {
  if (count < ACTIVITY_ACCURACY_MIN_ATTEMPTS) return null;
  return Math.round((correct / count) * 100);
}

const EMPTY_ACCURACY: AccuracySummary = {
  correct: 0,
  incorrect: 0,
  total: 0,
  accuracyPct: 0,
};

/** Tel pogingen per kalenderdag (Europe/Amsterdam) en vul lege dagen met 0. */
export function computeActivityDays(
  attempts: ReadonlyArray<AttemptRow>,
  days: number,
  now: Date = new Date(),
): ActivityDay[] {
  const buckets = new Map<string, DayBucket>();
  for (const attempt of attempts) {
    const key = toDayKey(new Date(attempt.created_at));
    const bucket = buckets.get(key) ?? { count: 0, correct: 0 };
    bucket.count += 1;
    if (attempt.is_correct) bucket.correct += 1;
    buckets.set(key, bucket);
  }

  const out: ActivityDay[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now.getTime() - i * DAY_MS);
    const day = toDayKey(d);
    const bucket = buckets.get(day) ?? { count: 0, correct: 0 };
    const incorrect = bucket.count - bucket.correct;
    out.push({
      day,
      count: bucket.count,
      correct: bucket.correct,
      incorrect,
      accuracyPct: toAccuracyPct(bucket.count, bucket.correct),
    });
  }
  return out;
}

export type AccuracyPeriod = "today" | "7d" | "30d" | "180d" | "all";

export const ACCURACY_PERIOD_OPTIONS: ReadonlyArray<{
  value: AccuracyPeriod;
  label: string;
  emptyTitle: string;
  emptyMessage: string;
}> = [
  {
    value: "today",
    label: "Vandaag",
    emptyTitle: "Geen pogingen vandaag",
    emptyMessage: "Maak vandaag oefeningen om je nauwkeurigheid hier te zien.",
  },
  {
    value: "7d",
    label: "7 dagen",
    emptyTitle: "Geen pogingen in 7 dagen",
    emptyMessage: "Er zijn geen oefenpogingen in de laatste 7 dagen.",
  },
  {
    value: "30d",
    label: "30 dagen",
    emptyTitle: "Geen pogingen in 30 dagen",
    emptyMessage: "Er zijn geen oefenpogingen in de laatste 30 dagen.",
  },
  {
    value: "180d",
    label: "6 mnd",
    emptyTitle: "Geen pogingen in 6 maanden",
    emptyMessage: "Er zijn geen oefenpogingen in de laatste 6 maanden.",
  },
  {
    value: "all",
    label: "Altijd",
    emptyTitle: "Nog geen oefenpogingen",
    emptyMessage: "Maak oefeningen om hier je nauwkeurigheid te zien.",
  },
];

export function getAccuracyPeriodLabel(period: AccuracyPeriod): string {
  return ACCURACY_PERIOD_OPTIONS.find((option) => option.value === period)?.label ?? "Altijd";
}

function getCutoffDayKey(days: number, now: Date): string {
  return toDayKey(new Date(now.getTime() - (days - 1) * DAY_MS));
}

/** Filter pogingen op rollend venster (kalenderdagen in Europe/Amsterdam). */
export function filterAttemptsByPeriod<T extends Pick<AttemptRow, "created_at">>(
  attempts: ReadonlyArray<T>,
  period: AccuracyPeriod,
  now: Date = new Date(),
): T[] {
  if (period === "all") return [...attempts];

  if (period === "today") {
    const todayKey = toDayKey(now);
    return attempts.filter(
      (attempt) => toDayKey(new Date(attempt.created_at)) === todayKey,
    );
  }

  const days = period === "7d" ? 7 : period === "30d" ? 30 : 180;
  const cutoff = getCutoffDayKey(days, now);
  return attempts.filter(
    (attempt) => toDayKey(new Date(attempt.created_at)) >= cutoff,
  );
}

export function computeAccuracySummary(
  attempts: ReadonlyArray<Pick<AttemptRow, "is_correct">>,
): AccuracySummary {
  if (attempts.length === 0) return EMPTY_ACCURACY;

  const correct = attempts.reduce((n, a) => n + (a.is_correct ? 1 : 0), 0);
  const total = attempts.length;
  const incorrect = total - correct;

  return {
    correct,
    incorrect,
    total,
    accuracyPct: Math.round((correct / total) * 100),
  };
}

export function computeAttemptStreakDays(
  attempts: ReadonlyArray<AttemptRow>,
  now: Date = new Date(),
): number {
  const dayKeys = new Set<string>();
  for (const attempt of attempts) {
    dayKeys.add(toDayKey(new Date(attempt.created_at)));
  }
  return computeStreakDays(dayKeys, now);
}
