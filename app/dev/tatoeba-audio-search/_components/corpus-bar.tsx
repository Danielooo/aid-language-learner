"use client";

import { useState } from "react";

import type { CorpusSnapshot } from "@/lib/hooks/use-corpus-cache";

// Bovenste actie-bar: kies taal, aantal records, en haal de corpus op.
// Toont status (laatst opgehaald, count) en een "Wis"-knop.
//
// Voorlopig hardcoded options + min/max — zelfde range als de
// /corpus-route schema-validatie.

type LangOption = { value: string; label: string };

export function CorpusBar({
  lang,
  onLangChange,
  langOptions,
  snapshot,
  loading,
  error,
  onLoad,
  onClear,
}: {
  lang: string;
  onLangChange: (lang: string) => void;
  langOptions: readonly LangOption[];
  snapshot: CorpusSnapshot | null;
  loading: boolean;
  error: string | null;
  onLoad: (limit: number) => void;
  onClear: () => void;
}) {
  const [limit, setLimit] = useState<number>(500);

  return (
    <section className="space-y-3 rounded-lg border border-border bg-card p-5 text-card-foreground">
      <header className="space-y-1">
        <h2 className="text-sm font-semibold">Corpus laden</h2>
        <p className="text-xs text-muted-foreground">
          500 Tatoeba-zinnen + embeddings per taal, gecached in
          localStorage. ~1 MB voor 500 × 512 dims.
        </p>
      </header>

      <div className="flex flex-wrap items-end gap-3 border-b border-border pb-3">
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
          {loading
            ? "Laden..."
            : snapshot
              ? "Opnieuw laden"
              : "Haal corpus op"}
        </button>

        {snapshot && (
          <button
            type="button"
            onClick={onClear}
            disabled={loading}
            className="text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline disabled:opacity-50"
          >
            Wis cache
          </button>
        )}

        {snapshot && (
          <span className="ml-auto text-[10px] text-muted-foreground">
            {snapshot.rows.length} records · {snapshot.dims} dims · opgehaald{" "}
            {new Date(snapshot.fetched_at).toLocaleString("nl-NL")}
          </span>
        )}
      </div>

      {error && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          {error}
        </div>
      )}
    </section>
  );
}
