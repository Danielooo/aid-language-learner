"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { LeerplanGroupModal } from "@/app/_components/features/topics/leerplan-group-modal";

import type {
  ExerciseGroupBulkCopySuccess,
  ExerciseGroupDetail,
  ExerciseGroupDetailSuccess,
  ExerciseGroupListItem,
  ExerciseGroupsListSuccess,
} from "@/types/exercise-groups";

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

async function fetchGlobalGroups(): Promise<ExerciseGroupListItem[]> {
  const res = await fetch("/api/exercise-groups/global", { cache: "no-store" });
  const body = (await res.json()) as ExerciseGroupsListSuccess & {
    error?: string;
  };
  if (!res.ok || !body.ok) {
    throw new Error(body.error ?? `Status ${res.status}`);
  }
  return body.groups;
}

async function fetchGlobalDetail(id: string): Promise<ExerciseGroupDetail> {
  const res = await fetch(`/api/exercise-groups/global/${id}`, {
    cache: "no-store",
  });
  const body = (await res.json()) as ExerciseGroupDetailSuccess & {
    error?: string;
  };
  if (!res.ok || !body.ok) {
    throw new Error(body.error ?? `Status ${res.status}`);
  }
  return body.group;
}

/**
 * Community → Overnemen: catalogus van goedgekeurde groepen,
 * zoeken, bulk-selectie en toevoegen aan leerplan.
 */
export function CommunityAdoptPanel() {
  const [groups, setGroups] = useState<ExerciseGroupListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [query, setQuery] = useState("");
  const [includeTags, setIncludeTags] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalGroupId, setModalGroupId] = useState<string | null>(null);
  const [modalName, setModalName] = useState<string | null>(null);
  const [modalDetail, setModalDetail] = useState<ExerciseGroupDetail | null>(
    null,
  );
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [copyBusy, setCopyBusy] = useState(false);

  const reload = useCallback(async () => {
    const next = await fetchGlobalGroups();
    setGroups(next);
    setSelected(new Set());
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

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return groups;
    return groups.filter((g) => {
      if (g.name.toLowerCase().includes(q)) return true;
      if (includeTags && (g.tagText ?? "").toLowerCase().includes(q)) {
        return true;
      }
      return false;
    });
  }, [groups, query, includeTags]);

  const allSelected = useMemo(
    () => filtered.length > 0 && filtered.every((g) => selected.has(g.id)),
    [filtered, selected],
  );

  const selectedCopyable = useMemo(() => {
    const ids: string[] = [];
    for (const id of selected) {
      const g = groups.find((row) => row.id === id);
      if (g && !g.alreadyCopied) ids.push(id);
    }
    return ids;
  }, [selected, groups]);

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

  async function openModal(item: ExerciseGroupListItem) {
    setModalGroupId(item.id);
    setModalName(item.name);
    setModalOpen(true);
    setModalDetail(null);
    setModalError(null);
    setModalLoading(true);
    try {
      const detail = await fetchGlobalDetail(item.id);
      setModalDetail(detail);
      setModalName(detail.name);
    } catch (e) {
      setModalError(e instanceof Error ? e.message : "Kon groep niet laden.");
    } finally {
      setModalLoading(false);
    }
  }

  function closeModal() {
    if (copyBusy) return;
    setModalOpen(false);
    setModalGroupId(null);
    setModalName(null);
    setModalDetail(null);
    setModalError(null);
  }

  async function handleSingleCopy() {
    if (!modalGroupId || modalDetail?.alreadyCopied) return;
    setCopyBusy(true);
    setModalError(null);
    try {
      const res = await fetch(
        `/api/exercise-groups/global/${modalGroupId}/copy`,
        { method: "POST" },
      );
      const body = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !body.ok) {
        throw new Error(body.error ?? `Status ${res.status}`);
      }
      await reload();
      setMessage("Oefeningengroep toegevoegd aan je leerplan.");
      setCopyBusy(false);
      setModalOpen(false);
      setModalGroupId(null);
      setModalName(null);
      setModalDetail(null);
      setModalError(null);
    } catch (e) {
      setModalError(e instanceof Error ? e.message : "Kopiëren mislukt.");
      setCopyBusy(false);
    }
  }

  async function handleBulkCopy() {
    if (selectedCopyable.length === 0) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/exercise-groups/global/copy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ group_ids: selectedCopyable }),
      });
      const body = (await res.json()) as ExerciseGroupBulkCopySuccess & {
        error?: string;
      };
      if (!res.ok || !body.ok) {
        throw new Error(body.error ?? `Status ${res.status}`);
      }
      const parts = [
        body.copied > 0
          ? `${body.copied} toegevoegd`
          : null,
        body.skipped > 0 ? `${body.skipped} overgeslagen (al in leerplan)` : null,
      ].filter(Boolean);
      setMessage(
        parts.length > 0
          ? parts.join(", ") + "."
          : "Geen groepen toegevoegd.",
      );
      if (body.errors.length > 0) {
        setError(body.errors.slice(0, 3).join(" · "));
      }
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Bulk toevoegen mislukt.");
    } finally {
      setBusy(false);
    }
  }

  const alreadyCopied =
    modalDetail?.alreadyCopied ??
    Boolean(
      modalGroupId && groups.find((g) => g.id === modalGroupId)?.alreadyCopied,
    );

  return (
    <div className="space-y-4">
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
        <button
          type="button"
          disabled={loading || busy}
          onClick={() => void reload()}
          className="ml-auto inline-flex h-9 items-center rounded-md border border-border px-3 text-xs text-foreground disabled:opacity-50"
        >
          Ververs
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={busy || selectedCopyable.length === 0}
          onClick={() => void handleBulkCopy()}
          className="inline-flex h-9 items-center rounded-md bg-accent px-3 text-sm font-medium text-accent-foreground disabled:opacity-50"
        >
          {busy
            ? "Bezig…"
            : `Toevoegen aan leerplan${selectedCopyable.length > 0 ? ` (${selectedCopyable.length})` : ""}`}
        </button>
        <span className="text-xs text-muted-foreground">
          {filtered.length} zichtbaar
          {query.trim() ? ` · filter: “${query.trim()}”` : ""}
        </span>
      </div>

      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
      {message && <p className="text-sm text-muted-foreground">{message}</p>}

      {loading ? (
        <p className="text-sm text-muted-foreground">Laden…</p>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {groups.length === 0
            ? "Geen community-oefeningengroepen beschikbaar."
            : "Geen groepen die bij je zoekopdracht passen."}
        </p>
      ) : (
        <div className="overflow-x-auto rounded-md border border-border">
          <table className="w-full min-w-[40rem] text-left text-sm">
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
                <th className="px-3 py-2">Oefeningengroep</th>
                <th className="px-3 py-2">Oefeningen</th>
                <th className="px-3 py-2">In leerplan</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => {
                const when = formatCopiedAt(item.copiedAt);
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
      )}

      <LeerplanGroupModal
        open={modalOpen}
        name={modalName}
        members={modalDetail?.members ?? []}
        loading={modalLoading}
        busy={copyBusy}
        showCopyAction
        alreadyCopied={alreadyCopied}
        error={modalError}
        onClose={closeModal}
        onCopy={() => void handleSingleCopy()}
      />
    </div>
  );
}
