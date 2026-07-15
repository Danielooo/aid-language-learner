/** Zichtbare naam in de app-shell: Naam, anders username. */
export function getDisplayLabel(
  displayName: string | null | undefined,
  username: string,
): string {
  const trimmed = displayName?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : username;
}
