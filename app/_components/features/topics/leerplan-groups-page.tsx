"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import { APP_ROUTES, leerplanGroupPath } from "@/lib/routes";

import { LeerplanGroupDeleteDialog } from "./leerplan-group-delete-dialog";

import type {
  ExerciseGroupListItem,
  ExerciseGroupsDeleteSuccess,
  ExerciseGroupsListSuccess,
} from "@/types/exercise-groups";

type OriginFilter = "all" | "personal" | "community";
type EditedFilter = "all" | "yes" | "no";
type ActiveFilter = "all" | "active" | "inactive";

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

function isCommunityOrigin(item: ExerciseGroupListItem): boolean {
  return Boolean(item.sourceGroupId);
}

function formatTagPreview(tagText: string | undefined): string {
  if (!tagText?.trim()) return "—";
  const parts = tagText
    .split(/[,\s]+/)
    .map((t) => t.trim())
    .filter(Boolean);
  const unique = Array.from(new Set(parts));
  if (unique.length === 0) return "—";
  return unique.join(", ");
}

/**
 * Overzichtstabel van persoonlijke oefeningengroepen in het leerplan.
 * Klik op een rij opent de bewerkpagina van die set.
 */
export function LeerplanGroupsPage() {
  const router = useRouter();
  const [personalGroups, setPersonalGroups] = useState<ExerciseGroupListItem[]>(
    [],
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [togglingName, setTogglingName] = useState<string | null>(null);

  const [query, setQuery] = useState("");
  const [includeTags, setIncludeTags] = useState(false);
  const [originFilter, setOriginFilter] = useState<OriginFilter>("all");
  const [editedFilter, setEditedFilter] = useState<EditedFilter>("all");
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>("all");

  const [deleteTarget, setDeleteTarget] =
    useState<ExerciseGroupListItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  const refreshLists = useCallback(async () => {
    const personal = await fetchMineGroups();
    setPersonalGroups(personal);
  }, []);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      setError(null);
      try {
        await refreshLists();
      } catch (err) {
        if (!cancelled) {
          setPersonalGroups([]);
          setError(
            err instanceof Error ? err.message : "Kon groepen niet laden.",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [refreshLists]);

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
      if (includeTags && (g.tagText ?? "").toLowerCase().includes(q)) {
        return true;
      }
      return false;
    });
  }, [
    personalGroups,
    query,
    includeTags,
    originFilter,
    editedFilter,
    activeFilter,
  ]);

  function openGroupEditor(item: ExerciseGroupListItem) {
    router.push(leerplanGroupPath(item.id));
  }

  async function handleToggleActive(name: string, isActive: boolean) {
    const previous = personalGroups;
    setTogglingName(name);
    setPersonalGroups((current) =>
      current.map((item) =>
        item.name === name ? { ...item, isActive } : item,
      ),
    );

    try {
      const res = await fetch("/api/learning-topics", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: name, isActive }),
      });
      const body = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !body.ok) {
        throw new Error(body.error ?? `Status ${res.status}`);
      }
      await refreshLists();
    } catch (err) {
      setPersonalGroups(previous);
      setError(
        err instanceof Error ? err.message : "Kon voorkeur niet opslaan.",
      );
    } finally {
      setTogglingName(null);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/exercise-groups/mine/${deleteTarget.id}`,
        { method: "DELETE" },
      );
      const body = (await res.json()) as ExerciseGroupsDeleteSuccess & {
        error?: string;
      };
      if (!res.ok || !body.ok) {
        throw new Error(body.error ?? `Status ${res.status}`);
      }
      setDeleteTarget(null);
      await refreshLists();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Verwijderen mislukt.",
      );
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Klik op een groep om de oefeningen te bewerken. Community-sets overnemen
        doe je via{" "}
        <Link
          href={APP_ROUTES.community}
          className="font-medium text-accent underline-offset-2 hover:underline"
        >
          Community → Overnemen
        </Link>
        .
      </p>

      <div className="flex flex-wrap items-end gap-3">
        <label className="flex min-w-[12rem] flex-1 flex-col gap-1 text-sm">
          <span className="text-xs text-muted-foreground">Zoeken</span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Groepsnaam…"
            className="h-9 rounded-md border border-border bg-background px-3 text-sm text-foreground"
          />
        </label>
        <label className="inline-flex items-center gap-2 pb-1 text-sm text-foreground">
          <input
            type="checkbox"
            checked={includeTags}
            onChange={(e) => setIncludeTags(e.target.checked)}
            className="size-4 rounded border-border accent-accent"
          />
          Tags meenemen
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
          disabled={loading}
          onClick={() => void refreshLists()}
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

      {error && (
        <p className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </p>
      )}

      {loading ? (
        <p className="text-sm text-muted-foreground">Laden…</p>
      ) : personalGroups.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Nog geen persoonlijke oefeningengroepen.{" "}
          <Link
            href={APP_ROUTES.generator}
            className="font-medium text-accent underline-offset-2 hover:underline"
          >
            Genereer oefeningen
          </Link>{" "}
          of haal groepen binnen via{" "}
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
          Geen groepen die bij je zoekopdracht of filters passen.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-md border border-border">
          <table className="w-full min-w-[52rem] text-left text-sm">
            <thead className="border-b border-border bg-muted/40 text-xs text-muted-foreground">
              <tr>
                <th className="px-3 py-2">Oefeningengroep</th>
                <th className="px-3 py-2">Herkomst</th>
                <th className="px-3 py-2">Bewerkt</th>
                <th className="px-3 py-2">Audio</th>
                <th className="px-3 py-2">Tags</th>
                <th className="px-3 py-2">Oefeningen</th>
                <th className="px-3 py-2">Actief</th>
                <th className="px-3 py-2">Acties</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => {
                const fromCommunity = isCommunityOrigin(item);
                const tagsPreview = formatTagPreview(item.tagText);
                const isActive = item.isActive ?? false;
                const toggling = togglingName === item.name;

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
                      title={
                        tagsPreview === "—" ? undefined : tagsPreview
                      }
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
                        disabled={toggling}
                        onChange={(e) =>
                          void handleToggleActive(
                            item.name,
                            e.target.checked,
                          )
                        }
                        className="size-4 rounded border-border accent-accent"
                        aria-label={`${isActive ? "Deactiveer" : "Activeer"} groep ${item.name}`}
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
        deleting={deleting}
        onCancel={() => {
          if (!deleting) setDeleteTarget(null);
        }}
        onConfirm={() => void confirmDelete()}
      />
    </div>
  );
}
