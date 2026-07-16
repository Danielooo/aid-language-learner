/**
 * Types voor groep-aanbiedingen (snapshot + review).
 * Schema: supabase/migrations/0018_exercise_groups.sql
 */

export const GROUP_SUBMISSION_STATUSES = [
  "pending",
  "approved",
  "rejected",
  "withdrawn",
] as const;

export type GroupSubmissionStatus = (typeof GROUP_SUBMISSION_STATUSES)[number];

/**
 * Inhoud van één oefening op het moment van aanbieden.
 * Bewust zonder id/owner/created_at/group_id van de source-rij.
 */
export type ExerciseMemberSnapshot = {
  source_text: string;
  target_text: string;
  topic: string | null;
  tags: string;
  source_lang: string | null;
  audio_path: string | null;
  tatoeba_audio_id: number | null;
  tatoeba_sentence_id: number | null;
  tatoeba_author: string | null;
  tatoeba_license: string | null;
  tatoeba_attribution_url: string | null;
  target_text_manually_edited: boolean;
  alternative_translations: string[];
};

/** Snapshot van een hele oefeningengroep bij aanbieden. */
export type ExerciseGroupSnapshot = {
  name: string;
  exercises: ExerciseMemberSnapshot[];
};

export type ExerciseGroupSubmissionRow = {
  id: string;
  source_group_id: string;
  submitted_by: string;
  snapshot: ExerciseGroupSnapshot;
  status: GroupSubmissionStatus;
  reject_reason: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  resulting_group_id: string | null;
  created_at: string;
  updated_at: string;
};

export type ExerciseGroupRow = {
  id: string;
  name: string;
  owner_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export const USER_AI_REQUESTS_PER_DAY = 10;
