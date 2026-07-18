"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { AdminReviewGroupModal } from "@/app/_components/features/admin/admin-review-group-modal";

import type {
  ExerciseGroupSnapshot,
  ExerciseGroupSubmissionRow,
  GroupSubmissionStatus,
} from "@/types/exercise-group-submission";

type TabId = "pending" | "approved" | "rejected";

type QueueRow = ExerciseGroupSubmissionRow & {
  submitter_username: string | null;
};

type QueueResponse =
  | { ok: true; rows: QueueRow[] }
  | { ok: false; error: string };

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1)}…`;
}

function snapshotOf(row: QueueRow): ExerciseGroupSnapshot {
  return row.snapshot;
}

export function AdminReviewQueue() {
  const [tab, setTab] = useState<TabId>("pending");
  const [pendingRows, setPendingRows] = useState<QueueRow[]>([]);
  const [approvedRows, setApprovedRows] = useState<QueueRow[]>([]);
  const [rejectedRows, setRejectedRows] = useState<QueueRow[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [rejectReason, setRejectReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [modalRow, setModalRow] = useState<QueueRow | null>(null);

  const loadStatus = useCallback(async (status: TabId) => {
    const res = await fetch(
      `/api/admin/group-submissions?status=${status}`,
      { cache: "no-store" },
    );
    const json = (await res.json()) as QueueResponse;
    if (!json.ok) {
      throw new Error(json.error);
    }
    return json.rows;
  }, []);

  const reload = useCallback(async () => {
    setError(null);
    const [pending, approved, rejected] = await Promise.all([
      loadStatus("pending"),
      loadStatus("approved"),
      loadStatus("rejected"),
    ]);
    setPendingRows(pending);
    setApprovedRows(approved);
    setRejectedRows(rejected);
    setSelected(new Set());
  }, [loadStatus]);

  useEffect(() => {
    void (async () => {
      setLoading(true);
      try {
        await reload();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Laden mislukt.");
      } finally {
        setLoading(false);
      }
    })();
  }, [reload]);

  const activeRows =
    tab === "pending"
      ? pendingRows
      : tab === "approved"
        ? approvedRows
        : rejectedRows;

  const allSelected = useMemo(
    () => activeRows.length > 0 && selected.size === activeRows.length,
    [activeRows, selected],
  );

  function switchTab(next: TabId) {
    setTab(next);
    setSelected(new Set());
    setRejectReason("");
    setMessage(null);
    setError(null);
    setModalRow(null);
  }

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
    else setSelected(new Set(activeRows.map((r) => r.id)));
  }

  async function runAction(
    label: string,
    fn: () => Promise<{ ok: boolean; message: string; error?: string }>,
  ) {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const result = await fn();
      if (!result.ok) {
        setError(result.error ?? `${label} mislukt.`);
        return;
      }
      setMessage(result.message);
      setRejectReason("");
      setModalRow(null);
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Onbekende fout.");
    } finally {
      setBusy(false);
    }
  }

  async function approveIds(ids: string[]) {
    if (ids.length === 0) return;
    await runAction("Goedkeuren", async () => {
      const res = await fetch("/api/admin/group-submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ submission_ids: ids }),
      });
      const json = (await res.json()) as {
        ok: boolean;
        approved?: number;
        errors?: string[];
        error?: string;
      };
      if (!json.ok) {
        return { ok: false, message: "", error: json.error };
      }
      return {
        ok: true,
        message:
          `${json.approved ?? 0} groep(en) goedgekeurd.` +
          (json.errors?.length ? ` ${json.errors.join("; ")}` : ""),
      };
    });
  }

  async function rejectIds(ids: string[], reason: string) {
    if (ids.length === 0) return;
    await runAction("Afkeuren", async () => {
      const res = await fetch("/api/admin/group-submissions/reject", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          submission_ids: ids,
          reason: reason.trim() || undefined,
        }),
      });
      const json = (await res.json()) as {
        ok: boolean;
        rejected?: number;
        errors?: string[];
        error?: string;
      };
      if (!json.ok) {
        return { ok: false, message: "", error: json.error };
      }
      return {
        ok: true,
        message:
          `${json.rejected ?? 0} groep(en) afgekeurd.` +
          (json.errors?.length ? ` ${json.errors.join("; ")}` : ""),
      };
    });
  }

  async function reopenIds(ids: string[]) {
    if (ids.length === 0) return;
    await runAction("Terugzetten", async () => {
      const res = await fetch("/api/admin/group-submissions/reopen", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ submission_ids: ids }),
      });
      const json = (await res.json()) as {
        ok: boolean;
        reopened?: number;
        errors?: string[];
        error?: string;
      };
      if (!json.ok) {
        return { ok: false, message: "", error: json.error };
      }
      return {
        ok: true,
        message:
          `${json.reopened ?? 0} groep(en) terug naar Pending.` +
          (json.errors?.length ? ` ${json.errors.join("; ")}` : ""),
      };
    });
  }

  const tabButtonClass = (id: TabId) =>
    `rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
      tab === id
        ? "bg-muted text-foreground"
        : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
    }`;

  return (
    <div className="space-y-4">
      <div
        role="tablist"
        aria-label="Review-tabs"
        className="flex flex-wrap gap-2 border-b border-border pb-2"
      >
        <button
          type="button"
          role="tab"
          aria-selected={tab === "pending"}
          onClick={() => switchTab("pending")}
          className={tabButtonClass("pending")}
        >
          Pending ({pendingRows.length})
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "approved"}
          onClick={() => switchTab("approved")}
          className={tabButtonClass("approved")}
        >
          Goedgekeurd ({approvedRows.length})
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "rejected"}
          onClick={() => switchTab("rejected")}
          className={tabButtonClass("rejected")}
        >
          Afgekeurd ({rejectedRows.length})
        </button>
      </div>

      <Toolbar
        tab={tab}
        busy={busy}
        selectedCount={selected.size}
        rejectReason={rejectReason}
        onRejectReasonChange={setRejectReason}
        onApprove={() => void approveIds([...selected])}
        onReject={() => void rejectIds([...selected], rejectReason)}
        onReopen={() => void reopenIds([...selected])}
        onReload={() => void reload()}
      />

      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
      {message && <p className="text-sm text-muted-foreground">{message}</p>}

      {loading ? (
        <p className="text-sm text-muted-foreground">Laden…</p>
      ) : activeRows.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {tab === "pending"
            ? "Geen pending groep-aanbiedingen."
            : tab === "approved"
              ? "Geen goedgekeurde groep-aanbiedingen."
              : "Geen afgekeurde groep-aanbiedingen."}
        </p>
      ) : (
        <div className="overflow-x-auto rounded-md border border-border">
          <table className="w-full min-w-[40rem] text-left text-sm">
            <thead className="border-b border-border bg-muted/40 text-xs text-muted-foreground">
              <tr>
                <th className="w-10 px-3 py-2 align-middle">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleAll}
                    aria-label="Alles selecteren"
                    className="size-4 rounded border-border accent-accent"
                  />
                </th>
                <th className="px-3 py-2">Groep</th>
                <th className="px-3 py-2">Oefeningen</th>
                <th className="px-3 py-2">User</th>
                {tab === "rejected" && (
                  <th className="px-3 py-2">Reden</th>
                )}
                <th className="px-3 py-2">
                  {tab === "pending" ? "Aangeboden" : "Bijgewerkt"}
                </th>
              </tr>
            </thead>
            <tbody>
              {activeRows.map((row) => {
                const snap = snapshotOf(row);
                const reason = row.reject_reason?.trim() ?? "";
                return (
                  <tr
                    key={row.id}
                    onClick={() => setModalRow(row)}
                    className="cursor-pointer border-b border-border/60 hover:bg-muted/40"
                  >
                    <td
                      className="px-3 py-2 align-middle"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <input
                        type="checkbox"
                        checked={selected.has(row.id)}
                        onChange={() => toggle(row.id)}
                        aria-label={`Selecteer ${snap.name}`}
                        className="size-4 rounded border-border accent-accent"
                      />
                    </td>
                    <td className="px-3 py-2 font-medium text-foreground">
                      {snap.name}
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {snap.exercises?.length ?? 0}
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {row.submitter_username ?? "—"}
                    </td>
                    {tab === "rejected" && (
                      <td className="px-3 py-2 text-muted-foreground">
                        {reason ? (
                          <span title={reason.length > 30 ? reason : undefined}>
                            {truncate(reason, 30)}
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                    )}
                    <td className="px-3 py-2 text-muted-foreground">
                      {new Date(
                        tab === "pending"
                          ? row.created_at
                          : (row.reviewed_at ?? row.updated_at),
                      ).toLocaleString("nl-NL")}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <AdminReviewGroupModal
        open={modalRow !== null}
        snapshot={modalRow ? snapshotOf(modalRow) : null}
        tab={tab as GroupSubmissionStatus}
        busy={busy}
        onClose={() => setModalRow(null)}
        onApprove={() => {
          if (!modalRow) return;
          void approveIds([modalRow.id]);
        }}
        onReject={(reason) => {
          if (!modalRow) return;
          void rejectIds([modalRow.id], reason);
        }}
        onReopen={() => {
          if (!modalRow) return;
          void reopenIds([modalRow.id]);
        }}
      />
    </div>
  );
}

type ToolbarProps = {
  tab: TabId;
  busy: boolean;
  selectedCount: number;
  rejectReason: string;
  onRejectReasonChange: (value: string) => void;
  onApprove: () => void;
  onReject: () => void;
  onReopen: () => void;
  onReload: () => void;
};

function Toolbar({
  tab,
  busy,
  selectedCount,
  rejectReason,
  onRejectReasonChange,
  onApprove,
  onReject,
  onReopen,
  onReload,
}: ToolbarProps) {
  const none = selectedCount === 0;

  return (
    <div className="flex flex-wrap items-end gap-3">
      {tab === "pending" && (
        <>
          <button
            type="button"
            disabled={busy || none}
            onClick={onApprove}
            className="inline-flex h-9 items-center rounded-md bg-accent px-3 text-xs font-medium text-accent-foreground disabled:opacity-50"
          >
            Goedkeuren ({selectedCount})
          </button>
          <button
            type="button"
            disabled={busy || none}
            onClick={onReject}
            className="inline-flex h-9 items-center rounded-md bg-destructive/90 px-3 text-xs font-medium text-destructive-foreground disabled:opacity-50"
          >
            Afkeuren ({selectedCount})
          </button>
          <RejectReasonField
            id="reject-reason"
            value={rejectReason}
            onChange={onRejectReasonChange}
            disabled={busy}
          />
        </>
      )}

      {tab === "approved" && (
        <>
          <button
            type="button"
            disabled={busy || none}
            onClick={onReopen}
            className="inline-flex h-9 items-center rounded-md border border-border px-3 text-xs disabled:opacity-50"
          >
            Terug naar Pending ({selectedCount})
          </button>
          <button
            type="button"
            disabled={busy || none}
            onClick={onReject}
            className="inline-flex h-9 items-center rounded-md bg-destructive/90 px-3 text-xs font-medium text-destructive-foreground disabled:opacity-50"
          >
            Afkeuren ({selectedCount})
          </button>
          <RejectReasonField
            id="reject-reason-approved"
            value={rejectReason}
            onChange={onRejectReasonChange}
            disabled={busy}
          />
        </>
      )}

      {tab === "rejected" && (
        <>
          <button
            type="button"
            disabled={busy || none}
            onClick={onReopen}
            className="inline-flex h-9 items-center rounded-md border border-border px-3 text-xs disabled:opacity-50"
          >
            Terug naar Pending ({selectedCount})
          </button>
          <button
            type="button"
            disabled={busy || none}
            onClick={onApprove}
            className="inline-flex h-9 items-center rounded-md bg-accent px-3 text-xs font-medium text-accent-foreground disabled:opacity-50"
          >
            Goedkeuren ({selectedCount})
          </button>
        </>
      )}

      <button
        type="button"
        disabled={busy}
        onClick={onReload}
        className="inline-flex h-9 items-center rounded-md border border-border px-3 text-xs"
      >
        Ververs
      </button>
    </div>
  );
}

function RejectReasonField({
  id,
  value,
  onChange,
  disabled,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  disabled: boolean;
}) {
  return (
    <div className="flex min-w-64 flex-1 flex-col gap-1">
      <label htmlFor={id} className="text-[11px] text-muted-foreground">
        Afkeurreden (optioneel)
      </label>
      <input
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="h-9 rounded-md border border-border bg-background px-2 text-sm"
        placeholder="Bijv. onduidelijke vertalingen"
      />
    </div>
  );
}
