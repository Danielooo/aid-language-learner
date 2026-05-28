import {
  stripWiktionaryHtml,
  wiktionaryLookup,
} from "@/lib/api/wiktionary";

import type { WiktionaryEntry, WiktionaryResult } from "@/lib/api/wiktionary";

type RawSearchParams = { [key: string]: string | string[] | undefined };

function pickString(
  raw: string | string[] | undefined,
  fallback: string,
): string {
  if (typeof raw === "string") return raw;
  if (Array.isArray(raw) && raw[0]) return raw[0];
  return fallback;
}

const SUGGESTIONS = ["hola", "casa", "perro", "comer", "rápido", "biblioteca"];

export default async function WiktionaryPlaygroundPage({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  const raw = await searchParams;
  const word = pickString(raw.word, "").trim();
  const focusLangValue = pickString(raw.focus, "es");

  const result = word ? await wiktionaryLookup(word) : null;

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Wiktionary playground
        </h1>
        <p className="text-sm text-muted-foreground">
          Endpoint:{" "}
          <code className="font-mono text-xs">
            GET https://en.wiktionary.org/api/rest_v1/page/definition/{`{word}`}
          </code>
        </p>
      </header>

      <form
        method="GET"
        className="grid gap-4 rounded-lg border border-border bg-card p-5 text-card-foreground sm:grid-cols-[1fr_auto_auto]"
      >
        <label htmlFor="word" className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-muted-foreground">
            Woord
          </span>
          <input
            id="word"
            type="text"
            name="word"
            defaultValue={word}
            placeholder="bv. hola"
            autoComplete="off"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
        </label>

        <label htmlFor="focus" className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-muted-foreground">
            Focus-taal (sectie)
          </span>
          <input
            id="focus"
            type="text"
            name="focus"
            defaultValue={focusLangValue}
            placeholder="es"
            className="w-24 rounded-md border border-input bg-background px-3 py-2 font-mono text-sm uppercase"
          />
        </label>

        <div className="flex items-end gap-3">
          <button
            type="submit"
            className="inline-flex h-10 cursor-pointer items-center justify-center rounded-md bg-accent px-4 text-sm font-medium text-accent-foreground transition-colors hover:bg-accent/90"
          >
            Opzoeken
          </button>
        </div>

        <p className="text-xs text-muted-foreground sm:col-span-3">
          Probeer:{" "}
          {SUGGESTIONS.map((s, i) => (
            <span key={s}>
              {i > 0 && ", "}
              <a
                href={`/dev/wiktionary?word=${encodeURIComponent(s)}&focus=es`}
                className="font-mono text-accent hover:underline"
              >
                {s}
              </a>
            </span>
          ))}
        </p>
      </form>

      {result && (
        <WiktionaryResultView
          result={result}
          focusLang={focusLangValue.toLowerCase()}
        />
      )}
    </div>
  );
}

function WiktionaryResultView({
  result,
  focusLang,
}: {
  result: WiktionaryResult;
  focusLang: string;
}) {
  return (
    <section className="space-y-4">
      <div className="rounded-md border border-border bg-muted/30 p-3 text-xs text-muted-foreground">
        <span className="font-medium text-foreground">Request URL:</span>{" "}
        <code className="font-mono break-all">{result.url}</code>
      </div>

      {!result.ok && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
          <p className="font-medium">Lookup mislukt</p>
          <pre className="mt-2 font-mono text-xs">
            {JSON.stringify(result.error, null, 2)}
          </pre>
        </div>
      )}

      {result.ok && (
        <>
          <FocusSection
            entries={result.data[focusLang]}
            focusLang={focusLang}
            word={result.word}
          />
          <AllLanguagesOverview data={result.data} focusLang={focusLang} />
          <details className="rounded-md border border-border bg-card text-card-foreground">
            <summary className="cursor-pointer px-4 py-2 text-xs font-medium text-muted-foreground">
              Rauwe JSON-response (volledig)
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

function FocusSection({
  entries,
  focusLang,
  word,
}: {
  entries: WiktionaryEntry[] | undefined;
  focusLang: string;
  word: string;
}) {
  if (!entries || entries.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-border bg-muted/30 p-4 text-sm text-muted-foreground">
        Geen <code className="font-mono">{focusLang}</code>-sectie gevonden voor{" "}
        <strong className="text-foreground">{word}</strong>. Mogelijk bestaat
        het woord wel maar parseert Wiktionary REST de sectie niet — een echte
        coverage-gap waar de AI-flow op moet anticiperen.
      </div>
    );
  }
  return (
    <div className="space-y-3">
      <h2 className="text-sm font-semibold text-foreground">
        Sectie:{" "}
        <code className="font-mono text-accent">{focusLang}</code> —{" "}
        {entries[0]?.language}
      </h2>
      {entries.map((entry, idx) => (
        <article
          key={`${focusLang}-${idx}`}
          className="rounded-lg border border-border bg-card p-4 text-card-foreground"
        >
          <header className="text-xs uppercase tracking-wide text-muted-foreground">
            {entry.partOfSpeech}
          </header>
          <ol className="mt-2 space-y-2 text-sm">
            {entry.definitions.map((def, di) => (
              <li key={di} className="list-decimal pl-2">
                <p>{stripWiktionaryHtml(def.definition)}</p>
                {def.parsedExamples && def.parsedExamples.length > 0 && (
                  <ul className="mt-2 space-y-1 border-l-2 border-border pl-3 text-xs text-muted-foreground">
                    {def.parsedExamples.map((ex, ei) => (
                      <li key={ei}>
                        <span>{stripWiktionaryHtml(ex.example)}</span>
                        {ex.translation && (
                          <span className="ml-2 italic">
                            → {stripWiktionaryHtml(ex.translation)}
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ol>
          <details className="mt-3 text-xs text-muted-foreground">
            <summary className="cursor-pointer">Rauwe HTML van deze sectie</summary>
            <pre className="mt-2 overflow-x-auto rounded bg-muted/40 p-2 font-mono">
              {JSON.stringify(entry, null, 2)}
            </pre>
          </details>
        </article>
      ))}
    </div>
  );
}

function AllLanguagesOverview({
  data,
  focusLang,
}: {
  data: Record<string, WiktionaryEntry[]>;
  focusLang: string;
}) {
  const keys = Object.keys(data).filter((k) => k !== focusLang);
  if (keys.length === 0) return null;
  return (
    <details className="rounded-md border border-border bg-card text-card-foreground">
      <summary className="cursor-pointer px-4 py-2 text-xs font-medium text-muted-foreground">
        Overige taal-secties in deze response ({keys.length})
      </summary>
      <ul className="space-y-1 px-4 pb-4 text-xs text-muted-foreground">
        {keys.map((k) => (
          <li key={k}>
            <code className="font-mono text-foreground">{k}</code> —{" "}
            {data[k]?.[0]?.language ?? "?"} ·{" "}
            {data[k]?.length ?? 0} entry(s)
          </li>
        ))}
      </ul>
    </details>
  );
}
