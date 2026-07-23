"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

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
          (old ?? []).map((g) =>
            g.name === name ? { ...g, isActive } : g,
          ),
      );
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) {
        queryClient.setQueryData(
          queryKeys.learningTopics(),
          ctx.previous,
        );
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
  }, [
    personalGroups,
    query,
    originFilter,
    editedFilter,
    activeFilter,
  ]);

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
          <span className="text-xs text-muted-foreground">Herkomst</span>
          <select
            value={originFilter}
            onChange={(e) =>
              setOriginFilter(e.target.value as OriginFilter)
            }
            className="h-9 rounded-md border border-border bg-background px-2 text-sm text-foreground"
          >
            <option value="all">Alles</option>
            <option value="personal">Persoonlijk</option>
            <option value="community">Community</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-xs text-muted-foreground">Bewerkt</span>
          <select
            value={editedFilter}
            onChange={(e) =>
              setEditedFilter(e.target.value as EditedFilter)
            }
            className="h-9 rounded-md border border-border bg-background px-2 text-sm text-foreground"
          >
            <option value="all">Alles</option>
            <option value="yes">Ja</option>
            <option value="no">Nee</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-xs text-muted-foreground">Actief</span>
          <select
            value={activeFilter}
            onChange={(e) =>
              setActiveFilter(e.target.value as ActiveFilter)
            }
            className="h-9 rounded-md border border-border bg-background px-2 text-sm text-foreground"
          >
            <option value="all">Alles</option>
            <option value="active">Actief</option>
            <option value="inactive">Inactief</option>
          </select>
        </label>
        <button
          type="button"
          disabled={loading || isRefreshing}
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
        {personalGroups.length > 0
          ? ` · ${personalGroups.length} totaal`
          : ""}
      </p>

      {displayError && (
        <p
          className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive"
          role="alert"
        >
          {displayError}
        </p>
      )}

      {loading ? (
        <p className="text-sm text-muted-foreground">Laden…</p>
      ) : personalGroups.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Nog geen persoonlijke topics.{" "}
          <Link
            href={APP_ROUTES.generator}
            className="font-medium text-accent underline-offset-2 hover:underline"
          >
            Genereer oefeningen
          </Link>{" "}
          of haal topics binnen via{" "}
          <Link
            href={APP_ROUTES.community}
            className="font-medium text-accent underline-offset-2 hover:underline"
          >
            Community → Overnemen
          </Link>
          .
        </p>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Geen topics die bij je zoekopdracht of filters passen.
        </p>
      ) : (
        <div
          className={`overflow-x-auto rounded-md border border-border ${isRefreshing ? "opacity-60 transition-opacity" : ""
            }`}
        >
          <table className="w-full min-w-[52rem] text-left text-sm">
            <thead className="border-b border-border bg-muted/40 text-xs text-muted-foreground">
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
                    className="cursor-pointer border-b border-border/60 hover:bg-muted/40"
                  >
                    <td className="px-3 py-2 font-medium text-foreground">
                      {item.name}
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {fromCommunity ? "Community" : "Persoonlijk"}
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {item.isEdited ? "Ja" : "Nee"}
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {item.hasAudio ? "Ja" : "Nee"}
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
                    <td
                      className="px-3 py-2"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <input
                        type="checkbox"
                        checked={isActive}
                        disabled={togglingThis}
                        onChange={(e) =>
                          handleToggleActive(
                            item.name,
                            e.target.checked,
                          )
                        }
                        className="size-4 rounded border-border accent-accent disabled:opacity-50"
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
                        className="rounded-md border border-border px-2 py-1 text-xs text-destructive hover:bg-destructive/10"
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
