/**
 * Dunne fetch-helper: gooit bij !ok zodat TanStack Query de error-state zet.
 */
export async function fetchJson<T>(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<T> {
  const res = await fetch(input, {
    cache: "no-store",
    ...init,
  });
  if (!res.ok) {
    throw new Error(`Status ${res.status}`);
  }
  return (await res.json()) as T;
}
