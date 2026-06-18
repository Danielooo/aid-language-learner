"use client";

import { useEffect, useRef } from "react";

// Waarschuwingsmodal die opent zodra de user op "Sla N op" klikt
// terwijl één of meer geselecteerde rijen nog geen vertaling hebben.
// Default-actie is veilig: alleen de records mét vertaling worden
// opgeslagen; de records zonder vertaling slaan we over. De user
// bevestigt expliciet via "Doorgaan" of breekt af via "Annuleren".
//
// Gebruikt het native <dialog>-element (zelfde patroon als
// ConflictDialog) zodat we focus-trap, Esc-to-close en correcte
// modal-rendering gratis krijgen.

type NoTranslationWarningDialogProps = {
  open: boolean;
  // Hoeveel geselecteerde rijen géén vertaling hebben.
  skippedCount: number;
  // Hoeveel geselecteerde rijen WEL een vertaling hebben en dus
  // opgeslagen zouden worden bij "Doorgaan".
  validCount: number;
  onCancel: () => void;
  onConfirm: () => void;
};

export function NoTranslationWarningDialog({
  open,
  skippedCount,
  validCount,
  onCancel,
  onConfirm,
}: NoTranslationWarningDialogProps) {
  const dialogRef = useRef<HTMLDialogElement | null>(null);

  // Sync open/close met de native <dialog>-API. close() vóór
  // showModal() voorkomt "Failed to execute" als hetzelfde dialog
  // twee keer achter elkaar geopend wordt.
  useEffect(() => {
    const node = dialogRef.current;
    if (!node) return;
    if (open && !node.open) {
      node.showModal();
    } else if (!open && node.open) {
      node.close();
    }
  }, [open]);

  const canContinue = validCount > 0;

  return (
    <dialog
      ref={dialogRef}
      onClose={onCancel}
      className="fixed inset-0 m-auto h-fit w-[min(480px,90vw)] rounded-lg border border-border bg-card p-0 text-card-foreground backdrop:bg-foreground/40"
    >
      <div className="space-y-4 p-5">
        <header className="space-y-1">
          <h2 className="text-base font-semibold">
            Records zonder vertaling
          </h2>
          <p className="text-xs text-muted-foreground">
            {skippedCount} van de geselecteerde record
            {skippedCount === 1 ? "" : "s"}{" "}
            {skippedCount === 1 ? "heeft" : "hebben"} nog geen vertaling.{" "}
            {canContinue
              ? `Doorgaan slaat alleen de ${validCount} record${
                  validCount === 1 ? "" : "s"
                } mét vertaling op; de overige worden overgeslagen.`
              : "Er zijn geen records met vertaling om op te slaan — vertaal ze eerst."}
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
            disabled={!canContinue}
            className="rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-accent-foreground hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Doorgaan
          </button>
        </footer>
      </div>
    </dialog>
  );
}
