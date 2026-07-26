"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";

export type SavedGroupMember = {
  key: string;
  source_text: string;
  target_text: string;
  tags: string;
};

type GeneratorSavedGroupModalProps = {
  open: boolean;
  name: string | null;
  members: SavedGroupMember[];
  onClose: () => void;
};

function CrossIcon() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 16 16"
      className="size-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4 4l8 8M12 4l-8 8" />
    </svg>
  );
}

/**
 * Bevestigingsmodal na Generator-opslag: toont de opgeslagen groep, zonder acties.
 */
export function GeneratorSavedGroupModal({
  open,
  name,
  members,
  onClose,
}: GeneratorSavedGroupModalProps) {
  const dialogRef = useRef<HTMLDialogElement | null>(null);

  useEffect(() => {
    const node = dialogRef.current;
    if (!node) return;
    if (open && !node.open) {
      node.showModal();
    } else if (!open && node.open) {
      node.close();
    }
  }, [open]);

  if (!open || !name) return null;

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      className="fixed inset-0 m-auto h-fit max-h-[85vh] w-[min(720px,90vw)] rounded-lg border border-border bg-card p-0 text-card-foreground backdrop:bg-foreground/40"
    >
      <div className="flex h-full max-h-[85vh] flex-col">
        <header className="relative space-y-1 border-b border-border px-5 py-3 pr-12">
          <h2 className="text-base font-semibold">{name}</h2>
          <p className="text-xs text-muted-foreground">
            {members.length} oefening{members.length === 1 ? "" : "en"}{" "}
            opgeslagen in dit topic
          </p>
          <button
            type="button"
            aria-label="Sluiten"
            onClick={onClose}
            className="absolute right-3 top-3 inline-flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <CrossIcon />
          </button>
        </header>

        <div className="flex-1 space-y-3 overflow-auto px-5 py-3">
          {members.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Geen oefeningen in dit topic.
            </p>
          ) : (
            members.map((ex) => (
              <div
                key={ex.key}
                className="space-y-1 rounded-md border border-border/60 px-3 py-2"
              >
                <p className="text-sm font-medium text-foreground">
                  {ex.source_text}
                </p>
                <p className="text-sm text-muted-foreground">{ex.target_text}</p>
                {ex.tags.trim() ? (
                  <p className="text-[11px] text-muted-foreground">
                    Tags: {ex.tags}
                  </p>
                ) : null}
              </div>
            ))
          )}
        </div>

        <footer className="flex flex-wrap items-center justify-end gap-3 border-t border-border px-5 py-3">
          <Link
            href="/leerplan"
            className="text-sm font-medium text-accent underline-offset-2 hover:underline"
          >
            Naar Leerplan
          </Link>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-border px-3 py-1.5 text-sm font-medium hover:bg-muted"
          >
            Sluiten
          </button>
        </footer>
      </div>
    </dialog>
  );
}
