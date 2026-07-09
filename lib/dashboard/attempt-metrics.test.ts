import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  computeAccuracySummary,
  filterAttemptsByPeriod,
} from "@/lib/dashboard/attempt-metrics";

const NOW = new Date("2026-07-09T12:00:00.000Z");

function makeAttempt(daysAgo: number, isCorrect: boolean) {
  const createdAt = new Date(NOW.getTime() - daysAgo * 24 * 60 * 60 * 1000);
  return {
    created_at: createdAt.toISOString(),
    is_correct: isCorrect,
  };
}

describe("filterAttemptsByPeriod", () => {
  const attempts = [
    makeAttempt(0, true),
    makeAttempt(0, false),
    makeAttempt(1, true),
    makeAttempt(6, true),
    makeAttempt(7, false),
    makeAttempt(30, true),
    makeAttempt(200, false),
  ];

  it("filtert alleen vandaag", () => {
    const filtered = filterAttemptsByPeriod(attempts, "today", NOW);
    assert.equal(filtered.length, 2);
    assert.ok(filtered.every((attempt) => attempt.is_correct || !attempt.is_correct));
  });

  it("neemt de oudste dag binnen 7 dagen mee", () => {
    const filtered = filterAttemptsByPeriod(attempts, "7d", NOW);
    assert.equal(filtered.length, 4);
    assert.ok(filtered.some((attempt) => attempt.created_at === attempts[3]?.created_at));
  });

  it("sluit dagen buiten 7 dagen uit", () => {
    const filtered = filterAttemptsByPeriod(attempts, "7d", NOW);
    assert.ok(!filtered.some((attempt) => attempt.created_at === attempts[4]?.created_at));
  });

  it("geeft lege set terug wanneer er geen data in het venster zit", () => {
    const filtered = filterAttemptsByPeriod([makeAttempt(400, true)], "30d", NOW);
    assert.equal(filtered.length, 0);
  });

  it("retourneert alles bij all", () => {
    const filtered = filterAttemptsByPeriod(attempts, "all", NOW);
    assert.equal(filtered.length, attempts.length);
  });
});

describe("computeAccuracySummary", () => {
  it("berekent nauwkeurigheid uit snapshots", () => {
    const summary = computeAccuracySummary([
      { is_correct: true },
      { is_correct: true },
      { is_correct: false },
    ]);

    assert.equal(summary.correct, 2);
    assert.equal(summary.incorrect, 1);
    assert.equal(summary.total, 3);
    assert.equal(summary.accuracyPct, 67);
  });
});
