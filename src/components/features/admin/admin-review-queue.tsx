"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { AdminReviewGroupModal } from "@/components/features/admin/admin-review-group-modal";
import { RefreshButton } from "@/components/ui/refresh-button";
import { TableLoadingSkeleton } from "@/components/ui/table-loading-skeleton";
import { fetchJson } from "@/lib/api/fetch-json";
import { queryKeys } from "@/lib/query-keys";

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

type ActionResult = {
  ok: boolean;
  message: string;
  error?: string;
};

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1)}…`;
}

function snapshotOf(row: QueueRow): ExerciseGroupSnapshot {
  return row.snapshot;
}

async function fetchStatusRows(status: TabId): Promise<QueueRow[]> {
  const json = await fetchJson<QueueResponse>(
    `/api/admin/group-submissions?status=${status}`,
  );
  if (!json.ok) throw new Error(json.error);
  return json.rows;
}

function useStatusQuery(status: TabId) {
  return useQuery({
    queryKey: queryKeys.adminReviews(status),
    queryFn: () => fetchStatusRows(status),
  });
}

export function AdminReviewQueue() {
  const queryClient = useQueryClient();

  const [tab, setTab] = useState<TabId>("pending");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [rejectReason, setRejectReason] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [modalRow, setModalRow] = useState<QueueRow | null>(null);

  const pendingQuery = useStatusQuery("pending");
  const approvedQuery = useStatusQuery("approved");
  const rejectedQuery = useStatusQuery("rejected");

  const pendingRows = pendingQuery.data ?? [];
  const approvedRows = approvedQuery.data ?? [];
  const rejectedRows = rejectedQuery.data ?? [];

  const loading =
    pendingQuery.isLoading ||
    approvedQuery.isLoading ||
    rejectedQuery.isLoading;

  const isFetching =
    pendingQuery.isFetching ||
    approvedQuery.isFetching ||
    rejectedQuery.isFetching;

  const queryError =
    pendingQuery.error ?? approvedQuery.error ?? rejectedQuery.error;

  const listError = queryError
    ? queryError instanceof Error
      ? queryError.message
      : "Laden mislukt."
    : null;

  const error = actionError ?? listError;

  function invalidateReviews() {
    void queryClient.invalidateQueries({ queryKey: ["admin-reviews"] });
    void queryClient.invalidateQueries({
      queryKey: queryKeys.communityGroups(),
    });
    void queryClient.invalidateQueries({
      queryKey: queryKeys.learningTopics(),
    });
  }

  function refetchAll() {
    setActionError(null);
    void pendingQuery.refetch();
    void approvedQuery.refetch();
    void rejectedQuery.refetch();
  }

  const actionMutation = useMutation({
    mutationFn: async (fn: () => Promise<ActionResult>) => fn(),
    onSuccess: (result) => {
      if (!result.ok) {
        setActionError(result.error ?? "Actie mislukt.");
        return;
      }
      setMessage(result.message);
      setRejectReason("");
      setModalRow(null);
      setSelected(new Set());
      setActionError(null);
      invalidateReviews();
    },
    onError: (e) => {
      setActionError(e instanceof Error ? e.message : "Onbekende fout.");
    },
  });

  const busy = actionMutation.isPending;
  const isRefreshing = isFetching && !loading;

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
    setActionError(null);
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

  function runAction(fn: () => Promise<ActionResult>) {
    setActionError(null);
    setMessage(null);
    actionMutation.mutate(fn);
  }

  function approveIds(ids: string[]) {
    if (ids.length === 0) return;
    runAction(async () => {
      const json = await fetchJson<{
        ok: boolean;
        approved?: number;
        errors?: string[];
        error?: string;
      }>("/api/admin/group-submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ submission_ids: ids }),
      });
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

  function rejectIds(ids: string[], reason: string) {
    if (ids.length === 0) return;
    runAction(async () => {
      const json = await fetchJson<{
        ok: boolean;
        rejected?: number;
        errors?: string[];
        error?: string;
      }>("/api/admin/group-submissions/reject", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          submission_ids: ids,
          reason: reason.trim() || undefined,
        }),
      });
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

  function reopenIds(ids: string[]) {
    if (ids.length === 0) return;
    runAction(async () => {
      const json = await fetchJson<{
        ok: boolean;
        reopened?: number;
        errors?: string[];
        error?: string;
      }>("/api/admin/group-submissions/reopen", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ submission_ids: ids }),
      });
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
        aria-label="Bijdragen beoordelen-tabs"
        className="border-border flex flex-wrap gap-2 border-b pb-2"
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
        isRefreshing={isRefreshing}
        selectedCount={selected.size}
        rejectReason={rejectReason}
        onRejectReasonChange={setRejectReason}
        onApprove={() => approveIds([...selected])}
        onReject={() => rejectIds([...selected], rejectReason)}
        onReopen={() => reopenIds([...selected])}
        onReload={refetchAll}
      />

      {error && (
        <p className="text-destructive text-sm" role="alert">
          {error}
          {listError && !actionError ? (
            <>
              {" "}
              <button type="button" onClick={refetchAll} className="underline">
                Opnieuw
              </button>
            </>
          ) : null}
        </p>
      )}
      {message && <p className="text-muted-foreground text-sm">{message}</p>}

      {loading ? (
        <TableLoadingSkeleton columns={tab === "rejected" ? 6 : 5} />
      ) : activeRows.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          {tab === "pending"
            ? "Geen pending groep-aanbiedingen."
            : tab === "approved"
              ? "Geen goedgekeurde groep-aanbiedingen."
              : "Geen afgekeurde groep-aanbiedingen."}
        </p>
      ) : (
        <div
          className={`border-border overflow-x-auto rounded-md border ${
            isRefreshing ? "opacity-60 transition-opacity" : ""
          }`}
        >
          <table className="w-full min-w-[40rem] text-left text-sm">
            <thead className="border-border bg-muted/40 text-muted-foreground border-b text-xs">
              <tr>
                <th className="w-10 px-3 py-2 align-middle">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleAll}
                    aria-label="Alles selecteren"
                    className="border-border accent-accent size-4 rounded"
                  />
                </th>
                <th className="px-3 py-2">Groep</th>
                <th className="px-3 py-2">Oefeningen</th>
                <th className="px-3 py-2">User</th>
                {tab === "rejected" && <th className="px-3 py-2">Reden</th>}
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
                    className="border-border/60 hover:bg-muted/40 cursor-pointer border-b"
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
                        className="border-border accent-accent size-4 rounded"
                      />
                    </td>
                    <td className="text-foreground px-3 py-2 font-medium">
                      {snap.name}
                    </td>
                    <td className="text-muted-foreground px-3 py-2">
                      {snap.exercises?.length ?? 0}
                    </td>
                    <td className="text-muted-foreground px-3 py-2">
                      {row.submitter_username ?? "—"}
                    </td>
                    {tab === "rejected" && (
                      <td className="text-muted-foreground px-3 py-2">
                        {reason ? (
                          <span title={reason.length > 30 ? reason : undefined}>
                            {truncate(reason, 30)}
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                    )}
                    <td className="text-muted-foreground px-3 py-2">
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
          approveIds([modalRow.id]);
        }}
        onReject={(reason) => {
          if (!modalRow) return;
          rejectIds([modalRow.id], reason);
        }}
        onReopen={() => {
          if (!modalRow) return;
          reopenIds([modalRow.id]);
        }}
      />
    </div>
  );
}

type ToolbarProps = {
  tab: TabId;
  busy: boolean;
  isRefreshing: boolean;
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
  isRefreshing,
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
            className="bg-accent text-accent-foreground inline-flex h-9 items-center rounded-md px-3 text-xs font-medium disabled:opacity-50"
          >
            Goedkeuren ({selectedCount})
          </button>
          <button
            type="button"
            disabled={busy || none}
            onClick={onReject}
            className="bg-destructive/90 text-destructive-foreground inline-flex h-9 items-center rounded-md px-3 text-xs font-medium disabled:opacity-50"
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
            className="border-border inline-flex h-9 items-center rounded-md border px-3 text-xs disabled:opacity-50"
          >
            Terug naar Pending ({selectedCount})
          </button>
          <button
            type="button"
            disabled={busy || none}
            onClick={onReject}
            className="bg-destructive/90 text-destructive-foreground inline-flex h-9 items-center rounded-md px-3 text-xs font-medium disabled:opacity-50"
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
            className="border-border inline-flex h-9 items-center rounded-md border px-3 text-xs disabled:opacity-50"
          >
            Terug naar Pending ({selectedCount})
          </button>
          <button
            type="button"
            disabled={busy || none}
            onClick={onApprove}
            className="bg-accent text-accent-foreground inline-flex h-9 items-center rounded-md px-3 text-xs font-medium disabled:opacity-50"
          >
            Goedkeuren ({selectedCount})
          </button>
        </>
      )}

      <RefreshButton
        isRefreshing={isRefreshing}
        disabled={busy}
        onClick={onReload}
      />
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
      <label htmlFor={id} className="text-muted-foreground text-[11px]">
        Afkeurreden (optioneel)
      </label>
      <input
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="border-border bg-background h-9 rounded-md border px-2 text-sm"
        placeholder="Bijv. onduidelijke vertalingen"
      />
    </div>
  );
}
