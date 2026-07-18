import type { SupabaseClient } from "@supabase/supabase-js";

import { EXERCISE_SELECT_COLUMNS, type ExerciseDbRow } from "@/lib/exercises/types";

type CopySuccess = {
  ok: true;
  personalGroupId: string;
  name: string;
  exerciseCount: number;
};

type CopyFailure = {
  ok: false;
  error: string;
  status: 404 | 409 | 500;
};

/**
 * Kopieert een actieve global groep naar een nieuwe persoonlijke groep
 * en activeert het bijbehorende topic in het leerplan.
 * Faalt met 409 als er al een personal kopie bestaat (zelfde source_group_id
 * of dezelfde naam).
 */
export async function copyGlobalGroupToPersonal(
  supabase: SupabaseClient,
  userId: string,
  globalGroupId: string,
): Promise<CopySuccess | CopyFailure> {
  const { data: globalGroup, error: groupError } = await supabase
    .from("exercise_groups")
    .select("id, name, owner_id, is_active")
    .eq("id", globalGroupId)
    .is("owner_id", null)
    .eq("is_active", true)
    .maybeSingle();

  if (groupError) {
    return { ok: false, error: groupError.message, status: 500 };
  }
  if (!globalGroup) {
    return {
      ok: false,
      error: "Community-oefeningengroep niet gevonden of niet actief.",
      status: 404,
    };
  }

  const groupName = (globalGroup.name as string).trim();
  if (!groupName) {
    return { ok: false, error: "Groepsnaam mag niet leeg zijn.", status: 500 };
  }

  // Eerst op bron-link; daarna naam (legacy copies zonder source_group_id).
  const { data: existingBySource, error: sourceError } = await supabase
    .from("exercise_groups")
    .select("id")
    .eq("owner_id", userId)
    .eq("source_group_id", globalGroupId)
    .maybeSingle();

  if (sourceError) {
    return { ok: false, error: sourceError.message, status: 500 };
  }
  if (existingBySource?.id) {
    return {
      ok: false,
      error: `Je hebt deze community-groep al in je leerplan.`,
      status: 409,
    };
  }

  const { data: existingPersonal, error: existingError } = await supabase
    .from("exercise_groups")
    .select("id")
    .eq("owner_id", userId)
    .eq("name", groupName)
    .maybeSingle();

  if (existingError) {
    return { ok: false, error: existingError.message, status: 500 };
  }
  if (existingPersonal?.id) {
    return {
      ok: false,
      error: `Je hebt al een persoonlijke groep met de naam "${groupName}".`,
      status: 409,
    };
  }

  const { data: members, error: membersError } = await supabase
    .from("exercises")
    .select(EXERCISE_SELECT_COLUMNS)
    .eq("group_id", globalGroupId)
    .is("owner_id", null);

  if (membersError) {
    return { ok: false, error: membersError.message, status: 500 };
  }

  const sourceRows = (members ?? []) as ExerciseDbRow[];
  if (sourceRows.length === 0) {
    return {
      ok: false,
      error: "Deze community-oefeningengroep heeft geen oefeningen.",
      status: 404,
    };
  }

  // Expliciet nieuwe groep: niet find-or-create, zodat rollback veilig is.
  const { data: createdGroup, error: createError } = await supabase
    .from("exercise_groups")
    .insert({
      name: groupName,
      owner_id: userId,
      is_active: true,
      source_group_id: globalGroupId,
    })
    .select("id")
    .maybeSingle();

  if (createError || !createdGroup?.id) {
    // Unieke race: iemand anders maakte dezelfde naam of source-link aan.
    if (createError?.code === "23505") {
      return {
        ok: false,
        error: `Je hebt deze community-groep al in je leerplan (of een groep met dezelfde naam).`,
        status: 409,
      };
    }
    return {
      ok: false,
      error: createError?.message ?? "Persoonlijke groep aanmaken mislukt.",
      status: 500,
    };
  }

  const personalGroupId = createdGroup.id as string;

  const exerciseRows = sourceRows.map((row) => ({
    source_text: row.source_text,
    target_text: row.target_text,
    topic: row.topic ?? groupName,
    tags: row.tags ?? "",
    source_lang: row.source_lang,
    audio_path: row.audio_path,
    tatoeba_audio_id: row.tatoeba_audio_id,
    tatoeba_sentence_id: row.tatoeba_sentence_id,
    tatoeba_author: row.tatoeba_author,
    tatoeba_license: row.tatoeba_license,
    tatoeba_attribution_url: row.tatoeba_attribution_url,
    target_text_manually_edited: row.target_text_manually_edited ?? false,
    alternative_translations: row.alternative_translations ?? [],
    owner_id: userId,
    group_id: personalGroupId,
  }));

  const { error: insertError } = await supabase
    .from("exercises")
    .insert(exerciseRows);

  if (insertError) {
    await supabase.from("exercise_groups").delete().eq("id", personalGroupId);
    return { ok: false, error: insertError.message, status: 500 };
  }

  await supabase.from("user_topic_preferences").upsert(
    {
      user_id: userId,
      topic: groupName,
      is_active: true,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,topic" },
  );

  return {
    ok: true,
    personalGroupId,
    name: groupName,
    exerciseCount: exerciseRows.length,
  };
}
