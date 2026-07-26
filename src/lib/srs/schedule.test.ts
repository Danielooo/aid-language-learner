import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { isSrsExerciseDue } from "@/lib/srs/due-exercises";
import {
  createNewSrsCard,
  isInRelearning,
  reviewSrsCard,
} from "@/lib/srs/schedule";

describe("isSrsExerciseDue", () => {
  const now = new Date("2026-07-09T12:00:00.000Z");

  it("behandelt oefeningen zonder progress als due", () => {
    assert.equal(isSrsExerciseDue(undefined, now), true);
  });

  it("sluit geschorste oefeningen uit", () => {
    assert.equal(
      isSrsExerciseDue(
        {
          nextReviewAt: new Date("2026-07-09T11:00:00.000Z"),
          isSuspended: true,
        },
        now,
      ),
      false,
    );
  });

  it("telt due progress mee", () => {
    assert.equal(
      isSrsExerciseDue(
        {
          nextReviewAt: new Date("2026-07-09T11:00:00.000Z"),
          isSuspended: false,
        },
        now,
      ),
      true,
    );
  });

  it("sluit toekomstige reviews uit", () => {
    assert.equal(
      isSrsExerciseDue(
        {
          nextReviewAt: new Date("2026-07-09T13:00:00.000Z"),
          isSuspended: false,
        },
        now,
      ),
      false,
    );
  });
});

describe("reviewSrsCard", () => {
  it("houdt een nieuwe kaart na fout meteen due", () => {
    const before = createNewSrsCard();
    const after = reviewSrsCard(before, false);

    assert.equal(after.repetitionCount, 0);
    assert.equal(after.intervalDays, 0);
    assert.equal(after.nextReviewAt.getTime(), after.lastReviewedAt?.getTime());
  });

  it("houdt een kaart op stap 2 na fout meteen due", () => {
    const before = {
      ...createNewSrsCard(),
      repetitionCount: 2,
      intervalDays: 0,
      nextReviewAt: new Date("2026-07-09T14:00:00.000Z"),
      lastReviewedAt: new Date("2026-07-09T12:00:00.000Z"),
    };

    const after = reviewSrsCard(before, false);

    assert.equal(after.repetitionCount, 2);
    assert.equal(after.intervalDays, 0);
    assert.equal(after.nextReviewAt.getTime(), after.lastReviewedAt?.getTime());
    assert.equal(
      isInRelearning({
        repetitionCount: after.repetitionCount,
        intervalDays: after.intervalDays,
        lastReviewedAt: after.lastReviewedAt,
        nextReviewAt: after.nextReviewAt,
      }),
      true,
    );
  });

  it("plant het eerste goede antwoord na 15 minuten", () => {
    const before = createNewSrsCard();
    const after = reviewSrsCard(before, true);

    assert.equal(after.repetitionCount, 1);
    const diffMinutes =
      (after.nextReviewAt.getTime() - (after.lastReviewedAt?.getTime() ?? 0)) /
      (1000 * 60);
    assert.equal(diffMinutes, 15);
  });
});
