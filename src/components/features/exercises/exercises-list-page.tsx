"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { DeleteConfirmDialog } from "@/components/features/exercises/delete-confirm-dialog";
import {
  ExerciseEditModal,
  parseTagsCsv,
  type ExerciseEditValues,
} from "@/components/features/exercises/exercise-edit-modal";
import { MyExercisesTable } from "@/components/features/exercises/my-exercises-table";
import { PaginationBar } from "@/components/features/exercises/pagination-bar";
import { DeleteAllExercisesDialog } from "@/components/features/topics/delete-all-exercises-dialog";
import { RefreshButton } from "@/components/ui/refresh-button";
import { TableLoadingSkeleton } from "@/components/ui/table-loading-skeleton";
import { fetchJson } from "@/lib/api/fetch-json";
import { queryKeys } from "@/lib/query-keys";

import type {
  AdminExerciseRow,
  ExercisePatchFields,
} from "@/lib/exercises/types";

const PAGE_SIZE = 10;
/** Stabiele lege array — `?? []` in render veroorzaakt infinite setState-loops. */
const EMPTY_ROWS: AdminExerciseRow[] = [];

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

type PatchSuccess = { ok: true; row: AdminExerciseRow };

type ListData = {
  rows: AdminExerciseRow[];
  total: number;
  page: number;
  pageSize: number;
};

export type ExercisesListPageProps = {
  apiBase: string;
  pagePath: string;
  /** Persoonlijke oefeningengroep die we bewerken. */
  groupId: string;
  emptyMessage: React.ReactNode;
  emptyFilteredMessage?: string;
  /** Wordt aangeroepen wanneer het totaal in deze groep wijzigt. */
  onTotalChange?: (total: number) => void;
  /** Topicnaam voor bevestigingscopy bij alles-verwijderen. */
  topicName?: string | null;
  /**
   * Na succesvol verwijderen van alle oefeningen: topic ook weg + navigeren.
   * Alleen aangeroepen bij “alle oefeningen” (zonder zoekfilter).
   */
  onDeleteTopic?: () => Promise<void>;
};

export function ExercisesListPage({
  apiBase,
  pagePath,
  groupId,
  emptyMessage,
  emptyFilteredMessage = "Geen oefeningen gevonden voor deze filters.",
  onTotalChange,
  topicName = null,
  onDeleteTopic,
}: ExercisesListPageProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();

  const page = Math.max(1, Number(searchParams.get("page") ?? "1") || 1);
  const q = searchParams.get("q") ?? "";

  const listParams = useMemo(
    () => ({
      page: String(page),
      pageSize: String(PAGE_SIZE),
      sortDir: "desc",
      groupId,
      ...(q ? { q } : {}),
    }),
    [page, groupId, q],
  );

  const listKey = queryKeys.exercises(listParams);

  const {
    data,
    isLoading: isInitialLoading,
    isFetching,
    error: queryError,
    refetch,
  } = useQuery({
    queryKey: listKey,
    queryFn: async (): Promise<ListData> => {
      const params = new URLSearchParams(listParams);
      const json = await fetchJson<ListSuccess | ListFailure>(
        `${apiBase}?${params}`,
      );
      if (!json.ok) throw new Error(json.error);
      return {
        rows: json.rows,
        total: json.total,
        page: json.page,
        pageSize: json.pageSize,
      };
    },
  });

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deletePrompt, setDeletePrompt] = useState<{
    ids: string[];
    hasAudio: boolean;
    emptiesTopic: boolean;
  } | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [editRow, setEditRow] = useState<AdminExerciseRow | null>(null);
  const [editError, setEditError] = useState<string | null>(null);

  const rows = data?.rows ?? EMPTY_ROWS;
  const total = data?.total ?? 0;
  const isRefreshing = isFetching && !isInitialLoading;
  const listError = queryError
    ? queryError instanceof Error
      ? queryError.message
      : "Laden mislukt."
    : null;

  const invalidateLeerplanOverview = useCallback(() => {
    void queryClient.invalidateQueries({
      queryKey: queryKeys.learningTopics(),
    });
  }, [queryClient]);

  const invalidateList = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ["exercises"] });
  }, [queryClient]);

  useEffect(() => {
    if (data) onTotalChange?.(data.total);
  }, [data, onTotalChange]);

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

  // Te hoge ?page= terugzetten i.p.v. valse “lege topic”-CTA.
  useEffect(() => {
    if (!data || isRefreshing) return;
    if (data.total === 0) return;
    const maxPages = Math.max(1, Math.ceil(data.total / PAGE_SIZE));
    if (page > maxPages) {
      updateParams({ page: String(maxPages) });
    }
  }, [data, isRefreshing, page, updateParams]);

  const patchMutation = useMutation({
    mutationFn: async ({
      exerciseId,
      fields,
    }: {
      exerciseId: string;
      fields: ExercisePatchFields;
    }) => {
      const json = await fetchJson<PatchSuccess>(`${apiBase}/${exerciseId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(fields),
      });
      return json.row;
    },
    onSuccess: (row, { exerciseId }) => {
      queryClient.setQueryData<ListData>(listKey, (prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          rows: prev.rows.map((r) => (r.exercise_id === exerciseId ? row : r)),
        };
      });
      invalidateLeerplanOverview();
      setEditRow(null);
      setEditError(null);
    },
    onError: (e) => {
      setEditError(e instanceof Error ? e.message : "Opslaan mislukt.");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (prompt: { ids: string[]; emptiesTopic: boolean }) => {
      const json = await fetchJson<DeleteSuccess>(apiBase, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          exercise_ids: prompt.ids,
          delete_audio: true,
        }),
      });
      return { json, prompt };
    },
    onSuccess: async ({ json, prompt }) => {
      setDeletePrompt(null);
      setSelectedIds(new Set());
      setActionError(null);

      if (prompt.emptiesTopic) {
        try {
          await onDeleteTopic?.();
        } catch (topicErr) {
          invalidateList();
          invalidateLeerplanOverview();
          setActionError(
            topicErr instanceof Error
              ? topicErr.message
              : "Topic verwijderen mislukt.",
          );
          return;
        }
        invalidateLeerplanOverview();
        return;
      }

      setActionMessage(
        `${json.deleted} verwijderd${json.audio_removed > 0 ? `, ${json.audio_removed} audiobestand(en)` : ""}.`,
      );
      invalidateLeerplanOverview();
      if (page > 1 && rows.length <= prompt.ids.length) {
        updateParams({ page: String(page - 1) });
      } else {
        invalidateList();
      }
    },
    onError: (e) => {
      setActionError(e instanceof Error ? e.message : "Verwijderen mislukt.");
    },
  });

  const visibleSelectedIds = useMemo(() => {
    const visibleIds = new Set(rows.map((r) => r.exercise_id));
    return new Set(Array.from(selectedIds).filter((id) => visibleIds.has(id)));
  }, [rows, selectedIds]);

  const selectedRows = useMemo(
    () => rows.filter((r) => visibleSelectedIds.has(r.exercise_id)),
    [rows, visibleSelectedIds],
  );

  const handleDeleteRequest = useCallback(() => {
    if (selectedRows.length === 0) return;
    // Zonder filter: selectie van alles in het topic → oefeningen + topic weg.
    const emptiesTopic = !q.trim() && selectedRows.length >= total && total > 0;
    setDeletePrompt({
      ids: selectedRows.map((r) => r.exercise_id),
      hasAudio: selectedRows.some((r) => r.has_audio),
      emptiesTopic,
    });
  }, [selectedRows, q, total]);

  const handleConfirmDelete = useCallback(() => {
    if (!deletePrompt) return;
    setActionMessage(null);
    deleteMutation.mutate(deletePrompt);
  }, [deletePrompt, deleteMutation]);

  const handleModalSave = useCallback(
    async (values: ExerciseEditValues) => {
      if (!editRow) return;
      setEditError(null);
      try {
        await patchMutation.mutateAsync({
          exerciseId: editRow.exercise_id,
          fields: {
            source_text: values.sourceText,
            target_text: values.targetText,
            tags: values.tags.join(","),
            alternative_translations: values.alternatives,
          },
        });
      } catch {
        // Fout staat al in editError via onError.
      }
    },
    [editRow, patchMutation],
  );

  const deleting = deleteMutation.isPending;
  const editSaving = patchMutation.isPending;
  const busy = isInitialLoading || isRefreshing || deleting;
  const hasActiveFilters = Boolean(q);

  const editInitial = useMemo(() => {
    if (!editRow) return null;
    return {
      sourceText: editRow.sentence_text,
      targetText: editRow.target_text,
      tags: parseTagsCsv(editRow.tags ?? ""),
      alternatives: [...(editRow.alternative_translations ?? [])],
    };
  }, [editRow]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex min-w-[12rem] flex-1 flex-col gap-1 text-sm">
          <span className="text-muted-foreground text-xs">
            Zoek binnen Bron, Vertaling en Alternatieven.
          </span>
          <SearchDraftInput
            key={q}
            initialValue={q}
            onDebouncedChange={(value) =>
              updateParams({ q: value || null, page: "1" })
            }
          />
        </label>

        <RefreshButton
          className="ml-auto"
          isRefreshing={isRefreshing}
          disabled={busy}
          onClick={() => {
            setActionError(null);
            void refetch();
          }}
        />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={busy || visibleSelectedIds.size === 0}
          onClick={handleDeleteRequest}
          className="border-border text-destructive hover:bg-destructive/10 inline-flex h-9 items-center rounded-md border px-3 text-sm disabled:opacity-50"
        >
          {deleting
            ? "Verwijderen…"
            : `Verwijderen${visibleSelectedIds.size > 0 ? ` (${visibleSelectedIds.size})` : ""}`}
        </button>
        {visibleSelectedIds.size > 0 && (
          <button
            type="button"
            disabled={busy}
            onClick={() => setSelectedIds(new Set())}
            className="text-muted-foreground text-xs underline-offset-2 hover:underline"
          >
            Selectie wissen
          </button>
        )}
        <span className="text-muted-foreground text-xs">
          {total.toLocaleString("nl-NL")}{" "}
          {total === 1 ? "oefening" : "oefeningen"}
          {q.trim() ? ` · filter: “${q.trim()}”` : ""}
        </span>
      </div>

      {actionError && (
        <p className="text-destructive text-sm" role="alert">
          {actionError}
        </p>
      )}
      {actionMessage && (
        <p className="text-muted-foreground text-sm">{actionMessage}</p>
      )}

      {listError && (
        <p className="border-destructive/40 bg-destructive/10 text-destructive rounded-lg border px-4 py-3 text-sm">
          {listError}{" "}
          <button
            type="button"
            onClick={() => void refetch()}
            className="underline"
          >
            Opnieuw
          </button>
        </p>
      )}

      {isInitialLoading && rows.length === 0 ? (
        <TableLoadingSkeleton columns={6} />
      ) : data && rows.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          {total === 0
            ? hasActiveFilters
              ? emptyFilteredMessage
              : emptyMessage
            : "Geen oefeningen op deze pagina."}
        </p>
      ) : rows.length > 0 ? (
        <div
          className={isRefreshing ? "opacity-60 transition-opacity" : undefined}
        >
          <MyExercisesTable
            rows={rows}
            selectedIds={visibleSelectedIds}
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
                const allSelected = rows.every((r) => prev.has(r.exercise_id));
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
        initial={editInitial}
        mp3Url={editRow?.has_audio && editRow.mp3_url ? editRow.mp3_url : null}
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
        open={deletePrompt !== null && !deletePrompt.emptiesTopic}
        count={deletePrompt?.ids.length ?? 0}
        hasAudio={deletePrompt?.hasAudio ?? false}
        onCancel={() => setDeletePrompt(null)}
        onConfirm={handleConfirmDelete}
        deleting={deleting}
      />

      <DeleteAllExercisesDialog
        open={deletePrompt !== null && deletePrompt.emptiesTopic}
        topicName={topicName}
        count={deletePrompt?.ids.length ?? 0}
        hasAudio={deletePrompt?.hasAudio ?? false}
        onCancel={() => setDeletePrompt(null)}
        onConfirm={handleConfirmDelete}
        deleting={deleting}
      />
    </div>
  );
}

function SearchDraftInput({
  initialValue,
  onDebouncedChange,
}: {
  initialValue: string;
  onDebouncedChange: (value: string) => void;
}) {
  const [draft, setDraft] = useState(initialValue);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (draft !== initialValue) onDebouncedChange(draft);
    }, 400);
    return () => window.clearTimeout(timer);
  }, [draft, initialValue, onDebouncedChange]);

  return (
    <input
      type="search"
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      placeholder="Bevat de tekst"
      className="border-border bg-background text-foreground h-9 rounded-md border px-3 text-sm"
    />
  );
}
