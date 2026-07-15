import type {
  ExerciseDbRow,
} from "@/app/api/dev/exercises-admin/types";
import type { ExerciseGlobalSnapshot } from "@/types/exercise-global-submission";

/**
 * Bouwt een immutable snapshot voor een global-aanbieding.
 * Geen id/owner/created_at — copy-on-approve maakt later een nieuwe rij.
 */
export function buildExerciseGlobalSnapshot(
  row: Pick<
    ExerciseDbRow,
    | "source_text"
    | "target_text"
    | "topic"
    | "tags"
    | "source_lang"
    | "audio_path"
    | "tatoeba_audio_id"
    | "tatoeba_sentence_id"
    | "tatoeba_author"
    | "tatoeba_license"
    | "tatoeba_attribution_url"
    | "target_text_manually_edited"
    | "alternative_translations"
  >,
): ExerciseGlobalSnapshot {
  return {
    source_text: row.source_text,
    target_text: row.target_text,
    topic: row.topic,
    tags: row.tags,
    source_lang: row.source_lang,
    audio_path: row.audio_path,
    tatoeba_audio_id: row.tatoeba_audio_id,
    tatoeba_sentence_id: row.tatoeba_sentence_id,
    tatoeba_author: row.tatoeba_author,
    tatoeba_license: row.tatoeba_license,
    tatoeba_attribution_url: row.tatoeba_attribution_url,
    target_text_manually_edited: row.target_text_manually_edited,
    alternative_translations: row.alternative_translations ?? [],
  };
}
