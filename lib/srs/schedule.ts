/**
 * Vast SRS-stappenplan met relearning bij fout.
 * `repetitionCount` = positie op de hoofdladder (stijgt alleen bij goed antwoord).
 */

export type SrsCardState = {
  easeFactor: number;
  intervalDays: number;
  repetitionCount: number;
  nextReviewAt: Date;
  lastReviewedAt: Date | null;
  isSuspended: boolean;
};

export const SRS_DEFAULT_EASE = 2.5;
export const SRS_TIMEZONE = "Europe/Amsterdam";
export const SRS_EVENING_HOUR = 20;

/** Pauze na fout voordat de oefening opnieuw due is (midden van 1–5 min). */
export const SRS_RELEARNING_MINUTES = 2;

export type SrsGuideGroup = "first-day" | "later" | "relearning";

export type SrsGuideEntry = {
  group: SrsGuideGroup;
  label: string;
  description: string;
};

export const SRS_INTERVAL_GUIDE: readonly SrsGuideEntry[] = [
  {
    group: "first-day",
    label: "Direct leren",
    description: "oefening verschijnt zodra hij in je herhaalschema staat",
  },
  {
    group: "first-day",
    label: "1× goed",
    description: "volgende herhaling na 15 minuten (binnen 10–20 min)",
  },
  {
    group: "first-day",
    label: "2× goed",
    description: "volgende herhaling na 2 uur (binnen 1–3 uur)",
  },
  {
    group: "first-day",
    label: "3× goed",
    description: "volgende herhaling om 20:00 (Europe/Amsterdam)",
  },
  {
    group: "later",
    label: "4× goed",
    description: "na 1 dag",
  },
  {
    group: "later",
    label: "5× goed",
    description: "na 3 dagen",
  },
  {
    group: "later",
    label: "6× goed",
    description: "na 7 dagen",
  },
  {
    group: "later",
    label: "7× goed",
    description: "na 14 dagen",
  },
  {
    group: "later",
    label: "8× goed",
    description: "na 30 dagen",
  },
  {
    group: "later",
    label: "9× goed",
    description: "na 90 dagen",
  },
  {
    group: "later",
    label: "10× goed of meer",
    description: "na 6 maanden, daarna telkens opnieuw na 6 maanden",
  },
  {
    group: "relearning",
    label: "Fout",
    description:
      "bekijk het juiste antwoord; dezelfde oefening komt over ~2 minuten terug. Pas bij een goed antwoord ga je door naar het volgende interval",
  },
];

export function createNewSrsCard(): SrsCardState {
  return {
    easeFactor: SRS_DEFAULT_EASE,
    intervalDays: 0,
    repetitionCount: 0,
    nextReviewAt: new Date(),
    lastReviewedAt: null,
    isSuspended: false,
  };
}

function addMinutes(date: Date, minutes: number): Date {
  const result = new Date(date);
  result.setMinutes(result.getMinutes() + minutes);
  return result;
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function addMonths(date: Date, months: number): Date {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
}

/** Volgende herhaling om 20:00 Amsterdam; na 20:00 → morgen 20:00. */
export function getEveningReviewAt(from: Date): Date {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: SRS_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(from);

  const get = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((p) => p.type === type)?.value ?? 0);

  const year = get("year");
  const month = get("month");
  const day = get("day");
  const hour = get("hour");

  let targetDay = day;
  if (hour >= SRS_EVENING_HOUR) {
    targetDay += 1;
  }

  // Bouw een UTC-timestamp die overeenkomt met 20:00 in Amsterdam op targetDay.
  const guess = new Date(Date.UTC(year, month - 1, targetDay, 12, 0, 0));
  const amsterdamHour = Number(
    new Intl.DateTimeFormat("en-US", {
      timeZone: SRS_TIMEZONE,
      hour: "2-digit",
      hour12: false,
    }).format(guess),
  );
  const offsetHours = 12 - amsterdamHour;
  const result = new Date(guess);
  result.setUTCHours(result.getUTCHours() + offsetHours + SRS_EVENING_HOUR);
  return result;
}

/** Berekent `next_review_at` na een goed antwoord dat de ladder omhoog brengt. */
function scheduleAfterSuccess(stepAfterIncrement: number, from: Date): Date {
  switch (stepAfterIncrement) {
    case 1:
      return addMinutes(from, 15);
    case 2:
      return addMinutes(from, 120);
    case 3:
      return getEveningReviewAt(from);
    case 4:
      return addDays(from, 1);
    case 5:
      return addDays(from, 3);
    case 6:
      return addDays(from, 7);
    case 7:
      return addDays(from, 14);
    case 8:
      return addDays(from, 30);
    case 9:
      return addDays(from, 90);
  }
  return addMonths(from, 6);
}

function deriveIntervalDays(from: Date, nextReviewAt: Date): number {
  const diffMs = nextReviewAt.getTime() - from.getTime();
  return Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
}

/**
 * Werkt de kaartstatus bij na een review.
 * Fout → relearning (+2 min, stap blijft). Goed → stap +1 en hoofdinterval.
 */
export function reviewSrsCard(
  state: SrsCardState,
  isCorrect: boolean,
): SrsCardState {
  const now = new Date();

  if (!isCorrect) {
    const nextReviewAt = addMinutes(now, SRS_RELEARNING_MINUTES);
    return {
      ...state,
      intervalDays: 0,
      nextReviewAt,
      lastReviewedAt: now,
    };
  }

  const nextStep = state.repetitionCount + 1;
  const nextReviewAt = scheduleAfterSuccess(nextStep, now);

  return {
    ...state,
    repetitionCount: nextStep,
    intervalDays: deriveIntervalDays(now, nextReviewAt),
    nextReviewAt,
    lastReviewedAt: now,
  };
}
