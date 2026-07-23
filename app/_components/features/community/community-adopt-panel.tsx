"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { queryKeys } from "@/lib/query-keys";
import { fetchJson } from "@/lib/api/fetch-json";
import { suggestedCommunityCopyName } from "@/lib/exercises/copy-global-group-to-personal";

import { LeerplanGroupModal } from "@/app/_components/features/topics/leerplan-group-modal";

import type {
  ExerciseGroupBulkCopySuccess,
  ExerciseGroupCopySuccess,
  ExerciseGroupDetail,
  ExerciseGroupDetailSuccess,
  ExerciseGroupListItem,
  ExerciseGroupsFailure,
  ExerciseGroupsListSuccess,
} from "@/types/exercise-groups";

type InPlanFilter = "all" | "yes" | "no";

type NameConflictState = {
  groupId: string;
  baseName: string;
  draftName: string;
};

function formatCopiedAt(iso: string | null | undefined): string | null {
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

type CopyError = Error & {
  code?: "NAME_CONFLICT";
  suggestedName?: string;
};

async function postCopy(
  groupId: string,
  name?: string,
): Promise<ExerciseGroupCopySuccess> {
  const res = await fetch(`/api/exercise-groups/global/${groupId}/copy`, {
    method: "POST",
    cache: "no-store",
    headers: name ? { "Content-Type": "application/json" } : undefined,
    body: name ? JSON.stringify({ name }) : undefined,
  });
  const body = (await res.json()) as
    | ExerciseGroupCopySuccess
    | ExerciseGroupsFailure;
  if (!res.ok || !body.ok) {
    const failure = body as ExerciseGroupsFailure;
    const err: CopyError = new Error(
      failure.error ?? `Status ${res.status}`,
    );
    err.code = failure.code;
    err.suggestedName = failure.suggestedName;
    throw err;
  }
  return body;
}

/**
 * Community → Overnemen: catalogus van goedgekeurde topics,
 * zoeken, filteren, bulk-selectie en toevoegen aan leerplan.
 */
export function CommunityAdoptPanel() {
  const queryClient = useQueryClient();

  const {
    data: groups = [],
    isLoading: loading,
    error: queryError,
    isFetching,
  } = useQuery({
    queryKey: queryKeys.communityGroups(),
    queryFn: async () => {
      const body = await fetchJson<ExerciseGroupsListSuccess>(
        "/api/exercise-groups/global",
      );
      return body.groups;
    },
  });

  const [message, setMessage] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState("");
  const [inPlanFilter, setInPlanFilter] = useState<InPlanFilter>("all");

  const [modalOpen, setModalOpen] = useState(false);
  const [modalGroupId, setModalGroupId] = useState<string | null>(null);
  const [modalName, setModalName] = useState<string | null>(null);
  const [modalDetail, setModalDetail] = useState<ExerciseGroupDetail | null>(
    null,
  );
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  const [nameConflict, setNameConflict] = useState<NameConflictState | null>(
    null,
  );
  const nameInputRef = useRef<HTMLInputElement | null>(null);

  const error = queryError
    ? queryError instanceof Error
      ? queryError.message
      : "Laden mislukt."
    : null;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return groups.filter((g) => {
      if (inPlanFilter === "yes" && !g.alreadyCopied) return false;
      if (inPlanFilter === "no" && g.alreadyCopied) return false;
      if (!q) return true;
      if (g.name.toLowerCase().includes(q)) return true;
      if ((g.tagText ?? "").toLowerCase().includes(q)) return true;
      return false;
    });
  }, [groups, query, inPlanFilter]);

  const hasActiveFilters = query.trim() !== "" || inPlanFilter !== "all";

  const allSelected = useMemo(
    () => filtered.length > 0 && filtered.every((g) => selected.has(g.id)),
    [filtered, selected],
  );

  const selectedIds = useMemo(() => Array.from(selected), [selected]);

  function invalidateLists() {
    void queryClient.invalidateQueries({
      queryKey: queryKeys.communityGroups(),
    });
    void queryClient.invalidateQueries({
      queryKey: queryKeys.learningTopics(),
    });
  }

  const singleCopyMutation = useMutation({
    mutationFn: async ({
      groupId,
      name,
    }: {
      groupId: string;
      name?: string;
    }) => postCopy(groupId, name),
    onSuccess: (body, variables) => {
      invalidateLists();
      setMessage(`Topic “${body.name}” toegevoegd aan je leerplan.`);
      setNameConflict(null);
      setModalOpen(false);
      setModalGroupId(null);
      setModalName(null);
      setModalDetail(null);
      setModalError(null);
      setSelected((prev) => {
        if (!prev.has(variables.groupId)) return prev;
        const next = new Set(prev);
        next.delete(variables.groupId);
        return next;
      });
    },
    onError: (err) => {
      const copyErr = err as CopyError;
      if (copyErr.code === "NAME_CONFLICT") {
        const base =
          modalName ??
          groups.find((g) => g.id === modalGroupId)?.name ??
          "topic";
        setNameConflict({
          groupId: modalGroupId!,
          baseName: base,
          draftName:
            copyErr.suggestedName ?? suggestedCommunityCopyName(base),
        });
        setModalError(null);
        return;
      }
      setModalError(
        err instanceof Error ? err.message : "Kopiëren mislukt.",
      );
    },
  });

  const bulkCopyMutation = useMutation({
    mutationFn: async (group_ids: string[]) => {
      const body = await fetchJson<ExerciseGroupBulkCopySuccess>(
        "/api/exercise-groups/global/copy",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ group_ids }),
        },
      );
      return body;
    },
    onSuccess: (body) => {
      invalidateLists();
      const parts = [
        body.copied > 0 ? `${body.copied} toegevoegd` : null,
        body.skipped > 0
          ? `${body.skipped} overgeslagen (naamconflict)`
          : null,
      ].filter(Boolean);
      setMessage(
        parts.length > 0
          ? parts.join(", ") + "."
          : "Geen topics toegevoegd.",
      );
      setSelected(new Set());
    },
  });

  const nameConflictDialogRef = useRef<HTMLDialogElement | null>(null);

  useEffect(() => {
    const node = nameConflictDialogRef.current;
    if (!node) return;
    if (nameConflict && !node.open) {
      node.showModal();
      nameInputRef.current?.focus();
      nameInputRef.current?.select();
    } else if (!nameConflict && node.open) {
      node.close();
    }
  }, [nameConflict]);

  const alreadyCopied =
    modalDetail?.alreadyCopied ??
    Boolean(
      modalGroupId && groups.find((g) => g.id === modalGroupId)?.alreadyCopied,
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
    if (allSelected) {
      setSelected(new Set());
      return;
    }
    setSelected(new Set(filtered.map((g) => g.id)));
  }

  function clearFilters() {
    setQuery("");
    setInPlanFilter("all");
  }

  async function openModal(item: ExerciseGroupListItem) {
    setModalGroupId(item.id);
    setModalName(item.name);
    setModalOpen(true);
    setModalDetail(null);
    setModalError(null);
    setNameConflict(null);
    setModalLoading(true);
    try {
      const detail = await fetchJson<ExerciseGroupDetailSuccess>(
        `/api/exercise-groups/global/${item.id}`,
      );
      setModalDetail(detail.group);
      setModalName(detail.group.name);
    } catch (e) {
      setModalError(e instanceof Error ? e.message : "Kon topic niet laden.");
    } finally {
      setModalLoading(false);
    }
  }

  function closeModal() {
    if (singleCopyMutation.isPending) return;
    setModalOpen(false);
    setModalGroupId(null);
    setModalName(null);
    setModalDetail(null);
    setModalError(null);
    // nameConflict niet wissen: bij “opnieuw toevoegen” sluit deze modal
    // programmatisch (open=false → dialog close → onClose) terwijl de
    // naamkeuze-dialog juist open moet blijven.
  }

  function handleSingleCopy() {
    if (!modalGroupId) return;
    setMessage(null);

    // Al in leerplan (zelfde bron of naam) → meteen naamkeuze tonen.
    if (alreadyCopied) {
      const base = modalName ?? "topic";
      setNameConflict({
        groupId: modalGroupId,
        baseName: base,
        draftName: suggestedCommunityCopyName(base),
      });
      return;
    }

    singleCopyMutation.mutate({ groupId: modalGroupId });
  }

  function handleBulkCopy() {
    if (selectedIds.length === 0) return;
    setMessage(null);

    const conflictIds = selectedIds.filter(
      (id) => groups.find((g) => g.id === id)?.alreadyCopied,
    );
    const freshIds = selectedIds.filter((id) => !conflictIds.includes(id));

    // Al in leerplan: naamkeuze i.p.v. stil overslaan/hernoemen.
    if (conflictIds.length === 1 && freshIds.length === 0) {
      const g = groups.find((x) => x.id === conflictIds[0]);
      if (g) {
        setNameConflict({
          groupId: g.id,
          baseName: g.name,
          draftName: suggestedCommunityCopyName(g.name),
        });
      }
      return;
    }

    if (conflictIds.length > 0 && freshIds.length === 0) {
      setMessage(
        "Topics die al in je leerplan staan: open ze één voor één om opnieuw over te nemen met een andere naam.",
      );
      return;
    }

    if (conflictIds.length > 0) {
      setMessage(
        `${conflictIds.length} al in leerplan overgeslagen — open die apart om opnieuw over te nemen.`,
      );
    }

    if (freshIds.length > 0) {
      bulkCopyMutation.mutate(freshIds);
    }
  }

  function confirmNameConflict() {
    if (!nameConflict) return;
    const name = nameConflict.draftName.trim();
    if (!name) return;
    singleCopyMutation.mutate({
      groupId: nameConflict.groupId,
      name,
    });
  }

  const isRefreshing = isFetching && !loading;
  const busy = bulkCopyMutation.isPending || singleCopyMutation.isPending;

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
          <span className="text-xs text-muted-foreground">In leerplan</span>
          <select
            value={inPlanFilter}
            onChange={(e) => setInPlanFilter(e.target.value as InPlanFilter)}
            className="h-9 rounded-md border border-border bg-background px-2 text-sm text-foreground"
          >
            <option value="all">Alles</option>
            <option value="yes">Ja</option>
            <option value="no">Nee</option>
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
          disabled={loading || busy}
          onClick={() =>
            void queryClient.invalidateQueries({
              queryKey: queryKeys.communityGroups(),
            })
          }
          className="ml-auto inline-flex h-9 items-center rounded-md border border-border px-3 text-xs text-foreground disabled:opacity-50"
        >
          Ververs
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={busy || selectedIds.length === 0}
          onClick={handleBulkCopy}
          className="inline-flex h-9 items-center rounded-md bg-accent px-3 text-sm font-medium text-accent-foreground disabled:opacity-50"
        >
          {bulkCopyMutation.isPending
            ? "Bezig…"
            : `Toevoegen aan leerplan${selectedIds.length > 0 ? ` (${selectedIds.length})` : ""}`}
        </button>
        <span className="text-xs text-muted-foreground">
          {filtered.length} zichtbaar
          {query.trim() ? ` · filter: “${query.trim()}”` : ""}
          {groups.length > 0 ? ` · ${groups.length} totaal` : ""}
        </span>
      </div>

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
          Geen community-topics beschikbaar.
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
                  <th className="w-10 px-3 py-2">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={toggleAll}
                      aria-label="Alles selecteren"
                      className="size-4 rounded border-border accent-accent"
                    />
                  </th>
                  <th className="px-3 py-2">Topic</th>
                  <th className="px-3 py-2">Alle tags</th>
                  <th className="px-3 py-2">Oefeningen</th>
                  <th className="px-3 py-2">In leerplan</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((item) => {
                  const when = formatCopiedAt(item.copiedAt);
                  const { preview: tagsPreview, full: tagsFull } =
                    formatTagPreview(item.tagText);
                  return (
                    <tr
                      key={item.id}
                      tabIndex={0}
                      onClick={() => void openModal(item)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") void openModal(item);
                      }}
                      className="cursor-pointer border-b border-border/60 hover:bg-muted/40"
                    >
                      <td
                        className="px-3 py-2 align-middle"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <input
                          type="checkbox"
                          checked={selected.has(item.id)}
                          onChange={() => toggle(item.id)}
                          aria-label={`Selecteer ${item.name}`}
                          className="size-4 rounded border-border accent-accent"
                        />
                      </td>
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
                        {item.alreadyCopied ? (
                          <span>
                            Ja
                            {when ? (
                              <span className="text-muted-foreground/80">
                                {" "}
                                · {when}
                              </span>
                            ) : null}
                          </span>
                        ) : (
                          "Nee"
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <p className="px-3 py-2 text-[11px] text-muted-foreground">
              Klik op een rij om te bekijken; vink aan voor bulk toevoegen.
            </p>
          </div>
        </div>
      )}

      <LeerplanGroupModal
        open={modalOpen && !nameConflict}
        name={modalName}
        members={modalDetail?.members ?? []}
        loading={modalLoading}
        busy={singleCopyMutation.isPending}
        showCopyAction
        alreadyCopied={alreadyCopied}
        error={modalError}
        onClose={closeModal}
        onCopy={handleSingleCopy}
      />

      <dialog
        ref={nameConflictDialogRef}
        onClose={() => {
          if (!singleCopyMutation.isPending) setNameConflict(null);
        }}
        className="fixed inset-0 m-auto h-fit w-[min(28rem,90vw)] rounded-lg border border-border bg-card p-0 text-card-foreground backdrop:bg-foreground/40"
      >
        {nameConflict ? (
          <form
            className="space-y-4 p-5"
            onSubmit={(e) => {
              e.preventDefault();
              confirmNameConflict();
            }}
          >
            <header className="space-y-1">
              <h2 className="text-base font-semibold">Andere topicnaam</h2>
              <p className="text-sm text-muted-foreground">
                “{nameConflict.baseName}” staat al in je leerplan. Kies een
                nieuwe naam om het community-topic alsnog binnen te halen.
              </p>
            </header>

            <label className="flex flex-col gap-1 text-sm">
              <span className="text-xs text-muted-foreground">Topicnaam</span>
              <input
                ref={nameInputRef}
                type="text"
                value={nameConflict.draftName}
                onChange={(e) =>
                  setNameConflict((prev) =>
                    prev ? { ...prev, draftName: e.target.value } : prev,
                  )
                }
                className="h-9 rounded-md border border-border bg-background px-3 text-sm text-foreground"
                disabled={singleCopyMutation.isPending}
              />
            </label>

            <footer className="flex flex-wrap justify-end gap-2">
              <button
                type="button"
                disabled={singleCopyMutation.isPending}
                onClick={() => setNameConflict(null)}
                className="inline-flex h-9 items-center rounded-md border border-border px-3 text-sm text-foreground disabled:opacity-50"
              >
                Annuleren
              </button>
              <button
                type="submit"
                disabled={
                  singleCopyMutation.isPending ||
                  !nameConflict.draftName.trim()
                }
                className="inline-flex h-9 items-center rounded-md bg-accent px-3 text-sm font-medium text-accent-foreground disabled:opacity-50"
              >
                {singleCopyMutation.isPending
                  ? "Bezig…"
                  : "Toch toevoegen"}
              </button>
            </footer>
          </form>
        ) : null}
      </dialog>
    </div>
  );
}
