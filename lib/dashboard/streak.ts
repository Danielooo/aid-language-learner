// Dagelijkse streak-berekening voor de Vandaag-pagina. Dagen worden
// bepaald in Europe/Amsterdam — dezelfde tijdzone als het SRS-schema.

const TIME_ZONE = "Europe/Amsterdam";
const DAY_MS = 24 * 60 * 60 * 1000;

const dayFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** ISO-achtige dagsleutel (YYYY-MM-DD) in Europe/Amsterdam. */
export function toDayKey(date: Date): string {
  return dayFormatter.format(date);
}

/**
 * Aaneengesloten dagen met ≥1 quiz-poging, terugtellend vanaf vandaag.
 * Een streak telt ook door als vandaag nog niet geoefend is maar
 * gisteren wel (je hebt vandaag nog de tijd om 'm te verlengen).
 */
export function computeStreakDays(
  attemptDayKeys: Set<string>,
  now: Date,
): number {
  const todayKey = toDayKey(now);
  const yesterdayKey = toDayKey(new Date(now.getTime() - DAY_MS));

  let anchor: Date;
  if (attemptDayKeys.has(todayKey)) {
    anchor = now;
  } else if (attemptDayKeys.has(yesterdayKey)) {
    anchor = new Date(now.getTime() - DAY_MS);
  } else {
    return 0;
  }

  let streak = 0;
  let cursor = anchor;
  while (attemptDayKeys.has(toDayKey(cursor))) {
    streak += 1;
    cursor = new Date(cursor.getTime() - DAY_MS);
  }
  return streak;
}
