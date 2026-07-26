"use client";

import { useState } from "react";

type ChipListFieldProps = {
  label: string;
  items: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  addLabel?: string;
  emptyLabel?: string;
  disabled?: boolean;
  /** Case-insensitive dedupe (tags); default exact match (alternatieven). */
  caseInsensitiveDedupe?: boolean;
};

/**
 * Bewerkbare chip-lijst met × per item en input eronder om toe te voegen.
 */
export function ChipListField({
  label,
  items,
  onChange,
  placeholder = "Nieuw…",
  addLabel = "Toevoegen",
  emptyLabel = "Geen",
  disabled = false,
  caseInsensitiveDedupe = false,
}: ChipListFieldProps) {
  const [draft, setDraft] = useState("");

  function addItem() {
    const trimmed = draft.trim();
    if (!trimmed) return;
    const exists = caseInsensitiveDedupe
      ? items.some((item) => item.toLowerCase() === trimmed.toLowerCase())
      : items.includes(trimmed);
    if (exists) {
      setDraft("");
      return;
    }
    onChange([...items, trimmed]);
    setDraft("");
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">{label}</p>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">{emptyLabel}</p>
      ) : (
        <ul className="flex flex-wrap gap-1.5">
          {items.map((item, index) => (
            <li
              key={`${item}-${index}`}
              className="inline-flex max-w-full items-center gap-1 rounded-full border border-border bg-muted px-2.5 py-0.5 text-xs text-foreground"
            >
              <span className="min-w-0 truncate">{item}</span>
              <button
                type="button"
                disabled={disabled}
                onClick={() =>
                  onChange(items.filter((_, i) => i !== index))
                }
                className="shrink-0 text-muted-foreground hover:text-destructive disabled:opacity-50"
                aria-label={`Verwijder ${item}`}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="flex gap-2">
        <input
          type="text"
          value={draft}
          disabled={disabled}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addItem();
            }
          }}
          placeholder={placeholder}
          className="h-9 min-w-0 flex-1 rounded-md border border-border bg-background px-3 text-sm"
        />
        <button
          type="button"
          disabled={disabled || draft.trim().length === 0}
          onClick={addItem}
          className="inline-flex h-9 items-center rounded-md border border-border px-3 text-xs disabled:opacity-50"
        >
          {addLabel}
        </button>
      </div>
    </div>
  );
}
