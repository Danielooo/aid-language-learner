"use client";

import { useCallback, useLayoutEffect, useMemo, useRef, useState } from "react";

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
  getLastAudioBatchExerciseCount,
  mapAudioBatchToRows,
  rowsToAudioPersistPayload,
  seedAudioTranslationCache,
  type AudioPersistBody,
  type AudioProposalBatch,
  type ProposeAudioExercisesOutput,
} from "./audio-proposal-table-adapter";

const EXCLUDED_COLUMNS: ColumnKey[] = [
  "edited",
  "topic",
  "lang",
  "author",
  "license",
  "audio_id",
  "sentence_id",
  "created",
  "cosine",
  "reason",
];

type PersistState = {
  status: "idle" | "saving" | "success" | "error";
  response: { ok: true; inserted: number } | { ok: false } | null;
  error: string | null;
};

type AudioProposalTableProps = {
  batches: AudioProposalBatch[];
  proposal: ProposeAudioExercisesOutput;
  persistState: PersistState;
  onSave: (body: AudioPersistBody) => void;
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

export function AudioProposalTable({
  batches,
  proposal,
  persistState,
  onSave,
  initialSelectedIds,
  initialTopic,
  onDraftMetaChange,
}: AudioProposalTableProps) {
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
    () => initialTopic?.trim() || proposal.topic || "",
  );
  const topicInitializedRef = useRef(Boolean(initialTopic?.trim()));

  const prevBatchCountRef = useRef(0);
  const prevBatchesRef = useRef<AudioProposalBatch[]>([]);
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
      // Nieuwste batch eerst: live (1 batch) én restore (alle batches tegelijk).
      const newBatches = batches.slice(prevCount).toReversed();
      const newRows = newBatches.flatMap((batch) => {
        const batchRows = mapAudioBatchToRows(batch);
        seedAudioTranslationCache(
          translationRef.current,
          batchRows,
          batch.proposal,
        );
        return batchRows;
      });
      // Nieuwste batch bovenaan; skip audio_ids die al in de tabel staan.
      setRows((prev) => {
        const seen = new Set(prev.map((r) => r.audio_id));
        const unique = newRows.filter((r) => {
          if (seen.has(r.audio_id)) return false;
          seen.add(r.audio_id);
          return true;
        });
        return [...unique, ...prev];
      });
    } else if (nextCount < prevCount) {
      const removedCount = getLastAudioBatchExerciseCount(prevBatchesRef.current);
      if (removedCount > 0) {
        const removedIds =
          prevBatchesRef.current.at(-1)?.proposal.exercises.map(
            (ex) => ex.audio_id,
          ) ?? [];
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

  const highlightAudioIds = useMemo(() => {
    if (batches.length < 2) return new Set<number>();
    const last = batches.at(-1);
    if (!last) return new Set<number>();
    return new Set(last.proposal.exercises.map((ex) => ex.audio_id));
  }, [batches]);

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
    const body = rowsToAudioPersistPayload(
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
  const saveLabel =
    selectedCount > 0
      ? `Groep opslaan (${selectedCount} geselecteerd)`
      : "Groep opslaan";

  const accentButtonClass =
    "rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-accent-foreground transition-colors hover:bg-accent/90 disabled:opacity-50";

  return (
    <section className="space-y-3 rounded-lg border border-border bg-card p-5 text-card-foreground">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div className="space-y-1.5">
          <h2 className="text-sm font-semibold">
            Audio-voorstel: {rows.length} oefening
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
            className={accentButtonClass}
          >
            Verwijder geselecteerd
          </button>
          <SaveButton
            persistState={persistState}
            onSave={handleSave}
            label={saveLabel}
            disabled={rows.length === 0 || !topic.trim()}
            className={accentButtonClass}
          />
        </div>
      </header>

      <AudioResultTable
        rows={rows}
        translation={{
          cache: translationLookup,
          state: {},
          onTranslateRow: () => {},
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
        tableScope="audio-exercise-generator"
        excludedColumns={EXCLUDED_COLUMNS}
        hideEnrichActions
        showFilterBar={false}
        showColumnMenu={false}
        mp3ColumnPlacement="after-selection"
        compactMp3Controls
        highlightAudioIds={highlightAudioIds}
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
  className,
}: {
  persistState: PersistState;
  onSave: () => void;
  label: string;
  disabled: boolean;
  className: string;
}) {
  if (persistState.status === "error") {
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs text-destructive">
          Fout: {persistState.error}
        </span>
        <button type="button" onClick={onSave} className={className}>
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
      className={className}
    >
      {persistState.status === "saving" ? "Opslaan…" : label}
    </button>
  );
}
