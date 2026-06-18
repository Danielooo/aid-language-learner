import { z } from "zod";

import { buildAudioListUrl } from "@/lib/api/tatoeba-audio";

import type {
  TatoebaAudioListResponse,
  TatoebaError,
} from "@/lib/api/tatoeba-audio";

// Lijst-route voor de tabelweergave op /dev/tatoeba-audio: haalt
// server-side audios op uit /unstable/audios en pagineert door
// `paging.next` totdat de gevraagde limit is bereikt of er geen
// volgende pagina meer is. Server-side om CORS-onzekerheid van
// api.tatoeba.org te vermijden, identiek aan probe/download/upload-
// routes hiernaast.
//
// Filteren gebeurt client-side in de tabel (zie audio-table.tsx);
// deze route doet alleen ophalen + pagineren.

export const dynamic = "force-dynamic";
// Hogere ceiling zodat grote limit-waarden (bv. 5000+ rijen via
// meerdere paginas) niet halverwege gekapt worden door Vercel's
// default. Dev-only route, dus de kosten zijn beperkt.
export const maxDuration = 60;

// Tatoeba's eigen per-request cap. We sturen nooit meer dan dit per
// pagina; bij een hogere user-limit doen we N opeenvolgende calls.
const PAGE_SIZE = 100;

const querySchema = z.object({
  lang: z
    .string()
    .min(2)
    .max(4)
    .regex(/^[a-z]+$/, "lang moet een ISO 639-3 code zijn (kleine letters)")
    .default("spa"),
  // Geen bovengrens: gebruiker kan de limit "oneindig hoog" zetten.
  // De pagineer-loop stopt vanzelf bij has_next=false.
  limit: z.coerce.number().int().min(1).default(100),
});

export type AudioRow = {
  audio_id: number;
  sentence_id: number;
  sentence_text: string;
  lang: string;
  author: string;
  // Lege string betekent "geen herbruikbare licentie" volgens Tatoeba.
  license: string;
  created: string | null;
  // Werkende CDN-URL voor de mp3 — opgebouwd uit lang + sentence_id.
  // Het 'download_url' uit de API zelf wijst naar /unstable/audio/{id}/file
  // dat momenteel 404 geeft, dus we exposen die niet aan de tabel.
  mp3_url: string;
  download_url: string;
  attribution_url: string;
};

export type AudioListSuccess = {
  ok: true;
  url: string;
  total: number;
  pages_fetched: number;
  rows: AudioRow[];
};

export type AudioListFailure = {
  ok: false;
  error: string;
  url?: string;
};

export type AudioListResponse = AudioListSuccess | AudioListFailure;

export async function GET(req: Request) {
  const reqUrl = new URL(req.url);
  const parse = querySchema.safeParse({
    lang: reqUrl.searchParams.get("lang") ?? undefined,
    limit: reqUrl.searchParams.get("limit") ?? undefined,
  });

  if (!parse.success) {
    return Response.json(
      { ok: false, error: "Validatie mislukt.", issues: parse.error.issues },
      { status: 400 },
    );
  }

  const { lang, limit: requestedLimit } = parse.data;
  const firstUrl = buildAudioListUrl({
    lang,
    limit: Math.min(requestedLimit, PAGE_SIZE),
  });

  const collected: TatoebaAudioListResponse["data"] = [];
  let nextUrl: string | undefined = firstUrl;
  let totalAvailable = 0;
  let pagesFetched = 0;

  while (nextUrl && collected.length < requestedLimit) {
    const page = await fetchPage(nextUrl);
    if (!page.ok) {
      return Response.json(
        {
          ok: false,
          error: page.error,
          url: firstUrl,
        } satisfies AudioListFailure,
        { status: 502 },
      );
    }
    collected.push(...page.data.data);
    totalAvailable = page.data.paging?.total ?? totalAvailable;
    pagesFetched += 1;
    nextUrl =
      page.data.paging?.has_next && page.data.paging?.next
        ? page.data.paging.next
        : undefined;
  }

  const trimmed = collected.slice(0, requestedLimit);

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

  return Response.json({
    ok: true,
    url: firstUrl,
    total: totalAvailable || rows.length,
    pages_fetched: pagesFetched,
    rows,
  } satisfies AudioListSuccess);
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
