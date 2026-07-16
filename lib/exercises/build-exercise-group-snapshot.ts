import type { ExerciseDbRow } from "@/lib/exercises/types";
import type {
  ExerciseGroupSnapshot,
  ExerciseMemberSnapshot,
} from "@/types/exercise-group-submission";

type ExerciseSnapshotSource = Pick<
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
>;

/** Bouwt een immutable snapshot voor één oefening binnen een groep-aanbieding. */
export function buildExerciseMemberSnapshot(
  row: ExerciseSnapshotSource,
): ExerciseMemberSnapshot {
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

/**
 * Bouwt een immutable snapshot voor een hele oefeningengroep.
 * Latere edits aan de persoonlijke groep raken deze snapshot niet.
 */
export function buildExerciseGroupSnapshot(
  name: string,
  exercises: ExerciseSnapshotSource[],
): ExerciseGroupSnapshot {
  return {
    name: name.trim(),
    exercises: exercises.map(buildExerciseMemberSnapshot),
  };
}
