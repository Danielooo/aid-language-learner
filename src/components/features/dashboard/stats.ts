import type { QuizAttempt } from "@/components/features/quiz/use-quiz-storage";

// Pure helpers, geen React, geen DOM. Houden we apart zodat ze
// later triviaal te testen zijn en hergebruikt kunnen worden zodra
// er een Supabase-bron bijkomt. Alle inputs zijn ReadonlyArray om
// per ongeluk muteren onmogelijk te maken.

const NO_TOPIC_LABEL = "(geen topic)";
// Onder dit aantal pogingen behandelen we een topic-accuracy als
// statistisch nietszeggend. Anders kleurt één foutje een topic
// meteen helemaal rood, wat de UX onbruikbaar maakt.
const MIN_ATTEMPTS_FOR_CONFIDENCE = 3;

export type Summary = {
  total: number;
  correct: number;
  incorrect: number;
  accuracyPct: number;
  uniqueExercises: number;
};

export type TopicStat = {
  topic: string;
  total: number;
  correct: number;
  accuracyPct: number;
  hasEnoughData: boolean;
};

export type WeakExercise = {
  exerciseId: string;
  source_text: string;
  target_text: string;
  topic: string | null;
  attempts: number;
  wrong: number;
};

export type DailyAccuracy = {
  date: string;
  total: number;
  correct: number;
  accuracyPct: number;
};

export function summarize(attempts: ReadonlyArray<QuizAttempt>): Summary {
  const total = attempts.length;
  const correct = attempts.reduce((n, a) => n + (a.isCorrect ? 1 : 0), 0);
  const incorrect = total - correct;
  const accuracyPct = total === 0 ? 0 : Math.round((correct / total) * 100);
  const uniqueExercises = new Set(attempts.map((a) => a.exerciseId)).size;
  return { total, correct, incorrect, accuracyPct, uniqueExercises };
}

export function byTopic(attempts: ReadonlyArray<QuizAttempt>): TopicStat[] {
  const buckets = new Map<string, { total: number; correct: number }>();
  for (const a of attempts) {
    const key = a.topic ?? NO_TOPIC_LABEL;
    const bucket = buckets.get(key) ?? { total: 0, correct: 0 };
    bucket.total += 1;
    if (a.isCorrect) bucket.correct += 1;
    buckets.set(key, bucket);
  }

  const stats: TopicStat[] = Array.from(buckets.entries()).map(
    ([topic, { total, correct }]) => ({
      topic,
      total,
      correct,
      accuracyPct: total === 0 ? 0 : Math.round((correct / total) * 100),
      hasEnoughData: total >= MIN_ATTEMPTS_FOR_CONFIDENCE,
    }),
  );

  // Zwakste topics bovenaan. Bij gelijke accuracy: meeste pogingen
  // eerst (meer signaal). Topics zonder genoeg data zakken naar onder
  // zodat ze de attention niet stelen.
  stats.sort((a, b) => {
    if (a.hasEnoughData !== b.hasEnoughData) return a.hasEnoughData ? -1 : 1;
    if (a.accuracyPct !== b.accuracyPct) return a.accuracyPct - b.accuracyPct;
    return b.total - a.total;
  });

  return stats;
}

export function weakExercises(
  attempts: ReadonlyArray<QuizAttempt>,
  limit = 5,
): WeakExercise[] {
  const buckets = new Map<string, WeakExercise>();
  for (const a of attempts) {
    const existing = buckets.get(a.exerciseId);
    if (existing) {
      existing.attempts += 1;
      if (!a.isCorrect) existing.wrong += 1;
      continue;
    }
    buckets.set(a.exerciseId, {
      exerciseId: a.exerciseId,
      source_text: a.source_text,
      target_text: a.target_text,
      topic: a.topic,
      attempts: 1,
      wrong: a.isCorrect ? 0 : 1,
    });
  }

  const list = Array.from(buckets.values()).filter((e) => e.wrong > 0);
  // Meest fout eerst; bij gelijkspel: vaakst geprobeerd (consistent
  // probleem) bovenaan.
  list.sort((a, b) => {
    if (b.wrong !== a.wrong) return b.wrong - a.wrong;
    return b.attempts - a.attempts;
  });
  return list.slice(0, limit);
}

export function dailyAccuracy(
  attempts: ReadonlyArray<QuizAttempt>,
  days = 7,
  now: Date = new Date(),
): DailyAccuracy[] {
  // We bucketen op kalenderdag in de lokale tijdzone van de browser.
  // Server-side draait dit niet (Dashboard is een client-component),
  // dus geen tz-mismatch te verwachten.
  const buckets = new Map<string, { total: number; correct: number }>();
  for (const a of attempts) {
    const key = toLocalDateKey(new Date(a.at));
    const bucket = buckets.get(key) ?? { total: 0, correct: 0 };
    bucket.total += 1;
    if (a.isCorrect) bucket.correct += 1;
    buckets.set(key, bucket);
  }

  // Lege dagen invullen zodat de bar-chart een vaste breedte heeft en
  // gaten visueel zichtbaar zijn ("die dag niet geoefend").
  const out: DailyAccuracy[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const key = toLocalDateKey(d);
    const bucket = buckets.get(key) ?? { total: 0, correct: 0 };
    out.push({
      date: key,
      total: bucket.total,
      correct: bucket.correct,
      accuracyPct:
        bucket.total === 0
          ? 0
          : Math.round((bucket.correct / bucket.total) * 100),
    });
  }
  return out;
}

function toLocalDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
