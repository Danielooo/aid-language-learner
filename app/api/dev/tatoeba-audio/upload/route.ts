import { z } from "zod";

import { fetchAudioBinary } from "@/lib/api/tatoeba-audio";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

// Upload-route voor /dev/tatoeba-audio. Stroomt een Tatoeba audio-bestand
// via deze server door naar de Supabase Storage-bucket `tatoeba-audio`.
//
// Waarom server-side i.p.v. direct client → Tatoeba → Supabase:
//   1. CORS: Tatoeba's CDN serveert geen Access-Control-Allow-Origin voor
//      arbitraire browser-clients; een fetch vanaf de browser zou falen
//      met een opaque response.
//   2. Licentie-gate: GET /v1/audios/{id}/file geeft 403 als de auteur
//      hergebruik buiten Tatoeba verbiedt — die check willen we bindend
//      door de server laten doen voordat iets in onze bucket terechtkomt.
//   3. Service-role schrijven: alleen de admin-client mag in de bucket
//      schrijven (RLS bypass); die mag niet in de browser-bundle leven.
//
// Voor de UI returnen we zowel de echo van de request body als de Supabase-
// response, plus de bestandsgrootte, zodat het debug-panel laat zien wat er
// precies heen-en-weer ging.

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const requestSchema = z.object({
  audio_id: z.number().int().positive(),
  lang: z
    .string()
    .min(2)
    .max(4)
    .regex(/^[a-z]+$/, "lang moet een ISO 639-3 code zijn (kleine letters)"),
  sentence_id: z.number().int().positive(),
  license: z.string(),
  author: z.string(),
  attribution_url: z.string().url().optional().or(z.literal("")),
  sentence_text: z.string().min(1),
});

export async function POST(req: Request) {
  let parsedBody: unknown;
  try {
    parsedBody = await req.json();
  } catch {
    return Response.json(
      { ok: false, error: "Body is geen geldige JSON." },
      { status: 400 },
    );
  }

  const parseResult = requestSchema.safeParse(parsedBody);
  if (!parseResult.success) {
    return Response.json(
      {
        ok: false,
        error: "Validatie mislukt.",
        issues: parseResult.error.issues,
      },
      { status: 400 },
    );
  }

  const body = parseResult.data;

  // Vroege licentie-gate vóór de API-call: lege string betekent "geen
  // herbruikbare licentie" volgens Tatoeba's downloads-pagina. We laten
  // de API-call dan over, maar tonen wel duidelijk waarom in de response.
  if (body.license.trim() === "") {
    return Response.json(
      {
        ok: false,
        error: "Geen herbruikbare licentie — upload geweigerd.",
        reason: "license_forbids_reuse",
        requestBody: body,
      },
      { status: 403 },
    );
  }

  const binaryResult = await fetchAudioBinary(body.audio_id);
  if (!binaryResult.ok) {
    return Response.json(
      {
        ok: false,
        error: binaryResult.message,
        reason: binaryResult.reason,
        tatoebaUrl: binaryResult.url,
        tatoebaStatus: binaryResult.status,
        requestBody: body,
      },
      { status: binaryResult.status >= 400 ? binaryResult.status : 502 },
    );
  }

  const bucket = "tatoeba-audio";
  const path = `${body.lang}/${body.sentence_id}/${body.audio_id}.mp3`;
  const byteSize = binaryResult.bytes.byteLength;

  // De admin-client bypassed RLS — strikt nodig hier omdat de bucket
  // geen INSERT-policy heeft voor anon/authenticated.
  const supabase = getSupabaseAdmin();

  const uploadArgs = {
    bucket,
    path,
    contentType: binaryResult.contentType,
    byteSize,
    upsert: true,
    metadata: {
      source: "tatoeba",
      audio_id: String(body.audio_id),
      sentence_id: String(body.sentence_id),
      lang: body.lang,
      license: body.license,
      author: body.author,
      attribution_url: body.attribution_url ?? "",
    },
  };

  const { data: uploadData, error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(path, binaryResult.bytes, {
      contentType: binaryResult.contentType,
      upsert: true,
      metadata: uploadArgs.metadata,
    });

  const supabaseResponse = {
    data: uploadData,
    error: uploadError
      ? { message: uploadError.message, name: uploadError.name }
      : null,
  };

  if (uploadError) {
    return Response.json(
      {
        ok: false,
        error: uploadError.message,
        reason: "supabase_upload_failed",
        requestBody: body,
        uploadArgs,
        supabaseResponse,
      },
      { status: 500 },
    );
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from(bucket).getPublicUrl(path);

  return Response.json({
    ok: true,
    path,
    public_url: publicUrl,
    byte_size: byteSize,
    content_type: binaryResult.contentType,
    tatoeba_url: binaryResult.url,
    requestBody: body,
    uploadArgs,
    supabaseResponse,
  });
}
