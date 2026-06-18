"use client";

import { useState } from "react";

import {
  TATOEBA_SEARCH_MODELS,
  type TatoebaSearchModel,
} from "@/lib/ai/tatoeba-search-config";

// Zoek-input + Zoek model. De cosine-stap en LLM-zoek zijn intern
// vastgelegd; de gebruiker kiest alleen welk model de matches filtert.

export function SearchControls({
  model,
  onModelChange,
  disabled,
  onSubmit,
}: {
  model: TatoebaSearchModel;
  onModelChange: (v: TatoebaSearchModel) => void;
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
      <div className="flex flex-wrap items-end gap-2">
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Zoek op onderwerp — bv. iets over autorijden of een vraag over eten"
          disabled={disabled}
          className="min-w-[240px] flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
        />
        <label className="flex flex-col gap-1">
          <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            Zoek model
          </span>
          <select
            value={model}
            onChange={(e) =>
              onModelChange(e.target.value as TatoebaSearchModel)
            }
            disabled={disabled}
            className="rounded-md border border-input bg-background px-2 py-2 text-xs"
          >
            {TATOEBA_SEARCH_MODELS.map((opt) => (
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
