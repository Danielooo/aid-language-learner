/**
 * Initialen voor avatar-placeholder (max. 2 letters).
 * Gebruikt weergavenaam indien aanwezig, anders username.
 */
export function getInitials(displayName: string | null | undefined, username: string): string {
  const source = displayName?.trim() || username.trim();
  if (!source) return "?";

  const parts = source.split(/[\s_-]+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0]![0]!}${parts[1]![0]!}`.toUpperCase();
  }

  return source.slice(0, 2).toUpperCase();
}
