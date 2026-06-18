"use client";

import { useEffect, useRef } from "react";

type DeleteConfirmDialogProps = {
  open: boolean;
  count: number;
  showAudioOption: boolean;
  deleteAudio: boolean;
  onDeleteAudioChange: (v: boolean) => void;
  onCancel: () => void;
  onConfirm: () => void;
  deleting: boolean;
};

export function DeleteConfirmDialog({
  open,
  count,
  showAudioOption,
  deleteAudio,
  onDeleteAudioChange,
  onCancel,
  onConfirm,
  deleting,
}: DeleteConfirmDialogProps) {
  const dialogRef = useRef<HTMLDialogElement | null>(null);

  useEffect(() => {
    const node = dialogRef.current;
    if (!node) return;
    if (open && !node.open) node.showModal();
    else if (!open && node.open) node.close();
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
            {count} oefening{count === 1 ? "" : "en"} verwijderen?
          </h2>
          <p className="text-xs text-muted-foreground">
            Dit kan niet ongedaan worden gemaakt.
          </p>
        </header>

        {showAudioOption && (
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            <input
              type="checkbox"
              checked={deleteAudio}
              onChange={(e) => onDeleteAudioChange(e.target.checked)}
              className="h-4 w-4 rounded border-input"
            />
            Verwijder ook audio uit de Supabase-bucket
          </label>
        )}

        <footer className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={deleting}
            className="rounded-md border border-border bg-background px-3 py-1.5 text-xs hover:bg-muted disabled:opacity-50"
          >
            Annuleren
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={deleting}
            className="rounded-md bg-destructive px-3 py-1.5 text-xs font-medium text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50"
          >
            {deleting ? "Verwijderen..." : "Verwijderen"}
          </button>
        </footer>
      </div>
    </dialog>
  );
}
