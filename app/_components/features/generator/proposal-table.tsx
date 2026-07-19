"use client";

import { useCallback, useLayoutEffect, useRef, useState } from "react";

import {
  AudioResultTable,
  type ColumnKey,
} from "@/app/_components/features/exercises/audio-result-table";
import {
  ExerciseEditModal,
  type ExerciseEditValues,
} from "@/app/_components/features/exercises/exercise-edit-modal";
import type { AudioRow } from "@/types/tatoeba";
import { useTranslationCache } from "@/lib/hooks/use-translation-cache";

import {
  getLastBatchExerciseCount,
  mapBatchToRows,
  proposalIndexToAudioId,
  rowsToExercisesPayload,
  seedTranslationCache,
  type ExercisesPersistBody,
  type ProposalBatch,
  type ProposeExercisesOutput,
} from "./proposal-table-adapter";

const DEFAULT_HIDDEN_COLUMNS: ColumnKey[] = [
  "lang",
  "author",
  "license",
  "created",
  "cosine",
  "reason",
];

const EXCLUDED_COLUMNS: ColumnKey[] = ["audio_id", "sentence_id"];

type PersistState = {
  status: "idle" | "saving" | "success" | "error";
  response: { ok: true; inserted: number } | { ok: false } | null;
  error: string | null;
};

type ProposalTableProps = {
  batches: ProposalBatch[];
  proposal: ProposeExercisesOutput;
  persistState: PersistState;
  onSave: (body: ExercisesPersistBody) => void;
  /** Herstelde selectie uit localStorage-draft. */
  initialSelectedIds?: number[];
  /** Hersteld onderwerp uit localStorage-draft. */
  initialTopic?: string;
  /** Melden van selectie/topic-wijzigingen voor draft-persist. */
  onDraftMetaChange?: (meta: {
    selectedAudioIds: number[];
    topic: string;
  }) => void;
};

export function ProposalTable({
  batches,
  proposal,
  persistState,
  onSave,
  initialSelectedIds,
  initialTopic,
  onDraftMetaChange,
}: ProposalTableProps) {
  const translationLookup = useTranslationCache();
  const translationRef = useRef(translationLookup);
  // Layout-effect (niet gewone effect): het batches-effect hieronder leest
  // deze ref en moet de verse lookup zien binnen dezelfde commit.
  useLayoutEffect(() => {
    translationRef.current = translationLookup;
  }, [translationLookup]);

  const [rows, setRows] = useState<AudioRow[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(
    () => new Set(initialSelectedIds ?? []),
  );
  const [topic, setTopic] = useState(
    () => initialTopic?.trim() || proposal.topic || "",
  );
  const topicInitializedRef = useRef(Boolean(initialTopic?.trim()));

  const prevBatchCountRef = useRef(0);
  const prevBatchesRef = useRef<ProposalBatch[]>([]);
  const draftMetaRef = useRef(onDraftMetaChange);
  useLayoutEffect(() => {
    draftMetaRef.current = onDraftMetaChange;
  }, [onDraftMetaChange]);

  // Batches → rijen synchroniseren kan niet als pure afleiding: het seedt
  // ook de gedeelde vertaal-cache (extern systeem). De sync setState hier
  // is bewust en begrensd (alleen bij batch-mutaties).
  /* eslint-disable react-hooks/set-state-in-effect */
  useLayoutEffect(() => {
    const prevCount = prevBatchCountRef.current;
    const nextCount = batches.length;

    if (nextCount === 0) {
      setRows([]);
      setSelectedIds(new Set());
      setTopic("");
      topicInitializedRef.current = false;
      prevBatchCountRef.current = 0;
      prevBatchesRef.current = [];
      return;
    }

    if (!topicInitializedRef.current) {
      setTopic(initialTopic?.trim() || proposal.topic);
      topicInitializedRef.current = true;
    }

    if (nextCount > prevCount) {
      const newBatches = batches.slice(prevCount);
      let startIndex = prevBatchesRef.current.reduce(
        (sum, batch) => sum + batch.proposal.exercises.length,
        0,
      );

      // Chronologische ids behouden; nieuwste batch bovenaan (live + restore).
      const batchRowGroups = newBatches.map((batch) => {
        const batchRows = mapBatchToRows(batch, startIndex);
        seedTranslationCache(translationRef.current, batchRows, batch.proposal);
        startIndex += batch.proposal.exercises.length;
        return batchRows;
      });
      const newRows = batchRowGroups.toReversed().flat();

      setRows((prev) => [...newRows, ...prev]);
    } else if (nextCount < prevCount) {
      const removedCount = getLastBatchExerciseCount(prevBatchesRef.current);
      if (removedCount > 0) {
        const startIndex = prevBatchesRef.current
          .slice(0, -1)
          .reduce((sum, batch) => sum + batch.proposal.exercises.length, 0);
        const removedIds = Array.from({ length: removedCount }, (_, index) =>
          proposalIndexToAudioId(startIndex + index),
        );

        translationRef.current.removeByAudioIds(removedIds);
        setRows((prev) => prev.slice(removedCount));
        setSelectedIds((prev) => {
          const next = new Set(prev);
          for (const id of removedIds) next.delete(id);
          return next;
        });
      }
    }

    prevBatchCountRef.current = nextCount;
    prevBatchesRef.current = batches;
  }, [batches, proposal.topic, initialTopic]);
  /* eslint-enable react-hooks/set-state-in-effect */

  // Draft-meta naar parent voor localStorage.
  useLayoutEffect(() => {
    draftMetaRef.current?.({
      selectedAudioIds: Array.from(selectedIds),
      topic,
    });
  }, [selectedIds, topic]);

  const [editRow, setEditRow] = useState<AudioRow | null>(null);
  const [editError, setEditError] = useState<string | null>(null);

  const handleDeleteSelected = useCallback(() => {
    if (selectedIds.size === 0) return;
    const ids = Array.from(selectedIds);
    translationRef.current.removeByAudioIds(ids);
    setRows((prev) => prev.filter((row) => !selectedIds.has(row.audio_id)));
    setSelectedIds(new Set());
  }, [selectedIds]);

  const handleRowDoubleClick = useCallback((row: AudioRow) => {
    setEditError(null);
    setEditRow(row);
  }, []);

  const handleModalSave = useCallback(
    async (values: ExerciseEditValues) => {
      if (!editRow) return;
      const cached = translationRef.current.get(
        editRow.audio_id,
        editRow.sentence_text,
      );
      if (cached) {
        translationRef.current.set(editRow.audio_id, {
          ...cached,
          source_text: values.sourceText,
          translation: values.targetText,
          tags: values.tags,
          alternatives: values.alternatives,
          manually_edited:
            values.targetText.trim() !== cached.translation.trim()
              ? true
              : cached.manually_edited,
        });
      }
      setRows((prev) =>
        prev.map((r) =>
          r.audio_id === editRow.audio_id
            ? { ...r, sentence_text: values.sourceText }
            : r,
        ),
      );
      setEditRow(null);
      setEditError(null);
    },
    [editRow],
  );

  const handleSave = useCallback(() => {
    const trimmedTopic = topic.trim();
    if (!trimmedTopic) return;
    const body = rowsToExercisesPayload(
      rows,
      translationLookup,
      selectedIds,
      trimmedTopic,
    );
    // Header-onderwerp wint: row-cache mag de groepsnaam niet overschrijven.
    body.topic = trimmedTopic;
    if (body.exercises.length === 0) return;
    onSave(body);
  }, [onSave, topic, rows, selectedIds, translationLookup]);

  const selectedCount = selectedIds.size;
  const saveLabel =
    selectedCount > 0
      ? `Groep opslaan (${selectedCount} geselecteerd)`
      : "Groep opslaan";

  return (
    <section className="space-y-3 rounded-lg border border-border bg-card p-5 text-card-foreground">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div className="space-y-1.5">
          <h2 className="text-sm font-semibold">
            Voorstel: {rows.length} oefening
            {rows.length === 1 ? "" : "en"}
            {batches.length > 1 && (
              <span className="font-normal text-muted-foreground">
                {" "}
                ({batches.length} batches)
              </span>
            )}
          </h2>
          <label className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span>Onderwerp:</span>
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              className="min-w-[12rem] flex-1 rounded-md border border-input bg-background px-2 py-1 font-mono text-xs text-foreground"
              aria-label="Onderwerp van de oefeningengroep"
            />
            {selectedCount > 0 && (
              <span className="text-muted-foreground">
                · {selectedCount} geselecteerd
              </span>
            )}
          </label>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleDeleteSelected}
            disabled={selectedCount === 0}
            className="rounded-md border border-border px-3 py-1.5 text-xs font-medium hover:bg-muted disabled:opacity-50"
          >
            Verwijder geselecteerd
          </button>
          <SaveButton
            persistState={persistState}
            onSave={handleSave}
            label={saveLabel}
            disabled={rows.length === 0 || !topic.trim()}
          />
        </div>
      </header>

      <AudioResultTable
        rows={rows}
        translation={{
          cache: translationLookup,
          state: {},
          onTranslateRow: () => { },
        }}
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
        tableScope="exercise-generator"
        defaultHiddenColumns={DEFAULT_HIDDEN_COLUMNS}
        excludedColumns={EXCLUDED_COLUMNS}
        hideMp3Column
        hideEnrichActions
        showFilterBar={false}
        showColumnMenu={false}
        serverSorted
        onRowDoubleClick={handleRowDoubleClick}
      />

      <ExerciseEditModal
        open={editRow !== null}
        initial={
          editRow
            ? (() => {
              const cached = translationLookup.get(
                editRow.audio_id,
                editRow.sentence_text,
              );
              return {
                sourceText: editRow.sentence_text,
                targetText: cached?.translation ?? "",
                tags: cached?.tags ?? [],
                alternatives: cached?.alternatives ?? [],
              };
            })()
            : null
        }
        saving={false}
        error={editError}
        onClose={() => {
          setEditRow(null);
          setEditError(null);
        }}
        onSave={handleModalSave}
      />
    </section>
  );
}

function SaveButton({
  persistState,
  onSave,
  label,
  disabled,
}: {
  persistState: PersistState;
  onSave: () => void;
  label: string;
  disabled: boolean;
}) {
  if (persistState.status === "error") {
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs text-destructive">
          Fout: {persistState.error}
        </span>
        <button
          type="button"
          onClick={onSave}
          className="rounded-md border border-border px-3 py-1.5 text-xs font-medium hover:bg-muted"
        >
          Opnieuw proberen
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onSave}
      disabled={disabled || persistState.status === "saving"}
      className="rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-accent-foreground transition-colors hover:bg-accent/90 disabled:opacity-50"
    >
      {persistState.status === "saving" ? "Opslaan…" : label}
    </button>
  );
}
