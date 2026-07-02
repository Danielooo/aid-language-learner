"use client";

import { useEffect, useState } from "react";

import { ALL_TOPICS } from "@/app/dev/_components/quiz/constants";
import { TopicPickerGrid } from "./topic-picker-grid";

import type { ExercisePickerItem, ExerciseListResponse } from "@/app/api/dev/exercise-generator-quiz/list/route";
import type { TopicStat } from "@/app/api/dev/exercise-generator-quiz/topics/route";

type ExercisePickerProps = {
  topicStats: TopicStat[];
  topicsLoading: boolean;
  selectedTopic: string;
  onTopicChange: (topic: string) => void;
  selectedIds: Set<string>;
  onToggle: (id: string) => void;
  onSelectAll: (ids: string[]) => void;
  onClear: () => void;
  onStart: () => void;
};

export function ExercisePicker({
  topicStats,
  topicsLoading,
  selectedTopic,
  onTopicChange,
  selectedIds,
  onToggle,
  onSelectAll,
  onClear,
  onStart,
}: ExercisePickerProps) {
  const [exercises, setExercises] = useState<ExercisePickerItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search), 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (selectedTopic !== ALL_TOPICS) {
          params.set("topic", selectedTopic);
        }
        if (debouncedSearch.length > 0) {
          params.set("search", debouncedSearch);
        }
        params.set("pageSize", "100");

        const res = await fetch(
          `/api/dev/exercise-generator-quiz/list?${params.toString()}`,
          { cache: "no-store" },
        );
        if (!res.ok) throw new Error(`Status ${res.status}`);
        const data = (await res.json()) as ExerciseListResponse;
        if (!cancelled) {
          setExercises(data.exercises);
          setTotal(data.total);
        }
      } catch {
        if (!cancelled) {
          setExercises([]);
          setTotal(0);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedTopic, debouncedSearch]);

  const visibleIds = exercises.map((e) => e.id);
  const allVisibleSelected =
    visibleIds.length > 0 && visibleIds.every((id) => selectedIds.has(id));

  return (
    <section className="space-y-6">
      <div className="space-y-4 rounded-2xl border border-border bg-gradient-to-b from-muted/30 to-background p-6 sm:p-8">
        <div className="space-y-1">
          <h2 className="text-sm font-semibold text-foreground">
            Filter op topic
          </h2>
          <p className="text-xs text-muted-foreground">
            Beperk de lijst tot één categorie, of kies &quot;Alle topics&quot;.
          </p>
        </div>
        <TopicPickerGrid
          stats={topicStats}
          loading={topicsLoading}
          selectedTopic={selectedTopic}
          onSelect={onTopicChange}
        />
      </div>

      <div className="space-y-4 rounded-2xl border border-border bg-card p-6 sm:p-8">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="space-y-1">
            <h2 className="text-sm font-semibold text-foreground">
              Kies oefeningen
            </h2>
            <p className="text-xs text-muted-foreground">
              {selectedIds.size} geselecteerd
              {total > 0 && ` · ${total} beschikbaar`}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => onSelectAll(visibleIds)}
              disabled={loading || visibleIds.length === 0 || allVisibleSelected}
              className="cursor-pointer rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
            >
              Alles op pagina
            </button>
            <button
              type="button"
              onClick={onClear}
              disabled={selectedIds.size === 0}
              className="cursor-pointer rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
            >
              Wis selectie
            </button>
          </div>
        </div>

        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Zoek in bron- of doeltekst…"
          className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
        />

        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="h-14 animate-pulse rounded-xl bg-muted/50"
              />
            ))}
          </div>
        ) : exercises.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Geen oefeningen gevonden voor deze filters.
          </p>
        ) : (
          <ul className="max-h-96 space-y-2 overflow-y-auto pr-1">
            {exercises.map((exercise) => {
              const checked = selectedIds.has(exercise.id);
              return (
                <li key={exercise.id}>
                  <label
                    className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition-colors ${
                      checked
                        ? "border-accent/40 bg-accent/5"
                        : "border-border hover:bg-muted/30"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => onToggle(exercise.id)}
                      className="mt-1 size-4 shrink-0 accent-accent"
                    />
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <p className="text-sm font-medium text-foreground">
                        {exercise.source_text}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {exercise.target_text}
                      </p>
                      {exercise.topic && (
                        <span className="inline-block rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                          {exercise.topic}
                        </span>
                      )}
                    </div>
                  </label>
                </li>
              );
            })}
          </ul>
        )}

        <div className="flex justify-end pt-2">
          <button
            type="button"
            onClick={onStart}
            disabled={selectedIds.size === 0}
            className="cursor-pointer rounded-xl bg-accent px-5 py-2.5 text-sm font-medium text-accent-foreground transition-colors hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Start met {selectedIds.size || 0}{" "}
            {selectedIds.size === 1 ? "oefening" : "oefeningen"}
          </button>
        </div>
      </div>
    </section>
  );
}
