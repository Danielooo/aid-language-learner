"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import type { ExerciseGlobalSnapshot } from "@/types/exercise-global-submission";

type ReviewRow = {
  id: string;
  source_exercise_id: string;
  snapshot: ExerciseGlobalSnapshot;
  submitter_username: string | null;
  created_at: string;
};

type QueueResponse =
  | { ok: true; rows: ReviewRow[] }
  | { ok: false; error: string };

export function AdminReviewQueue() {
  const [rows, setRows] = useState<ReviewRow[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [rejectReason, setRejectReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setError(null);
    const res = await fetch("/api/admin/global-submissions", {
      cache: "no-store",
    });
    const json = (await res.json()) as QueueResponse;
    if (!json.ok) {
      setError(json.error);
      return;
    }
    setRows(json.rows);
    setSelected(new Set());
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const allSelected = useMemo(
    () => rows.length > 0 && selected.size === rows.length,
    [rows, selected],
  );

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(rows.map((r) => r.id)));
  }

  async function approve() {
    if (selected.size === 0) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/global-submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ submission_ids: [...selected] }),
      });
      const json = (await res.json()) as {
        ok: boolean;
        approved?: number;
        errors?: string[];
        error?: string;
      };
      if (!json.ok) {
        setError(json.error ?? "Goedkeuren mislukt.");
        return;
      }
      setMessage(
        `${json.approved ?? 0} goedgekeurd.` +
          (json.errors?.length ? ` ${json.errors.join("; ")}` : ""),
      );
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Onbekende fout.");
    } finally {
      setBusy(false);
    }
  }

  async function reject() {
    if (selected.size === 0 || !rejectReason.trim()) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/global-submissions/reject", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          submission_ids: [...selected],
          reason: rejectReason.trim(),
        }),
      });
      const json = (await res.json()) as {
        ok: boolean;
        rejected?: number;
        errors?: string[];
        error?: string;
      };
      if (!json.ok) {
        setError(json.error ?? "Afwijzen mislukt.");
        return;
      }
      setMessage(
        `${json.rejected ?? 0} afgewezen.` +
          (json.errors?.length ? ` ${json.errors.join("; ")}` : ""),
      );
      setRejectReason("");
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Onbekende fout.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <button
          type="button"
          disabled={busy || selected.size === 0}
          onClick={() => void approve()}
          className="inline-flex h-9 items-center rounded-md bg-accent px-3 text-xs font-medium text-accent-foreground disabled:opacity-50"
        >
          Goedkeuren ({selected.size})
        </button>
        <div className="flex min-w-64 flex-1 flex-col gap-1">
          <label htmlFor="reject-reason" className="text-[11px] text-muted-foreground">
            Afwijsreden (verplicht bij afwijzen)
          </label>
          <input
            id="reject-reason"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            className="h-9 rounded-md border border-border bg-background px-2 text-sm"
            placeholder="Bijv. onduidelijke vertaling"
          />
        </div>
        <button
          type="button"
          disabled={busy || selected.size === 0 || !rejectReason.trim()}
          onClick={() => void reject()}
          className="inline-flex h-9 items-center rounded-md bg-destructive/90 px-3 text-xs font-medium text-destructive-foreground disabled:opacity-50"
        >
          Afwijzen ({selected.size})
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => void reload()}
          className="inline-flex h-9 items-center rounded-md border border-border px-3 text-xs"
        >
          Ververs
        </button>
      </div>

      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
      {message && <p className="text-sm text-muted-foreground">{message}</p>}

      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">Geen pending aanbiedingen.</p>
      ) : (
        <div className="overflow-x-auto rounded-md border border-border">
          <table className="w-full min-w-[40rem] text-left text-sm">
            <thead className="border-b border-border bg-muted/40 text-xs text-muted-foreground">
              <tr>
                <th className="px-3 py-2">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleAll}
                    aria-label="Alles selecteren"
                  />
                </th>
                <th className="px-3 py-2">Bron (ES)</th>
                <th className="px-3 py-2">Doel (NL)</th>
                <th className="px-3 py-2">User</th>
                <th className="px-3 py-2">Topic</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-b border-border/60">
                  <td className="px-3 py-2">
                    <input
                      type="checkbox"
                      checked={selected.has(row.id)}
                      onChange={() => toggle(row.id)}
                      aria-label={`Selecteer ${row.id}`}
                    />
                  </td>
                  <td className="max-w-56 truncate px-3 py-2">
                    {row.snapshot.source_text}
                  </td>
                  <td className="max-w-56 truncate px-3 py-2">
                    {row.snapshot.target_text}
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {row.submitter_username ?? "—"}
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {row.snapshot.topic ?? "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
