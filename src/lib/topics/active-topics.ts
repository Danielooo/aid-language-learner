import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Actieve topics voor een user (alleen expliciet aangevinkte topics).
 * Geen rij in `user_topic_preferences` = inactief.
 */
export async function getActiveTopicsForUser(
  supabase: SupabaseClient,
  userId: string,
): Promise<Set<string>> {
  const { data, error } = await supabase
    .from("user_topic_preferences")
    .select("topic")
    .eq("user_id", userId)
    .eq("is_active", true);

  if (error) {
    throw new Error(error.message);
  }

  return new Set(
    (data ?? [])
      .map((row) => row.topic?.trim())
      .filter((topic): topic is string => Boolean(topic && topic.length > 0)),
  );
}

/** Converteert actieve set naar array voor PostgREST `.in()`; null = geen actieve topics. */
export function activeTopicsToArray(
  activeTopics: Set<string>,
): string[] | null {
  if (activeTopics.size === 0) return null;
  return Array.from(activeTopics);
}

export function isTopicActive(
  activeTopics: Set<string>,
  topic: string | null | undefined,
): boolean {
  if (!topic || topic.trim().length === 0) return false;
  return activeTopics.has(topic.trim());
}
