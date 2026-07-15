/**
 * Types voor global-aanbiedingen (snapshot + review).
 * Schema: supabase/migrations/0017_exercise_global_submissions.sql
 */

export const GLOBAL_SUBMISSION_STATUSES = [
  "pending",
  "approved",
  "rejected",
  "withdrawn",
] as const;

export type GlobalSubmissionStatus = (typeof GLOBAL_SUBMISSION_STATUSES)[number];

/**
 * Inhoud van een oefening op het moment van aanbieden.
 * Bewust zonder id/owner/created_at van de source-rij.
 */
export type ExerciseGlobalSnapshot = {
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

export type ExerciseGlobalSubmissionRow = {
  id: string;
  source_exercise_id: string;
  submitted_by: string;
  snapshot: ExerciseGlobalSnapshot;
  status: GlobalSubmissionStatus;
  reject_reason: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  resulting_exercise_id: string | null;
  created_at: string;
  updated_at: string;
};

export const USER_AI_REQUESTS_PER_DAY = 10;
