import { z } from "zod";

import { fetchAudioBinary } from "@/lib/api/tatoeba-audio";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

// Persist-route voor /dev/tatoeba-audio-search. Verzorgt twee modes
// in één endpoint:
//
//   1. mode: "preflight" → checkt op dubbeling (audio_id of sentence_id)
//      en geeft de bestaande conflict-rijen per audio_id terug. De UI
//      toont die in een dialoog en laat de user per conflict kiezen
//      "alleen oude" / "alleen nieuwe" / "beide bewaren".
//   2. mode: "apply" → voert de daadwerkelijke persist uit met de
//      gekozen resoluties. Bij elke "in te voegen" rij doen we:
//        a) licentie-gate (lege license = no-reuse → skip),
//        b) mp3 binary ophalen via fetchAudioBinary,
//        c) upload naar Supabase Storage bucket `tatoeba-audio`,
//        d) insert in `exercises` met owner_id = NULL (publieke seed).
//
// Bewust geen UNIQUE constraint in de DB — "beide bewaren" zou anders
// de hele apply-call laten falen. Duplicate-detect blijft daardoor
// hier in de application-code.
//
// We gebruiken `getSupabaseAdmin()` (service-role) voor zowel de bucket-
// upload (RLS bypass) als de exercises-insert: owner_id = NULL kan niet
// via een normale authenticated client omdat de RLS-policy
// `with check (owner_id = auth.uid())` dat blokkeert.

export const dynamic = "force-dynamic";
// Persist-flow doet per item een netwerk-call naar Tatoeba + een upload
// naar Supabase. 60s ceiling laat ons batches tot ~30 records aan
// voordat we client-side moeten splitsen.
export const maxDuration = 60;

// ── Schemas ──────────────────────────────────────────────────────────

const persistItemSchema = z.object({
  audio_id: z.number().int().positive(),
  sentence_id: z.number().int().positive(),
  sentence_text: z.string().min(1),
  source_lang: z
    .string()
    .min(2)
    .max(4)
    .regex(/^[a-z]+$/, "lang moet een ISO 639-3 code zijn (kleine letters)"),
  target_text: z.string().min(1),
  topic: z.string().nullable().optional(),
  license: z.string(),
  author: z.string(),
  attribution_url: z.string().url().optional().or(z.literal("")),
  // True wanneer de user de auto-vertaling handmatig heeft aangepast
  // (dubbelklik in de tabel). Default false zodat oude clients
  // (zonder dit veld in de body) ongemoeid blijven werken.
  target_text_manually_edited: z.boolean().default(false),
  // Door de user toegevoegde extra correcte vertalingen — gebruikt voor
  // de toekomstige `markAsAlsoCorrect`-quizfeature uit IDEEFASE.md.
  alternative_translations: z.array(z.string().min(1)).default([]),
});

const resolutionSchema = z.enum(["skip", "replace", "both"]);

const requestSchema = z.discriminatedUnion("mode", [
  z.object({
    mode: z.literal("preflight"),
    items: z.array(persistItemSchema).min(1).max(100),
  }),
  z.object({
    mode: z.literal("apply"),
    items: z.array(persistItemSchema).min(1).max(100),
    // Map per audio_id (als string-key, want JSON heeft geen number-keys).
    resolutions: z.record(z.string(), resolutionSchema).default({}),
  }),
]);

export type PersistItem = z.infer<typeof persistItemSchema>;
export type PersistResolution = z.infer<typeof resolutionSchema>;

// ── Response-types (geëxporteerd voor UI-typing) ─────────────────────

export type ExistingConflictRow = {
  id: string;
  tatoeba_audio_id: number | null;
  tatoeba_sentence_id: number | null;
  source_text: string;
  target_text: string;
  source_lang: string | null;
  audio_path: string | null;
  created_at: string;
};

export type PreflightSuccess = {
  ok: true;
  mode: "preflight";
  // Key = nieuwe audio_id van het PersistItem; waarde = bestaande rijen
  // die op audio_id óf sentence_id matchen. Lege array = geen conflict.
  conflicts: Record<string, ExistingConflictRow[]>;
};

export type ApplyResultStatus =
  | "inserted"
  | "replaced"
  | "kept_both"
  | "skipped_conflict"
  | "skipped_license"
  | "error";

export type ApplyItemResult = {
  audio_id: number;
  sentence_id: number;
  status: ApplyResultStatus;
  // Aanwezig bij inserted/replaced/kept_both: de id van de nieuwe rij.
  inserted_exercise_id?: string;
  // Aanwezig bij replaced: de id's van de verwijderde oude rijen.
  replaced_exercise_ids?: string[];
  audio_path?: string;
  byte_size?: number;
  error?: string;
};

export type ApplySuccess = {
  ok: true;
  mode: "apply";
  results: ApplyItemResult[];
  summary: {
    inserted: number;
    replaced: number;
    kept_both: number;
    skipped_conflict: number;
    skipped_license: number;
    errors: number;
  };
};

export type PersistFailure = {
  ok: false;
  error: string;
  issues?: unknown;
};

export type PersistResponse = PreflightSuccess | ApplySuccess | PersistFailure;

// ── Handler ──────────────────────────────────────────────────────────

export async function POST(req: Request): Promise<Response> {
  let parsedBody: unknown;
  try {
    parsedBody = await req.json();
  } catch {
    return Response.json(
      { ok: false, error: "Body is geen geldige JSON." } satisfies PersistFailure,
      { status: 400 },
    );
  }

  const parsed = requestSchema.safeParse(parsedBody);
  if (!parsed.success) {
    return Response.json(
      {
        ok: false,
        error: "Validatie mislukt.",
        issues: parsed.error.issues,
      } satisfies PersistFailure,
      { status: 400 },
    );
  }

  const supabase = getSupabaseAdmin();

  if (parsed.data.mode === "preflight") {
    return handlePreflight(parsed.data.items, supabase);
  }
  return handleApply(parsed.data.items, parsed.data.resolutions, supabase);
}

// Preflight: één gerichte query op de bestaande exercises-rijen.
async function handlePreflight(
  items: PersistItem[],
  supabase: ReturnType<typeof getSupabaseAdmin>,
): Promise<Response> {
  const audioIds = items.map((i) => i.audio_id);
  const sentenceIds = items.map((i) => i.sentence_id);

  const { data, error } = await supabase
    .from("exercises")
    .select(
      "id, tatoeba_audio_id, tatoeba_sentence_id, source_text, target_text, source_lang, audio_path, created_at",
    )
    .or(
      `tatoeba_audio_id.in.(${audioIds.join(",")}),tatoeba_sentence_id.in.(${sentenceIds.join(",")})`,
    );

  if (error) {
    return Response.json(
      {
        ok: false,
        error: `Preflight-query mislukt: ${error.message}`,
      } satisfies PersistFailure,
      { status: 500 },
    );
  }

  const existing = (data ?? []) as ExistingConflictRow[];
  const conflicts: Record<string, ExistingConflictRow[]> = {};
  for (const item of items) {
    const matches = existing.filter(
      (row) =>
        row.tatoeba_audio_id === item.audio_id ||
        row.tatoeba_sentence_id === item.sentence_id,
    );
    conflicts[String(item.audio_id)] = matches;
  }

  return Response.json({
    ok: true,
    mode: "preflight",
    conflicts,
  } satisfies PreflightSuccess);
}

// Apply: per item de juiste actie afhankelijk van resolutie + conflict-status.
async function handleApply(
  items: PersistItem[],
  resolutions: Record<string, PersistResolution>,
  supabase: ReturnType<typeof getSupabaseAdmin>,
): Promise<Response> {
  // Eén keer alle conflict-rijen ophalen (zelfde query als preflight)
  // zodat we sequentieel niet voor elke item een ronde maken.
  const audioIds = items.map((i) => i.audio_id);
  const sentenceIds = items.map((i) => i.sentence_id);

  const { data: existingData, error: existingError } = await supabase
    .from("exercises")
    .select(
      "id, tatoeba_audio_id, tatoeba_sentence_id, source_text, target_text, source_lang, audio_path, created_at",
    )
    .or(
      `tatoeba_audio_id.in.(${audioIds.join(",")}),tatoeba_sentence_id.in.(${sentenceIds.join(",")})`,
    );

  if (existingError) {
    return Response.json(
      {
        ok: false,
        error: `Conflict-lookup mislukt: ${existingError.message}`,
      } satisfies PersistFailure,
      { status: 500 },
    );
  }

  const existing = (existingData ?? []) as ExistingConflictRow[];
  const results: ApplyItemResult[] = [];

  for (const item of items) {
    const conflictRows = existing.filter(
      (row) =>
        row.tatoeba_audio_id === item.audio_id ||
        row.tatoeba_sentence_id === item.sentence_id,
    );
    const resolution = resolutions[String(item.audio_id)];

    // Bij een conflict zónder resolutie defaulten we naar skip — dan
    // weet de UI dat ie eerst preflight moet runnen.
    if (conflictRows.length > 0 && !resolution) {
      results.push({
        audio_id: item.audio_id,
        sentence_id: item.sentence_id,
        status: "skipped_conflict",
        error: "Conflict gevonden, geen resolutie meegegeven.",
      });
      continue;
    }

    if (conflictRows.length > 0 && resolution === "skip") {
      results.push({
        audio_id: item.audio_id,
        sentence_id: item.sentence_id,
        status: "skipped_conflict",
      });
      continue;
    }

    // Replace = oude rijen + bijbehorende mp3-objecten weg, daarna insert.
    let replacedIds: string[] | undefined;
    if (conflictRows.length > 0 && resolution === "replace") {
      const oldIds = conflictRows.map((c) => c.id);
      const oldPaths = conflictRows
        .map((c) => c.audio_path)
        .filter((p): p is string => typeof p === "string" && p.length > 0);

      const { error: deleteRowsError } = await supabase
        .from("exercises")
        .delete()
        .in("id", oldIds);
      if (deleteRowsError) {
        results.push({
          audio_id: item.audio_id,
          sentence_id: item.sentence_id,
          status: "error",
          error: `Verwijderen oude rijen mislukt: ${deleteRowsError.message}`,
        });
        continue;
      }
      // Best-effort: storage-fout laten we niet de hele apply-call killen,
      // de oude rijen zijn al weg en de nieuwe upload upserten op pad.
      if (oldPaths.length > 0) {
        await supabase.storage.from("tatoeba-audio").remove(oldPaths);
      }
      replacedIds = oldIds;
    }

    // Vanaf hier: insert-flow. Eerst licentie-gate.
    if (item.license.trim() === "") {
      results.push({
        audio_id: item.audio_id,
        sentence_id: item.sentence_id,
        status: "skipped_license",
        error: "Licentie verbiedt hergebruik.",
      });
      continue;
    }

    const binary = await fetchAudioBinary(item.audio_id);
    if (!binary.ok) {
      results.push({
        audio_id: item.audio_id,
        sentence_id: item.sentence_id,
        status: "error",
        error: `Tatoeba binary fetch faalde (${binary.reason}): ${binary.message}`,
      });
      continue;
    }

    const path = `${item.source_lang}/${item.sentence_id}/${item.audio_id}.mp3`;
    const byteSize = binary.bytes.byteLength;

    const { error: uploadError } = await supabase.storage
      .from("tatoeba-audio")
      .upload(path, binary.bytes, {
        contentType: binary.contentType,
        upsert: true,
        metadata: {
          source: "tatoeba",
          audio_id: String(item.audio_id),
          sentence_id: String(item.sentence_id),
          lang: item.source_lang,
          license: item.license,
          author: item.author,
          attribution_url: item.attribution_url ?? "",
        },
      });

    if (uploadError) {
      results.push({
        audio_id: item.audio_id,
        sentence_id: item.sentence_id,
        status: "error",
        error: `Bucket-upload mislukt: ${uploadError.message}`,
      });
      continue;
    }

    const { data: insertedRow, error: insertError } = await supabase
      .from("exercises")
      .insert({
        source_text: item.sentence_text,
        target_text: item.target_text,
        topic: item.topic ?? null,
        owner_id: null,
        source_lang: item.source_lang,
        audio_path: path,
        tatoeba_audio_id: item.audio_id,
        tatoeba_sentence_id: item.sentence_id,
        tatoeba_author: item.author,
        tatoeba_license: item.license,
        tatoeba_attribution_url: item.attribution_url ?? "",
        target_text_manually_edited: item.target_text_manually_edited,
        alternative_translations: item.alternative_translations,
      })
      .select("id")
      .single();

    if (insertError || !insertedRow) {
      results.push({
        audio_id: item.audio_id,
        sentence_id: item.sentence_id,
        status: "error",
        error: `Exercises-insert mislukt: ${insertError?.message ?? "onbekend"}`,
      });
      continue;
    }

    const status: ApplyResultStatus = replacedIds
      ? "replaced"
      : conflictRows.length > 0 && resolution === "both"
        ? "kept_both"
        : "inserted";

    results.push({
      audio_id: item.audio_id,
      sentence_id: item.sentence_id,
      status,
      inserted_exercise_id: insertedRow.id,
      replaced_exercise_ids: replacedIds,
      audio_path: path,
      byte_size: byteSize,
    });
  }

  // Aggregaat-summary voor de UI-toast.
  const summary = {
    inserted: 0,
    replaced: 0,
    kept_both: 0,
    skipped_conflict: 0,
    skipped_license: 0,
    errors: 0,
  };
  for (const r of results) {
    if (r.status === "inserted") summary.inserted += 1;
    else if (r.status === "replaced") summary.replaced += 1;
    else if (r.status === "kept_both") summary.kept_both += 1;
    else if (r.status === "skipped_conflict") summary.skipped_conflict += 1;
    else if (r.status === "skipped_license") summary.skipped_license += 1;
    else if (r.status === "error") summary.errors += 1;
  }

  return Response.json({
    ok: true,
    mode: "apply",
    results,
    summary,
  } satisfies ApplySuccess);
}
