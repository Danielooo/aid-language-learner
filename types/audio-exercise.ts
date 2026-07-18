/** Één voorgestelde audio-oefening klaar voor UI + persist. */
export type AudioExerciseProposal = {
  source_text: string;
  target_text: string;
  tags: string[];
  alternative_translations: string[];
  audio_id: number;
  sentence_id: number;
  lang: string;
  author: string;
  license: string;
  attribution_url: string;
  mp3_url: string;
  created: string | null;
};
