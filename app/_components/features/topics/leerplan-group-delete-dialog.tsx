"use client";

import { useEffect, useRef } from "react";

type LeerplanGroupDeleteDialogProps = {
  open: boolean;
  groupName: string | null;
  exerciseCount: number;
  deleting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

/**
 * Bevestiging vóór hard-delete van een persoonlijke oefeningengroep.
 */
export function LeerplanGroupDeleteDialog({
  open,
  groupName,
  exerciseCount,
  deleting,
  onCancel,
  onConfirm,
}: LeerplanGroupDeleteDialogProps) {
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
          <h2 className="text-base font-semibold">Topic verwijderen?</h2>
          <p className="text-sm text-muted-foreground">
            {exerciseCount === 0 ? (
              <>
                {groupName ? (
                  <>
                    <span className="font-medium text-foreground">
                      “{groupName}”
                    </span>{" "}
                    heeft geen oefeningen.{" "}
                  </>
                ) : (
                  <>Dit topic heeft geen oefeningen. </>
                )}
                Verwijderen uit je leerplan?
              </>
            ) : (
              <>
                Weet je het zeker?{" "}
                {groupName ? (
                  <>
                    <span className="font-medium text-foreground">
                      “{groupName}”
                    </span>{" "}
                  </>
                ) : null}
                en{" "}
                {exerciseCount === 1
                  ? "1 oefening"
                  : `${exerciseCount} oefeningen`}{" "}
                verdwijnen permanent uit je leerplan.
              </>
            )}
          </p>
        </header>

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
            {deleting ? "Verwijderen…" : "Verwijderen"}
          </button>
        </footer>
      </div>
    </dialog>
  );
}
