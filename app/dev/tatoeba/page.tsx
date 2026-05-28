import { searchTatoebaSentences } from "@/lib/api/tatoeba";

import type {
  TatoebaResult,
  TatoebaSearchParams,
  TatoebaSentence,
  TatoebaSort,
} from "@/lib/api/tatoeba";

// Vaste opties voor de form-dropdowns. Bewust beperkt tot wat zinvol is
// voor "Spaans leren met NL/EN als brugtaal".
const LANG_OPTIONS = [
  { value: "spa", label: "Spaans (spa)" },
  { value: "eng", label: "Engels (eng)" },
  { value: "nld", label: "Nederlands (nld)" },
] as const;

const TRANS_OPTIONS = [
  { value: "", label: "Geen" },
  { value: "nld", label: "Nederlands (nld)" },
  { value: "eng", label: "Engels (eng)" },
] as const;

const SHOW_OPTIONS = [
  { value: "", label: "Geen" },
  { value: "all", label: "Alle vertalingen" },
  { value: "nld", label: "Alleen Nederlandse vertalingen" },
  { value: "eng", label: "Alleen Engelse vertalingen" },
] as const;

const SORT_OPTIONS: TatoebaSort[] = ["random", "relevance", "created", "words"];

function pickString(
  raw: string | string[] | undefined,
  fallback: string,
): string {
  if (typeof raw === "string") return raw;
  if (Array.isArray(raw) && raw[0]) return raw[0];
  return fallback;
}

function pickOptional(raw: string | string[] | undefined): string | undefined {
  if (typeof raw === "string" && raw !== "") return raw;
  if (Array.isArray(raw) && raw[0]) return raw[0];
  return undefined;
}

type RawSearchParams = { [key: string]: string | string[] | undefined };

export default async function TatoebaPlaygroundPage({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  const raw = await searchParams;

  const lang = pickString(raw.lang, "spa");
  const transRequiredLang = pickOptional(raw.trans);
  const transShowLang = pickOptional(raw.show);
  const tag = pickOptional(raw.tag);
  const q = pickOptional(raw.q);
  const limit = Number(pickString(raw.limit, "5")) || 5;
  const sortValue = pickString(raw.sort, "random");
  const sort = (SORT_OPTIONS as readonly string[]).includes(sortValue)
    ? (sortValue as TatoebaSort)
    : "random";

  // Pas een request afvuren als de gebruiker een form heeft ingestuurd
  // (herkenbaar aan de aanwezigheid van een searchParam). Eerste bezoek
  // toont alleen het formulier zonder loze API-call.
  const hasSubmitted = Object.keys(raw).length > 0;
  const params: TatoebaSearchParams = {
    lang,
    transRequiredLang,
    transShowLang,
    tag,
    q,
    limit: Math.max(1, Math.min(limit, 50)),
    sort,
  };
  const result = hasSubmitted ? await searchTatoebaSentences(params) : null;

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Tatoeba playground
        </h1>
        <p className="text-sm text-muted-foreground">
          Endpoint:{" "}
          <code className="font-mono text-xs">
            GET https://api.tatoeba.org/v1/sentences
          </code>
        </p>
      </header>

      <TatoebaForm
        defaults={{
          lang,
          trans: transRequiredLang ?? "",
          show: transShowLang ?? "",
          tag: tag ?? "",
          q: q ?? "",
          limit,
          sort,
        }}
      />

      {result && <TatoebaResultView result={result} />}
    </div>
  );
}

type FormDefaults = {
  lang: string;
  trans: string;
  show: string;
  tag: string;
  q: string;
  limit: number;
  sort: TatoebaSort;
};

function TatoebaForm({ defaults }: { defaults: FormDefaults }) {
  return (
    <form
      method="GET"
      className="grid gap-4 rounded-lg border border-border bg-card p-5 text-card-foreground sm:grid-cols-2"
    >
      <FormField label="Brontaal" name="lang">
        <select
          name="lang"
          defaultValue={defaults.lang}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          {LANG_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </FormField>

      <FormField label="Moet vertaling hebben in" name="trans">
        <select
          name="trans"
          defaultValue={defaults.trans}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          {TRANS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </FormField>

      <FormField label="Toon vertalingen" name="show">
        <select
          name="show"
          defaultValue={defaults.show}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          {SHOW_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </FormField>

      <FormField label="Sort" name="sort">
        <select
          name="sort"
          defaultValue={defaults.sort}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          {SORT_OPTIONS.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      </FormField>

      <FormField label="Tag (optioneel)" name="tag">
        <input
          type="text"
          name="tag"
          defaultValue={defaults.tag}
          placeholder="bv. food, travel"
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        />
      </FormField>

      <FormField label="Zoekterm (optioneel)" name="q">
        <input
          type="text"
          name="q"
          defaultValue={defaults.q}
          placeholder="bv. café"
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        />
      </FormField>

      <FormField label="Limit (1–50)" name="limit">
        <input
          type="number"
          name="limit"
          min={1}
          max={50}
          defaultValue={defaults.limit}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        />
      </FormField>

      <div className="flex items-end gap-3 sm:col-span-2">
        <button
          type="submit"
          className="inline-flex h-10 cursor-pointer items-center justify-center rounded-md bg-accent px-4 text-sm font-medium text-accent-foreground transition-colors hover:bg-accent/90"
        >
          Verzenden
        </button>
        <a
          href="/dev/tatoeba"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          Reset
        </a>
      </div>
    </form>
  );
}

function FormField({
  label,
  name,
  children,
}: {
  label: string;
  name: string;
  children: React.ReactNode;
}) {
  return (
    <label htmlFor={name} className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

function TatoebaResultView({ result }: { result: TatoebaResult }) {
  return (
    <section className="space-y-4">
      <div className="rounded-md border border-border bg-muted/30 p-3 text-xs text-muted-foreground">
        <span className="font-medium text-foreground">Request URL:</span>{" "}
        <code className="font-mono break-all">{result.url}</code>
      </div>

      {!result.ok && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
          <p className="font-medium">API gaf een fout terug</p>
          <pre className="mt-2 font-mono text-xs">
            {JSON.stringify(result.error, null, 2)}
          </pre>
        </div>
      )}

      {result.ok && (
        <>
          <div className="text-sm text-muted-foreground">
            Totaal in corpus dat aan filters voldoet:{" "}
            <strong className="text-foreground">
              {result.data.paging.total.toLocaleString("nl-NL")}
            </strong>{" "}
            — getoond:{" "}
            <strong className="text-foreground">
              {result.data.data.length}
            </strong>
          </div>

          <SentenceList sentences={result.data.data} />

          <details className="rounded-md border border-border bg-card text-card-foreground">
            <summary className="cursor-pointer px-4 py-2 text-xs font-medium text-muted-foreground">
              Rauwe JSON-response
            </summary>
            <pre className="overflow-x-auto px-4 pb-4 font-mono text-xs">
              {JSON.stringify(result.data, null, 2)}
            </pre>
          </details>
        </>
      )}
    </section>
  );
}

function SentenceList({ sentences }: { sentences: TatoebaSentence[] }) {
  if (sentences.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Geen resultaten voor deze filtercombinatie.
      </p>
    );
  }
  return (
    <ul className="space-y-3">
      {sentences.map((s) => (
        <li
          key={s.id}
          className="rounded-lg border border-border bg-card p-4 text-card-foreground"
        >
          <div className="flex items-baseline justify-between gap-3">
            <p className="text-base font-medium">{s.text}</p>
            <span className="font-mono text-xs text-muted-foreground">
              #{s.id} · {s.lang}
            </span>
          </div>
          {s.translations && s.translations.length > 0 && (
            <ul className="mt-3 space-y-1 border-l-2 border-border pl-3 text-sm text-muted-foreground">
              {s.translations.map((t) => (
                <li key={t.id} className="flex items-baseline gap-2">
                  <span className="font-mono text-[10px] uppercase tracking-wide">
                    {t.lang}
                  </span>
                  <span>{t.text}</span>
                  {t.is_direct && (
                    <span className="text-[10px] text-accent">direct</span>
                  )}
                </li>
              ))}
            </ul>
          )}
          <p className="mt-3 text-[10px] text-muted-foreground/70">
            {s.license} · @{s.owner}
          </p>
        </li>
      ))}
    </ul>
  );
}
