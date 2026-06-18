// Typed wrappers voor de drie audio-gerelateerde endpoints van Tatoeba:
//
//   A. GET /unstable/audios            (audio-first listing, met parent sentence)
//   B. GET /v1/sentences?has_audio=yes (sentence-first, includes audios + transcriptions)
//   C. GET /v1/audios/{id}/file        (de mp3 binary; 403 als licentie hergebruik verbiedt)
//
// Documentatie: https://api.tatoeba.org/openapi
//
// Bewust gescheiden van [lib/api/tatoeba.ts](./tatoeba.ts): dat bestand
// modelleert de "platte" sentences-search die geen audio nodig heeft. De
// types overlappen wat, maar dubbelhouden levert hier scherpere typing op
// (audios/transcriptions zijn optioneel in beide endpoints, maar verplicht
// aanwezig zodra we ze opvragen).

const TATOEBA_AUDIOS_URL = "https://api.tatoeba.org/unstable/audios";
const TATOEBA_SENTENCES_URL = "https://api.tatoeba.org/v1/sentences";

// Empirisch werkende download-URL voor één specifieke opname. De
// OpenAPI-spec belooft /v1/audios/{id}/file (en /unstable/audio/{id}/file
// in de download_url-veld), maar beide retourneren momenteel 404.
// tatoeba.org/audio/download/{id} doet wél een 200 met audio/mpeg en
// een Content-Disposition: attachment; filename="{sentence_id}-{audio_id}.mp3".
const TATOEBA_AUDIO_FILE_URL = (id: number) =>
  `https://tatoeba.org/audio/download/${id}`;

// ── Schemas ────────────────────────────────────────────────────────────

export type TatoebaAudio = {
  id: number;
  author: string;
  // De OpenAPI-spec schrijft 'licence' (UK), maar de live API levert
  // 'license' (US) op. We typen op de werkelijke response.
  license: string;
  attribution_url: string;
  // Voorzichtig: in de praktijk wijst dit veld naar
  // https://api.tatoeba.org/unstable/audio/{id}/file dat momenteel 404 geeft.
  // Niet vertrouwen voor afspelen of downloaden — gebruik de probe-route
  // om werkende URL's te vinden (audio.tatoeba.org/sentences/{lang}/{sentence_id}.mp3
  // of tatoeba.org/audio/download/{audio_id}).
  download_url: string;
  // Kunnen null zijn in de praktijk (oudere opnames).
  created: string | null;
  modified: string | null;
};

export type TatoebaSentenceMeta = {
  id: number;
  text: string;
  lang: string | null;
  script: string | null;
  license: string;
  owner: string | null;
  is_unapproved: boolean;
};

export type TatoebaTranscription = {
  text: string;
  script: string;
  needsReview: boolean;
  type: "transcription" | "altscript";
  html: string;
  editor: string | null;
  modified: string;
};

// /unstable/audios → AudioWithExtraInfo (Audio + parent sentence)
export type TatoebaAudioWithSentence = TatoebaAudio & {
  sentence: TatoebaSentenceMeta;
};

export type TatoebaAudioListResponse = {
  data: TatoebaAudioWithSentence[];
  paging: TatoebaPaging;
};

// /v1/sentences?include=audios,transcriptions
export type TatoebaSentenceWithAudios = TatoebaSentenceMeta & {
  audios: TatoebaAudio[];
  transcriptions: TatoebaTranscription[];
  translations: Array<
    TatoebaSentenceMeta & {
      is_direct: boolean;
      audios: TatoebaAudio[];
      transcriptions: TatoebaTranscription[];
    }
  >;
};

export type TatoebaSentenceListResponse = {
  data: TatoebaSentenceWithAudios[];
  paging: TatoebaPaging;
};

export type TatoebaPaging = {
  first?: string;
  total: number;
  has_next: boolean;
  next?: string;
};

export type TatoebaError = {
  message: string;
  url: string;
  code: number;
};

export type TatoebaSort = "random" | "relevance" | "created" | "words";

// ── URL builders ───────────────────────────────────────────────────────

export interface AudioListParams {
  lang?: string;
  author?: string;
  limit?: number;
}

export function buildAudioListUrl(params: AudioListParams): string {
  const url = new URL(TATOEBA_AUDIOS_URL);
  if (params.lang) url.searchParams.set("lang", params.lang);
  if (params.author) url.searchParams.set("author", params.author);
  url.searchParams.set("limit", String(params.limit ?? 20));
  return url.toString();
}

export interface SentenceWithAudioParams {
  lang: string;
  transLang?: string;
  limit?: number;
  sort?: TatoebaSort;
  /** Filter `is_native=yes` op de bron-zinnen (= moedertaalspreker). */
  nativeOnly?: boolean;
}

export function buildSentenceWithAudioUrl(
  params: SentenceWithAudioParams,
): string {
  const url = new URL(TATOEBA_SENTENCES_URL);
  url.searchParams.set("lang", params.lang);
  url.searchParams.set("has_audio", "yes");
  url.searchParams.set("include", "audios,transcriptions");
  url.searchParams.set("sort", params.sort ?? "random");
  url.searchParams.set("limit", String(params.limit ?? 20));

  if (params.transLang) {
    url.searchParams.set("trans:lang", params.transLang);
    url.searchParams.set("trans:has_audio", "yes");
    url.searchParams.set("showtrans:lang", params.transLang);
  }
  if (params.nativeOnly) {
    url.searchParams.set("is_native", "yes");
  }

  return url.toString();
}

// ── Fetchers ───────────────────────────────────────────────────────────

export type TatoebaResult<T> =
  | { ok: true; url: string; data: T }
  | { ok: false; url: string; error: TatoebaError | { message: string } };

// Geen caching: voor de playground willen we elke request live zien.
async function fetchJson<T>(url: string): Promise<TatoebaResult<T>> {
  try {
    const res = await fetch(url, { cache: "no-store" });
    const json = (await res.json()) as T | TatoebaError;
    if (!res.ok || (json as TatoebaError).code !== undefined) {
      return { ok: false, url, error: json as TatoebaError };
    }
    return { ok: true, url, data: json as T };
  } catch (e) {
    return {
      ok: false,
      url,
      error: { message: e instanceof Error ? e.message : "Unknown error" },
    };
  }
}

export function listAudios(
  params: AudioListParams,
): Promise<TatoebaResult<TatoebaAudioListResponse>> {
  return fetchJson<TatoebaAudioListResponse>(buildAudioListUrl(params));
}

export function listSentencesWithAudio(
  params: SentenceWithAudioParams,
): Promise<TatoebaResult<TatoebaSentenceListResponse>> {
  return fetchJson<TatoebaSentenceListResponse>(
    buildSentenceWithAudioUrl(params),
  );
}

// ── Binary fetch (endpoint C) ──────────────────────────────────────────

export type AudioBinaryResult =
  | {
      ok: true;
      url: string;
      bytes: ArrayBuffer;
      contentType: string;
      status: number;
    }
  | {
      ok: false;
      url: string;
      status: number;
      reason: "licence_forbids_reuse" | "not_found" | "bad_request" | "other";
      message: string;
    };

// Haalt de mp3 op via de API. We prefereren deze route boven de directe
// `download_url` omdat de API expliciet 403 teruggeeft als de licentie
// hergebruik verbiedt — dat is een betrouwbare licentie-gate die we niet
// kunnen zien aan de CDN-URL zelf.
export async function fetchAudioBinary(
  audioId: number,
): Promise<AudioBinaryResult> {
  const url = TATOEBA_AUDIO_FILE_URL(audioId);
  try {
    const res = await fetch(url, { cache: "no-store" });

    if (res.status === 403) {
      return {
        ok: false,
        url,
        status: 403,
        reason: "licence_forbids_reuse",
        message:
          "De auteur staat hergebruik buiten Tatoeba niet toe (HTTP 403).",
      };
    }
    if (res.status === 404) {
      return {
        ok: false,
        url,
        status: 404,
        reason: "not_found",
        message: "Audio niet gevonden of verwijderd (HTTP 404).",
      };
    }
    if (res.status === 400) {
      return {
        ok: false,
        url,
        status: 400,
        reason: "bad_request",
        message: "Ongeldige audio-id (HTTP 400).",
      };
    }
    if (!res.ok) {
      return {
        ok: false,
        url,
        status: res.status,
        reason: "other",
        message: `Onverwachte status: ${res.status} ${res.statusText}`,
      };
    }

    const bytes = await res.arrayBuffer();
    const contentType = res.headers.get("content-type") ?? "audio/mpeg";
    return { ok: true, url, bytes, contentType, status: res.status };
  } catch (e) {
    return {
      ok: false,
      url,
      status: 0,
      reason: "other",
      message: e instanceof Error ? e.message : "Unknown error",
    };
  }
}
