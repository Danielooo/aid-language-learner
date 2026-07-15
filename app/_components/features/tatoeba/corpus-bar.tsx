"use client";

import { useState } from "react";

import type { CorpusSnapshot } from "@/lib/hooks/use-corpus-cache";

// Bovenste actie-bar: kies taal, aantal records, en haal de corpus op.
// Twee modi:
//   - leeg (geen snapshot) → volledige card als prominente CTA, met
//     uitleg, taal-keuze en aantal records.
//   - geladen (snapshot) → dunne status-bar met dezelfde controls in
//     één regel; spaart veel verticale ruimte op een werk-pagina.

type LangOption = { value: string; label: string };

type CorpusBarProps = {
  lang: string;
  onLangChange: (lang: string) => void;
  langOptions: readonly LangOption[];
  snapshot: CorpusSnapshot | null;
  loading: boolean;
  error: string | null;
  onLoad: (limit: number) => void;
  onClear: () => void;
};

export function CorpusBar(props: CorpusBarProps) {
  return props.snapshot ? (
    <CompactCorpusBar {...props} />
  ) : (
    <FullCorpusForm {...props} />
  );
}

function FullCorpusForm({
  lang,
  onLangChange,
  langOptions,
  loading,
  error,
  onLoad,
}: CorpusBarProps) {
  const [limit, setLimit] = useState<number>(50);

  return (
    <section className="space-y-3 rounded-lg border border-border bg-card p-5 text-card-foreground">
      <header className="space-y-1">
        <h2 className="text-sm font-semibold">Records ophalen</h2>
        <p className="text-xs text-muted-foreground">
          500 Tatoeba-zinnen + embeddings per taal, gecached in
          localStorage. ~1 MB voor 500 × 512 dims.
        </p>
      </header>

      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-muted-foreground">
            Brontaal
          </span>
          <select
            value={lang}
            onChange={(e) => onLangChange(e.target.value)}
            disabled={loading}
            className="rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            {langOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-muted-foreground">
            Aantal records (1 – 2000)
          </span>
          <input
            type="number"
            min={1}
            max={2000}
            step={100}
            value={limit}
            onChange={(e) =>
              setLimit(
                Math.max(1, Math.min(2000, Number(e.target.value) || 500)),
              )
            }
            disabled={loading}
            className="w-32 rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
        </label>

        <button
          type="button"
          onClick={() => onLoad(limit)}
          disabled={loading}
          className="inline-flex h-10 cursor-pointer items-center justify-center rounded-md bg-accent px-4 text-sm font-medium text-accent-foreground transition-colors hover:bg-accent/90 disabled:opacity-50"
        >
          {loading ? "Laden..." : "Haal records op"}
        </button>
      </div>

      {error && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          {error}
        </div>
      )}
    </section>
  );
}

// Compacte status-regel zodra er een snapshot is. Bevat een mini-form
// voor "Opnieuw laden" met dezelfde limit-input, maar standaard
// horizontaal gestapeld op één regel. Geen aparte card-header.
function CompactCorpusBar({
  lang,
  onLangChange,
  langOptions,
  snapshot,
  loading,
  error,
  onLoad,
  onClear,
}: CorpusBarProps) {
  const [limit, setLimit] = useState<number>(snapshot?.rows.length ?? 50);

  return (
    <section className="space-y-2 rounded-md border border-border bg-card px-3 py-2 text-card-foreground">
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="font-medium text-muted-foreground">Records:</span>

        <select
          value={lang}
          onChange={(e) => onLangChange(e.target.value)}
          disabled={loading}
          className="rounded-md border border-input bg-background px-2 py-1 text-xs"
          title="Wissel taal — corpus wordt opnieuw geladen"
        >
          {langOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        <span className="font-mono text-[11px] text-foreground">
          {snapshot?.rows.length ?? 0} records
        </span>

        {snapshot && (
          <span className="text-[10px] text-muted-foreground">
            · {snapshot.dims} dims · opgehaald{" "}
            {new Date(snapshot.fetched_at).toLocaleString("nl-NL")}
          </span>
        )}

        <span className="ml-auto flex items-center gap-2">
          <input
            type="number"
            min={1}
            max={2000}
            step={100}
            value={limit}
            onChange={(e) =>
              setLimit(
                Math.max(1, Math.min(2000, Number(e.target.value) || 500)),
              )
            }
            disabled={loading}
            title="Aantal records (1 – 2000)"
            className="w-20 rounded-md border border-input bg-background px-2 py-1 text-xs"
          />
          <button
            type="button"
            onClick={() => onLoad(limit)}
            disabled={loading}
            className="inline-flex h-7 cursor-pointer items-center justify-center rounded-md bg-card px-2.5 text-[11px] font-medium text-card-foreground hover:bg-muted disabled:opacity-50"
          >
            {loading ? "Laden..." : "Ophalen"}
          </button>
          <button
            type="button"
            onClick={onClear}
            disabled={loading}
            className="text-[11px] text-muted-foreground underline-offset-2 hover:text-foreground hover:underline disabled:opacity-50"
          >
            Wissen
          </button>
        </span>
      </div>

      {error && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 px-3 py-1.5 text-xs text-destructive">
          {error}
        </div>
      )}
    </section>
  );
}
