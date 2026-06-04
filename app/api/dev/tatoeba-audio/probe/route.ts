import { z } from "zod";

import type { ProbeCandidate } from "@/app/dev/tatoeba-audio/_components/types";

// Probe-route: voert server-side HEAD-requests uit op de kandidaat-URL's
// waar een Tatoeba-audio zou kunnen leven. Browser-side kan dat niet
// (CORS + Mixed Content + algemeen onvoorspelbaar gedrag van <audio>).
//
// Gevonden door empirisch curl-onderzoek:
//   ✓ audio.tatoeba.org/sentences/{lang}/{sentence_id}.mp3   (de CDN; geen
//       Content-Disposition, ideaal voor inline <audio>-playback)
//   ✓ tatoeba.org/audio/download/{audio_id}                  (volgt 301 → 200;
//       levert Content-Disposition: attachment; filename="{sid}-{aid}.mp3")
//   ✗ api.tatoeba.org/unstable/audio/{id}/file               (404; helaas
//       wel wat het 'download_url'-veld in de API-response retourneert)
//   ✗ api.tatoeba.org/v1/audios/{id}/file                    (404; beloofd
//       in de OpenAPI-spec maar momenteel kapot)
//
// We probieren ze allemaal zodat de user in de UI kan zien wat er werkt
// en niet werkt. De UI presenteert vervolgens de werkende opties als
// 'viable download options'.

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const querySchema = z.object({
  audio_id: z.coerce.number().int().positive(),
  sentence_id: z.coerce.number().int().positive(),
  lang: z
    .string()
    .min(2)
    .max(4)
    .regex(/^[a-z]+$/, "lang moet een ISO 639-3 code zijn (kleine letters)"),
  download_url: z.string().url().optional(),
});

export async function GET(req: Request) {
  const url = new URL(req.url);
  const parse = querySchema.safeParse({
    audio_id: url.searchParams.get("audio_id"),
    sentence_id: url.searchParams.get("sentence_id"),
    lang: url.searchParams.get("lang"),
    download_url: url.searchParams.get("download_url") ?? undefined,
  });

  if (!parse.success) {
    return Response.json(
      { ok: false, error: "Validatie mislukt.", issues: parse.error.issues },
      { status: 400 },
    );
  }

  const { audio_id, sentence_id, lang, download_url } = parse.data;

  const candidates: Array<{ label: string; url: string }> = [
    {
      label: "CDN (per sentence_id)",
      url: `https://audio.tatoeba.org/sentences/${lang}/${sentence_id}.mp3`,
    },
    {
      label: "tatoeba.org download (per audio_id)",
      url: `https://tatoeba.org/audio/download/${audio_id}`,
    },
    {
      label: "API binary endpoint (/v1)",
      url: `https://api.tatoeba.org/v1/audios/${audio_id}/file`,
    },
  ];

  // De download_url uit het API-veld erbij, mits het iets nieuws toevoegt.
  if (
    download_url &&
    !candidates.some((c) => c.url === download_url) &&
    isAllowedHost(download_url)
  ) {
    candidates.push({
      label: "download_url uit API-response",
      url: download_url,
    });
  }

  const results = await Promise.all(candidates.map(probeOne));

  return Response.json({ ok: true, candidates: results });
}

const ALLOWED_HOSTS = new Set([
  "audio.tatoeba.org",
  "api.tatoeba.org",
  "tatoeba.org",
]);

function isAllowedHost(url: string): boolean {
  try {
    return ALLOWED_HOSTS.has(new URL(url).hostname);
  } catch {
    return false;
  }
}

async function probeOne(c: {
  label: string;
  url: string;
}): Promise<ProbeCandidate> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    // HEAD volgt redirects (default); content-type/content-length komen
    // uit de uiteindelijke response. Tatoeba doet 301 → /en/... voor
    // taalprefix; dat is prima.
    const res = await fetch(c.url, {
      method: "HEAD",
      redirect: "follow",
      cache: "no-store",
      signal: controller.signal,
    });

    const contentType = res.headers.get("content-type");
    const contentLengthRaw = res.headers.get("content-length");
    const contentDisposition = res.headers.get("content-disposition");

    const isAudio = (contentType ?? "").startsWith("audio/");
    const playable = res.ok && isAudio;
    const downloadable = res.ok && isAudio;

    let reason: string | null = null;
    if (!res.ok) {
      reason = `HTTP ${res.status}`;
    } else if (!isAudio) {
      reason = `Geen audio-content-type (${contentType ?? "onbekend"})`;
    }

    return {
      label: c.label,
      url: c.url,
      status: res.status,
      content_type: contentType,
      content_length: contentLengthRaw ? Number(contentLengthRaw) : null,
      content_disposition: contentDisposition,
      final_url: res.url !== c.url ? res.url : null,
      playable,
      downloadable,
      reason,
    };
  } catch (e) {
    const isAbort = e instanceof Error && e.name === "AbortError";
    return {
      label: c.label,
      url: c.url,
      status: isAbort ? -1 : 0,
      content_type: null,
      content_length: null,
      content_disposition: null,
      final_url: null,
      playable: false,
      downloadable: false,
      reason: isAbort
        ? "Timeout na 8s"
        : e instanceof Error
          ? e.message
          : "Onbekende fout",
    };
  } finally {
    clearTimeout(timeout);
  }
}
