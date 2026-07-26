"use client";

import { useEffect, useRef } from "react";

type QuizLeaveSessionDialogProps = {
  open: boolean;
  onStay: () => void;
  onLeave: () => void;
};

/**
 * Waarschuwing bij verlaten mid-sessie.
 * Esc (2e keer via parent) / “Toch verlaten” = weg;
 * “Blijven oefenen” = blijven (alleen knop).
 */
export function QuizLeaveSessionDialog({
  open,
  onStay,
  onLeave,
}: QuizLeaveSessionDialogProps) {
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
      // Esc wordt in de deck-handler afgehandeld (2e Esc = verlaten);
      // native dialog-cancel blokkeren om niet te dismissen.
      onCancel={(e) => e.preventDefault()}
      className="fixed inset-0 m-auto h-fit w-[min(28rem,90vw)] rounded-lg border border-border bg-card p-0 text-card-foreground backdrop:bg-foreground/40"
    >
      <div className="space-y-4 p-5">
        <header className="space-y-1 text-center">
          <h2 className="text-base font-semibold">Sessie nog niet klaar</h2>
          <p className="text-sm text-muted-foreground">
            Je bent nog bezig. Beoordeelde oefeningen blijven bewaard; open
            oefeningen komen later terug of starten opnieuw.
          </p>
        </header>
        <footer className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={onLeave}
            className="inline-flex h-9 items-center gap-2 rounded-md border border-border px-3 text-sm text-foreground hover:bg-muted"
          >
            Toch verlaten
            <kbd className="rounded border border-border bg-background px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
              Esc
            </kbd>
          </button>
          <button
            type="button"
            onClick={onStay}
            className="inline-flex h-9 items-center gap-2 rounded-md bg-accent px-3 text-sm font-medium text-accent-foreground hover:bg-accent/90"
          >
            Blijven oefenen
          </button>
        </footer>
      </div>
    </dialog>
  );
}
