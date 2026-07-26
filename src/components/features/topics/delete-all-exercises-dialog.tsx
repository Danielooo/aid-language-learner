"use client";

import { useEffect, useRef } from "react";

type DeleteAllExercisesDialogProps = {
  open: boolean;
  topicName: string | null;
  count: number;
  hasAudio: boolean;
  deleting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

/**
 * Bevestiging wanneer alle oefeningen van een topic worden verwijderd:
 * oefeningen én topic verdwijnen in één actie (audio mee).
 */
export function DeleteAllExercisesDialog({
  open,
  topicName,
  count,
  hasAudio,
  deleting,
  onCancel,
  onConfirm,
}: DeleteAllExercisesDialogProps) {
  const dialogRef = useRef<HTMLDialogElement | null>(null);

  useEffect(() => {
    const node = dialogRef.current;
    if (!node) return;
    if (open && !node.open) node.showModal();
    else if (!open && node.open) node.close();
  }, [open]);

  const topicLabel = topicName ? (
    <span className="text-foreground font-medium">“{topicName}”</span>
  ) : (
    "dit topic"
  );

  return (
    <dialog
      ref={dialogRef}
      onClose={onCancel}
      className="border-border bg-card text-card-foreground backdrop:bg-foreground/40 fixed inset-0 m-auto h-fit w-[min(480px,90vw)] rounded-lg border p-0"
    >
      <div className="space-y-4 p-5">
        <header className="space-y-1">
          <h2 className="text-base font-semibold">
            Alle oefeningen verwijderen?
          </h2>
          <p className="text-muted-foreground text-sm">
            Je staat op het punt{" "}
            {count === 1 ? "de laatste oefening" : `alle ${count} oefeningen`}{" "}
            in {topicLabel} te verwijderen. Het topic verdwijnt dan ook uit je
            leerplan
            {hasAudio ? ", inclusief de bijbehorende audiobestanden" : ""}. Dit
            kun je niet ongedaan maken. Wil je doorgaan?
          </p>
        </header>

        <footer className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={deleting}
            className="border-border bg-background hover:bg-muted rounded-md border px-3 py-1.5 text-xs disabled:opacity-50"
          >
            Annuleren
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={deleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-md px-3 py-1.5 text-xs font-medium disabled:opacity-50"
          >
            {deleting ? "Verwijderen…" : "Verwijderen"}
          </button>
        </footer>
      </div>
    </dialog>
  );
}
