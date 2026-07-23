import type { ExerciseGroupSnapshot } from "@/types/exercise-group-submission";

/**
 * Stabiele fingerprint van snapshot-inhoud (naam + oefeningen).
 * Gebruikt om te zien of een topic sinds afkeuring is gewijzigd.
 */
export function exerciseGroupSnapshotFingerprint(
  snapshot: ExerciseGroupSnapshot,
): string {
  const exercises = snapshot.exercises.map((ex) => ({
    source_text: ex.source_text,
    target_text: ex.target_text,
    topic: ex.topic ?? null,
    tags: ex.tags ?? "",
    source_lang: ex.source_lang ?? null,
    audio_path: ex.audio_path ?? null,
    tatoeba_audio_id: ex.tatoeba_audio_id ?? null,
    tatoeba_sentence_id: ex.tatoeba_sentence_id ?? null,
    alternative_translations: [...(ex.alternative_translations ?? [])].sort(),
  }));
  return JSON.stringify({
    name: snapshot.name.trim(),
    exercises,
  });
}

/** true als naam/oefeningen inhoudelijk gelijk zijn. */
export function snapshotsContentEqual(
  a: ExerciseGroupSnapshot,
  b: ExerciseGroupSnapshot,
): boolean {
  return (
    exerciseGroupSnapshotFingerprint(a) === exerciseGroupSnapshotFingerprint(b)
  );
}
