"use client";

import { useEffect, useRef, useState } from "react";

import { ChipListField } from "@/app/_components/ui/chip-list-field";

export type ExerciseEditValues = {
  sourceText: string;
  targetText: string;
  tags: string[];
  alternatives: string[];
};

type ExerciseEditModalProps = {
  open: boolean;
  initial: ExerciseEditValues | null;
  saving: boolean;
  error: string | null;
  onClose: () => void;
  onSave: (values: ExerciseEditValues) => Promise<void>;
};

/** Split CSV-tags; lege stukken en witruimte worden weggelaten. */
export function parseTagsCsv(raw: string): string[] {
  return raw
    .split(",")
    .map((t) => t.trim())
    .filter((t) => t.length > 0);
}

/**
 * Modal om één oefening te bewerken (bron, vertaling, tags, alts).
 */
export function ExerciseEditModal({
  open,
  initial,
  saving,
  error,
  onClose,
  onSave,
}: ExerciseEditModalProps) {
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const [sourceText, setSourceText] = useState("");
  const [targetText, setTargetText] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [alternatives, setAlternatives] = useState<string[]>([]);

  useEffect(() => {
    if (!initial) return;
    setSourceText(initial.sourceText);
    setTargetText(initial.targetText);
    setTags([...initial.tags]);
    setAlternatives([...initial.alternatives]);
  }, [initial]);

  useEffect(() => {
    const node = dialogRef.current;
    if (!node) return;
    if (open && !node.open) node.showModal();
    else if (!open && node.open) node.close();
  }, [open]);

  if (!open || !initial) return null;

  async function handleSave() {
    const source = sourceText.trim();
    const target = targetText.trim();
    if (!source || !target) return;
    await onSave({
      sourceText: source,
      targetText: target,
      tags,
      alternatives,
    });
  }

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      className="fixed inset-0 m-auto h-fit max-h-[85vh] w-[min(560px,90vw)] rounded-lg border border-border bg-card p-0 text-card-foreground backdrop:bg-foreground/40"
    >
      <div className="flex max-h-[85vh] flex-col">
        <header className="border-b border-border px-5 py-3">
          <h2 className="text-base font-semibold">Oefening bewerken</h2>
          <p className="text-xs text-muted-foreground">
            Pas bron, vertaling, tags en alternatieven aan.
          </p>
        </header>

        <div className="space-y-4 overflow-y-auto px-5 py-4">
          <label className="block space-y-1 text-sm">
            <span className="text-xs text-muted-foreground">Bron</span>
            <textarea
              value={sourceText}
              onChange={(e) => setSourceText(e.target.value)}
              rows={2}
              disabled={saving}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground disabled:opacity-50"
            />
          </label>

          <label className="block space-y-1 text-sm">
            <span className="text-xs text-muted-foreground">Vertaling</span>
            <textarea
              value={targetText}
              onChange={(e) => setTargetText(e.target.value)}
              rows={2}
              disabled={saving}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground disabled:opacity-50"
            />
          </label>

          <ChipListField
            label="Tags"
            items={tags}
            onChange={setTags}
            disabled={saving}
            caseInsensitiveDedupe
            placeholder="Nieuwe tag…"
            emptyLabel="Geen"
          />

          <ChipListField
            label="Alternatieven"
            items={alternatives}
            onChange={setAlternatives}
            disabled={saving}
            placeholder="Nieuw alternatief…"
            emptyLabel="Geen"
          />

          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}
        </div>

        <footer className="flex justify-end gap-2 border-t border-border px-5 py-3">
          <button
            type="button"
            disabled={saving}
            onClick={onClose}
            className="inline-flex h-9 items-center rounded-md border border-border px-3 text-sm disabled:opacity-50"
          >
            Annuleren
          </button>
          <button
            type="button"
            disabled={
              saving ||
              sourceText.trim().length === 0 ||
              targetText.trim().length === 0
            }
            onClick={() => void handleSave()}
            className="inline-flex h-9 items-center rounded-md bg-accent px-3 text-sm font-medium text-accent-foreground disabled:opacity-50"
          >
            {saving ? "Opslaan…" : "Opslaan"}
          </button>
        </footer>
      </div>
    </dialog>
  );
}
