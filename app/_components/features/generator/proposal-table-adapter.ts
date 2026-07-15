import type { AudioRow } from "@/types/tatoeba";
import type { UseTranslationCache } from "@/lib/hooks/use-translation-cache";

// Map LLM-voorstellen naar pseudo-AudioRow's zodat AudioResultTable
// hergebruikt kan worden zonder Tatoeba-metadata. Negatieve audio_id's
// voorkomen botsingen met echte Tatoeba-ids in de gedeelde vertaal-cache.

export type ExerciseProposal = {
  source_text: string;
  target_text: string;
  tags: string[];
  alternative_translations?: string[];
};

export type ProposeExercisesOutput = {
  topic: string;
  exercises: ExerciseProposal[];
};

export type ProposalBatch = {
  id: string;
  proposal: ProposeExercisesOutput;
};

export type ExercisePayloadItem = {
  source_text: string;
  target_text: string;
  tags: string;
  alternative_translations?: string[];
};

export type ExercisesPersistBody = {
  topic: string;
  exercises: ExercisePayloadItem[];
};

/** Stabiele negatieve id per rij-index binnen één proposal. */
export function proposalIndexToAudioId(index: number): number {
  return -(index + 1);
}

function normalizeSourceText(text: string): string {
  return text.trim().toLowerCase();
}

/** Voeg batches samen tot één proposal; topic van de eerste batch wint. */
export function mergeProposalBatches(
  batches: ProposalBatch[],
): ProposeExercisesOutput {
  if (batches.length === 0) {
    return { topic: "", exercises: [] };
  }

  const topic = batches[0].proposal.topic;
  const seen = new Set<string>();
  const exercises: ExerciseProposal[] = [];

  for (const batch of batches) {
    for (const exercise of batch.proposal.exercises) {
      const key = normalizeSourceText(exercise.source_text);
      if (seen.has(key)) continue;
      seen.add(key);
      exercises.push(exercise);
    }
  }

  return { topic, exercises };
}

export function mapBatchToRows(
  batch: ProposalBatch,
  startIndex: number,
): AudioRow[] {
  return batch.proposal.exercises.map((ex, index) => ({
    audio_id: proposalIndexToAudioId(startIndex + index),
    sentence_id: 0,
    sentence_text: ex.source_text,
    lang: "spa",
    author: "",
    license: "",
    created: null,
    mp3_url: "",
    download_url: "",
    attribution_url: "",
  }));
}

export function mapBatchesToRows(batches: ProposalBatch[]): AudioRow[] {
  let globalIndex = 0;
  return batches.flatMap((batch) => {
    const rows = mapBatchToRows(batch, globalIndex);
    globalIndex += batch.proposal.exercises.length;
    return rows;
  });
}

export function getLastBatchExerciseCount(batches: ProposalBatch[]): number {
  const last = batches.at(-1);
  return last?.proposal.exercises.length ?? 0;
}

export function mapProposalToRows(proposal: ProposeExercisesOutput): AudioRow[] {
  return proposal.exercises.map((ex, index) => ({
    audio_id: proposalIndexToAudioId(index),
    sentence_id: 0,
    sentence_text: ex.source_text,
    lang: "spa",
    author: "",
    license: "",
    created: null,
    mp3_url: "",
    download_url: "",
    attribution_url: "",
  }));
}

export function seedTranslationCache(
  cache: UseTranslationCache,
  rows: AudioRow[],
  proposal: ProposeExercisesOutput,
): void {
  const cachedAt = new Date().toISOString();
  // Eén bulkSet i.p.v. meerdere set-calls: elke set spread dezelfde
  // stale cache-closure en alleen de laatste rij zou overblijven.
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

export function rowsToExercisesPayload(
  rows: AudioRow[],
  cache: UseTranslationCache,
  selectedIds: Set<number>,
  defaultTopic: string,
): ExercisesPersistBody {
  const targetRows =
    selectedIds.size > 0
      ? rows.filter((row) => selectedIds.has(row.audio_id))
      : rows;

  let topic = defaultTopic.trim();
  const exercises: ExercisePayloadItem[] = [];

  for (const row of targetRows) {
    const cached = cache.get(row.audio_id, row.sentence_text);
    if (!cached) continue;
    if (cached.topic?.trim()) {
      topic = cached.topic.trim();
    }
    const tags = cached.tags.map((tag) => tag.trim()).filter(Boolean);
    if (tags.length < 2) continue;
    exercises.push({
      source_text: row.sentence_text,
      target_text: cached.translation,
      tags: tags.join(","),
      alternative_translations:
        cached.alternatives.length > 0 ? cached.alternatives : undefined,
    });
  }

  return { topic, exercises };
}
