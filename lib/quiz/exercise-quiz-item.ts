import { getPublicAudioUrl } from "@/lib/exercises/public-audio-url";

import type { ExerciseQuizItem } from "@/types/quiz";
import type { SupabaseClient } from "@supabase/supabase-js";

type ExerciseRow = {
  id: string;
  source_text: string;
  target_text: string;
  topic: string | null;
  created_at: string;
  alternative_translations: string[] | null;
  audio_path: string | null;
  tatoeba_author: string | null;
  tatoeba_license: string | null;
  tatoeba_attribution_url: string | null;
};

/** Map een DB-rij naar het quiz-API-responseformaat. */
export function toExerciseQuizItem(
  supabase: SupabaseClient,
  row: ExerciseRow,
): ExerciseQuizItem {
  const mp3Url =
    row.audio_path != null && row.audio_path.length > 0
      ? getPublicAudioUrl(supabase, row.audio_path)
      : null;

  return {
    id: row.id,
    source_text: row.source_text,
    target_text: row.target_text,
    topic: row.topic,
    created_at: row.created_at,
    alternative_translations: row.alternative_translations ?? [],
    mp3_url: mp3Url,
    tatoeba_author: row.tatoeba_author ?? null,
    tatoeba_license: row.tatoeba_license ?? null,
    tatoeba_attribution_url: row.tatoeba_attribution_url ?? null,
  };
}

export const EXERCISE_QUIZ_SELECT =
  "id, source_text, target_text, topic, created_at, alternative_translations, audio_path, tatoeba_author, tatoeba_license, tatoeba_attribution_url";
