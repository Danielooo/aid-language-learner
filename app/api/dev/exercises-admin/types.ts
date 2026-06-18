import type { AudioRow } from "@/app/api/dev/tatoeba-audio/list/route";

const BUCKET = "tatoeba-audio";

export type ExerciseDbRow = {
  id: string;
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
  owner_id: string | null;
  created_at: string;
};

export type AdminExerciseRow = AudioRow & {
  exercise_id: string;
  target_text: string;
  topic: string | null;
  tags: string;
  alternative_translations: string[];
  target_text_manually_edited: boolean;
  owner_id: string | null;
  has_audio: boolean;
  audio_path: string | null;
};

export type ExercisePatchFields = {
  target_text?: string;
  topic?: string | null;
  tags?: string;
  alternative_translations?: string[];
  target_text_manually_edited?: boolean;
};

/** Stabiele negatieve audio_id voor rijen zonder Tatoeba-metadata. */
export function uuidToSyntheticAudioId(uuid: string): number {
  const hex = uuid.replace(/-/g, "").slice(0, 8);
  const n = Number.parseInt(hex, 16);
  if (!Number.isFinite(n) || n === 0) return -1;
  return -(Math.abs(n % 2_147_483_647) + 1);
}

export function mapDbRowToAdminRow(
  row: ExerciseDbRow,
  publicUrlForPath: (path: string) => string,
): AdminExerciseRow {
  const hasAudio = Boolean(row.audio_path);
  const audioId =
    row.tatoeba_audio_id ?? uuidToSyntheticAudioId(row.id);
  const sentenceId = row.tatoeba_sentence_id ?? 0;
  const mp3Url = hasAudio && row.audio_path
    ? publicUrlForPath(row.audio_path)
    : "";

  return {
    exercise_id: row.id,
    audio_id: audioId,
    sentence_id: sentenceId,
    sentence_text: row.source_text,
    lang: row.source_lang ?? "spa",
    author: row.tatoeba_author ?? "",
    license: row.tatoeba_license ?? "",
    created: row.created_at,
    mp3_url: mp3Url,
    download_url: mp3Url,
    attribution_url: row.tatoeba_attribution_url ?? "",
    target_text: row.target_text,
    topic: row.topic,
    tags: row.tags,
    alternative_translations: row.alternative_translations ?? [],
    target_text_manually_edited: row.target_text_manually_edited,
    owner_id: row.owner_id,
    has_audio: hasAudio,
    audio_path: row.audio_path,
  };
}

export function getPublicAudioUrl(
  supabase: ReturnType<
    typeof import("@/lib/supabase/admin").getSupabaseAdmin
  >,
  path: string,
): string {
  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}

export const EXERCISE_SELECT_COLUMNS =
  "id, source_text, target_text, topic, tags, source_lang, audio_path, tatoeba_audio_id, tatoeba_sentence_id, tatoeba_author, tatoeba_license, tatoeba_attribution_url, target_text_manually_edited, alternative_translations, owner_id, created_at";
