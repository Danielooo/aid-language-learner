"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { queryKeys } from "@/lib/query-keys";
import { fetchJson } from "@/lib/api/fetch-json";

import {
  CommunityGroupModal,
  membersFromLive,
} from "@/components/features/community/community-group-modal";
import { RefreshButton } from "@/components/ui/refresh-button";
import { TableLoadingSkeleton } from "@/components/ui/table-loading-skeleton";

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
  const [modalChangedSinceReject, setModalChangedSinceReject] = useState(false);

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

  const offerMutation = useMutation({
    mutationFn: async (groupId: string) => {
      await fetchJson<ExerciseGroupSubmitSuccess>(
        `/api/exercise-groups/mine/${groupId}/submit`,
        { method: "POST" },
      );
    },
    onSuccess: () => {
      setMessage("Topic aangeboden aan de community.");
      setModalOfferState("pending");
      setModalChangedSinceReject(false);
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
    setModalChangedSinceReject(false);
  }

  async function openGroup(item: ExerciseGroupListItem) {
    setModalGroup(item);
    setModalOfferState(item.offerState ?? "available");
    setModalMembers([]);
    setModalError(null);
    setModalRejectReason(item.rejectReason ?? null);
    setModalChangedSinceReject(item.changedSinceReject ?? false);
    setModalLoading(true);
    setMessage(null);

    try {
      const body = await fetchJson<ExerciseGroupDetailSuccess>(
        `/api/exercise-groups/mine/${item.id}`,
      );
      setModalMembers(membersFromLive(body.group.members));
      setModalOfferState(body.group.offerState ?? "available");
      setModalRejectReason(body.group.rejectReason ?? null);
      setModalChangedSinceReject(body.group.changedSinceReject ?? false);
    } catch (e) {
      setModalError(e instanceof Error ? e.message : "Kon topic niet laden.");
    } finally {
      setModalLoading(false);
    }
  }

  const isRefreshing = isFetching && !loading;
  const offerBusy = offerMutation.isPending;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex min-w-[12rem] flex-1 flex-col gap-1 text-sm">
          <span className="text-muted-foreground text-xs">Zoeken</span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Topic of tags…"
            className="border-border bg-background text-foreground h-9 rounded-md border px-3 text-sm"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-muted-foreground text-xs">Status</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            className="border-border bg-background text-foreground h-9 rounded-md border px-2 text-sm"
          >
            <option value="all">Alles</option>
            <option value="available">Beschikbaar</option>
            <option value="pending">Pending</option>
            <option value="approved">Goedgekeurd</option>
            <option value="rejected">Afgekeurd</option>
          </select>
        </label>
        <RefreshButton
          className="ml-auto"
          isRefreshing={isRefreshing}
          disabled={loading || offerBusy}
          onClick={() =>
            void queryClient.invalidateQueries({
              queryKey: queryKeys.learningTopics(),
            })
          }
        />
      </div>

      <p className="text-muted-foreground text-xs">
        {filtered.length} zichtbaar
        {query.trim() ? ` · filter: “${query.trim()}”` : ""}
        {groups.length > 0 ? ` · ${groups.length} totaal` : ""}
      </p>

      {error && (
        <p className="text-destructive text-sm" role="alert">
          {error}
        </p>
      )}
      {message && (
        <p className="text-muted-foreground text-sm" role="status">
          {message}
        </p>
      )}

      {loading ? (
        <TableLoadingSkeleton columns={5} />
      ) : groups.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          Nog geen persoonlijke topics. Maak of importeer eerst topics via de
          Generator of Community → Overnemen.
        </p>
      ) : filtered.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          Geen topics die bij je filters passen.
        </p>
      ) : (
        <div
          className={isRefreshing ? "opacity-60 transition-opacity" : undefined}
        >
          <div className="border-border overflow-x-auto rounded-md border">
            <table className="w-full min-w-[44rem] table-fixed text-left text-sm">
              <colgroup>
                <col className="w-[26%]" />
                <col className="w-[24%]" />
                <col className="w-[12%]" />
                <col className="w-[22%]" />
                <col className="w-[16%]" />
              </colgroup>
              <thead className="border-border bg-muted/40 text-muted-foreground border-b text-xs">
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
                      className="border-border/60 hover:bg-muted/40 cursor-pointer border-b"
                    >
                      <td className="text-foreground truncate px-3 py-2 font-medium">
                        {item.name}
                      </td>
                      <td
                        className="text-muted-foreground truncate px-3 py-2"
                        title={tagsFull}
                      >
                        {tagsPreview}
                      </td>
                      <td className="text-muted-foreground px-3 py-2">
                        {item.exerciseCount}
                      </td>
                      <td className="text-muted-foreground truncate px-3 py-2">
                        {!when ||
                        label === "—" ||
                        label === "Beschikbaar" ||
                        label === "Leeg" ? (
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
                      <td className="text-muted-foreground truncate px-3 py-2">
                        {reason ? (
                          <span title={reason.length > 40 ? reason : undefined}>
                            {truncate(reason, 40)}
                          </span>
                        ) : item.offerState === "rejected" ? (
                          "Geen reden"
                        ) : (
                          "—"
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <p className="text-muted-foreground px-3 py-2 text-[11px]">
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
        changedSinceReject={modalChangedSinceReject}
        onClose={closeModal}
        onOffer={() => {
          if (!modalGroup) return;
          offerMutation.mutate(modalGroup.id);
        }}
      />
    </div>
  );
}
