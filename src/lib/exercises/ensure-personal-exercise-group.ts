import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Zoekt of maakt een persoonlijke oefeningengroep voor deze user + naam.
 * Topic blijft denormalized label; group_id is de echte FK.
 */
export async function ensurePersonalExerciseGroup(
  supabase: SupabaseClient,
  userId: string,
  name: string,
): Promise<{ ok: true; groupId: string } | { ok: false; error: string }> {
  const trimmed = name.trim();
  if (!trimmed) {
    return { ok: false, error: "Groepsnaam mag niet leeg zijn." };
  }

  const { data: existing, error: findError } = await supabase
    .from("exercise_groups")
    .select("id")
    .eq("owner_id", userId)
    .eq("name", trimmed)
    .maybeSingle();

  if (findError) {
    return { ok: false, error: findError.message };
  }
  if (existing?.id) {
    return { ok: true, groupId: existing.id as string };
  }

  const { data: created, error: insertError } = await supabase
    .from("exercise_groups")
    .insert({
      name: trimmed,
      owner_id: userId,
      is_active: true,
    })
    .select("id")
    .maybeSingle();

  if (insertError || !created?.id) {
    return {
      ok: false,
      error: insertError?.message ?? "Groep aanmaken mislukt.",
    };
  }

  return { ok: true, groupId: created.id as string };
}
