"use client";

import { useEffect, useRef } from "react";

// Waarschuwingsmodal die opent zodra de user "Wissen" klikt terwijl er
// nog verrijkingen (vertaling + topic + tags) in de translation-cache
// staan voor de actieve taal. Wissen is destructief en niet undo-baar
// — daarom expliciete bevestiging via "Doorgaan" of "Annuleren".
//
// Gebruikt het native <dialog>-element (zelfde patroon als
// NoTranslationWarningDialog en ConflictDialog) voor gratis focus-trap,
// Esc-to-close en correcte modal-rendering.

type ClearWarningDialogProps = {
  open: boolean;
  // Hoeveel verrijkte records er voor de actieve taal in de cache
  // staan en weggegooid zouden worden bij "Doorgaan".
  enrichedCount: number;
  onCancel: () => void;
  onConfirm: () => void;
};

export function ClearWarningDialog({
  open,
  enrichedCount,
  onCancel,
  onConfirm,
}: ClearWarningDialogProps) {
  const dialogRef = useRef<HTMLDialogElement | null>(null);

  // close() vóór showModal() voorkomt "Failed to execute" als hetzelfde
  // dialog twee keer achter elkaar geopend wordt.
  useEffect(() => {
    const node = dialogRef.current;
    if (!node) return;
    if (open && !node.open) {
      node.showModal();
    } else if (!open && node.open) {
      node.close();
    }
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      onClose={onCancel}
      className="fixed inset-0 m-auto h-fit w-[min(480px,90vw)] rounded-lg border border-border bg-card p-0 text-card-foreground backdrop:bg-foreground/40"
    >
      <div className="space-y-4 p-5">
        <header className="space-y-1">
          <h2 className="text-base font-semibold">
            Records en verrijkingen wissen?
          </h2>
          <p className="text-xs text-muted-foreground">
            Je hebt {enrichedCount} verrijkte record
            {enrichedCount === 1 ? "" : "s"} (vertaling + topic + tags) in
            de cache voor deze taal. Doorgaan wist de records, je zoek-
            sessie én deze verrijkingen onomkeerbaar.
          </p>
        </header>

        <footer className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md border border-border bg-background px-3 py-1.5 text-xs hover:bg-muted"
          >
            Annuleren
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="rounded-md bg-destructive px-3 py-1.5 text-xs font-medium text-destructive-foreground hover:bg-destructive/90"
          >
            Doorgaan
          </button>
        </footer>
      </div>
    </dialog>
  );
}
