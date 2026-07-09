"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import {
  AudioResultTable,
  type SortDir,
  type SortKey,
  type TranslateRowState,
} from "@/app/dev/_components/audio-result-table";
import { TopicCombobox } from "@/app/_components/features/exercises/topic-combobox";
import { AdminActionBar } from "@/app/dev/exercises-admin/_components/admin-action-bar";
import { DeleteConfirmDialog } from "@/app/dev/exercises-admin/_components/delete-confirm-dialog";
import { PaginationBar } from "@/app/dev/exercises-admin/_components/pagination-bar";

import type { AudioRow } from "@/app/api/dev/tatoeba-audio/list/route";
import type {
  AdminExerciseRow,
  ExercisePatchFields,
} from "@/app/api/dev/exercises-admin/types";
import type {
  TranslationCacheEntry,
  TranslationCacheMap,
  UseTranslationCache,
} from "@/lib/hooks/use-translation-cache";

const LANG_OPTIONS = [
  { value: "", label: "Alle talen" },
  { value: "spa", label: "Spaans (spa)" },
  { value: "eng", label: "Engels (eng)" },
  { value: "nld", label: "Nederlands (nld)" },
  { value: "fra", label: "Frans (fra)" },
  { value: "deu", label: "Duits (deu)" },
] as const;

const PAGE_SIZE_PRESETS = [10, 25, 50, 100, 200] as const;
const ENRICH_CHUNK = 50;
const TARGET_LANG = "nld";

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

type EnrichSuccess = { ok: true; enriched: number; skipped: number };
type EnrichFailure = { ok: false; error: string };

type TopicsResponse =
  | { ok: true; topics: string[] }
  | { ok: false; error: string };

type LoadState =
  | { status: "idle" }
  | { status: "loading" }
  | {
      status: "loaded";
      rows: AdminExerciseRow[];
      total: number;
      page: number;
      pageSize: number;
      fetchedAt: string;
      isRefreshing?: boolean;
    }
  | { status: "error"; error: string };

export type ExercisesListPageProps = {
  apiBase: string;
  pagePath: string;
  tableScope: string;
  topicsUrl: string;
  emptyMessage: React.ReactNode;
  emptyFilteredMessage?: string;
};

function buildTranslationLookup(
  rows: AdminExerciseRow[],
  onLocalUpdate: (
    audioId: number,
    patch: Partial<TranslationCacheEntry>,
  ) => void,
): UseTranslationCache {
  const cache: TranslationCacheMap = {};
  for (const row of rows) {
    const tags = row.tags
      .split(",")
      .map((t) => t.trim())
      .filter((t) => t.length > 0);
    cache[String(row.audio_id)] = {
      translation: row.target_text,
      source_text: row.sentence_text,
      lang: row.lang,
      cached_at: row.created ?? new Date().toISOString(),
      manually_edited: row.target_text_manually_edited,
      alternatives: row.alternative_translations,
      topic: row.topic,
      tags,
    };
  }

  return {
    cache,
    get(audioId, currentSourceText) {
      const entry = cache[String(audioId)];
      if (!entry || entry.source_text !== currentSourceText) return null;
      return entry;
    },
    set(audioId, entry) {
      cache[String(audioId)] = entry;
      onLocalUpdate(audioId, entry);
    },
    bulkSet: () => {},
    setManualTranslation(audioId, newText) {
      const entry = cache[String(audioId)];
      if (!entry) return;
      const next = {
        ...entry,
        translation: newText,
        manually_edited: true,
      };
      cache[String(audioId)] = next;
      onLocalUpdate(audioId, next);
    },
    addAlternative(audioId, text) {
      const entry = cache[String(audioId)];
      if (!entry) return;
      const next = {
        ...entry,
        alternatives: [...entry.alternatives, text],
      };
      cache[String(audioId)] = next;
      onLocalUpdate(audioId, next);
    },
    removeAlternative(audioId, index) {
      const entry = cache[String(audioId)];
      if (!entry) return;
      const next = {
        ...entry,
        alternatives: entry.alternatives.filter((_, i) => i !== index),
      };
      cache[String(audioId)] = next;
      onLocalUpdate(audioId, next);
    },
    removeByAudioIds(audioIds) {
      for (const audioId of audioIds) {
        delete cache[String(audioId)];
      }
    },
    clearAll: () => {},
    clearByLang: () => {},
  };
}

function parsePageSize(raw: string | null): number {
  const n = Number(raw);
  if ((PAGE_SIZE_PRESETS as readonly number[]).includes(n)) return n;
  return PAGE_SIZE_PRESETS[0];
}

function parseSortDir(raw: string | null): SortDir {
  return raw === "asc" ? "asc" : "desc";
}

export function ExercisesListPage({
  apiBase,
  pagePath,
  tableScope,
  topicsUrl,
  emptyMessage,
  emptyFilteredMessage = "Geen oefeningen gevonden voor deze filters.",
}: ExercisesListPageProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const page = Math.max(1, Number(searchParams.get("page") ?? "1") || 1);
  const pageSize = parsePageSize(searchParams.get("pageSize"));
  const sortDir = parseSortDir(searchParams.get("sortDir"));
  const lang = searchParams.get("lang") ?? "";
  const topic = searchParams.get("topic") ?? "";
  const q = searchParams.get("q") ?? "";

  const [searchDraft, setSearchDraft] = useState(q);
  const [load, setLoad] = useState<LoadState>({ status: "idle" });
  const [topics, setTopics] = useState<string[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [translateState, setTranslateState] = useState<
    Record<number, TranslateRowState>
  >({});
  const [cacheVersion, setCacheVersion] = useState(0);
  const [enriching, setEnriching] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deletePrompt, setDeletePrompt] = useState<{
    ids: string[];
    showAudioOption: boolean;
  } | null>(null);
  const [deleteAudio, setDeleteAudio] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const enrichAbortRef = useRef<AbortController | null>(null);
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
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const updateParams = useCallback(
    (patch: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(patch)) {
        if (value === null || value === "") params.delete(key);
        else params.set(key, value);
      }
      router.replace(`${pagePath}?${params.toString()}`);
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
          pageSize: String(pageSize),
          sortDir,
        });
        if (lang) params.set("lang", lang);
        if (topic) params.set("topic", topic);
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
          fetchedAt: json.fetched_at,
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
    [apiBase, page, pageSize, sortDir, lang, topic, q],
  );

  useEffect(() => {
    void fetchList(false);
  }, [fetchList]);

  useEffect(() => {
    fetch(topicsUrl, { cache: "no-store" })
      .then((res) => res.json() as Promise<TopicsResponse>)
      .then((json) => {
        if (json.ok) setTopics(json.topics);
      })
      .catch(() => {});
  }, [topicsUrl]);

  // Selectie beperken tot zichtbare rijen zodra de dataset wisselt.
  // State-tijdens-render-patroon i.p.v. effect (geen extra render-cascade).
  const [prevRows, setPrevRows] = useState(rows);
  if (rows !== prevRows) {
    setPrevRows(rows);
    const scope = new Set(rows.map((r) => r.audio_id));
    setSelectedIds((prev) => {
      let changed = false;
      const next = new Set<number>();
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

  const rowByAudioId = useMemo(
    () => new Map(rows.map((r) => [r.audio_id, r])),
    [rows],
  );

  const translationLookup = useMemo(() => {
    void cacheVersion;
    return buildTranslationLookup(rows, () => {
      setCacheVersion((v) => v + 1);
    });
  }, [rows, cacheVersion]);

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

  const persistMode = useMemo(
    () => ({
      getExerciseId: (row: AudioRow) => {
        const found = rowByAudioId.get(row.audio_id);
        if (!found) throw new Error("Rij niet gevonden.");
        return found.exercise_id;
      },
      onPatchRow: patchRow,
    }),
    [rowByAudioId, patchRow],
  );

  const selectedRows = useMemo(
    () => rows.filter((r) => selectedIds.has(r.audio_id)),
    [rows, selectedIds],
  );

  const enrichableOnPage = useMemo(
    () => rows.filter((r) => r.lang !== TARGET_LANG),
    [rows],
  );

  const enrichableSelected = useMemo(
    () => selectedRows.filter((r) => r.lang !== TARGET_LANG),
    [selectedRows],
  );

  const runEnrich = useCallback(
    async (targetRows: AdminExerciseRow[]) => {
      if (targetRows.length === 0 || enriching) return;

      const controller = new AbortController();
      enrichAbortRef.current = controller;
      const { signal } = controller;

      setEnriching(true);
      setActionError(null);
      setActionMessage(null);
      setTranslateState(
        Object.fromEntries(
          targetRows.map((r) => [r.audio_id, { status: "loading" as const }]),
        ),
      );

      let totalEnriched = 0;
      let aborted = false;

      try {
        const ids = targetRows.map((r) => r.exercise_id);
        for (let i = 0; i < ids.length; i += ENRICH_CHUNK) {
          if (signal.aborted) {
            aborted = true;
            break;
          }
          const chunk = ids.slice(i, i + ENRICH_CHUNK);
          const res = await fetch(`${apiBase}/enrich`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ exercise_ids: chunk }),
            signal,
          });
          const json = (await res.json()) as EnrichSuccess | EnrichFailure;
          if (!res.ok || !json.ok) {
            throw new Error(json.ok ? `HTTP ${res.status}` : json.error);
          }
          totalEnriched += json.enriched;
        }

        if (aborted) {
          setActionMessage(
            `Verrijking gestopt — ${totalEnriched} oefening(en) verwerkt.`,
          );
        } else {
          setActionMessage(`${totalEnriched} oefening(en) verrijkt.`);
        }
        setSelectedIds(new Set());
        await fetchList(true);
      } catch (e) {
        if (e instanceof Error && e.name === "AbortError") {
          setActionMessage(
            `Verrijking gestopt — ${totalEnriched} oefening(en) verwerkt.`,
          );
          await fetchList(true);
        } else {
          setActionError(e instanceof Error ? e.message : "Verrijken mislukt.");
        }
      } finally {
        enrichAbortRef.current = null;
        setEnriching(false);
        setTranslateState({});
      }
    },
    [apiBase, enriching, fetchList],
  );

  const stopEnrich = useCallback(() => {
    enrichAbortRef.current?.abort();
  }, []);

  const handleEnrich = useCallback(() => {
    if (selectedRows.length > 0) {
      void runEnrich(enrichableSelected);
    } else {
      void runEnrich(enrichableOnPage);
    }
  }, [selectedRows.length, enrichableSelected, enrichableOnPage, runEnrich]);

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
        `${json.deleted} verwijderd${json.audio_removed > 0 ? `, ${json.audio_removed} audio-bestand(en) uit bucket` : ""}.`,
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
  }, [apiBase, deletePrompt, deleteAudio, page, rows.length, updateParams, fetchList]);

  const handleTranslateRow = useCallback(
    (row: AudioRow) => {
      const full = rowByAudioId.get(row.audio_id);
      if (full) void runEnrich([full]);
    },
    [runEnrich, rowByAudioId],
  );

  const handleSortChange = useCallback(
    (key: SortKey, dir: SortDir) => {
      if (key === "created") {
        updateParams({ sortDir: dir, page: "1" });
      }
    },
    [updateParams],
  );

  const hasActiveFilters = Boolean(lang || topic || q);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3 rounded-lg border border-border bg-card p-4">
        <label className="flex flex-col gap-1">
          <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            Brontaal
          </span>
          <select
            value={lang}
            onChange={(e) =>
              updateParams({ lang: e.target.value || null, page: "1" })
            }
            className="rounded-md border border-input bg-background px-2 py-1.5 text-xs"
          >
            {LANG_OPTIONS.map((opt) => (
              <option key={opt.value || "all"} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>

        <div className="flex flex-col gap-1">
          <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            Onderwerp
          </span>
          <TopicCombobox
            topics={topics}
            value={topic}
            onChange={(t) =>
              updateParams({ topic: t ?? null, page: "1" })
            }
          />
        </div>

        <label className="flex min-w-[200px] flex-1 flex-col gap-1">
          <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            Zoeken
          </span>
          <input
            type="search"
            value={searchDraft}
            onChange={(e) => setSearchDraft(e.target.value)}
            placeholder="Bron- of doeltekst…"
            className="rounded-md border border-input bg-background px-2 py-1.5 text-xs"
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            Per pagina
          </span>
          <select
            value={String(pageSize)}
            onChange={(e) =>
              updateParams({ pageSize: e.target.value, page: "1" })
            }
            className="rounded-md border border-input bg-background px-2 py-1.5 text-xs"
          >
            {PAGE_SIZE_PRESETS.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>

        <button
          type="button"
          onClick={() => void fetchList(true)}
          disabled={isInitialLoading || isRefreshing}
          className="rounded-md border border-border bg-background px-3 py-1.5 text-xs hover:bg-muted disabled:opacity-50"
        >
          {isRefreshing ? "Verversen…" : "Verversen"}
        </button>
      </div>

      {load.status === "error" && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          {load.error}
          <button
            type="button"
            onClick={() => void fetchList(false)}
            className="ml-2 underline"
          >
            Opnieuw
          </button>
        </div>
      )}

      {load.status === "loaded" && (
        <p className="text-[11px] text-muted-foreground">
          {total} oefening{total === 1 ? "" : "en"} · laatst opgehaald{" "}
          {new Date(load.fetchedAt).toLocaleTimeString("nl-NL")} · inline
          bewerkingen slaan direct op in de database
        </p>
      )}

      <AdminActionBar
        selectedCount={selectedIds.size}
        page={page}
        totalPages={totalPages}
        total={total}
        pendingEnrichCount={enrichableOnPage.length}
        pendingSelectedEnrichCount={enrichableSelected.length}
        enriching={enriching}
        deleting={deleting}
        isRefreshing={isRefreshing}
        onEnrich={handleEnrich}
        onStopEnrich={stopEnrich}
        onDelete={handleDeleteRequest}
        onClearSelection={() => setSelectedIds(new Set())}
        actionError={actionError}
        actionMessage={actionMessage}
      />

      {isInitialLoading && rows.length === 0 && (
        <p className="text-xs text-muted-foreground">Laden...</p>
      )}

      <PaginationBar
        page={page}
        pageSize={pageSize}
        total={total}
        disabled={isInitialLoading || isRefreshing}
        onPageChange={(p) => updateParams({ page: String(p) })}
      />

      {rows.length > 0 && (
        <div className={isRefreshing ? "opacity-60 transition-opacity" : undefined}>
          <AudioResultTable
            rows={rows}
            translation={{
              cache: translationLookup,
              state: translateState,
              onTranslateRow: handleTranslateRow,
            }}
            persistMode={persistMode}
            selection={{
              selectedIds,
              onToggle: (audioId) => {
                setSelectedIds((prev) => {
                  const next = new Set(prev);
                  if (next.has(audioId)) next.delete(audioId);
                  else next.add(audioId);
                  return next;
                });
              },
              onToggleAllVisible: (visibleIds) => {
                setSelectedIds((prev) => {
                  const allSelected = visibleIds.every((id) => prev.has(id));
                  const next = new Set(prev);
                  if (allSelected) {
                    for (const id of visibleIds) next.delete(id);
                  } else {
                    for (const id of visibleIds) next.add(id);
                  }
                  return next;
                });
              },
            }}
            tableScope={tableScope}
            hideMp3Column
            defaultHiddenColumns={[
              "sentence_id",
              "author",
              "license",
              "cosine",
              "reason",
            ]}
            sortKey="created"
            sortDir={sortDir}
            onSortChange={handleSortChange}
            serverSorted
          />
        </div>
      )}

      {load.status === "loaded" && rows.length === 0 && (
        <div className="text-xs text-muted-foreground">
          {hasActiveFilters ? (
            emptyFilteredMessage
          ) : (
            emptyMessage
          )}
        </div>
      )}

      <PaginationBar
        page={page}
        pageSize={pageSize}
        total={total}
        disabled={isInitialLoading || isRefreshing}
        onPageChange={(p) => updateParams({ page: String(p) })}
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
