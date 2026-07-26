"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { RefreshButton } from "@/components/ui/refresh-button";
import { TableLoadingSkeleton } from "@/components/ui/table-loading-skeleton";
import { APP_ROUTES, leerplanGroupPath } from "@/lib/routes";
import { queryKeys } from "@/lib/query-keys";
import { fetchJson } from "@/lib/api/fetch-json";

import { LeerplanGroupDeleteDialog } from "./leerplan-group-delete-dialog";

import type {
  ExerciseGroupListItem,
  ExerciseGroupsDeleteSuccess,
  ExerciseGroupsListSuccess,
} from "@/types/exercise-groups";

type OriginFilter = "all" | "personal" | "community";
type EditedFilter = "all" | "yes" | "no";
type ActiveFilter = "all" | "active" | "inactive";

function isCommunityOrigin(item: ExerciseGroupListItem): boolean {
  return Boolean(item.sourceGroupId);
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

/**
 * Overzichtstabel van persoonlijke topics in het leerplan.
 * Klik op een rij opent de bewerkpagina van dat topic.
 */
export function LeerplanGroupsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const {
    data: personalGroups = [],
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
  const [originFilter, setOriginFilter] = useState<OriginFilter>("all");
  const [editedFilter, setEditedFilter] = useState<EditedFilter>("all");
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>("all");

  const [deleteTarget, setDeleteTarget] =
    useState<ExerciseGroupListItem | null>(null);

  const toggleActiveMutation = useMutation({
    mutationFn: async ({
      name,
      isActive,
    }: {
      name: string;
      isActive: boolean;
    }) => {
      await fetchJson("/api/learning-topics", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: name, isActive }),
      });
    },
    onMutate: async ({ name, isActive }) => {
      await queryClient.cancelQueries({
        queryKey: queryKeys.learningTopics(),
      });
      const previous = queryClient.getQueryData<ExerciseGroupListItem[]>(
        queryKeys.learningTopics(),
      );
      queryClient.setQueryData<ExerciseGroupListItem[]>(
        queryKeys.learningTopics(),
        (old) =>
          (old ?? []).map((g) => (g.name === name ? { ...g, isActive } : g)),
      );
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) {
        queryClient.setQueryData(queryKeys.learningTopics(), ctx.previous);
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.learningTopics(),
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await fetchJson<ExerciseGroupsDeleteSuccess>(
        `/api/exercise-groups/mine/${id}`,
        { method: "DELETE" },
      );
    },
    onSuccess: () => {
      setDeleteTarget(null);
      void queryClient.invalidateQueries({
        queryKey: queryKeys.learningTopics(),
      });
    },
  });

  const loadError = queryError
    ? queryError instanceof Error
      ? queryError.message
      : "Kon topics niet laden."
    : null;

  const actionError =
    toggleActiveMutation.error instanceof Error
      ? toggleActiveMutation.error.message
      : deleteMutation.error instanceof Error
        ? deleteMutation.error.message
        : toggleActiveMutation.isError || deleteMutation.isError
          ? "Actie mislukt."
          : null;

  const displayError = actionError ?? loadError;
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return personalGroups.filter((g) => {
      if (originFilter === "personal" && isCommunityOrigin(g)) return false;
      if (originFilter === "community" && !isCommunityOrigin(g)) return false;
      if (editedFilter === "yes" && !g.isEdited) return false;
      if (editedFilter === "no" && g.isEdited) return false;
      if (activeFilter === "active" && !g.isActive) return false;
      if (activeFilter === "inactive" && g.isActive) return false;

      if (!q) return true;
      if (g.name.toLowerCase().includes(q)) return true;
      if ((g.tagText ?? "").toLowerCase().includes(q)) return true;
      return false;
    });
  }, [personalGroups, query, originFilter, editedFilter, activeFilter]);

  function openGroupEditor(item: ExerciseGroupListItem) {
    router.push(leerplanGroupPath(item.id));
  }

  function handleToggleActive(name: string, isActive: boolean) {
    toggleActiveMutation.mutate({ name, isActive });
  }

  function confirmDelete() {
    if (!deleteTarget) return;
    deleteMutation.mutate(deleteTarget.id);
  }

  const isRefreshing = isFetching && !loading;

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
          <span className="text-muted-foreground text-xs">Herkomst</span>
          <select
            value={originFilter}
            onChange={(e) => setOriginFilter(e.target.value as OriginFilter)}
            className="border-border bg-background text-foreground h-9 rounded-md border px-2 text-sm"
          >
            <option value="all">Alles</option>
            <option value="personal">Persoonlijk</option>
            <option value="community">Community</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-muted-foreground text-xs">Bewerkt</span>
          <select
            value={editedFilter}
            onChange={(e) => setEditedFilter(e.target.value as EditedFilter)}
            className="border-border bg-background text-foreground h-9 rounded-md border px-2 text-sm"
          >
            <option value="all">Alles</option>
            <option value="yes">Ja</option>
            <option value="no">Nee</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-muted-foreground text-xs">Actief</span>
          <select
            value={activeFilter}
            onChange={(e) => setActiveFilter(e.target.value as ActiveFilter)}
            className="border-border bg-background text-foreground h-9 rounded-md border px-2 text-sm"
          >
            <option value="all">Alles</option>
            <option value="active">Actief</option>
            <option value="inactive">Inactief</option>
          </select>
        </label>
        <RefreshButton
          className="ml-auto"
          isRefreshing={isRefreshing}
          disabled={loading}
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
        {personalGroups.length > 0 ? ` · ${personalGroups.length} totaal` : ""}
      </p>

      {displayError && (
        <p
          className="border-destructive/40 bg-destructive/10 text-destructive rounded-lg border px-4 py-3 text-sm"
          role="alert"
        >
          {displayError}
        </p>
      )}

      {loading ? (
        <TableLoadingSkeleton columns={8} />
      ) : personalGroups.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          Nog geen persoonlijke topics.{" "}
          <Link
            href={APP_ROUTES.generator}
            className="text-accent font-medium underline-offset-2 hover:underline"
          >
            Genereer oefeningen
          </Link>{" "}
          of haal topics binnen via{" "}
          <Link
            href={APP_ROUTES.community}
            className="text-accent font-medium underline-offset-2 hover:underline"
          >
            Community → Overnemen
          </Link>
          .
        </p>
      ) : filtered.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          Geen topics die bij je zoekopdracht of filters passen.
        </p>
      ) : (
        <div
          className={`border-border overflow-x-auto rounded-md border ${
            isRefreshing ? "opacity-60 transition-opacity" : ""
          }`}
        >
          <table className="w-full min-w-[52rem] text-left text-sm">
            <thead className="border-border bg-muted/40 text-muted-foreground border-b text-xs">
              <tr>
                <th className="px-3 py-2">Topic</th>
                <th className="px-3 py-2">Herkomst</th>
                <th className="px-3 py-2">Bewerkt</th>
                <th className="px-3 py-2">Audio</th>
                <th className="px-3 py-2">Alle tags</th>
                <th className="px-3 py-2">Oefeningen</th>
                <th className="px-3 py-2">Actief</th>
                <th className="px-3 py-2">Acties</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => {
                const fromCommunity = isCommunityOrigin(item);
                const { preview: tagsPreview, full: tagsFull } =
                  formatTagPreview(item.tagText);
                const isActive = item.isActive ?? false;
                const togglingThis =
                  toggleActiveMutation.isPending &&
                  toggleActiveMutation.variables?.name === item.name;

                return (
                  <tr
                    key={item.id}
                    tabIndex={0}
                    onClick={() => openGroupEditor(item)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") openGroupEditor(item);
                    }}
                    className="border-border/60 hover:bg-muted/40 cursor-pointer border-b"
                  >
                    <td className="text-foreground px-3 py-2 font-medium">
                      {item.name}
                    </td>
                    <td className="text-muted-foreground px-3 py-2">
                      {fromCommunity ? "Community" : "Persoonlijk"}
                    </td>
                    <td className="text-muted-foreground px-3 py-2">
                      {item.isEdited ? "Ja" : "Nee"}
                    </td>
                    <td className="text-muted-foreground px-3 py-2">
                      {item.hasAudio ? "Ja" : "Nee"}
                    </td>
                    <td
                      className="text-muted-foreground max-w-[12rem] truncate px-3 py-2"
                      title={tagsFull}
                    >
                      {tagsPreview}
                    </td>
                    <td className="text-muted-foreground px-3 py-2">
                      {item.exerciseCount}
                    </td>
                    <td
                      className="px-3 py-2"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <input
                        type="checkbox"
                        checked={isActive}
                        disabled={togglingThis}
                        onChange={(e) =>
                          handleToggleActive(item.name, e.target.checked)
                        }
                        className="border-border accent-accent size-4 rounded disabled:opacity-50"
                        aria-label={`${isActive ? "Deactiveer" : "Activeer"} topic ${item.name}`}
                      />
                    </td>
                    <td
                      className="px-3 py-2"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(item)}
                        className="border-border text-destructive hover:bg-destructive/10 rounded-md border px-2 py-1 text-xs"
                      >
                        Verwijderen
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <LeerplanGroupDeleteDialog
        open={deleteTarget != null}
        groupName={deleteTarget?.name ?? null}
        exerciseCount={deleteTarget?.exerciseCount ?? 0}
        deleting={deleteMutation.isPending}
        onCancel={() => {
          if (!deleteMutation.isPending) setDeleteTarget(null);
        }}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
