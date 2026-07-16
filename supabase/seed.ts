// Seed-script voor lokaal testen. Run met: npm run seed:users
//
// Werking (elke run):
//   1. de hele Supabase-database wordt geleegd (alle public-tabellen + alle
//      auth-users), zodat je altijd met een schone lei begint
//   2. testuser1, testuser2 en testadmin worden aangemaakt (vast wachtwoord)
//   3. global + personal oefeningengroepen + review-submissions (pending /
//      approved / rejected) zodat de admin review-queue testbaar is
//   4. testuser1 krijgt demo SRS/quiz-data
//   5. CRED.md wordt geschreven met de testaccount-gegevens

import { writeFileSync } from "node:fs";
import { resolve } from "node:path";

import { createClient } from "@supabase/supabase-js";

import { usernameToEmail } from "../lib/auth/username";
import { buildExerciseGroupSnapshot } from "../lib/exercises/build-exercise-group-snapshot";

import type { SupabaseClient, User } from "@supabase/supabase-js";
import type { ExerciseMemberSnapshot } from "../types/exercise-group-submission";

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

type ExerciseSpec = {
  source_text: string;
  target_text: string;
  tags?: string;
};

// Vast wachtwoord voor alle geseede users. Prima voor een lokale testomgeving.
const DEFAULT_PASSWORD = "q1q1Q!Q!";

const USERS: SeedUser[] = [
  { username: "testuser1" },
  { username: "testuser2" },
  { username: "testadmin", role: "admin" },
];

const OWNED_TOPIC = "reis";

/** Goedgekeurde global groepen (2). */
const APPROVED_GLOBAL_GROUPS: Array<{
  name: string;
  exercises: ExerciseSpec[];
}> = [
  {
    name: "restaurant",
    exercises: [
      {
        source_text: "¿Tienen una mesa para dos?",
        target_text: "Hebben jullie een tafel voor twee?",
      },
      {
        source_text: "La cuenta, por favor.",
        target_text: "De rekening, alstublieft.",
      },
      {
        source_text: "¿Qué recomienda el chef hoy?",
        target_text: "Wat raadt de chef vandaag aan?",
      },
    ],
  },
  {
    name: "luchthaven",
    exercises: [
      {
        source_text: "¿Dónde está la puerta de embarque?",
        target_text: "Waar is de gate?",
      },
      {
        source_text: "Mi maleta no ha llegado.",
        target_text: "Mijn koffer is niet aangekomen.",
      },
      {
        source_text: "¿A qué hora sale el próximo vuelo?",
        target_text: "Hoe laat vertrekt de volgende vlucht?",
      },
    ],
  },
];

/** Pending aanbiedingen (2) — personal groepen van testuser1. */
const PENDING_GROUPS: Array<{ name: string; exercises: ExerciseSpec[] }> = [
  {
    name: "hotel",
    exercises: [
      {
        source_text: "¿Hay wifi en la habitación?",
        target_text: "Is er wifi op de kamer?",
        tags: "seed-pending,hotel",
      },
      {
        source_text: "Quisiera una habitación con vistas al mar.",
        target_text: "Ik zou graag een kamer met zeezicht willen.",
        tags: "seed-pending,hotel",
      },
      {
        source_text: "¿A qué hora es el desayuno?",
        target_text: "Hoe laat is het ontbijt?",
        tags: "seed-pending,hotel",
      },
    ],
  },
  {
    name: "museum",
    exercises: [
      {
        source_text: "¿Cuánto cuesta la entrada?",
        target_text: "Wat kost het entreeticket?",
        tags: "seed-pending,museum",
      },
      {
        source_text: "¿Se pueden hacer fotos dentro?",
        target_text: "Mag je binnen foto's maken?",
        tags: "seed-pending,museum",
      },
    ],
  },
];

/** Afgewezen aanbiedingen (2) — personal bron + rejected submission, geen global. */
const REJECTED_GROUPS: Array<{
  name: string;
  exercises: ExerciseSpec[];
  reason: string;
}> = [
  {
    name: "sport",
    reason: "Te weinig context; vertalingen inconsistent.",
    exercises: [
      {
        source_text: "¿Dónde está el gimnasio?",
        target_text: "Waar is de sportschool?",
        tags: "seed-rejected,sport",
      },
      {
        source_text: "Quiero reservar una pista de tenis.",
        target_text: "Ik wil een tennisbaan reserveren.",
        tags: "seed-rejected,sport",
      },
    ],
  },
  {
    name: "winkel",
    reason: "Niet geschikt als global corpus (te niche).",
    exercises: [
      {
        source_text: "¿Tienen esta camisa en otra talla?",
        target_text: "Hebben jullie dit shirt in een andere maat?",
        tags: "seed-rejected,winkel",
      },
      {
        source_text: "¿Puedo pagar con tarjeta?",
        target_text: "Kan ik met pin betalen?",
        tags: "seed-rejected,winkel",
      },
    ],
  },
];

const OWNED_EXERCISES: ExerciseSpec[] = [
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
];

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

function toMemberSnapshot(
  spec: ExerciseSpec,
  topic: string,
): ExerciseMemberSnapshot {
  return {
    source_text: spec.source_text,
    target_text: spec.target_text,
    topic,
    tags: spec.tags ?? "",
    source_lang: "spa",
    audio_path: null,
    tatoeba_audio_id: null,
    tatoeba_sentence_id: null,
    tatoeba_author: null,
    tatoeba_license: null,
    tatoeba_attribution_url: null,
    target_text_manually_edited: false,
    alternative_translations: [],
  };
}

/**
 * Leegt de hele database: eerst alle public-tabellen in FK-veilige volgorde
 * (children voor parents), daarna alle auth-users. De service-role client
 * omzeilt RLS, dus alle deletes slagen.
 */
async function wipeDatabase(admin: AdminClient): Promise<void> {
  const deletions: Array<{ table: string; notNullColumn: string }> = [
    { table: "exercise_group_submissions", notNullColumn: "id" },
    { table: "quiz_attempts", notNullColumn: "id" },
    { table: "exercise_progress", notNullColumn: "user_id" },
    { table: "user_topic_preferences", notNullColumn: "user_id" },
    { table: "exercises", notNullColumn: "id" },
    { table: "exercise_groups", notNullColumn: "id" },
    { table: "profiles", notNullColumn: "id" },
  ];

  for (const { table, notNullColumn } of deletions) {
    const { error } = await admin
      .from(table)
      .delete()
      .not(notNullColumn, "is", null);
    if (error) throw error;
  }

  await deleteAllAuthUsers(admin);
}

async function deleteAllAuthUsers(admin: AdminClient): Promise<void> {
  const perPage = 200;

  for (let i = 0; i < 100; i++) {
    const { data, error } = await admin.auth.admin.listUsers({
      page: 1,
      perPage,
    });
    if (error) throw error;
    if (data.users.length === 0) return;

    for (const user of data.users) {
      const { error: deleteError } = await admin.auth.admin.deleteUser(user.id);
      if (deleteError) throw deleteError;
    }
  }
}

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

async function insertGroup(
  admin: AdminClient,
  name: string,
  ownerId: string | null,
  isActive = true,
): Promise<string> {
  const { data, error } = await admin
    .from("exercise_groups")
    .insert({
      name,
      owner_id: ownerId,
      is_active: isActive,
    })
    .select("id")
    .maybeSingle();
  if (error || !data) {
    throw error ?? new Error(`Groep ${name} aanmaken mislukt.`);
  }
  return data.id as string;
}

async function insertExercisesForGroup(
  admin: AdminClient,
  groupId: string,
  ownerId: string | null,
  name: string,
  exercises: ExerciseSpec[],
): Promise<ExerciseRow[]> {
  const rows = exercises.map((spec) => ({
    source_text: spec.source_text,
    target_text: spec.target_text,
    topic: name,
    tags: spec.tags ?? "",
    source_lang: "spa",
    owner_id: ownerId,
    group_id: groupId,
  }));

  const { data, error } = await admin
    .from("exercises")
    .insert(rows)
    .select("id, source_text, target_text, topic");
  if (error) throw error;
  return (data ?? []) as ExerciseRow[];
}

async function seedApprovedGlobals(
  admin: AdminClient,
  submitterId: string,
): Promise<ExerciseRow[]> {
  const allExercises: ExerciseRow[] = [];

  for (const group of APPROVED_GLOBAL_GROUPS) {
    // Persoonlijke bron-groep (wat de user ooit aanbood)
    const sourceGroupId = await insertGroup(admin, group.name, submitterId);
    await insertExercisesForGroup(
      admin,
      sourceGroupId,
      submitterId,
      group.name,
      group.exercises,
    );

    // Global resultaat na goedkeuring
    const globalGroupId = await insertGroup(admin, group.name, null, true);
    const globalExercises = await insertExercisesForGroup(
      admin,
      globalGroupId,
      null,
      group.name,
      group.exercises,
    );
    allExercises.push(...globalExercises);

    const snapshot = buildExerciseGroupSnapshot(
      group.name,
      group.exercises.map((spec) => toMemberSnapshot(spec, group.name)),
    );

    const { error } = await admin.from("exercise_group_submissions").insert({
      source_group_id: sourceGroupId,
      submitted_by: submitterId,
      snapshot,
      status: "approved",
      resulting_group_id: globalGroupId,
      reviewed_at: hoursAgo(48),
    });
    if (error) throw error;
  }

  return allExercises;
}

async function seedPendingGroups(
  admin: AdminClient,
  submitterId: string,
): Promise<void> {
  for (const group of PENDING_GROUPS) {
    const sourceGroupId = await insertGroup(admin, group.name, submitterId);
    await insertExercisesForGroup(
      admin,
      sourceGroupId,
      submitterId,
      group.name,
      group.exercises,
    );

    const snapshot = buildExerciseGroupSnapshot(
      group.name,
      group.exercises.map((spec) => toMemberSnapshot(spec, group.name)),
    );

    const { error } = await admin.from("exercise_group_submissions").insert({
      source_group_id: sourceGroupId,
      submitted_by: submitterId,
      snapshot,
      status: "pending",
    });
    if (error) throw error;
  }
}

async function seedRejectedGroups(
  admin: AdminClient,
  submitterId: string,
): Promise<void> {
  for (const group of REJECTED_GROUPS) {
    const sourceGroupId = await insertGroup(admin, group.name, submitterId);
    await insertExercisesForGroup(
      admin,
      sourceGroupId,
      submitterId,
      group.name,
      group.exercises,
    );

    const snapshot = buildExerciseGroupSnapshot(
      group.name,
      group.exercises.map((spec) => toMemberSnapshot(spec, group.name)),
    );

    const { error } = await admin.from("exercise_group_submissions").insert({
      source_group_id: sourceGroupId,
      submitted_by: submitterId,
      snapshot,
      status: "rejected",
      reject_reason: group.reason,
      reviewed_at: hoursAgo(24),
    });
    if (error) throw error;
  }
}

async function activateTopics(admin: AdminClient, userId: string): Promise<void> {
  const topics = [
    ...APPROVED_GLOBAL_GROUPS.map((g) => g.name),
    ...PENDING_GROUPS.map((g) => g.name),
    OWNED_TOPIC,
  ];
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

async function insertOwnedReisGroup(
  admin: AdminClient,
  userId: string,
): Promise<ExerciseRow[]> {
  const groupId = await insertGroup(admin, OWNED_TOPIC, userId);
  return insertExercisesForGroup(
    admin,
    groupId,
    userId,
    OWNED_TOPIC,
    OWNED_EXERCISES,
  );
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
    const correctRate = exercise.topic === "luchthaven" ? 0.4 : 0.75;

    for (let i = 0; i < attemptCount; i++) {
      const isCorrect = (attemptIndex + i) % 10 < correctRate * 10;
      const daysAgo = (attemptIndex % 7) + i * 0.3;
      const practiceType =
        PRACTICE_TYPES[(attemptIndex + i) % PRACTICE_TYPES.length];
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
        interval_days_before: isScheduledReview ? attemptIndex % 4 : null,
        repetition_count_before: isScheduledReview ? attemptIndex % 3 : null,
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

async function seedDemoExerciseData(
  admin: AdminClient,
  userId: string,
  publicExercises: ExerciseRow[],
): Promise<void> {
  console.log("\nDemo-oefendata voor testuser1…");

  await activateTopics(admin, userId);

  const ownedExercises = await insertOwnedReisGroup(admin, userId);
  const allExercises = [...publicExercises, ...ownedExercises];

  const progressCount = await insertProgress(admin, userId, allExercises);
  const attemptRows = buildAttemptRows(userId, allExercises);
  const attemptCount = await insertAttempts(admin, attemptRows);

  console.log(
    `  [+] ${APPROVED_GLOBAL_GROUPS.length + PENDING_GROUPS.length + 1} actieve topics`,
  );
  console.log(
    `  [+] ${ownedExercises.length} eigen oefeningen (groep: ${OWNED_TOPIC})`,
  );
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

  const testuser1 = credUsers.find((user) => user.username === "testuser1");
  if (!testuser1) {
    throw new Error("testuser1 ontbreekt na seed.");
  }

  console.log("\nReview-seed: approved / pending / rejected groepen…");
  const publicExercises = await seedApprovedGlobals(admin, testuser1.id);
  await seedPendingGroups(admin, testuser1.id);
  await seedRejectedGroups(admin, testuser1.id);
  console.log(
    `  [+] ${APPROVED_GLOBAL_GROUPS.length} goedgekeurde global groepen`,
  );
  console.log(`  [+] ${PENDING_GROUPS.length} pending aanbiedingen`);
  console.log(`  [+] ${REJECTED_GROUPS.length} afgewezen aanbiedingen`);
  console.log(`  [+] ${publicExercises.length} global oefeningen`);

  await seedDemoExerciseData(admin, testuser1.id, publicExercises);

  console.log(
    "\nKlaar. Log in op /login met username + wachtwoord uit CRED.md.",
  );
}

main().catch((err) => {
  console.error("seed.ts faalde:", err);
  process.exit(1);
});
