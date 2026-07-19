"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { queryKeys } from "@/lib/query-keys";
import { fetchJson } from "@/lib/api/fetch-json";

import {
  CommunityGroupModal,
  membersFromLive,
} from "@/app/_components/features/community/community-group-modal";

import type {
  ExerciseGroupDetailSuccess,
  ExerciseGroupListItem,
  ExerciseGroupsListSuccess,
  ExerciseGroupSubmitSuccess,
  GroupOfferState,
} from "@/types/exercise-groups";

type StatusFilter = "all" | "pending" | "approved" | "rejected" | "available";

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
    case "available":
      return "Beschikbaar";
    case "empty":
      return "Leeg";
    default:
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

function formatTagPreview(tagText: string | undefined): {
  preview: string;
  full: string | undefined;
} {
  if (!tagText?.trim()) return { preview: "—", full: undefined };
  const parts = tagText
    .split(/[,\s]+/)
    .map((t) => t.trim())
    .filter(Boolean);
  const unique = Array.from(new Set(parts));
  if (unique.length === 0) return { preview: "—", full: undefined };
  const full = unique.join(", ");
  return { preview: full, full };
}

function matchesStatusFilter(
  state: GroupOfferState | undefined,
  filter: StatusFilter,
): boolean {
  if (filter === "all") return true;
  if (filter === "available") {
    return state === "available" || state === "empty";
  }
  return state === filter;
}

/**
 * Community → Bijdragen: persoonlijke topics aanbieden;
 * één tabel met zoek- en statusfilter.
 */
export function CommunityBijdragenPanel() {
  const queryClient = useQueryClient();

  const {
    data: groups = [],
    isLoading: loading,
    error: queryError,
    isFetching,
  } = useQuery({
    queryKey: queryKeys.learningTopics(),
    queryFn: async () => {
      const body = await fetchJson<ExerciseGroupsListSuccess>(
        "/api/exercise-groups/mine",
      );
      return body.groups;
    },
  });

  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [message, setMessage] = useState<string | null>(null);

  const [modalGroup, setModalGroup] = useState<ExerciseGroupListItem | null>(
    null,
  );
  const [modalMembers, setModalMembers] = useState<
    ReturnType<typeof membersFromLive>
  >([]);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [modalOfferState, setModalOfferState] =
    useState<GroupOfferState>("available");
  const [modalRejectReason, setModalRejectReason] = useState<string | null>(
    null,
  );

  const error = queryError
    ? queryError instanceof Error
      ? queryError.message
      : "Laden mislukt."
    : null;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return groups.filter((g) => {
      if (!matchesStatusFilter(g.offerState, statusFilter)) return false;
      if (!q) return true;
      if (g.name.toLowerCase().includes(q)) return true;
      if ((g.tagText ?? "").toLowerCase().includes(q)) return true;
      return false;
    });
  }, [groups, query, statusFilter]);

  const hasActiveFilters = query.trim() !== "" || statusFilter !== "all";

  const offerMutation = useMutation({
    mutationFn: async (groupId: string) => {
      await fetchJson<ExerciseGroupSubmitSuccess>(
        `/api/exercise-groups/mine/${groupId}/submit`,
        { method: "POST" },
      );
    },
    onSuccess: () => {
      setMessage("Topic aangeboden aan de community.");
      setStatusFilter("pending");
      closeModal();
      void queryClient.invalidateQueries({
        queryKey: queryKeys.learningTopics(),
      });
    },
    onError: (e) => {
      setModalError(e instanceof Error ? e.message : "Aanbieden mislukt.");
    },
  });

  function closeModal() {
    if (offerMutation.isPending) return;
    setModalGroup(null);
    setModalMembers([]);
    setModalError(null);
    setModalRejectReason(null);
  }

  async function openGroup(item: ExerciseGroupListItem) {
    setModalGroup(item);
    setModalOfferState(item.offerState ?? "available");
    setModalMembers([]);
    setModalError(null);
    setModalRejectReason(item.rejectReason ?? null);
    setModalLoading(true);
    setMessage(null);

    try {
      const body = await fetchJson<ExerciseGroupDetailSuccess>(
        `/api/exercise-groups/mine/${item.id}`,
      );
      setModalMembers(membersFromLive(body.group.members));
      setModalOfferState(body.group.offerState ?? "available");
    } catch (e) {
      setModalError(e instanceof Error ? e.message : "Kon topic niet laden.");
    } finally {
      setModalLoading(false);
    }
  }

  function clearFilters() {
    setQuery("");
    setStatusFilter("all");
  }

  const isRefreshing = isFetching && !loading;
  const offerBusy = offerMutation.isPending;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex min-w-[12rem] flex-1 flex-col gap-1 text-sm">
          <span className="text-xs text-muted-foreground">Zoeken</span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Topic of tags…"
            className="h-9 rounded-md border border-border bg-background px-3 text-sm text-foreground"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-xs text-muted-foreground">Status</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            className="h-9 rounded-md border border-border bg-background px-2 text-sm text-foreground"
          >
            <option value="all">Alles</option>
            <option value="available">Beschikbaar</option>
            <option value="pending">Pending</option>
            <option value="approved">Goedgekeurd</option>
            <option value="rejected">Afgekeurd</option>
          </select>
        </label>
        {hasActiveFilters && (
          <button
            type="button"
            onClick={clearFilters}
            className="inline-flex h-9 items-center rounded-md border border-border px-3 text-xs text-foreground"
          >
            Filters wissen
          </button>
        )}
        <button
          type="button"
          disabled={loading || offerBusy}
          onClick={() =>
            void queryClient.invalidateQueries({
              queryKey: queryKeys.learningTopics(),
            })
          }
          className="ml-auto inline-flex h-9 items-center rounded-md border border-border px-3 text-xs text-foreground disabled:opacity-50"
        >
          Ververs
        </button>
      </div>

      <p className="text-xs text-muted-foreground">
        {filtered.length} zichtbaar
        {query.trim() ? ` · filter: “${query.trim()}”` : ""}
        {groups.length > 0 ? ` · ${groups.length} totaal` : ""}
      </p>

      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
      {message && (
        <p className="text-sm text-muted-foreground" role="status">
          {message}
        </p>
      )}

      {loading ? (
        <p className="text-sm text-muted-foreground">Laden…</p>
      ) : groups.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Nog geen persoonlijke topics. Maak of importeer eerst topics via de
          Generator of Community → Overnemen.
        </p>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Geen topics die bij je filters passen.
        </p>
      ) : (
        <div
          className={
            isRefreshing ? "opacity-60 transition-opacity" : undefined
          }
        >
          <div className="overflow-x-auto rounded-md border border-border">
            <table className="w-full min-w-[44rem] text-left text-sm">
              <thead className="border-b border-border bg-muted/40 text-xs text-muted-foreground">
                <tr>
                  <th className="px-3 py-2">Topic</th>
                  <th className="px-3 py-2">Alle tags</th>
                  <th className="px-3 py-2">Oefeningen</th>
                  <th className="px-3 py-2">Community-status</th>
                  <th className="px-3 py-2">Reden</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((item) => {
                  const label = offerStateLabel(item.offerState);
                  const when = formatOfferStatusAt(item.offerStatusAt);
                  const { preview: tagsPreview, full: tagsFull } =
                    formatTagPreview(item.tagText);
                  const reason = item.rejectReason?.trim() ?? "";
                  return (
                    <tr
                      key={item.id}
                      tabIndex={0}
                      onClick={() => void openGroup(item)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") void openGroup(item);
                      }}
                      className="cursor-pointer border-b border-border/60 hover:bg-muted/40"
                    >
                      <td className="px-3 py-2 font-medium text-foreground">
                        {item.name}
                      </td>
                      <td
                        className="max-w-[12rem] truncate px-3 py-2 text-muted-foreground"
                        title={tagsFull}
                      >
                        {tagsPreview}
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">
                        {item.exerciseCount}
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">
                        {!when || label === "—" || label === "Beschikbaar" || label === "Leeg" ? (
                          label
                        ) : (
                          <span>
                            {label}
                            <span className="text-muted-foreground/80">
                              {" "}
                              · {when}
                            </span>
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">
                        {reason ? (
                          <span title={reason.length > 40 ? reason : undefined}>
                            {truncate(reason, 40)}
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <p className="px-3 py-2 text-[11px] text-muted-foreground">
              Klik op een rij om te bekijken en aan te bieden.
            </p>
          </div>
        </div>
      )}

      <CommunityGroupModal
        open={modalGroup !== null}
        name={modalGroup?.name ?? null}
        members={modalMembers}
        loading={modalLoading}
        busy={offerBusy}
        error={modalError}
        mode="offer"
        offerState={modalOfferState}
        rejectReason={modalRejectReason}
        onClose={closeModal}
        onOffer={() => {
          if (!modalGroup) return;
          offerMutation.mutate(modalGroup.id);
        }}
      />
    </div>
  );
}
