import type { AudioExerciseProposal } from "@/types/audio-exercise";
import type { AudioRow } from "@/types/tatoeba";
import type { UseTranslationCache } from "@/hooks/use-translation-cache";

export type ProposeAudioExercisesOutput = {
  topic: string;
  exercises: AudioExerciseProposal[];
  ok?: boolean;
  error?: string;
};

export type AudioProposalBatch = {
  id: string;
  proposal: ProposeAudioExercisesOutput;
};

export type AudioPersistBody = {
  topic: string;
  exercises: Array<{
    audio_id: number;
    sentence_id: number;
    source_text: string;
    target_text: string;
    source_lang: string;
    license: string;
    author: string;
    attribution_url: string;
    tags: string;
    alternative_translations: string[];
  }>;
};

/** Voeg batches samen; topic van de eerste batch wint; dedupe op audio_id. */
export function mergeAudioProposalBatches(
  batches: AudioProposalBatch[],
): ProposeAudioExercisesOutput {
  if (batches.length === 0) {
    return { topic: "", exercises: [] };
  }

  const topic = batches[0].proposal.topic;
  const seen = new Set<number>();
  const exercises: AudioExerciseProposal[] = [];

  for (const batch of batches) {
    for (const exercise of batch.proposal.exercises) {
      if (seen.has(exercise.audio_id)) continue;
      seen.add(exercise.audio_id);
      exercises.push(exercise);
    }
  }

  return { topic, exercises };
}

export function mapAudioBatchToRows(batch: AudioProposalBatch): AudioRow[] {
  return batch.proposal.exercises.map((ex) => ({
    audio_id: ex.audio_id,
    sentence_id: ex.sentence_id,
    sentence_text: ex.source_text,
    lang: ex.lang,
    author: ex.author,
    license: ex.license,
    created: ex.created,
    mp3_url: ex.mp3_url,
    download_url: "",
    attribution_url: ex.attribution_url,
  }));
}

export function getLastAudioBatchExerciseCount(
  batches: AudioProposalBatch[],
): number {
  return batches.at(-1)?.proposal.exercises.length ?? 0;
}

/** Verwijder oefeningen op audio_id; lege batches vallen weg. */
export function filterAudioProposalBatchesByAudioIds(
  batches: AudioProposalBatch[],
  removeAudioIds: ReadonlySet<number>,
): AudioProposalBatch[] {
  const next: AudioProposalBatch[] = [];
  for (const batch of batches) {
    const exercises = batch.proposal.exercises.filter(
      (ex) => !removeAudioIds.has(ex.audio_id),
    );
    if (exercises.length === 0) continue;
    next.push({
      ...batch,
      proposal: { ...batch.proposal, exercises },
    });
  }
  return next;
}

/** Werk één audio-oefening bij via audio_id. */
export function updateAudioProposalExerciseByAudioId(
  batches: AudioProposalBatch[],
  audioId: number,
  patch: Partial<AudioExerciseProposal>,
): AudioProposalBatch[] {
  return batches.map((batch) => ({
    ...batch,
    proposal: {
      ...batch.proposal,
      exercises: batch.proposal.exercises.map((ex) =>
        ex.audio_id === audioId ? { ...ex, ...patch } : ex,
      ),
    },
  }));
}

export function seedAudioTranslationCache(
  cache: UseTranslationCache,
  rows: AudioRow[],
  proposal: ProposeAudioExercisesOutput,
): void {
  const cachedAt = new Date().toISOString();
  const entries = rows.flatMap((row, index) => {
    const exercise = proposal.exercises[index];
    if (!exercise) return [];
    return [
      {
        audio_id: row.audio_id,
        translation: exercise.target_text,
        source_text: row.sentence_text,
        lang: row.lang,
        cached_at: cachedAt,
        topic: proposal.topic,
        tags: exercise.tags,
        alternatives: exercise.alternative_translations ?? [],
      },
    ];
  });
  if (entries.length === 0) return;
  cache.bulkSet(entries);
}

export function rowsToAudioPersistPayload(
  rows: AudioRow[],
  cache: UseTranslationCache,
  selectedIds: Set<number>,
  defaultTopic: string,
): AudioPersistBody {
  const targetRows =
    selectedIds.size > 0
      ? rows.filter((row) => selectedIds.has(row.audio_id))
      : rows;

  const topic = defaultTopic.trim();
  const exercises: AudioPersistBody["exercises"] = [];

  for (const row of targetRows) {
    const cached = cache.get(row.audio_id, row.sentence_text);
    if (!cached) continue;
    const tags = cached.tags.map((tag) => tag.trim()).filter(Boolean);
    if (tags.length < 2) continue;
    exercises.push({
      audio_id: row.audio_id,
      sentence_id: row.sentence_id,
      source_text: row.sentence_text,
      target_text: cached.translation,
      source_lang: row.lang || "spa",
      license: row.license,
      author: row.author,
      attribution_url: row.attribution_url,
      tags: tags.join(","),
      alternative_translations:
        cached.alternatives.length > 0 ? cached.alternatives : [],
    });
  }

  return { topic, exercises };
}
