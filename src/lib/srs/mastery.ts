import type { SrsCardState } from "@/lib/srs/schedule";

export const MASTERY_LEVELS = [
  "nieuw",
  "aan-het-leren",
  "zwak",
  "bekend",
  "sterk",
  "beheerst",
] as const;

export type MasteryLevel = (typeof MASTERY_LEVELS)[number];

export const MASTERED_REPETITION_THRESHOLD = 9;

export type MasteryInput = Pick<
  SrsCardState,
  "repetitionCount" | "intervalDays" | "lastReviewedAt"
> & {
  /** Of er een exercise_progress-rij bestaat. */
  hasProgressRow?: boolean;
};

const MASTERY_SCORES: Record<MasteryLevel, number> = {
  nieuw: 0,
  "aan-het-leren": 25,
  zwak: 35,
  bekend: 55,
  sterk: 75,
  beheerst: 100,
};

/** Bepaalt mastery-niveau op basis van SRS-ladderpositie. */
export function getMasteryLevel(input: MasteryInput): MasteryLevel {
  const {
    repetitionCount,
    intervalDays,
    lastReviewedAt,
    hasProgressRow = true,
  } = input;

  if (!hasProgressRow || (repetitionCount === 0 && !lastReviewedAt)) {
    return "nieuw";
  }

  if (
    intervalDays === 0 &&
    lastReviewedAt &&
    Date.now() - lastReviewedAt.getTime() < 7 * 24 * 60 * 60 * 1000
  ) {
    return "zwak";
  }

  if (repetitionCount >= MASTERED_REPETITION_THRESHOLD) return "beheerst";
  if (repetitionCount >= 7) return "sterk";
  if (repetitionCount >= 4) return "bekend";
  if (repetitionCount >= 1) return "aan-het-leren";

  return "nieuw";
}

export function isMastered(input: MasteryInput): boolean {
  return getMasteryLevel(input) === "beheerst";
}

export function masteryScoreForLevel(level: MasteryLevel): number {
  return MASTERY_SCORES[level];
}

export function averageMasteryScore(
  inputs: ReadonlyArray<MasteryInput>,
): number {
  if (inputs.length === 0) return 0;
  const total = inputs.reduce(
    (sum, input) => sum + masteryScoreForLevel(getMasteryLevel(input)),
    0,
  );
  return Math.round(total / inputs.length);
}

export function masteryLevelLabel(level: MasteryLevel): string {
  switch (level) {
    case "nieuw":
      return "Nieuw";
    case "aan-het-leren":
      return "Aan het leren";
    case "zwak":
      return "Zwak";
    case "bekend":
      return "Bekend";
    case "sterk":
      return "Sterk";
    case "beheerst":
      return "Beheerst";
  }
}
