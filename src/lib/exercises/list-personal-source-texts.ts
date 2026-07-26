import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

/** Max aantal Spaanse bronzinnen uit het Leerplan voor dedup (nieuwste eerst). */
export const PERSONAL_SOURCE_TEXTS_CAP = 1000;

export type ListPersonalSourceTextsResult = {
  sourceTexts: string[];
  truncated: boolean;
};

/**
 * Normaliseer `source_text` voor exacte dedup (trim + case-insensitive Spaans).
 */
export function normalizeSourceText(text: string): string {
  return text.trim().toLocaleLowerCase("es");
}

/**
 * Bouw een Set van genormaliseerde bronzinnen (Leerplan + optionele extra's).
 */
export function buildNormalizedSourceTextSet(
  texts: Iterable<string>,
): Set<string> {
  const set = new Set<string>();
  for (const text of texts) {
    const key = normalizeSourceText(text);
    if (key.length > 0) set.add(key);
  }
  return set;
}

/**
 * Alle `source_text`s uit het persoonlijke Leerplan van de user.
 * Cap op nieuwste `PERSONAL_SOURCE_TEXTS_CAP` rijen.
 */
export async function listPersonalSourceTexts(
  supabase: SupabaseClient,
  userId: string,
): Promise<ListPersonalSourceTextsResult> {
  const { data, error } = await supabase
    .from("exercises")
    .select("source_text")
    .eq("owner_id", userId)
    .order("created_at", { ascending: false })
    .limit(PERSONAL_SOURCE_TEXTS_CAP + 1);

  if (error) {
    throw new Error(`Leerplan-bronteksten ophalen mislukt: ${error.message}`);
  }

  const rows = data ?? [];
  const truncated = rows.length > PERSONAL_SOURCE_TEXTS_CAP;
  const sliced = truncated ? rows.slice(0, PERSONAL_SOURCE_TEXTS_CAP) : rows;

  const sourceTexts: string[] = [];
  const seen = new Set<string>();
  for (const row of sliced) {
    const text =
      typeof row.source_text === "string" ? row.source_text.trim() : "";
    if (!text) continue;
    const key = normalizeSourceText(text);
    if (seen.has(key)) continue;
    seen.add(key);
    sourceTexts.push(text);
  }

  return { sourceTexts, truncated };
}
