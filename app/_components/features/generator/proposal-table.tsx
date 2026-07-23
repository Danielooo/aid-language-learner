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
  ProposalTopicDestination,
  type TopicDestinationMode,
} from "./proposal-topic-destination";
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

const EXCLUDED_COLUMNS: ColumnKey[] = [
  "audio_id",
  "sentence_id",
  "topic",
  "edited",
];

type PersistState = {
  status: "idle" | "saving" | "success" | "error";
  response: { ok: true; inserted: number } | { ok: false } | null;
  error: string | null;
};

type ProposalTableProps = {
  batches: ProposalBatch[];
  proposal: ProposeExercisesOutput | null;
  persistState: PersistState;
  onSave: (body: ExercisesPersistBody) => void;
  /** Herstelde selectie uit localStorage-draft. */
  initialSelectedIds?: number[];
  /** Hersteld onderwerp uit localStorage-draft. */
  initialTopic?: string;
  destinationMode: TopicDestinationMode;
  onDestinationModeChange: (mode: TopicDestinationMode) => void;
  onRemoveAudioIds?: (audioIds: number[]) => void;
  onUpdateExercise?: (
    audioId: number,
    values: ExerciseEditValues,
  ) => void;
  /** Melden van selectie/topic-wijzigingen voor draft-persist. */
  onDraftMetaChange?: (meta: {
    selectedAudioIds: number[];
    topic: string;
  }) => void;
};

const EMPTY_TABLE_MESSAGE =
  "Nog geen oefeningen — genereer via chat hierboven.";

export function ProposalTable({
  batches,
  proposal,
  persistState,
  onSave,
  initialSelectedIds,
  initialTopic,
  destinationMode,
  onDestinationModeChange,
  onRemoveAudioIds,
  onUpdateExercise,
  onDraftMetaChange,
}: ProposalTableProps) {
  const translationLookup = useTranslationCache();
  const translationRef = useRef(translationLookup);
  useLayoutEffect(() => {
    translationRef.current = translationLookup;
  }, [translationLookup]);

  const [rows, setRows] = useState<AudioRow[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(
    () => new Set(initialSelectedIds ?? []),
  );
  const [topic, setTopic] = useState(
    () => initialTopic?.trim() || proposal?.topic || "",
  );
  const topicInitializedRef = useRef(Boolean(initialTopic?.trim()));
  const topicRef = useRef(topic);
  topicRef.current = topic;
  const didApplyInitialSelectionRef = useRef(false);

  const prevBatchCountRef = useRef(0);
  const prevBatchesRef = useRef<ProposalBatch[]>([]);
  const draftMetaRef = useRef(onDraftMetaChange);
  useLayoutEffect(() => {
    draftMetaRef.current = onDraftMetaChange;
  }, [onDraftMetaChange]);

  /* eslint-disable react-hooks/set-state-in-effect */
  useLayoutEffect(() => {
    const prevCount = prevBatchCountRef.current;
    const nextCount = batches.length;

    if (nextCount === 0) {
      setRows([]);
      setSelectedIds(new Set());
      didApplyInitialSelectionRef.current = false;
      if (prevCount > 0) {
        setTopic("");
        topicInitializedRef.current = false;
      } else if (initialTopic?.trim() && !topicInitializedRef.current) {
        setTopic(initialTopic.trim());
        topicInitializedRef.current = true;
      }
      prevBatchCountRef.current = 0;
      prevBatchesRef.current = [];
      return;
    }

    if (!topicInitializedRef.current) {
      if (!topicRef.current.trim()) {
        setTopic(initialTopic?.trim() || proposal?.topic || "");
      }
      topicInitializedRef.current = true;
    }

    if (nextCount > prevCount) {
      const newBatches = batches.slice(prevCount);
      let startIndex = prevBatchesRef.current.reduce(
        (sum, batch) => sum + batch.proposal.exercises.length,
        0,
      );

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
  }, [batches, proposal?.topic, initialTopic]);
  /* eslint-enable react-hooks/set-state-in-effect */

  // Eenmalig draft-selectie toepassen nadat rijen bestaan.
  useLayoutEffect(() => {
    if (didApplyInitialSelectionRef.current) return;
    if (!initialSelectedIds?.length || rows.length === 0) return;
    const valid = initialSelectedIds.filter((id) =>
      rows.some((row) => row.audio_id === id),
    );
    if (valid.length === 0) return;
    setSelectedIds(new Set(valid));
    didApplyInitialSelectionRef.current = true;
  }, [initialSelectedIds, rows]);

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
    onRemoveAudioIds?.(ids);
  }, [selectedIds, onRemoveAudioIds]);

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
      onUpdateExercise?.(editRow.audio_id, values);
      setEditRow(null);
      setEditError(null);
    },
    [editRow, onUpdateExercise],
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
    body.topic = trimmedTopic;
    if (body.exercises.length === 0) return;
    onSave(body);
  }, [onSave, topic, rows, selectedIds, translationLookup]);

  const selectedCount = selectedIds.size;

  const countLabel = `${rows.length} oefening${rows.length === 1 ? "" : "en"}${
    selectedCount > 0 ? ` · ${selectedCount} geselecteerd` : ""
  }${batches.length > 1 ? ` · ${batches.length} batches` : ""}`;

  return (
    <section className="space-y-4">
      <ProposalTopicDestination
        suggestedTopic={proposal?.topic ?? ""}
        topic={topic}
        onTopicChange={setTopic}
        mode={destinationMode}
        onModeChange={onDestinationModeChange}
        actions={({ blocked, existingTopicName }) => {
          const saveLabel = existingTopicName
            ? selectedCount > 0
              ? `Toevoegen aan “${existingTopicName}” (${selectedCount} geselecteerd)`
              : `Toevoegen aan “${existingTopicName}”`
            : selectedCount > 0
              ? `Topic opslaan (${selectedCount} geselecteerd)`
              : "Topic opslaan";
          return (
            <>
              <button
                type="button"
                onClick={handleDeleteSelected}
                disabled={selectedCount === 0}
                className="inline-flex h-9 items-center rounded-md border border-border px-3 text-xs text-foreground disabled:opacity-50"
              >
                Verwijder geselecteerd
              </button>
              <SaveButton
                persistState={persistState}
                onSave={handleSave}
                label={saveLabel}
                disabled={blocked || rows.length === 0}
              />
            </>
          );
        }}
      />

      <p className="text-xs text-muted-foreground">{countLabel}</p>

      {rows.length === 0 ? (
        <EmptyProposalTableChrome
          message={EMPTY_TABLE_MESSAGE}
          showMp3={false}
        />
      ) : (
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
          density="list"
          hideRowCount
        />
      )}

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

function EmptyProposalTableChrome({
  message,
  showMp3,
}: {
  message: string;
  showMp3: boolean;
}) {
  const colSpan = showMp3 ? 6 : 5;
  return (
    <div className="overflow-auto rounded-md border border-border">
      <table className="w-full border-collapse text-left text-sm">
        <thead className="sticky top-0 border-b bg-muted/40 text-sm text-muted-foreground">
          <tr>
            <th className="w-10 px-3 py-2" aria-label="Selectie" />
            {showMp3 && (
              <th className="px-3 py-2 font-semibold" aria-label="Audio" />
            )}
            <th className="px-3 py-2 font-semibold">Brontaal (SPA)</th>
            <th className="px-3 py-2 font-semibold">Vertaling (NL)</th>
            <th className="px-3 py-2 font-semibold">alternatieven</th>
            <th className="px-3 py-2 font-semibold">tags</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td
              colSpan={colSpan}
              className="px-3 py-8 text-center text-sm text-muted-foreground"
            >
              {message}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
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
          disabled={disabled}
          className="rounded-md border border-border px-3 py-1.5 text-xs font-medium hover:bg-muted disabled:opacity-50"
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
      className="inline-flex h-9 items-center rounded-md bg-accent px-3 text-xs font-medium text-accent-foreground transition-colors hover:bg-accent/90 disabled:opacity-50"
    >
      {persistState.status === "saving" ? "Opslaan…" : label}
    </button>
  );
}
