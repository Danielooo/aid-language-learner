import type { SupabaseClient } from "@supabase/supabase-js";

import {
  EXERCISE_SELECT_COLUMNS,
  type ExerciseDbRow,
} from "@/lib/exercises/types";

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
  code?: "NAME_CONFLICT";
  suggestedName?: string;
};

export type CopyGlobalGroupOptions = {
  /** Gewenste personal naam; default = community-naam. */
  name?: string;
};

/** Voorstel: originele naam + datum van vandaag tussen haakjes. */
export function suggestedCommunityCopyName(
  baseName: string,
  at = new Date(),
): string {
  const date = new Intl.DateTimeFormat("nl-NL", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(at);
  return `${baseName.trim()} (${date})`;
}

/**
 * Kopieert een actieve global groep naar een nieuwe persoonlijke groep
 * en activeert het bijbehorende topic in het leerplan.
 * Meerdere kopieën van dezelfde bron zijn toegestaan; bij gelijke naam → 409 NAME_CONFLICT.
 */
export async function copyGlobalGroupToPersonal(
  supabase: SupabaseClient,
  userId: string,
  globalGroupId: string,
  options?: CopyGlobalGroupOptions,
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
      error: "Community-topic niet gevonden of niet actief.",
      status: 404,
    };
  }

  const sourceName = (globalGroup.name as string).trim();
  if (!sourceName) {
    return { ok: false, error: "Topicnaam mag niet leeg zijn.", status: 500 };
  }

  const targetName = (options?.name ?? sourceName).trim();
  if (!targetName) {
    return { ok: false, error: "Topicnaam mag niet leeg zijn.", status: 409 };
  }

  const { data: existingPersonal, error: existingError } = await supabase
    .from("exercise_groups")
    .select("id")
    .eq("owner_id", userId)
    .eq("name", targetName)
    .maybeSingle();

  if (existingError) {
    return { ok: false, error: existingError.message, status: 500 };
  }
  if (existingPersonal?.id) {
    return {
      ok: false,
      error: `Je hebt al een topic met de naam "${targetName}".`,
      status: 409,
      code: "NAME_CONFLICT",
      suggestedName: suggestedCommunityCopyName(sourceName),
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
      error: "Dit community-topic heeft geen oefeningen.",
      status: 404,
    };
  }

  // Expliciet nieuwe groep: niet find-or-create, zodat rollback veilig is.
  const { data: createdGroup, error: createError } = await supabase
    .from("exercise_groups")
    .insert({
      name: targetName,
      owner_id: userId,
      is_active: true,
      source_group_id: globalGroupId,
    })
    .select("id")
    .maybeSingle();

  if (createError || !createdGroup?.id) {
    if (createError?.code === "23505") {
      return {
        ok: false,
        error: `Je hebt al een topic met de naam "${targetName}".`,
        status: 409,
        code: "NAME_CONFLICT",
        suggestedName: suggestedCommunityCopyName(sourceName),
      };
    }
    return {
      ok: false,
      error: createError?.message ?? "Persoonlijk topic aanmaken mislukt.",
      status: 500,
    };
  }

  const personalGroupId = createdGroup.id as string;

  const exerciseRows = sourceRows.map((row) => ({
    source_text: row.source_text,
    target_text: row.target_text,
    topic: targetName,
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
      topic: targetName,
      is_active: true,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,topic" },
  );

  return {
    ok: true,
    personalGroupId,
    name: targetName,
    exerciseCount: exerciseRows.length,
  };
}
