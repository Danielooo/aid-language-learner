"use client";

import { useState } from "react";

import {
  TATOEBA_SEARCH_RERANK_MODELS,
  type TatoebaSearchRerankModel,
} from "@/lib/ai/tatoeba-search-config";

// Search-input + knobs (top-K, AI-rerank toggle, model-dropdown). Submit
// triggert de search-pipeline in de parent. Houdt zelf alleen de input-
// text vast; alle andere knobs zijn fully controlled door de parent.

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
      className="space-y-3 rounded-lg border border-border bg-card p-5 text-card-foreground"
    >
      <header className="space-y-1">
        <h2 className="text-sm font-semibold">Zoeken</h2>
        <p className="text-xs text-muted-foreground">
          Type een zoekopdracht in het Nederlands. Bv.{" "}
          <em>&quot;zinnen die over auto&apos;s gaan&quot;</em> of{" "}
          <em>&quot;zinnen waarin iemand een vraag stelt over eten&quot;</em>.
          Vervolgvragen verfijnen automatisch op de huidige selectie.
        </p>
      </header>

      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-1 flex-col gap-1.5" style={{ minWidth: 240 }}>
          <span className="text-xs font-medium text-muted-foreground">
            Query
          </span>
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="bv. iets over autorijden of een rijbewijs..."
            disabled={disabled}
            className="rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-muted-foreground">
            Top-K (cosine)
          </span>
          <input
            type="number"
            min={1}
            max={100}
            value={topK}
            onChange={(e) =>
              onTopKChange(Math.max(1, Math.min(100, Number(e.target.value) || 50)))
            }
            disabled={disabled}
            className="w-24 rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
        </label>

        <label className="flex items-center gap-2 pt-6 text-xs text-muted-foreground">
          <input
            type="checkbox"
            checked={rerankEnabled}
            onChange={(e) => onRerankToggle(e.target.checked)}
            disabled={disabled}
            className="h-4 w-4 rounded border-input"
          />
          AI rerank
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-muted-foreground">
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
            className="rounded-md border border-input bg-background px-3 py-2 text-sm disabled:opacity-50"
          >
            {TATOEBA_SEARCH_RERANK_MODELS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>

        <button
          type="submit"
          disabled={disabled || text.trim().length === 0}
          className="inline-flex h-10 cursor-pointer items-center justify-center rounded-md bg-accent px-4 text-sm font-medium text-accent-foreground transition-colors hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {disabled ? "Bezig..." : "Zoek"}
        </button>
      </div>
    </form>
  );
}
