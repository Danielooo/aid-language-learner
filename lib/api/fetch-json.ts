/**
 * Dunne fetch-helper: gooit bij !ok zodat TanStack Query de error-state zet.
 * Probeert `error` uit de JSON-body te lezen voor bruikbare UI-copy.
 */
export async function fetchJson<T>(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<T> {
  const res = await fetch(input, {
    cache: "no-store",
    ...init,
  });

  let json: unknown = null;
  try {
    json = await res.json();
  } catch {
    json = null;
  }

  if (!res.ok) {
    const bodyError =
      json &&
      typeof json === "object" &&
      "error" in json &&
      typeof (json as { error: unknown }).error === "string"
        ? (json as { error: string }).error
        : null;
    throw new Error(bodyError || `Status ${res.status}`);
  }

  return json as T;
}
