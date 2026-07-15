// Seed-script voor lokaal testen. Run met: npm run seed:users
//
// Werking (elke run):
//   1. de hele Supabase-database wordt geleegd (alle public-tabellen + alle
//      auth-users), zodat je altijd met een schone lei begint
//   2. testuser1, testuser2 en testadmin worden aangemaakt (vast wachtwoord)
//   3. de publieke topic-oefeningen worden opnieuw aangemaakt
//   4. testuser1 krijgt de volledige demo-set (eigen oefeningen, SRS-voortgang,
//      quiz-pogingen en actieve topics) voor dashboard/SRS/quiz-schermen
//   5. CRED.md wordt geschreven met de testaccount-gegevens

import { writeFileSync } from "node:fs";
import { resolve } from "node:path";

import { createClient } from "@supabase/supabase-js";

import { usernameToEmail } from "../lib/auth/username";

import type { SupabaseClient, User } from "@supabase/supabase-js";

type AdminClient = SupabaseClient;

type SeedUser = {
  username: string;
  role?: "admin";
};

type CredUser = {
  id: string;
  username: string;
  email: string;
  password: string;
  role?: "admin";
};

type ExerciseRow = {
  id: string;
  source_text: string;
  target_text: string;
  topic: string | null;
};

// Vast wachtwoord voor alle geseede users. Prima voor een lokale testomgeving.
const DEFAULT_PASSWORD = "q1q1Q!Q!";

const USERS: SeedUser[] = [
  { username: "testuser1" },
  { username: "testuser2" },
  { username: "testadmin", role: "admin" },
];

const PUBLIC_TOPICS = [
  "restaurant",
  "luchthaven",
  "autogarage",
  "ijsjeszaak",
] as const;

const OWNED_TOPIC = "reis";

// Publieke oefeningen (owner_id = null) — overgenomen uit migration 0003.
const PUBLIC_EXERCISES: Array<{
  source_text: string;
  target_text: string;
  topic: (typeof PUBLIC_TOPICS)[number];
}> = [
  {
    source_text: "¿Tienen una mesa para dos?",
    target_text: "Hebben jullie een tafel voor twee?",
    topic: "restaurant",
  },
  {
    source_text: "La cuenta, por favor.",
    target_text: "De rekening, alstublieft.",
    topic: "restaurant",
  },
  {
    source_text: "¿Qué recomienda el chef hoy?",
    target_text: "Wat raadt de chef vandaag aan?",
    topic: "restaurant",
  },
  {
    source_text: "¿Dónde está la puerta de embarque?",
    target_text: "Waar is de gate?",
    topic: "luchthaven",
  },
  {
    source_text: "Mi maleta no ha llegado.",
    target_text: "Mijn koffer is niet aangekomen.",
    topic: "luchthaven",
  },
  {
    source_text: "¿A qué hora sale el próximo vuelo?",
    target_text: "Hoe laat vertrekt de volgende vlucht?",
    topic: "luchthaven",
  },
  {
    source_text: "Necesito cambiar las ruedas del coche.",
    target_text: "Ik moet de wielen van de auto vervangen.",
    topic: "autogarage",
  },
  {
    source_text: "¿Cuánto cuesta la revisión del vehículo?",
    target_text: "Wat kost de keuring van het voertuig?",
    topic: "autogarage",
  },
  {
    source_text: "Quiero hacer una cita para un cambio de aceite.",
    target_text: "Ik wil een afspraak maken voor een olieverversing.",
    topic: "autogarage",
  },
  {
    source_text: "¿Qué sabores de helado tienen hoy?",
    target_text: "Welke smaken ijs hebben jullie vandaag?",
    topic: "ijsjeszaak",
  },
  {
    source_text: "Me gustaría un helado de chocolate, por favor.",
    target_text: "Ik zou graag een chocolade-ijsje willen, alstublieft.",
    topic: "ijsjeszaak",
  },
  {
    source_text: "¿Puedo probar un poco del helado de fresa?",
    target_text: "Mag ik een beetje van het aardbeienijs proeven?",
    topic: "ijsjeszaak",
  },
];

// Eigen oefeningen van testuser1 (owner_id = testuser1).
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

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Env var ${name} ontbreekt. Zet 'm in .env.local.`);
  }
  return value;
}

/**
 * Leegt de hele database: eerst alle public-tabellen in FK-veilige volgorde
 * (children voor parents), daarna alle auth-users. De service-role client
 * omzeilt RLS, dus alle deletes slagen.
 */
async function wipeDatabase(admin: AdminClient): Promise<void> {
  // Volgorde is belangrijk: rijen die naar andere tabellen verwijzen eerst.
  const deletions: Array<{ table: string; notNullColumn: string }> = [
    { table: "exercise_global_submissions", notNullColumn: "id" },
    { table: "quiz_attempts", notNullColumn: "id" },
    { table: "exercise_progress", notNullColumn: "user_id" },
    { table: "user_topic_preferences", notNullColumn: "user_id" },
    { table: "exercises", notNullColumn: "id" },
    { table: "profiles", notNullColumn: "id" },
  ];

  for (const { table, notNullColumn } of deletions) {
    // `.not(col, "is", null)` op een NOT NULL-kolom matcht alle rijen; supabase
    // vereist een filter bij delete, dit is de veilige "verwijder alles"-vorm.
    const { error } = await admin.from(table).delete().not(notNullColumn, "is", null);
    if (error) throw error;
  }

  await deleteAllAuthUsers(admin);
}

async function deleteAllAuthUsers(admin: AdminClient): Promise<void> {
  const perPage = 200;

  for (let i = 0; i < 100; i++) {
    const { data, error } = await admin.auth.admin.listUsers({ page: 1, perPage });
    if (error) throw error;
    if (data.users.length === 0) return;

    for (const user of data.users) {
      const { error: deleteError } = await admin.auth.admin.deleteUser(user.id);
      if (deleteError) throw deleteError;
    }
  }
}

/**
 * Maakt een nieuwe auth-user aan. De DB is elke run schoon, dus we hoeven
 * geen bestaande user te zoeken/updaten. Het `profiles`-record wordt via een
 * trigger op auth.users automatisch aangemaakt met de username.
 */
async function createUser(admin: AdminClient, seed: SeedUser): Promise<User> {
  const email = usernameToEmail(seed.username);
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: DEFAULT_PASSWORD,
    email_confirm: true,
    user_metadata: { username: seed.username },
    ...(seed.role === "admin" ? { app_metadata: { role: "admin" } } : {}),
  });
  if (error || !data.user) {
    throw error ?? new Error("createUser gaf geen user terug.");
  }
  return data.user;
}

async function insertPublicExercises(admin: AdminClient): Promise<ExerciseRow[]> {
  const rows = PUBLIC_EXERCISES.map((exercise) => ({
    source_text: exercise.source_text,
    target_text: exercise.target_text,
    topic: exercise.topic,
    owner_id: null,
  }));

  const { data, error } = await admin
    .from("exercises")
    .insert(rows)
    .select("id, source_text, target_text, topic");
  if (error) throw error;
  return (data ?? []) as ExerciseRow[];
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

  const { data, error } = await admin
    .from("exercises")
    .insert(rows)
    .select("id, source_text, target_text, topic");
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
 * Zet de volledige demo-set voor testuser1: actieve topics, eigen oefeningen,
 * SRS-voortgang en quiz-pogingen. De publieke oefeningen worden meegegeven zodat
 * de voortgang/pogingen ook over topic-oefeningen verspreid zijn.
 */
async function seedDemoExerciseData(
  admin: AdminClient,
  userId: string,
  publicExercises: ExerciseRow[],
): Promise<void> {
  console.log("\nDemo-oefendata voor testuser1…");

  await activateTopics(admin, userId);

  const ownedExercises = await insertOwnedExercises(admin, userId);
  const allExercises = [...publicExercises, ...ownedExercises];

  const progressCount = await insertProgress(admin, userId, allExercises);
  const attemptRows = buildAttemptRows(userId, allExercises);
  const attemptCount = await insertAttempts(admin, attemptRows);

  console.log(`  [+] ${PUBLIC_TOPICS.length + 1} actieve topics`);
  console.log(`  [+] ${ownedExercises.length} eigen oefeningen (topic: ${OWNED_TOPIC})`);
  console.log(`  [+] ${progressCount} SRS-voortgangskaarten`);
  console.log(`  [+] ${attemptCount} quiz-pogingen`);
}

function writeCredMd(users: CredUser[]): void {
  const lines: string[] = [
    "# Test credentials — NIET committen (staat in .gitignore)",
    "",
    "Gegenereerd door `npm run seed:users`.",
    "Open CRED.md lokaal voor de testaccounts (niet committen).",
    "",
  ];

  for (const user of users) {
    lines.push(`## ${user.username}`);
    lines.push(`- Username: \`${user.username}\``);
    lines.push(`- E-mail: \`${user.email}\``);
    lines.push(`- Wachtwoord: \`${user.password}\``);
    if (user.role === "admin") {
      lines.push("- Rol: admin (via Supabase `app_metadata.role`)");
    }
    lines.push("");
  }

  const credPath = resolve(process.cwd(), "CRED.md");
  writeFileSync(credPath, lines.join("\n"), "utf8");
  console.log(`\nCredentials geschreven naar ${credPath}`);
}

async function main() {
  const url = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
  const secret =
    process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) {
    throw new Error(
      "Zet SUPABASE_SECRET_KEY of SUPABASE_SERVICE_ROLE_KEY in .env.local.",
    );
  }

  const admin: AdminClient = createClient(url, secret, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  console.log("Database legen (alle public-tabellen + alle auth-users)…");
  await wipeDatabase(admin);

  console.log(
    "\nUsers aanmaken:",
    USERS.map((seed) => seed.username).join(", "),
  );

  const credUsers: CredUser[] = [];
  for (const seed of USERS) {
    const user = await createUser(admin, seed);
    credUsers.push({
      id: user.id,
      username: seed.username,
      email: usernameToEmail(seed.username),
      password: DEFAULT_PASSWORD,
      role: seed.role,
    });
    console.log(`[+] ${seed.username.padEnd(12)} ${user.id}`);
  }

  writeCredMd(credUsers);

  console.log("\nPublieke oefeningen aanmaken…");
  const publicExercises = await insertPublicExercises(admin);
  console.log(`[+] ${publicExercises.length} publieke oefeningen`);

  const testuser1 = credUsers.find((user) => user.username === "testuser1");
  if (testuser1) {
    await seedDemoExerciseData(admin, testuser1.id, publicExercises);
  }

  console.log(
    "\nKlaar. Log in op /login met username + wachtwoord uit CRED.md.",
  );
}

main().catch((err) => {
  console.error("seed.ts faalde:", err);
  process.exit(1);
});
