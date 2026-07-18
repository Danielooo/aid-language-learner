"use client";

import { useCallback, useEffect, useState } from "react";

import {
  CommunityGroupModal,
  membersFromLive,
  membersFromSnapshot,
} from "@/app/_components/features/community/community-group-modal";

import type { ExerciseGroupSnapshot } from "@/types/exercise-group-submission";
import type {
  ExerciseGroupDetailSuccess,
  ExerciseGroupListItem,
  ExerciseGroupsListSuccess,
  GroupOfferState,
  MyGroupSubmissionDetailSuccess,
  MyGroupSubmissionListItem,
  MyGroupSubmissionsListSuccess,
} from "@/types/exercise-groups";

type TabId = "current" | "pending" | "approved" | "rejected";

type ModalState =
  | {
      kind: "offer";
      groupId: string;
      name: string;
      offerState: GroupOfferState;
    }
  | {
      kind: "snapshot";
      submissionId: string;
      name: string;
      rejectReason: string | null;
    };

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1)}…`;
}

function offerStateLabel(state: GroupOfferState | undefined): string {
  switch (state) {
    case "pending":
      return "Pending";
    case "approved":
      return "Goedgekeurd";
    case "rejected":
      return "Afgekeurd";
    default:
      // available / empty / undefined → nooit (of niet relevant) aangeboden
      return "—";
  }
}

function formatOfferStatusAt(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("nl-NL", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

async function fetchMineGroups(): Promise<ExerciseGroupListItem[]> {
  const res = await fetch("/api/exercise-groups/mine", { cache: "no-store" });
  const body = (await res.json()) as ExerciseGroupsListSuccess & {
    error?: string;
  };
  if (!res.ok || !body.ok) {
    throw new Error(body.error ?? `Status ${res.status}`);
  }
  return body.groups;
}

async function fetchSubmissions(
  status: "pending" | "approved" | "rejected",
): Promise<MyGroupSubmissionListItem[]> {
  const res = await fetch(
    `/api/exercise-groups/mine/submissions?status=${status}`,
    { cache: "no-store" },
  );
  const body = (await res.json()) as MyGroupSubmissionsListSuccess & {
    error?: string;
  };
  if (!res.ok || !body.ok) {
    throw new Error(body.error ?? `Status ${res.status}`);
  }
  return body.rows;
}

/**
 * Community → Bijdragen: aanbieden + snapshot-status tabs.
 */
export function CommunityBijdragenPanel() {
  const [tab, setTab] = useState<TabId>("current");
  const [currentGroups, setCurrentGroups] = useState<ExerciseGroupListItem[]>(
    [],
  );
  const [pendingRows, setPendingRows] = useState<MyGroupSubmissionListItem[]>(
    [],
  );
  const [approvedRows, setApprovedRows] = useState<MyGroupSubmissionListItem[]>(
    [],
  );
  const [rejectedRows, setRejectedRows] = useState<MyGroupSubmissionListItem[]>(
    [],
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const [modal, setModal] = useState<ModalState | null>(null);
  const [modalMembers, setModalMembers] = useState<
    ReturnType<typeof membersFromLive>
  >([]);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [offerBusy, setOfferBusy] = useState(false);
  const [modalOfferState, setModalOfferState] =
    useState<GroupOfferState>("available");
  const [modalRejectReason, setModalRejectReason] = useState<string | null>(
    null,
  );

  const reload = useCallback(async () => {
    const [current, pending, approved, rejected] = await Promise.all([
      fetchMineGroups(),
      fetchSubmissions("pending"),
      fetchSubmissions("approved"),
      fetchSubmissions("rejected"),
    ]);
    setCurrentGroups(current);
    setPendingRows(pending);
    setApprovedRows(approved);
    setRejectedRows(rejected);
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      setError(null);
      try {
        await reload();
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Laden mislukt.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [reload]);

  function switchTab(next: TabId) {
    setTab(next);
    setMessage(null);
    setError(null);
    closeModal();
  }

  function closeModal() {
    if (offerBusy) return;
    setModal(null);
    setModalMembers([]);
    setModalError(null);
    setModalRejectReason(null);
  }

  async function openCurrentGroup(item: ExerciseGroupListItem) {
    setModal({
      kind: "offer",
      groupId: item.id,
      name: item.name,
      offerState: item.offerState ?? "available",
    });
    setModalOfferState(item.offerState ?? "available");
    setModalMembers([]);
    setModalError(null);
    setModalRejectReason(null);
    setModalLoading(true);

    try {
      const res = await fetch(`/api/exercise-groups/mine/${item.id}`, {
        cache: "no-store",
      });
      const body = (await res.json()) as ExerciseGroupDetailSuccess & {
        error?: string;
      };
      if (!res.ok || !body.ok) {
        throw new Error(body.error ?? `Status ${res.status}`);
      }
      setModalMembers(membersFromLive(body.group.members));
      setModalOfferState(body.group.offerState ?? "available");
    } catch (e) {
      setModalError(e instanceof Error ? e.message : "Kon groep niet laden.");
    } finally {
      setModalLoading(false);
    }
  }

  async function openSubmission(row: MyGroupSubmissionListItem) {
    setModal({
      kind: "snapshot",
      submissionId: row.id,
      name: row.name,
      rejectReason: row.reject_reason,
    });
    setModalMembers([]);
    setModalError(null);
    setModalRejectReason(row.reject_reason);
    setModalLoading(true);

    try {
      const res = await fetch(
        `/api/exercise-groups/mine/submissions/${row.id}`,
        { cache: "no-store" },
      );
      const body = (await res.json()) as MyGroupSubmissionDetailSuccess & {
        error?: string;
      };
      if (!res.ok || !body.ok) {
        throw new Error(body.error ?? `Status ${res.status}`);
      }
      const snapshot = body.row.snapshot as ExerciseGroupSnapshot;
      const exercises = Array.isArray(snapshot.exercises)
        ? snapshot.exercises
        : [];
      setModalMembers(membersFromSnapshot(exercises));
      setModalRejectReason(body.row.reject_reason);
    } catch (e) {
      setModalError(
        e instanceof Error ? e.message : "Kon aanbieding niet laden.",
      );
    } finally {
      setModalLoading(false);
    }
  }

  async function handleOffer() {
    if (!modal || modal.kind !== "offer") return;
    if (modalOfferState !== "available" && modalOfferState !== "rejected") {
      return;
    }

    setOfferBusy(true);
    setModalError(null);
    try {
      const res = await fetch(
        `/api/exercise-groups/mine/${modal.groupId}/submit`,
        { method: "POST" },
      );
      const body = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !body.ok) {
        throw new Error(body.error ?? `Status ${res.status}`);
      }
      await reload();
      setMessage("Oefeningengroep aangeboden aan de community.");
      setTab("pending");
      setModal(null);
      setModalMembers([]);
    } catch (e) {
      setModalError(e instanceof Error ? e.message : "Aanbieden mislukt.");
    } finally {
      setOfferBusy(false);
    }
  }

  const tabButtonClass = (id: TabId) =>
    `rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
      tab === id
        ? "bg-muted text-foreground"
        : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
    }`;

  const submissionRows =
    tab === "pending"
      ? pendingRows
      : tab === "approved"
        ? approvedRows
        : tab === "rejected"
          ? rejectedRows
          : [];

  return (
    <div className="space-y-4">
      <div
        role="tablist"
        aria-label="Bijdragen-tabs"
        className="flex flex-wrap gap-2 border-b border-border pb-2"
      >
        <button
          type="button"
          role="tab"
          aria-selected={tab === "current"}
          onClick={() => switchTab("current")}
          className={tabButtonClass("current")}
        >
          Huidige oefeningengroepen ({currentGroups.length})
        </button>
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

      <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
        <span>
          <span className="font-medium text-foreground">
            {approvedRows.length}
          </span>{" "}
          goedgekeurd
        </span>
        <span>
          <span className="font-medium text-foreground">
            {pendingRows.length}
          </span>{" "}
          pending
        </span>
        <span>
          <span className="font-medium text-foreground">
            {rejectedRows.length}
          </span>{" "}
          afgekeurd
        </span>
        <button
          type="button"
          disabled={loading || offerBusy}
          onClick={() => void reload()}
          className="ml-auto inline-flex h-9 items-center rounded-md border border-border px-3 text-xs text-foreground disabled:opacity-50"
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

      {loading ? (
        <p className="text-sm text-muted-foreground">Laden…</p>
      ) : tab === "current" ? (
        currentGroups.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nog geen persoonlijke oefeningengroepen. Maak of importeer eerst
            groepen via de Generator of Community → Overnemen.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-md border border-border">
            <table className="w-full min-w-[36rem] text-left text-sm">
              <thead className="border-b border-border bg-muted/40 text-xs text-muted-foreground">
                <tr>
                  <th className="px-3 py-2">Oefeningengroep</th>
                  <th className="px-3 py-2">Oefeningen</th>
                  <th className="px-3 py-2">Community-status</th>
                </tr>
              </thead>
              <tbody>
                {currentGroups.map((item) => (
                  <tr
                    key={item.id}
                    tabIndex={0}
                    onDoubleClick={() => void openCurrentGroup(item)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") void openCurrentGroup(item);
                    }}
                    className="cursor-pointer border-b border-border/60 hover:bg-muted/40"
                  >
                    <td className="px-3 py-2 font-medium text-foreground">
                      {item.name}
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {item.exerciseCount}
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {(() => {
                        const label = offerStateLabel(item.offerState);
                        const when = formatOfferStatusAt(item.offerStatusAt);
                        if (!when || label === "—") return label;
                        return (
                          <span>
                            {label}
                            <span className="text-muted-foreground/80">
                              {" "}
                              · {when}
                            </span>
                          </span>
                        );
                      })()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="px-3 py-2 text-[11px] text-muted-foreground">
              Dubbelklik (of Enter) om te bekijken en aan te bieden.
            </p>
          </div>
        )
      ) : submissionRows.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {tab === "pending"
            ? "Geen pending aanbiedingen."
            : tab === "approved"
              ? "Nog geen goedgekeurde oefeningengroepen."
              : "Geen afgekeurde aanbiedingen."}
        </p>
      ) : (
        <div className="overflow-x-auto rounded-md border border-border">
          <table className="w-full min-w-[36rem] text-left text-sm">
            <thead className="border-b border-border bg-muted/40 text-xs text-muted-foreground">
              <tr>
                <th className="px-3 py-2">Oefeningengroep</th>
                <th className="px-3 py-2">Oefeningen</th>
                {tab === "rejected" && (
                  <th className="px-3 py-2">Reden</th>
                )}
                <th className="px-3 py-2">
                  {tab === "pending" ? "Aangeboden" : "Bijgewerkt"}
                </th>
              </tr>
            </thead>
            <tbody>
              {submissionRows.map((row) => {
                const reason = row.reject_reason?.trim() ?? "";
                return (
                  <tr
                    key={row.id}
                    tabIndex={0}
                    onDoubleClick={() => void openSubmission(row)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") void openSubmission(row);
                    }}
                    className="cursor-pointer border-b border-border/60 hover:bg-muted/40"
                  >
                    <td className="px-3 py-2 font-medium text-foreground">
                      {row.name}
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {row.exerciseCount}
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
          <p className="px-3 py-2 text-[11px] text-muted-foreground">
            Dubbelklik (of Enter) om de ingeleverde snapshot te bekijken.
          </p>
        </div>
      )}

      <CommunityGroupModal
        open={modal !== null}
        name={modal?.name ?? null}
        members={modalMembers}
        loading={modalLoading}
        busy={offerBusy}
        error={modalError}
        mode={modal?.kind === "offer" ? "offer" : "snapshot"}
        offerState={modalOfferState}
        rejectReason={modalRejectReason}
        onClose={closeModal}
        onOffer={() => void handleOffer()}
      />
    </div>
  );
}
