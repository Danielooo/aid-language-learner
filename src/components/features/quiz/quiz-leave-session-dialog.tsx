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
      className="border-border bg-card text-card-foreground backdrop:bg-foreground/40 fixed inset-0 m-auto h-fit w-[min(28rem,90vw)] rounded-lg border p-0"
    >
      <div className="space-y-4 p-5">
        <header className="space-y-1 text-center">
          <h2 className="text-base font-semibold">Sessie nog niet klaar</h2>
          <p className="text-muted-foreground text-sm">
            Je bent nog bezig. Beoordeelde oefeningen blijven bewaard; open
            oefeningen komen later terug of starten opnieuw.
          </p>
        </header>
        <footer className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={onLeave}
            className="border-border text-foreground hover:bg-muted inline-flex h-9 items-center gap-2 rounded-md border px-3 text-sm"
          >
            Toch verlaten
            <kbd className="border-border bg-background text-muted-foreground rounded border px-1.5 py-0.5 font-mono text-[10px]">
              Esc
            </kbd>
          </button>
          <button
            type="button"
            onClick={onStay}
            className="bg-accent text-accent-foreground hover:bg-accent/90 inline-flex h-9 items-center gap-2 rounded-md px-3 text-sm font-medium"
          >
            Blijven oefenen
          </button>
        </footer>
      </div>
    </dialog>
  );
}
