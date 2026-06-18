"use client";

import { useCallback, useLayoutEffect, useMemo, useRef, useState } from "react";

import {
  AudioResultTable,
  type ColumnKey,
} from "@/app/dev/_components/audio-result-table";
import type { AudioRow } from "@/app/api/dev/tatoeba-audio/list/route";
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
  canUndo: boolean;
  onUndo: () => void;
  persistState: PersistState;
  onSave: (body: ExercisesPersistBody) => void;
};

export function ProposalTable({
  batches,
  proposal,
  canUndo,
  onUndo,
  persistState,
  onSave,
}: ProposalTableProps) {
  const translationLookup = useTranslationCache();
  const translationRef = useRef(translationLookup);
  translationRef.current = translationLookup;

  const [rows, setRows] = useState<AudioRow[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(() => new Set());

  const prevBatchCountRef = useRef(0);
  const prevBatchesRef = useRef<ProposalBatch[]>([]);

  useLayoutEffect(() => {
    const prevCount = prevBatchCountRef.current;
    const nextCount = batches.length;

    if (nextCount === 0) {
      setRows([]);
      setSelectedIds(new Set());
      prevBatchCountRef.current = 0;
      prevBatchesRef.current = [];
      return;
    }

    if (nextCount > prevCount) {
      const newBatches = batches.slice(prevCount);
      let startIndex = prevBatchesRef.current.reduce(
        (sum, batch) => sum + batch.proposal.exercises.length,
        0,
      );

      const appendedRows = newBatches.flatMap((batch) => {
        const batchRows = mapBatchToRows(batch, startIndex);
        seedTranslationCache(translationRef.current, batchRows, batch.proposal);
        startIndex += batch.proposal.exercises.length;
        return batchRows;
      });

      setRows((prev) => [...prev, ...appendedRows]);
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
        setRows((prev) => prev.slice(0, -removedCount));
        setSelectedIds((prev) => {
          const next = new Set(prev);
          for (const id of removedIds) next.delete(id);
          return next;
        });
      }
    }

    prevBatchCountRef.current = nextCount;
    prevBatchesRef.current = batches;
  }, [batches]);

  const persistMode = useMemo(
    () => ({
      getExerciseId: (row: AudioRow) => String(row.audio_id),
      onPatchRow: async () => {
        // Lokale draft: cellen updaten de translation-cache zelf.
      },
    }),
    [],
  );

  const handlePatchSourceText = useCallback((row: AudioRow, text: string) => {
    setRows((prev) =>
      prev.map((r) =>
        r.audio_id === row.audio_id ? { ...r, sentence_text: text } : r,
      ),
    );
  }, []);

  const handleSave = useCallback(() => {
    if (!proposal.topic.trim()) return;
    const body = rowsToExercisesPayload(
      rows,
      translationLookup,
      selectedIds,
      proposal.topic,
    );
    if (body.exercises.length === 0 || !body.topic.trim()) return;
    onSave(body);
  }, [onSave, proposal.topic, rows, selectedIds, translationLookup]);

  const selectedCount = selectedIds.size;
  const saveLabel =
    selectedCount > 0
      ? `Opslaan (${selectedCount} geselecteerd)`
      : "Opslaan in Supabase";

  return (
    <section className="space-y-3 rounded-lg border border-border bg-card p-5 text-card-foreground">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div className="space-y-0.5">
          <h2 className="text-sm font-semibold">
            Voorstel: {proposal.exercises.length} oefening
            {proposal.exercises.length === 1 ? "" : "en"}
            {batches.length > 1 && (
              <span className="font-normal text-muted-foreground">
                {" "}
                ({batches.length} batches)
              </span>
            )}
          </h2>
          <p className="text-xs text-muted-foreground">
            Onderwerp:{" "}
            <code className="font-mono text-foreground">{proposal.topic}</code>
            {selectedCount > 0 && (
              <span className="ml-2 text-muted-foreground">
                · {selectedCount} geselecteerd
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {canUndo && (
            <button
              type="button"
              onClick={onUndo}
              className="rounded-md border border-border px-3 py-1.5 text-xs font-medium hover:bg-muted"
            >
              ← Terug
            </button>
          )}
          <SaveButton
            persistState={persistState}
            onSave={handleSave}
            label={saveLabel}
            disabled={rows.length === 0}
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
        persistMode={persistMode}
        tableScope="exercise-generator"
        defaultHiddenColumns={DEFAULT_HIDDEN_COLUMNS}
        excludedColumns={EXCLUDED_COLUMNS}
        hideMp3Column
        hideEnrichActions
        editableSourceText
        onPatchSourceText={handlePatchSourceText}
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
      {persistState.status === "saving" ? "Opslaan..." : label}
    </button>
  );
}
