import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildDashboardStats,
  computeSrsStepDistribution,
  computeTopicProgress,
  computeUpcomingByDay,
} from "@/lib/dashboard/metrics";

import type { ExerciseTopicRow, ProgressRow } from "@/lib/dashboard/types";

const NOW = new Date("2026-07-09T12:00:00.000Z");

function makeRow(overrides: Partial<ProgressRow> & Pick<ProgressRow, "exercise_id">): ProgressRow {
  return {
    repetition_count: 0,
    interval_days: 0,
    last_reviewed_at: null,
    next_review_at: "2026-07-09T11:00:00.000Z",
    is_suspended: false,
    ...overrides,
  };
}

describe("computeSrsStepDistribution", () => {
  it("splitst due en wachten per stap", () => {
    const rows: ProgressRow[] = [
      makeRow({
        exercise_id: "due-step-3",
        repetition_count: 3,
        interval_days: 1,
        last_reviewed_at: "2026-07-09T10:00:00.000Z",
        next_review_at: "2026-07-09T11:00:00.000Z",
      }),
      makeRow({
        exercise_id: "waiting-step-3",
        repetition_count: 3,
        interval_days: 1,
        last_reviewed_at: "2026-07-09T10:00:00.000Z",
        next_review_at: "2026-07-10T12:00:00.000Z",
      }),
    ];

    const distribution = computeSrsStepDistribution(rows, NOW);
    const step3 = distribution.find((step) => step.stepIndex === 3);

    assert.ok(step3);
    assert.equal(step3.label, "3× goed");
    assert.equal(step3.dueCount, 1);
    assert.equal(step3.waitingCount, 1);
    assert.equal(step3.count, 2);
  });

  it("telt herkansing als due op de huidige stap", () => {
    const reviewedAt = "2026-07-09T11:30:00.000Z";
    const rows: ProgressRow[] = [
      makeRow({
        exercise_id: "relearning",
        repetition_count: 2,
        interval_days: 0,
        last_reviewed_at: reviewedAt,
        next_review_at: reviewedAt,
      }),
    ];

    const distribution = computeSrsStepDistribution(rows, NOW);
    const step2 = distribution.find((step) => step.stepIndex === 2);

    assert.ok(step2);
    assert.equal(step2.dueCount, 1);
    assert.equal(step2.waitingCount, 0);
    assert.equal(step2.count, 1);
  });

  it("houdt count gelijk aan dueCount + waitingCount per stap", () => {
    const rows: ProgressRow[] = [
      makeRow({ exercise_id: "a", repetition_count: 0 }),
      makeRow({
        exercise_id: "b",
        repetition_count: 5,
        interval_days: 3,
        last_reviewed_at: "2026-07-06T12:00:00.000Z",
        next_review_at: "2026-07-12T12:00:00.000Z",
      }),
      makeRow({
        exercise_id: "c",
        repetition_count: 8,
        interval_days: 30,
        last_reviewed_at: "2026-06-01T12:00:00.000Z",
        next_review_at: "2026-07-08T12:00:00.000Z",
      }),
    ];

    const distribution = computeSrsStepDistribution(rows, NOW);

    for (const step of distribution) {
      assert.equal(step.count, step.dueCount + step.waitingCount);
    }
  });

  it("sluit geschorste oefeningen uit", () => {
    const rows: ProgressRow[] = [
      makeRow({ exercise_id: "active", repetition_count: 1 }),
      makeRow({ exercise_id: "suspended", repetition_count: 1, is_suspended: true }),
    ];

    const distribution = computeSrsStepDistribution(rows, NOW);
    const total = distribution.reduce((sum, step) => sum + step.count, 0);

    assert.equal(total, 1);
  });

  it("gebruikt labels in de vorm 0× goed t/m 10× goed", () => {
    const distribution = computeSrsStepDistribution([], NOW);

    assert.equal(distribution.length, 11);
    assert.equal(distribution[0]?.label, "0× goed");
    assert.equal(distribution[10]?.label, "10× goed");
  });
});

describe("buildDashboardStats", () => {
  it("laat som van dueCount in de chart overeenkomen met dueNowCount", () => {
    const rows: ProgressRow[] = [
      makeRow({ exercise_id: "due-1", repetition_count: 1 }),
      makeRow({
        exercise_id: "waiting-1",
        repetition_count: 4,
        interval_days: 3,
        last_reviewed_at: "2026-07-07T12:00:00.000Z",
        next_review_at: "2026-07-15T12:00:00.000Z",
      }),
      makeRow({
        exercise_id: "relearning-2",
        repetition_count: 2,
        interval_days: 0,
        last_reviewed_at: "2026-07-09T11:45:00.000Z",
        next_review_at: "2026-07-09T11:45:00.000Z",
      }),
    ];

    const stats = buildDashboardStats(rows, [], NOW);
    const chartDueTotal = stats.srsStepDistribution.reduce(
      (sum, step) => sum + step.dueCount,
      0,
    );

    assert.equal(chartDueTotal, stats.dueNowCount);
  });

  it("telt masteredCount bij 9× goed of meer", () => {
    const rows: ProgressRow[] = [
      makeRow({ exercise_id: "a", repetition_count: 8 }),
      makeRow({
        exercise_id: "b",
        repetition_count: 9,
        interval_days: 90,
        last_reviewed_at: "2026-06-01T12:00:00.000Z",
        next_review_at: "2026-09-01T12:00:00.000Z",
      }),
      makeRow({
        exercise_id: "c",
        repetition_count: 10,
        interval_days: 180,
        last_reviewed_at: "2026-01-01T12:00:00.000Z",
        next_review_at: "2026-12-01T12:00:00.000Z",
      }),
    ];
    const exercises: ExerciseTopicRow[] = [
      { id: "a", topic: "A" },
      { id: "b", topic: "A" },
      { id: "c", topic: "A" },
    ];

    const stats = buildDashboardStats(rows, [], NOW, exercises);
    assert.equal(stats.masteredCount, 2);
    assert.equal(stats.totalExercises, 3);
  });
});

describe("computeTopicProgress", () => {
  it("berekent % klaar en status per topic, laagste % eerst", () => {
    const exercises: ExerciseTopicRow[] = [
      { id: "a1", topic: "Alpha" },
      { id: "a2", topic: "Alpha" },
      { id: "b1", topic: "Beta" },
      { id: "b2", topic: "Beta" },
      { id: "b3", topic: "Beta" },
    ];
    const rows: ProgressRow[] = [
      makeRow({
        exercise_id: "a1",
        repetition_count: 9,
        interval_days: 90,
        next_review_at: "2026-09-01T12:00:00.000Z",
      }),
      makeRow({
        exercise_id: "a2",
        repetition_count: 9,
        interval_days: 90,
        next_review_at: "2026-09-01T12:00:00.000Z",
      }),
      makeRow({ exercise_id: "b1", repetition_count: 9, next_review_at: "2026-09-01T12:00:00.000Z" }),
      makeRow({ exercise_id: "b2", repetition_count: 2 }),
      // b3 zonder progress
    ];

    const topics = computeTopicProgress(exercises, rows, NOW);

    assert.equal(topics[0]?.topic, "Beta");
    assert.equal(topics[0]?.masteredCount, 1);
    assert.equal(topics[0]?.totalCount, 3);
    assert.equal(topics[0]?.percentMastered, 33);
    assert.equal(topics[0]?.status, "bezig");
    assert.equal(topics[0]?.dueCount, 2);
    assert.deepEqual(topics[0]?.buckets, {
      nogNiet: 1,
      bezig: 1,
      gevorderd: 0,
      beheerst: 1,
    });

    assert.equal(topics[1]?.topic, "Alpha");
    assert.equal(topics[1]?.percentMastered, 100);
    assert.equal(topics[1]?.status, "beheerst");
    assert.deepEqual(topics[1]?.buckets, {
      nogNiet: 0,
      bezig: 0,
      gevorderd: 0,
      beheerst: 2,
    });
  });
});

describe("computeUpcomingByDay", () => {
  it("bundelt achterstallige reviews onder vandaag en geeft 7 dagen", () => {
    const exercises: ExerciseTopicRow[] = [
      { id: "overdue", topic: "A" },
      { id: "tomorrow", topic: "A" },
      { id: "fresh", topic: "A" },
    ];
    const rows: ProgressRow[] = [
      makeRow({
        exercise_id: "overdue",
        repetition_count: 4,
        next_review_at: "2026-07-01T12:00:00.000Z",
      }),
      makeRow({
        exercise_id: "tomorrow",
        repetition_count: 4,
        next_review_at: "2026-07-10T12:00:00.000Z",
      }),
      // fresh: geen progress → vandaag
    ];

    const upcoming = computeUpcomingByDay(exercises, rows, NOW);
    assert.equal(upcoming.length, 7);

    const today = upcoming.find((day) => day.label === "Vandaag");
    const tomorrow = upcoming.find((day) => day.label === "Morgen");

    assert.ok(today);
    assert.equal(today.count, 2);
    assert.ok(tomorrow);
    assert.equal(tomorrow.count, 1);
    assert.ok(upcoming.every((day) => typeof day.count === "number"));
  });
});
