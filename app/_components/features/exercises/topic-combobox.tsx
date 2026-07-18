"use client";

import { useCallback, useId, useMemo, useRef, useState } from "react";

import { cn } from "@/lib/utils";

/** Rangschikt topics op relevantie t.o.v. query; max `limit` resultaten. */
export function rankTopics(query: string, topics: string[], limit = 3): string[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  type Scored = { topic: string; score: number };
  const scored: Scored[] = [];

  for (const topic of topics) {
    const lower = topic.toLowerCase();
    let score: number;
    if (lower === q) score = 0;
    else if (lower.startsWith(q)) score = 1;
    else if (lower.includes(q)) score = 2;
    else continue;
    scored.push({ topic, score });
  }

  return scored
    .sort((a, b) => {
      if (a.score !== b.score) return a.score - b.score;
      return a.topic.localeCompare(b.topic, "nl");
    })
    .slice(0, limit)
    .map((s) => s.topic);
}

type TopicComboboxProps = {
  topics: string[];
  value: string;
  onChange: (topic: string | null) => void;
  className?: string;
};

export function TopicCombobox({
  topics,
  value,
  onChange,
  className,
}: TopicComboboxProps) {
  const listboxId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState(value);
  const [open, setOpen] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(0);

  // Prop-wijziging (bijv. filter extern gereset) overschrijft de draft.
  // State-tijdens-render-patroon i.p.v. effect, zie React-docs
  // "adjusting state when a prop changes".
  const [prevValue, setPrevValue] = useState(value);
  if (value !== prevValue) {
    setPrevValue(value);
    setDraft(value);
  }

  const suggestions = useMemo(
    () => rankTopics(draft, topics, 3),
    [draft, topics],
  );

  const showDropdown = open && draft.trim().length > 0 && suggestions.length > 0;

  const selectTopic = useCallback(
    (topic: string | null) => {
      onChange(topic);
      setDraft(topic ?? "");
      setOpen(false);
      setHighlightIndex(0);
    },
    [onChange],
  );

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape") {
      setOpen(false);
      return;
    }

    if (!showDropdown) {
      if (e.key === "Enter") {
        e.preventDefault();
        if (draft.trim() === "") selectTopic(null);
        else if (suggestions.length === 1) selectTopic(suggestions[0]);
      }
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightIndex((i) => Math.min(i + 1, suggestions.length - 1));
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightIndex((i) => Math.max(i - 1, 0));
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      const picked = suggestions[highlightIndex];
      if (picked) selectTopic(picked);
      else if (draft.trim() === "") selectTopic(null);
    }
  }

  return (
    <div className={cn("relative min-w-[160px]", className)}>
      <input
        ref={inputRef}
        type="text"
        role="combobox"
        aria-expanded={showDropdown}
        aria-controls={listboxId}
        aria-activedescendant={
          showDropdown ? `${listboxId}-opt-${highlightIndex}` : undefined
        }
        aria-autocomplete="list"
        value={draft}
        onChange={(e) => {
          setDraft(e.target.value);
          setOpen(true);
          setHighlightIndex(0);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => {
          window.setTimeout(() => setOpen(false), 150);
        }}
        onKeyDown={handleKeyDown}
        placeholder="Alle onderwerpen"
        className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground"
      />
      {showDropdown && (
        <ul
          id={listboxId}
          role="listbox"
          className="absolute z-20 mt-1 max-h-40 w-full overflow-auto rounded-md border border-border bg-popover py-1 shadow-md"
        >
          {suggestions.map((topic, index) => (
            <li
              key={topic}
              id={`${listboxId}-opt-${index}`}
              role="option"
              aria-selected={index === highlightIndex}
              className={cn(
                "cursor-pointer px-2 py-1.5 text-sm",
                index === highlightIndex
                  ? "bg-accent/15 text-foreground"
                  : "text-foreground hover:bg-muted",
              )}
              onMouseDown={(e) => {
                e.preventDefault();
                selectTopic(topic);
              }}
              onMouseEnter={() => setHighlightIndex(index)}
            >
              {topic}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
