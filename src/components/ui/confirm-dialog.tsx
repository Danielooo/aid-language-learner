"use client";

import { useEffect, useRef } from "react";

import type { ReactNode } from "react";

type ConfirmDialogProps = {
  open: boolean;
  title: string;
  description: ReactNode;
  confirmLabel: string;
  pendingLabel?: string;
  pending?: boolean;
  tone?: "danger" | "default";
  onCancel: () => void;
  onConfirm: () => void;
};

/**
 * Herbruikbare bevestigingsmodal (native `<dialog>` + showModal).
 * Zelfde look als de feature delete-dialogs.
 */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  pendingLabel,
  pending = false,
  tone = "default",
  onCancel,
  onConfirm,
}: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLDialogElement | null>(null);

  useEffect(() => {
    const node = dialogRef.current;
    if (!node) return;
    if (open && !node.open) node.showModal();
    else if (!open && node.open) node.close();
  }, [open]);

  const confirmClass =
    tone === "danger"
      ? "rounded-md bg-destructive px-3 py-1.5 text-xs font-medium text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50"
      : "rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-accent-foreground hover:bg-accent/90 disabled:opacity-50";

  return (
    <dialog
      ref={dialogRef}
      onClose={onCancel}
      className="border-border bg-card text-card-foreground backdrop:bg-foreground/40 fixed inset-0 m-auto h-fit w-[min(480px,90vw)] rounded-lg border p-0"
    >
      <div className="space-y-4 p-5">
        <header className="space-y-1">
          <h2 className="text-base font-semibold">{title}</h2>
          <div className="text-muted-foreground text-sm">{description}</div>
        </header>

        <footer className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={pending}
            className="border-border bg-background hover:bg-muted rounded-md border px-3 py-1.5 text-xs disabled:opacity-50"
          >
            Annuleren
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={pending}
            className={confirmClass}
          >
            {pending ? (pendingLabel ?? confirmLabel) : confirmLabel}
          </button>
        </footer>
      </div>
    </dialog>
  );
}
