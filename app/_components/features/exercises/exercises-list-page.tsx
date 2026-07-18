"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { DeleteConfirmDialog } from "@/app/_components/features/exercises/delete-confirm-dialog";
import {
  ExerciseEditModal,
  parseTagsCsv,
  type ExerciseEditValues,
} from "@/app/_components/features/exercises/exercise-edit-modal";
import { MyExercisesTable } from "@/app/_components/features/exercises/my-exercises-table";
import { PaginationBar } from "@/app/_components/features/exercises/pagination-bar";

import type {
  AdminExerciseRow,
  ExercisePatchFields,
} from "@/lib/exercises/types";

const PAGE_SIZE = 25;

type ListSuccess = {
  ok: true;
  rows: AdminExerciseRow[];
  total: number;
  page: number;
  pageSize: number;
  fetched_at: string;
};

type ListFailure = { ok: false; error: string };

type DeleteSuccess = {
  ok: true;
  deleted: number;
  audio_removed: number;
  errors: string[];
};

type DeleteFailure = { ok: false; error: string };

type PatchSuccess = { ok: true; row: AdminExerciseRow };
type PatchFailure = { ok: false; error: string };

type LoadState =
  | { status: "idle" }
  | { status: "loading" }
  | {
      status: "loaded";
      rows: AdminExerciseRow[];
      total: number;
      page: number;
      pageSize: number;
      isRefreshing?: boolean;
    }
  | { status: "error"; error: string };

export type ExercisesListPageProps = {
  apiBase: string;
  pagePath: string;
  /** Persoonlijke oefeningengroep die we bewerken. */
  groupId: string;
  emptyMessage: React.ReactNode;
  emptyFilteredMessage?: string;
  /** Wordt aangeroepen wanneer het totaal in deze groep wijzigt. */
  onTotalChange?: (total: number) => void;
};

export function ExercisesListPage({
  apiBase,
  pagePath,
  groupId,
  emptyMessage,
  emptyFilteredMessage = "Geen oefeningen gevonden voor deze filters.",
  onTotalChange,
}: ExercisesListPageProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const page = Math.max(1, Number(searchParams.get("page") ?? "1") || 1);
  const q = searchParams.get("q") ?? "";

  const [searchDraft, setSearchDraft] = useState(q);
  const [load, setLoad] = useState<LoadState>({ status: "idle" });
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);
  const [deletePrompt, setDeletePrompt] = useState<{
    ids: string[];
    showAudioOption: boolean;
  } | null>(null);
  const [deleteAudio, setDeleteAudio] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [editRow, setEditRow] = useState<AdminExerciseRow | null>(null);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const loadRef = useRef(load);
  useEffect(() => {
    loadRef.current = load;
  }, [load]);

  const rows = useMemo(
    () => (load.status === "loaded" ? load.rows : []),
    [load],
  );
  const total = load.status === "loaded" ? load.total : 0;
  const isRefreshing = load.status === "loaded" && Boolean(load.isRefreshing);
  const isInitialLoading = load.status === "loading";
  const busy = isInitialLoading || isRefreshing || deleting;

  useEffect(() => {
    if (load.status === "loaded") {
      onTotalChange?.(load.total);
    }
  }, [load, onTotalChange]);

  const updateParams = useCallback(
    (patch: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(patch)) {
        if (value === null || value === "") params.delete(key);
        else params.set(key, value);
      }
      params.delete("pageSize");
      params.delete("sortDir");
      params.delete("lang");
      params.delete("group");
      params.delete("topic");
      const qs = params.toString();
      router.replace(qs ? `${pagePath}?${qs}` : pagePath);
    },
    [router, searchParams, pagePath],
  );

  const fetchList = useCallback(
    async (refresh = false) => {
      const prev = loadRef.current;
      if (!refresh || prev.status !== "loaded") {
        setLoad({ status: "loading" });
      } else {
        setLoad({ ...prev, isRefreshing: true });
      }
      setActionError(null);
      try {
        const params = new URLSearchParams({
          page: String(page),
          pageSize: String(PAGE_SIZE),
          sortDir: "desc",
          groupId,
        });
        if (q) params.set("q", q);

        const res = await fetch(`${apiBase}?${params}`, {
          cache: "no-store",
        });
        const json = (await res.json()) as ListSuccess | ListFailure;
        if (!res.ok || !json.ok) {
          const err = json.ok ? `HTTP ${res.status}` : json.error;
          if (refresh && prev.status === "loaded") {
            setLoad({ ...prev, isRefreshing: false });
            setActionError(err);
          } else {
            setLoad({ status: "error", error: err });
          }
          return;
        }
        setLoad({
          status: "loaded",
          rows: json.rows,
          total: json.total,
          page: json.page,
          pageSize: json.pageSize,
          isRefreshing: false,
        });
      } catch (e) {
        const err = e instanceof Error ? e.message : "Onbekende fout.";
        if (refresh && prev.status === "loaded") {
          setLoad({ ...prev, isRefreshing: false });
          setActionError(err);
        } else {
          setLoad({ status: "error", error: err });
        }
      }
    },
    [apiBase, page, q, groupId],
  );

  useEffect(() => {
    void fetchList(false);
  }, [fetchList]);

  const [prevRows, setPrevRows] = useState(rows);
  if (rows !== prevRows) {
    setPrevRows(rows);
    const scope = new Set(rows.map((r) => r.exercise_id));
    setSelectedIds((prev) => {
      let changed = false;
      const next = new Set<string>();
      for (const id of prev) {
        if (scope.has(id)) next.add(id);
        else changed = true;
      }
      return changed ? next : prev;
    });
  }

  useEffect(() => {
    const t = window.setTimeout(() => {
      if (searchDraft !== q) {
        updateParams({ q: searchDraft || null, page: "1" });
      }
    }, 400);
    return () => window.clearTimeout(t);
  }, [searchDraft, q, updateParams]);

  const patchRow = useCallback(
    async (exerciseId: string, fields: ExercisePatchFields) => {
      const res = await fetch(`${apiBase}/${exerciseId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(fields),
      });
      const json = (await res.json()) as PatchSuccess | PatchFailure;
      if (!res.ok || !json.ok) {
        throw new Error(json.ok ? `HTTP ${res.status}` : json.error);
      }
      setLoad((prev) => {
        if (prev.status !== "loaded") return prev;
        return {
          ...prev,
          rows: prev.rows.map((r) =>
            r.exercise_id === exerciseId ? json.row : r,
          ),
        };
      });
    },
    [apiBase],
  );

  const selectedRows = useMemo(
    () => rows.filter((r) => selectedIds.has(r.exercise_id)),
    [rows, selectedIds],
  );

  const handleDeleteRequest = useCallback(() => {
    if (selectedRows.length === 0) return;
    setDeleteAudio(false);
    setDeletePrompt({
      ids: selectedRows.map((r) => r.exercise_id),
      showAudioOption: selectedRows.some((r) => r.has_audio),
    });
  }, [selectedRows]);

  const handleConfirmDelete = useCallback(async () => {
    if (!deletePrompt) return;
    setDeleting(true);
    setActionError(null);
    setActionMessage(null);
    try {
      const res = await fetch(apiBase, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          exercise_ids: deletePrompt.ids,
          delete_audio: deleteAudio,
        }),
      });
      const json = (await res.json()) as DeleteSuccess | DeleteFailure;
      if (!res.ok || !json.ok) {
        throw new Error(json.ok ? `HTTP ${res.status}` : json.error);
      }
      setActionMessage(
        `${json.deleted} verwijderd${json.audio_removed > 0 ? `, ${json.audio_removed} audio-bestand(en)` : ""}.`,
      );
      setDeletePrompt(null);
      setSelectedIds(new Set());
      if (page > 1 && rows.length <= deletePrompt.ids.length) {
        updateParams({ page: String(page - 1) });
      } else {
        await fetchList(true);
      }
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Verwijderen mislukt.");
    } finally {
      setDeleting(false);
    }
  }, [
    apiBase,
    deletePrompt,
    deleteAudio,
    page,
    rows.length,
    updateParams,
    fetchList,
  ]);

  const handleModalSave = useCallback(
    async (values: ExerciseEditValues) => {
      if (!editRow) return;
      setEditSaving(true);
      setEditError(null);
      try {
        await patchRow(editRow.exercise_id, {
          source_text: values.sourceText,
          target_text: values.targetText,
          tags: values.tags.join(","),
          alternative_translations: values.alternatives,
        });
        setEditRow(null);
      } catch (e) {
        setEditError(e instanceof Error ? e.message : "Opslaan mislukt.");
      } finally {
        setEditSaving(false);
      }
    },
    [editRow, patchRow],
  );

  const hasActiveFilters = Boolean(q);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex min-w-[12rem] flex-1 flex-col gap-1 text-sm">
          <span className="text-xs text-muted-foreground">
            Zoek binnen Bron, Vertaling en Alternatieven.
          </span>
          <input
            type="search"
            value={searchDraft}
            onChange={(e) => setSearchDraft(e.target.value)}
            placeholder="Bevat de tekst"
            className="h-9 rounded-md border border-border bg-background px-3 text-sm text-foreground"
          />
        </label>

        <button
          type="button"
          disabled={busy}
          onClick={() => void fetchList(true)}
          className="ml-auto inline-flex h-9 items-center rounded-md border border-border px-3 text-xs text-foreground disabled:opacity-50"
        >
          {isRefreshing ? "Verversen…" : "Ververs"}
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={busy || selectedIds.size === 0}
          onClick={handleDeleteRequest}
          className="inline-flex h-9 items-center rounded-md border border-border px-3 text-sm text-destructive hover:bg-destructive/10 disabled:opacity-50"
        >
          {deleting
            ? "Verwijderen…"
            : `Verwijderen${selectedIds.size > 0 ? ` (${selectedIds.size})` : ""}`}
        </button>
        {selectedIds.size > 0 && (
          <button
            type="button"
            disabled={busy}
            onClick={() => setSelectedIds(new Set())}
            className="text-xs text-muted-foreground underline-offset-2 hover:underline"
          >
            Selectie wissen
          </button>
        )}
        <span className="text-xs text-muted-foreground">
          {total.toLocaleString("nl-NL")}{" "}
          {total === 1 ? "oefening" : "oefeningen"}
          {q.trim() ? ` · filter: “${q.trim()}”` : ""}
        </span>
      </div>

      {actionError && (
        <p className="text-sm text-destructive" role="alert">
          {actionError}
        </p>
      )}
      {actionMessage && (
        <p className="text-sm text-muted-foreground">{actionMessage}</p>
      )}

      {load.status === "error" && (
        <p className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {load.error}{" "}
          <button
            type="button"
            onClick={() => void fetchList(false)}
            className="underline"
          >
            Opnieuw
          </button>
        </p>
      )}

      {isInitialLoading && rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">Laden…</p>
      ) : load.status === "loaded" && rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {hasActiveFilters ? emptyFilteredMessage : emptyMessage}
        </p>
      ) : rows.length > 0 ? (
        <div
          className={isRefreshing ? "opacity-60 transition-opacity" : undefined}
        >
          <MyExercisesTable
            rows={rows}
            selectedIds={selectedIds}
            disabled={busy}
            onRowClick={(row) => {
              setEditError(null);
              setEditRow(row);
            }}
            onToggle={(exerciseId) => {
              setSelectedIds((prev) => {
                const next = new Set(prev);
                if (next.has(exerciseId)) next.delete(exerciseId);
                else next.add(exerciseId);
                return next;
              });
            }}
            onToggleAll={() => {
              setSelectedIds((prev) => {
                const allSelected = rows.every((r) =>
                  prev.has(r.exercise_id),
                );
                if (allSelected) return new Set();
                return new Set(rows.map((r) => r.exercise_id));
              });
            }}
          />
        </div>
      ) : null}

      {total > 0 && (
        <PaginationBar
          page={page}
          pageSize={PAGE_SIZE}
          total={total}
          disabled={busy}
          onPageChange={(p) => updateParams({ page: String(p) })}
        />
      )}

      <ExerciseEditModal
        open={editRow !== null}
        initial={
          editRow
            ? {
                sourceText: editRow.sentence_text,
                targetText: editRow.target_text,
                tags: parseTagsCsv(editRow.tags),
                alternatives: [...editRow.alternative_translations],
              }
            : null
        }
        saving={editSaving}
        error={editError}
        onClose={() => {
          if (!editSaving) {
            setEditRow(null);
            setEditError(null);
          }
        }}
        onSave={handleModalSave}
      />

      <DeleteConfirmDialog
        open={deletePrompt !== null}
        count={deletePrompt?.ids.length ?? 0}
        showAudioOption={deletePrompt?.showAudioOption ?? false}
        deleteAudio={deleteAudio}
        onDeleteAudioChange={setDeleteAudio}
        onCancel={() => setDeletePrompt(null)}
        onConfirm={() => void handleConfirmDelete()}
        deleting={deleting}
      />
    </div>
  );
}
