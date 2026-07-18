import "server-only";

import {
  listSentencesWithAudio,
  type TatoebaSentenceWithAudios,
} from "@/lib/api/tatoeba-audio";

import type { AudioExerciseProposal } from "@/types/audio-exercise";

export type { AudioExerciseProposal };

export type SearchAudioExercisesInput = {
  topic: string;
  count: number;
  keywords: string[];
  tags: string[];
  /** Audio-IDs die al in eerdere batches staan; overslaan bij zoeken. */
  excludeAudioIds?: number[];
};

export type SearchAudioExercisesResult =
  | { ok: true; topic: string; exercises: AudioExerciseProposal[]; urls: string[] }
  | { ok: false; error: string };

const SOURCE_LANG = "spa";
const TARGET_LANG = "nld";
const PER_KEYWORD_LIMIT = 20;

/**
 * Zoekt Spaanse zinnen met audio via Tatoeba keyword-search.
 * Gebruikt LLM-keywords sequentieel tot `count` unieke hits (met NL-vertaling).
 */
export async function searchAudioExercises(
  input: SearchAudioExercisesInput,
): Promise<SearchAudioExercisesResult> {
  const topic = input.topic.trim();
  if (!topic) {
    return { ok: false, error: "Topic mag niet leeg zijn." };
  }

  const count = Math.min(Math.max(1, Math.floor(input.count)), 30);
  const keywords = dedupeKeywords(input.keywords);
  if (keywords.length === 0) {
    return { ok: false, error: "Minimaal één zoekwoord vereist." };
  }

  const tags = normalizeTags(input.tags, topic);
  const seenSentenceIds = new Set<number>();
  const seenAudioIds = new Set<number>(
    (input.excludeAudioIds ?? []).filter((id) => Number.isFinite(id)),
  );
  const exercises: AudioExerciseProposal[] = [];
  const urls: string[] = [];

  for (const keyword of keywords) {
    if (exercises.length >= count) break;

    const result = await listSentencesWithAudio({
      lang: SOURCE_LANG,
      transLang: TARGET_LANG,
      transHasAudio: false,
      q: keyword,
      sort: "relevance",
      limit: PER_KEYWORD_LIMIT,
    });

    if (!result.ok) {
      const message =
        "message" in result.error
          ? result.error.message
          : "Tatoeba-zoekopdracht mislukt.";
      // Eerste keyword faalt hard; latere keywords zijn best-effort.
      if (exercises.length === 0 && urls.length === 0) {
        return { ok: false, error: message };
      }
      continue;
    }

    urls.push(result.url);

    for (const sentence of result.data.data) {
      if (exercises.length >= count) break;
      const mapped = mapSentenceToProposal(sentence, tags);
      if (!mapped) continue;
      if (seenSentenceIds.has(mapped.sentence_id)) continue;
      if (seenAudioIds.has(mapped.audio_id)) continue;
      seenSentenceIds.add(mapped.sentence_id);
      seenAudioIds.add(mapped.audio_id);
      exercises.push(mapped);
    }
  }

  if (exercises.length === 0) {
    return {
      ok: false,
      error:
        "Geen Tatoeba-zinnen met audio en Nederlandse vertaling gevonden voor deze zoektermen.",
    };
  }

  return { ok: true, topic, exercises, urls };
}

function mapSentenceToProposal(
  sentence: TatoebaSentenceWithAudios,
  tags: string[],
): AudioExerciseProposal | null {
  const audio = pickReusableAudio(sentence);
  if (!audio) return null;

  const nlTranslations = (sentence.translations ?? [])
    .filter((t) => t.lang === TARGET_LANG && t.text.trim().length > 0)
    .map((t) => t.text.trim());

  if (nlTranslations.length === 0) return null;

  const [target_text, ...alts] = nlTranslations;
  const lang = sentence.lang ?? SOURCE_LANG;

  return {
    source_text: sentence.text.trim(),
    target_text,
    tags,
    alternative_translations: alts.slice(0, 3),
    audio_id: audio.id,
    sentence_id: sentence.id,
    lang,
    author: audio.author ?? "",
    license: audio.license ?? "",
    attribution_url: audio.attribution_url ?? "",
    mp3_url: `https://audio.tatoeba.org/sentences/${lang}/${sentence.id}.mp3`,
    created: audio.created,
  };
}

/** Kies eerste audio met niet-lege licentie (herbruikbaar volgens Tatoeba). */
function pickReusableAudio(sentence: TatoebaSentenceWithAudios) {
  const audios = sentence.audios ?? [];
  return (
    audios.find((a) => typeof a.license === "string" && a.license.trim() !== "") ??
    null
  );
}

function dedupeKeywords(keywords: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of keywords) {
    const k = raw.trim();
    if (!k) continue;
    const key = k.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(k);
  }
  return out.slice(0, 8);
}

function normalizeTags(tags: string[], topic: string): string[] {
  const cleaned = tags
    .map((t) => t.trim().toLowerCase())
    .filter((t) => t.length > 0);
  const seen = new Set<string>();
  const out: string[] = [];
  for (const tag of [...cleaned, "audio", topic.trim().toLowerCase()]) {
    if (!tag || seen.has(tag)) continue;
    seen.add(tag);
    out.push(tag);
    if (out.length >= 5) break;
  }
  while (out.length < 2) {
    out.push(out.length === 0 ? "audio" : "tatoeba");
  }
  return out;
}
