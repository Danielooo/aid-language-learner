/**
 * Demo-oefendata voor dashboard, SRS en quiz-flows.
 * Wordt aangeroepen vanuit seed-users.ts voor testuser en dev-user.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

export const SEED_DEMO_TAG = "seed-demo";

const PUBLIC_TOPICS = [
  "restaurant",
  "luchthaven",
  "autogarage",
  "ijsjeszaak",
] as const;

const OWNED_TOPIC = "reis";

const OWNED_EXERCISES = [
  {
    source_text: "¿Tiene habitaciones disponibles para esta noche?",
    target_text: "Heeft u kamers beschikbaar voor vanavond?",
    tags: "seed-demo,reis,hotel,inchecken",
  },
  {
    source_text: "Quisiera reservar un billete de ida y vuelta.",
    target_text: "Ik zou graag een retourticket willen reserveren.",
    tags: "seed-demo,reis,trein,bestelling",
  },
  {
    source_text: "¿Dónde puedo cambiar dinero?",
    target_text: "Waar kan ik geld wisselen?",
    tags: "seed-demo,reis,geld,bank",
  },
] as const;

const PRACTICE_TYPES = ["flashcard", "typing", "sort"] as const;
const SELECTION_MODES = ["topic", "srs", "custom"] as const;
const DIRECTIONS = ["es-to-nl", "nl-to-es"] as const;

type AdminClient = SupabaseClient;

type ExerciseRow = {
  id: string;
  source_text: string;
  target_text: string;
  topic: string | null;
};

type ProgressSpec = {
  repetition_count: number;
  interval_days: number;
  next_review_offset_hours: number;
  last_reviewed_offset_hours: number | null;
  is_suspended?: boolean;
};

const PROGRESS_SPECS: ProgressSpec[] = [
  {
    repetition_count: 0,
    interval_days: 0,
    next_review_offset_hours: -2,
    last_reviewed_offset_hours: null,
  },
  {
    repetition_count: 1,
    interval_days: 0,
    next_review_offset_hours: -1,
    last_reviewed_offset_hours: -3,
  },
  {
    repetition_count: 2,
    interval_days: 0,
    next_review_offset_hours: -0.5,
    last_reviewed_offset_hours: -2,
  },
  {
    repetition_count: 3,
    interval_days: 1,
    next_review_offset_hours: 24,
    last_reviewed_offset_hours: -4,
  },
  {
    repetition_count: 4,
    interval_days: 3,
    next_review_offset_hours: 72,
    last_reviewed_offset_hours: -24,
  },
  {
    repetition_count: 5,
    interval_days: 7,
    next_review_offset_hours: 168,
    last_reviewed_offset_hours: -48,
  },
  {
    repetition_count: 1,
    interval_days: 0,
    next_review_offset_hours: -1,
    last_reviewed_offset_hours: -1,
    is_suspended: true,
  },
];

function hoursAgo(hours: number): string {
  return new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
}

function hoursFromNow(hours: number): string {
  return new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
}

async function clearDemoData(admin: AdminClient, userId: string): Promise<void> {
  const { data: owned } = await admin
    .from("exercises")
    .select("id")
    .eq("owner_id", userId)
    .like("tags", `%${SEED_DEMO_TAG}%`);

  const ownedIds = (owned ?? []).map((row) => row.id);

  await admin.from("quiz_attempts").delete().eq("user_id", userId);
  await admin.from("exercise_progress").delete().eq("user_id", userId);

  if (ownedIds.length > 0) {
    await admin.from("exercises").delete().in("id", ownedIds);
  }
}

async function activateTopics(admin: AdminClient, userId: string): Promise<void> {
  const topics = [...PUBLIC_TOPICS, OWNED_TOPIC];
  const { error } = await admin.from("user_topic_preferences").upsert(
    topics.map((topic) => ({
      user_id: userId,
      topic,
      is_active: true,
    })),
    { onConflict: "user_id,topic" },
  );
  if (error) throw error;
}

async function fetchPublicExercises(admin: AdminClient): Promise<ExerciseRow[]> {
  const { data, error } = await admin
    .from("exercises")
    .select("id, source_text, target_text, topic")
    .is("owner_id", null)
    .in("topic", [...PUBLIC_TOPICS])
    .order("created_at", { ascending: true });

  if (error) throw error;

  // Max 3 per topic — voorkomt explosie bij dubbele migration-seeds
  const byTopic = new Map<string, ExerciseRow[]>();
  for (const row of (data ?? []) as ExerciseRow[]) {
    if (!row.topic) continue;
    const list = byTopic.get(row.topic) ?? [];
    if (list.length < 3) list.push(row);
    byTopic.set(row.topic, list);
  }

  return [...byTopic.values()].flat();
}

async function insertOwnedExercises(
  admin: AdminClient,
  userId: string,
): Promise<ExerciseRow[]> {
  const rows = OWNED_EXERCISES.map((spec) => ({
    source_text: spec.source_text,
    target_text: spec.target_text,
    topic: OWNED_TOPIC,
    tags: spec.tags,
    owner_id: userId,
  }));

  const { data, error } = await admin.from("exercises").insert(rows).select(
    "id, source_text, target_text, topic",
  );
  if (error) throw error;
  return (data ?? []) as ExerciseRow[];
}

async function insertProgress(
  admin: AdminClient,
  userId: string,
  exercises: ExerciseRow[],
): Promise<number> {
  const targets = exercises.slice(0, PROGRESS_SPECS.length);
  const rows = targets.map((exercise, index) => {
    const spec = PROGRESS_SPECS[index];
    return {
      user_id: userId,
      exercise_id: exercise.id,
      ease_factor: 2.5,
      interval_days: spec.interval_days,
      repetition_count: spec.repetition_count,
      next_review_at: hoursFromNow(spec.next_review_offset_hours),
      last_reviewed_at:
        spec.last_reviewed_offset_hours === null
          ? null
          : hoursAgo(Math.abs(spec.last_reviewed_offset_hours)),
      is_suspended: spec.is_suspended ?? false,
    };
  });

  if (rows.length === 0) return 0;

  const { error } = await admin.from("exercise_progress").insert(rows);
  if (error) throw error;
  return rows.length;
}

function buildAttemptRows(
  userId: string,
  exercises: ExerciseRow[],
): Array<Record<string, unknown>> {
  const attempts: Array<Record<string, unknown>> = [];
  let attemptIndex = 0;

  for (const exercise of exercises) {
    const attemptCount = 2 + (attemptIndex % 2);
    const correctRate = exercise.topic === "autogarage" ? 0.4 : 0.75;

    for (let i = 0; i < attemptCount; i++) {
      const isCorrect = (attemptIndex + i) % 10 < correctRate * 10;
      const daysAgo = (attemptIndex % 7) + i * 0.3;
      const practiceType = PRACTICE_TYPES[(attemptIndex + i) % PRACTICE_TYPES.length];
      const selectionMode =
        SELECTION_MODES[(attemptIndex + i) % SELECTION_MODES.length];
      const isScheduledReview = selectionMode === "srs";

      attempts.push({
        user_id: userId,
        exercise_id: exercise.id,
        user_answer: isCorrect ? exercise.target_text : "ik weet het niet",
        is_correct: isCorrect,
        created_at: hoursAgo(daysAgo * 24),
        selection_mode: selectionMode,
        practice_type: practiceType,
        direction: DIRECTIONS[(attemptIndex + i) % DIRECTIONS.length],
        typing_mode: practiceType === "typing" ? "full" : null,
        is_mistake_review: !isCorrect && i > 0,
        response_time_ms: 2000 + ((attemptIndex + i) % 5) * 800,
        interval_days_before: isScheduledReview ? (attemptIndex % 4) : null,
        repetition_count_before: isScheduledReview ? (attemptIndex % 3) : null,
        is_scheduled_review: isScheduledReview,
      });
    }

    attemptIndex += 1;
  }

  return attempts;
}

async function insertAttempts(
  admin: AdminClient,
  rows: Array<Record<string, unknown>>,
): Promise<number> {
  if (rows.length === 0) return 0;

  const chunkSize = 50;
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);
    const { error } = await admin.from("quiz_attempts").insert(chunk);
    if (error) throw error;
  }

  return rows.length;
}

/**
 * Zet demo-oefeningen, pogingen en SRS-voortgang voor één gebruiker.
 * Idempotent: wist eerst eerdere demo-data van deze user.
 */
export async function seedDemoExerciseData(
  admin: AdminClient,
  userId: string,
  username: string,
): Promise<void> {
  console.log(`\nSeeden van demo-oefendata voor ${username}…`);

  await clearDemoData(admin, userId);
  await activateTopics(admin, userId);

  const publicExercises = await fetchPublicExercises(admin);
  if (publicExercises.length === 0) {
    console.warn(
      "  [!] Geen publieke oefeningen gevonden (migration 0003?). Alleen eigen oefeningen worden gezaaid.",
    );
  }

  const ownedExercises = await insertOwnedExercises(admin, userId);
  const allExercises = [...publicExercises, ...ownedExercises];

  const progressCount = await insertProgress(admin, userId, allExercises);
  const attemptRows = buildAttemptRows(userId, allExercises);
  const attemptCount = await insertAttempts(admin, attemptRows);

  console.log(`  [+] ${PUBLIC_TOPICS.length + 1} actieve topics`);
  console.log(`  [+] ${ownedExercises.length} eigen oefeningen (topic: ${OWNED_TOPIC})`);
  console.log(`  [+] ${progressCount} SRS-voortgangskaarten`);
  console.log(`  [+] ${attemptCount} quiz-pogingen (publiek + eigen)`);
}
