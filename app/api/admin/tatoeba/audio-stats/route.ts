import { assertAdmin } from "@/lib/auth/assert-admin";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

// Stats-route voor het uitklapbare dashboard onderaan
// Tatoeba-import. Telt per `source_lang` hoeveel global
// exercises-rijen een `audio_path` hebben.

export const dynamic = "force-dynamic";
export const maxDuration = 10;

export type AudioStatsSuccess = {
  ok: true;
  total_with_audio: number;
  // Per ISO-639-3 taalcode het aantal oefeningen met audio_path.
  lang_counts: Record<string, number>;
  fetched_at: string;
};

export type AudioStatsFailure = {
  ok: false;
  error: string;
};

export type AudioStatsResponse = AudioStatsSuccess | AudioStatsFailure;

export async function GET(): Promise<Response> {
  const auth = await assertAdmin();
  if (!auth.ok) return auth.response;
  const supabase = getSupabaseAdmin();

  // Supabase-js heeft geen group-by helper; we halen alleen de
  // `source_lang`-kolom op voor rijen met audio_path en aggregeren
  // client-side. Aantallen blijven klein (< 10K) dus dat is prima;
  // de partial index `exercises_audio_path_lang_idx` houdt 'm snel.
  const { data, error } = await supabase
    .from("exercises")
    .select("source_lang")
    .is("owner_id", null)
    .not("audio_path", "is", null);

  if (error) {
    return Response.json(
      {
        ok: false,
        error: `Stats-query mislukt: ${error.message}`,
      } satisfies AudioStatsFailure,
      { status: 500 },
    );
  }

  const counts: Record<string, number> = {};
  for (const row of data ?? []) {
    const lang =
      typeof row.source_lang === "string" && row.source_lang.length > 0
        ? row.source_lang
        : "unknown";
    counts[lang] = (counts[lang] ?? 0) + 1;
  }

  return Response.json({
    ok: true,
    total_with_audio: data?.length ?? 0,
    lang_counts: counts,
    fetched_at: new Date().toISOString(),
  } satisfies AudioStatsSuccess);
}
