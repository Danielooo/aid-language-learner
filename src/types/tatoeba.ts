/** Genormaliseerde Tatoeba-audiorij voor lijsten en import-UI. */
export type AudioRow = {
  audio_id: number;
  sentence_id: number;
  sentence_text: string;
  lang: string;
  author: string;
  /** Lege string betekent "geen herbruikbare licentie" volgens Tatoeba. */
  license: string;
  created: string | null;
  /** Werkende CDN-URL voor de mp3 — opgebouwd uit lang + sentence_id. */
  mp3_url: string;
  download_url: string;
  attribution_url: string;
};
