"use client";

import { useCallback, useEffect, useState } from "react";

import type { ExerciseGlobalSubmissionRow } from "@/types/exercise-global-submission";

type SubmissionsResponse =
  | { ok: true; rows: ExerciseGlobalSubmissionRow[] }
  | { ok: false; error: string };

type SubmitResponse =
  | { ok: true; created: number; errors: string[] }
  | { ok: false; error: string };

type Props = {
  selectedExerciseIds: string[];
  onDone?: () => void;
};

const STATUS_LABEL: Record<string, string> = {
  pending: "In review",
  approved: "Goedgekeurd",
  rejected: "Afgewezen",
  withdrawn: "Ingetrokken",
};

/**
 * User-paneel: aanbieden als global + status van recente aanbiedingen.
 */
export function GlobalOfferPanel({ selectedExerciseIds, onDone }: Props) {
  const [rows, setRows] = useState<ExerciseGlobalSubmissionRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    const res = await fetch("/api/exercises/global-submissions", {
      cache: "no-store",
    });
    const json = (await res.json()) as SubmissionsResponse;
    if (json.ok) setRows(json.rows);
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  async function submitSelected() {
    if (selectedExerciseIds.length === 0) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/exercises/global-submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ exercise_ids: selectedExerciseIds }),
      });
      const json = (await res.json()) as SubmitResponse;
      if (!json.ok) {
        setError(json.error);
        return;
      }
      setMessage(
        `${json.created} aangeboden.` +
          (json.errors.length ? ` Fouten: ${json.errors.join("; ")}` : ""),
      );
      await reload();
      onDone?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Onbekende fout.");
    } finally {
      setBusy(false);
    }
  }

  async function withdraw(id: string) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/exercises/global-submissions/${id}/withdraw`,
        { method: "POST" },
      );
      const json = (await res.json()) as { ok: boolean; error?: string };
      if (!json.ok) {
        setError(json.error ?? "Intrekken mislukt.");
        return;
      }
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Onbekende fout.");
    } finally {
      setBusy(false);
    }
  }

  const recent = rows.slice(0, 8);

  return (
    <section className="space-y-3 rounded-md border border-border bg-background/40 px-3 py-3">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-sm font-semibold text-foreground">
          Aanbieden als global
        </h2>
        <button
          type="button"
          disabled={busy || selectedExerciseIds.length === 0}
          onClick={() => void submitSelected()}
          className="inline-flex h-9 cursor-pointer items-center rounded-md bg-accent px-3 text-xs font-medium text-accent-foreground transition-colors hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy
            ? "Bezig…"
            : selectedExerciseIds.length > 0
              ? `Bied ${selectedExerciseIds.length} aan`
              : "Selecteer oefeningen"}
        </button>
      </div>
      <p className="text-xs text-muted-foreground">
        Admin keurt goed (copy-on-approve). Je origineel blijft van jou.
      </p>
      {error && (
        <p className="text-xs text-destructive" role="alert">
          {error}
        </p>
      )}
      {message && <p className="text-xs text-muted-foreground">{message}</p>}
      {recent.length > 0 && (
        <ul className="space-y-2">
          {recent.map((row) => (
            <li
              key={row.id}
              className="flex flex-wrap items-start justify-between gap-2 rounded border border-border/60 px-2 py-1.5 text-xs"
            >
              <div className="min-w-0 space-y-0.5">
                <p className="truncate font-medium text-foreground">
                  {(row.snapshot as { source_text?: string }).source_text ??
                    row.source_exercise_id}
                </p>
                <p className="text-muted-foreground">
                  {STATUS_LABEL[row.status] ?? row.status}
                  {row.status === "rejected" && row.reject_reason
                    ? ` — ${row.reject_reason}`
                    : ""}
                </p>
              </div>
              {row.status === "pending" && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void withdraw(row.id)}
                  className="shrink-0 text-[11px] text-muted-foreground underline-offset-2 hover:text-foreground hover:underline disabled:opacity-50"
                >
                  Intrekken
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
