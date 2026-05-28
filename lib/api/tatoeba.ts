// Typed wrapper voor Tatoeba v1 /sentences endpoint.
// Documentatie: https://api.tatoeba.org/openapi en de migratie-guide
// http://en.wiki.tatoeba.org/articles/show/api-migration-v1.

const TATOEBA_BASE = "https://api.tatoeba.org/v1/sentences";

export type TatoebaTranslation = {
  id: number;
  text: string;
  lang: string;
  script: string | null;
  license: string;
  owner: string;
  is_unapproved: boolean;
  is_direct: boolean;
};

export type TatoebaSentence = {
  id: number;
  text: string;
  lang: string;
  script: string | null;
  license: string;
  owner: string;
  is_unapproved: boolean;
  translations?: TatoebaTranslation[];
};

export type TatoebaPaging = {
  total: number;
  has_next: boolean;
  next: string | null;
};

export type TatoebaResponse = {
  data: TatoebaSentence[];
  paging: TatoebaPaging;
};

export type TatoebaError = {
  message: string;
  url: string;
  code: number;
};

export type TatoebaSort = "random" | "relevance" | "created" | "words";

export interface TatoebaSearchParams {
  lang: string;
  /** Filter: alleen zinnen met vertaling in deze taal (ISO 639-3). */
  transRequiredLang?: string;
  /** Toon vertalingen in deze taal. "all" = alle, undefined = geen. */
  transShowLang?: string | "all";
  /** Tatoeba tag (bv. "food", "travel"). Geen tag-discovery beschikbaar. */
  tag?: string;
  /** Vrije zoekterm in tekst. */
  q?: string;
  /** Aantal resultaten (max 50). */
  limit?: number;
  sort?: TatoebaSort;
}

// Bouwt de URL op zoals de v1 API verwacht: kolon-genested keys (bv.
// "trans:lang", "showtrans:lang") in plaats van geneste objecten.
export function buildTatoebaUrl(params: TatoebaSearchParams): string {
  const url = new URL(TATOEBA_BASE);
  url.searchParams.set("lang", params.lang);
  url.searchParams.set("sort", params.sort ?? "random");
  url.searchParams.set("limit", String(params.limit ?? 5));

  if (params.transRequiredLang) {
    url.searchParams.set("trans:lang", params.transRequiredLang);
  }
  if (params.transShowLang) {
    if (params.transShowLang === "all") {
      url.searchParams.set("showtrans", "all");
    } else {
      url.searchParams.set("showtrans:lang", params.transShowLang);
    }
  }
  if (params.tag) url.searchParams.set("tag", params.tag);
  if (params.q) url.searchParams.set("q", params.q);

  return url.toString();
}

export type TatoebaResult =
  | { ok: true; url: string; data: TatoebaResponse }
  | { ok: false; url: string; error: TatoebaError | { message: string } };

// Geen caching: voor de playground willen we elke request live zien.
// Next 16 default is sowieso "no cache" voor fetch, maar expliciet
// schrijven helpt lezers.
export async function searchTatoebaSentences(
  params: TatoebaSearchParams,
): Promise<TatoebaResult> {
  const url = buildTatoebaUrl(params);
  try {
    const res = await fetch(url, { cache: "no-store" });
    const json = (await res.json()) as TatoebaResponse | TatoebaError;
    if (!res.ok || "code" in json) {
      return { ok: false, url, error: json as TatoebaError };
    }
    return { ok: true, url, data: json as TatoebaResponse };
  } catch (e) {
    return {
      ok: false,
      url,
      error: { message: e instanceof Error ? e.message : "Unknown error" },
    };
  }
}
