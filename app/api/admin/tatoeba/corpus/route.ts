import { embedMany } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";

import {
  TATOEBA_SEARCH_EMBED_DIMS,
  TATOEBA_SEARCH_EMBED_MODEL,
} from "@/lib/ai/tatoeba-search-config";
import { buildAudioListUrl } from "@/lib/api/tatoeba-audio";

import type {
  TatoebaAudioListResponse,
  TatoebaError,
} from "@/lib/api/tatoeba-audio";
import type { AudioRow } from "@/types/tatoeba";

// Corpus-route voor Tatoeba-import:
//   1. Pagineert Tatoeba's /unstable/audios in chunks van 100 tot de
//      gevraagde `limit` is bereikt of er geen volgende pagina meer is.
//   2. Embed elke `sentence_text` via `text-embedding-3-small` met
//      `dimensions: 512` — multilingual zodat een Nederlandse query
//      een Spaanse zin kan matchen, en compact genoeg om met records
//      samen onder de localStorage-cap te blijven.
//
// De pagineer-loop is een copy van de logica in
// [list/route.ts](../tatoeba-audio/list/route.ts). Bewust een copy
// in plaats van een gedeelde helper: de twee routes hebben subtiel
// andere caps (list = onbegrensd, search = max 2000) en het is
// makkelijker om elk z'n eigen flow te laten houden dan een helper
// te ontwerpen die beide gevallen elegant afdekt.

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const PAGE_SIZE = 100;
// Iets ruimer dan de 500 die de UI default gebruikt, om met top-K
// experimenten boven 1k te kunnen testen, zonder kosten/latency
// uit de hand te laten lopen.
const MAX_LIMIT = 2000;

const querySchema = z.object({
  lang: z
    .string()
    .min(2)
    .max(4)
    .regex(/^[a-z]+$/, "lang moet een ISO 639-3 code zijn (kleine letters)")
    .default("spa"),
  limit: z.coerce.number().int().min(1).max(MAX_LIMIT).default(500),
});

export type CorpusSuccess = {
  ok: true;
  lang: string;
  fetched_at: string;
  rows: AudioRow[];
  embeddings: number[][];
  dims: number;
  pages_fetched: number;
};

export type CorpusFailure = {
  ok: false;
  error: string;
  reason?: "validation" | "no_api_key" | "tatoeba_failed" | "openai_failed";
  url?: string;
};

export type CorpusResponse = CorpusSuccess | CorpusFailure;

export async function GET(req: Request): Promise<Response> {
  const reqUrl = new URL(req.url);
  const parse = querySchema.safeParse({
    lang: reqUrl.searchParams.get("lang") ?? undefined,
    limit: reqUrl.searchParams.get("limit") ?? undefined,
  });

  if (!parse.success) {
    return Response.json(
      {
        ok: false,
        error: "Validatie mislukt.",
        reason: "validation",
      } satisfies CorpusFailure,
      { status: 400 },
    );
  }

  const { lang, limit } = parse.data;

  if (!process.env.OPENAI_API_KEY) {
    return Response.json(
      {
        ok: false,
        error: "OPENAI_API_KEY is niet geconfigureerd op de server.",
        reason: "no_api_key",
      } satisfies CorpusFailure,
      { status: 500 },
    );
  }

  // ── 1. Pagineer Tatoeba ─────────────────────────────────────────
  const firstUrl = buildAudioListUrl({
    lang,
    limit: Math.min(limit, PAGE_SIZE),
  });

  const collected: TatoebaAudioListResponse["data"] = [];
  let nextUrl: string | undefined = firstUrl;
  let pagesFetched = 0;

  while (nextUrl && collected.length < limit) {
    const page = await fetchPage(nextUrl);
    if (!page.ok) {
      return Response.json(
        {
          ok: false,
          error: page.error,
          reason: "tatoeba_failed",
          url: firstUrl,
        } satisfies CorpusFailure,
        { status: 502 },
      );
    }
    collected.push(...page.data.data);
    pagesFetched += 1;
    nextUrl =
      page.data.paging?.has_next && page.data.paging?.next
        ? page.data.paging.next
        : undefined;
  }

  const trimmed = collected.slice(0, limit);
  const rows: AudioRow[] = trimmed.map((audio) => {
    const sentenceLang = audio.sentence.lang ?? lang;
    return {
      audio_id: audio.id,
      sentence_id: audio.sentence.id,
      sentence_text: audio.sentence.text,
      lang: sentenceLang,
      author: audio.author ?? "",
      license: audio.license ?? "",
      created: audio.created,
      mp3_url: `https://audio.tatoeba.org/sentences/${sentenceLang}/${audio.sentence.id}.mp3`,
      download_url: audio.download_url,
      attribution_url: audio.attribution_url ?? "",
    };
  });

  if (rows.length === 0) {
    // Niets om te embedden; geef lege response terug zonder OpenAI te
    // bellen (kost anders een leeg request + foutmelding).
    return Response.json({
      ok: true,
      lang,
      fetched_at: new Date().toISOString(),
      rows: [],
      embeddings: [],
      dims: TATOEBA_SEARCH_EMBED_DIMS,
      pages_fetched: pagesFetched,
    } satisfies CorpusSuccess);
  }

  // ── 2. Embed alle sentence_text in één batch ────────────────────
  // `embedMany` chunkt zelf naar de model-limit (3072 inputs voor
  // text-embedding-3-small per request) — voor 500 zinnen dus één call.
  try {
    const result = await embedMany({
      model: openai.textEmbeddingModel(TATOEBA_SEARCH_EMBED_MODEL),
      values: rows.map((r) => r.sentence_text),
      providerOptions: {
        openai: {
          dimensions: TATOEBA_SEARCH_EMBED_DIMS,
        },
      },
    });

    return Response.json({
      ok: true,
      lang,
      fetched_at: new Date().toISOString(),
      rows,
      embeddings: result.embeddings,
      dims: TATOEBA_SEARCH_EMBED_DIMS,
      pages_fetched: pagesFetched,
    } satisfies CorpusSuccess);
  } catch (e) {
    return Response.json(
      {
        ok: false,
        error: e instanceof Error ? e.message : "Onbekende OpenAI-fout.",
        reason: "openai_failed",
      } satisfies CorpusFailure,
      { status: 502 },
    );
  }
}

type PageResult =
  | { ok: true; data: TatoebaAudioListResponse }
  | { ok: false; error: string };

async function fetchPage(url: string): Promise<PageResult> {
  try {
    const res = await fetch(url, { cache: "no-store" });
    const json = (await res.json()) as TatoebaAudioListResponse | TatoebaError;
    if (!res.ok || (json as TatoebaError).code !== undefined) {
      const err = json as TatoebaError;
      return {
        ok: false,
        error: err.message ?? `Tatoeba HTTP ${res.status}`,
      };
    }
    return { ok: true, data: json as TatoebaAudioListResponse };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Onbekende fetch-fout",
    };
  }
}
