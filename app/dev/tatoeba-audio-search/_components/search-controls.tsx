"use client";

import { useState } from "react";

import {
  TATOEBA_SEARCH_RERANK_MODELS,
  type TatoebaSearchRerankModel,
} from "@/lib/ai/tatoeba-search-config";

// Search-input + knobs. Hoofd-regel toont alleen het query-veld en
// de Zoek-knop; de technische knobs (Top-K, AI rerank toggle, model)
// zitten in een uitklap "Geavanceerd" omdat die zelden per query
// veranderen. Compact opzet zonder eigen card-header zodat de pagina
// rustiger oogt.

export function SearchControls({
  topK,
  onTopKChange,
  rerankEnabled,
  onRerankToggle,
  model,
  onModelChange,
  disabled,
  onSubmit,
}: {
  topK: number;
  onTopKChange: (v: number) => void;
  rerankEnabled: boolean;
  onRerankToggle: (v: boolean) => void;
  model: TatoebaSearchRerankModel;
  onModelChange: (v: TatoebaSearchRerankModel) => void;
  disabled: boolean;
  onSubmit: (query: string) => void;
}) {
  const [text, setText] = useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || disabled) return;
    onSubmit(trimmed);
    setText("");
  }

  return (
    <form
      onSubmit={submit}
      className="space-y-2 rounded-md border border-border bg-card p-3 text-card-foreground"
    >
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Zoek semantisch — bv. iets over autorijden of een vraag over eten"
          disabled={disabled}
          className="min-w-[240px] flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
        />
        <button
          type="submit"
          disabled={disabled || text.trim().length === 0}
          className="inline-flex h-10 cursor-pointer items-center justify-center rounded-md bg-accent px-4 text-sm font-medium text-accent-foreground transition-colors hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {disabled ? "Bezig..." : "Zoek"}
        </button>
      </div>

      <details className="group">
        <summary className="cursor-pointer text-[11px] font-medium text-muted-foreground hover:text-foreground">
          <span className="select-none">
            Geavanceerd
            <span className="ml-1 text-[10px] text-muted-foreground/70">
              · top-K {topK} · {rerankEnabled ? `rerank (${model})` : "geen rerank"}
            </span>
          </span>
        </summary>

        <div className="mt-2 flex flex-wrap items-end gap-3 border-t border-border pt-2">
          <label className="flex flex-col gap-1">
            <span className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              Top-K (cosine)
              <InfoTooltip
                label="Uitleg Top-K"
                text={
                  "Hoeveel kandidaten de cosine-similarity-stap doorlaat naar de volgende stap (de tabel of de AI-rerank).\n\n" +
                  "Hoger = meer kandidaten, vollediger maar bredere selectie en duurdere rerank.\n" +
                  "Lager = strakkere top-N, sneller en goedkoper maar meer kans om relevante zinnen te missen.\n\n" +
                  "Tussen 1 en 100. Default 50."
                }
              />
            </span>
            <input
              type="number"
              min={1}
              max={100}
              value={topK}
              onChange={(e) =>
                onTopKChange(
                  Math.max(1, Math.min(100, Number(e.target.value) || 50)),
                )
              }
              disabled={disabled}
              className="w-20 rounded-md border border-input bg-background px-2 py-1 text-xs"
            />
          </label>

          <label className="flex items-center gap-2 pt-4 text-xs text-muted-foreground">
            <input
              type="checkbox"
              checked={rerankEnabled}
              onChange={(e) => onRerankToggle(e.target.checked)}
              disabled={disabled}
              className="h-4 w-4 rounded border-input"
            />
            AI rerank
            <InfoTooltip
              label="Uitleg AI rerank"
              text={
                "Aan: na de cosine-similarity-stap stuurt een LLM (gekozen via 'Rerank-model') de top-K kandidaten opnieuw door en herorder ze op semantische relevantie + geeft een korte reden per match en een samenvatting.\n\n" +
                "Uit: alleen de pure cosine-volgorde (sneller, geen LLM-call, maar grover)."
              }
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              Rerank-model
            </span>
            <select
              value={model}
              onChange={(e) =>
                onModelChange(e.target.value as TatoebaSearchRerankModel)
              }
              disabled={disabled || !rerankEnabled}
              title={
                rerankEnabled
                  ? "Kies welk model de cosine-kandidaten herorder + samenvat"
                  : "Schakel AI rerank aan om een model te kiezen"
              }
              className="rounded-md border border-input bg-background px-2 py-1 text-xs disabled:opacity-50"
            >
              {TATOEBA_SEARCH_RERANK_MODELS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </details>
    </form>
  );
}

// Klein 'i'-rondje met native title-tooltip. Local helper omdat dit
// component twee tooltips heeft (Top-K + AI rerank); verder gebruiken
// we hetzelfde patroon inline in de tabel-FilterBar.
function InfoTooltip({ label, text }: { label: string; text: string }) {
  return (
    <span
      role="img"
      aria-label={label}
      tabIndex={0}
      title={text}
      className="inline-flex h-4 w-4 cursor-help items-center justify-center rounded-full border border-border bg-background text-[9px] font-semibold text-muted-foreground hover:text-foreground"
    >
      i
    </span>
  );
}
