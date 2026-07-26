"use client";

import { useEffect, useRef, type ReactNode } from "react";

import type { ExerciseGroupMember } from "@/types/exercise-groups";

type LeerplanGroupModalProps = {
  open: boolean;
  name: string | null;
  members: ExerciseGroupMember[];
  loading: boolean;
  busy: boolean;
  /** true = community-modal met copy-actie; false = alleen bekijken */
  showCopyAction: boolean;
  alreadyCopied: boolean;
  error: string | null;
  onClose: () => void;
  onCopy: () => void;
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
 * Modal met lid-oefeningen; optioneel hele groep naar personal kopiëren.
 */
export function LeerplanGroupModal({
  open,
  name,
  members,
  loading,
  busy,
  showCopyAction,
  alreadyCopied,
  error,
  onClose,
  onCopy,
}: LeerplanGroupModalProps) {
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

  let footer: ReactNode = null;
  if (showCopyAction) {
    footer = (
      <footer className="border-border flex flex-wrap items-center justify-end gap-2 border-t px-5 py-3">
        {alreadyCopied ? (
          <p className="text-muted-foreground mr-auto text-sm">
            Al in je leerplan — opnieuw toevoegen vraagt om een andere naam.
          </p>
        ) : null}
        <button
          type="button"
          disabled={busy || loading || members.length === 0}
          onClick={onCopy}
          className="bg-accent text-accent-foreground hover:bg-accent/90 inline-flex min-h-10 items-center rounded-md px-4 text-sm font-medium transition-colors disabled:opacity-50"
        >
          {busy
            ? "Bezig…"
            : alreadyCopied
              ? "Opnieuw toevoegen…"
              : "Toevoegen aan mijn leerplan"}
        </button>
      </footer>
    );
  }

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      className="border-border bg-card text-card-foreground backdrop:bg-foreground/40 fixed inset-0 m-auto h-fit max-h-[85vh] w-[min(720px,90vw)] rounded-lg border p-0"
    >
      <div className="flex h-full max-h-[85vh] flex-col">
        <header className="border-border relative space-y-1 border-b px-5 py-3 pr-12">
          <h2 className="text-base font-semibold">{name}</h2>
          <p className="text-muted-foreground text-xs">
            {loading
              ? "Laden…"
              : `${members.length} oefening${members.length === 1 ? "" : "en"} in dit topic`}
          </p>
          <button
            type="button"
            aria-label="Sluiten"
            disabled={busy}
            onClick={onClose}
            className="text-muted-foreground hover:bg-muted hover:text-foreground absolute top-3 right-3 inline-flex size-8 items-center justify-center rounded-md disabled:opacity-50"
          >
            <CrossIcon />
          </button>
        </header>

        <div className="flex-1 space-y-3 overflow-auto px-5 py-3">
          {error ? (
            <p className="border-destructive/40 bg-destructive/10 text-destructive rounded-md border px-3 py-2 text-sm">
              {error}
            </p>
          ) : null}

          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="border-border bg-muted/40 h-16 animate-pulse rounded-md border"
                />
              ))}
            </div>
          ) : members.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              Geen oefeningen in dit topic.
            </p>
          ) : (
            members.map((ex) => (
              <div
                key={ex.id}
                className="border-border/60 space-y-1 rounded-md border px-3 py-2"
              >
                <p className="text-foreground text-sm font-medium">
                  {ex.source_text}
                </p>
                <p className="text-muted-foreground text-sm">
                  {ex.target_text}
                </p>
                {ex.tags?.trim() ? (
                  <p className="text-muted-foreground text-[11px]">
                    Tags: {ex.tags}
                  </p>
                ) : null}
              </div>
            ))
          )}
        </div>

        {footer}
      </div>
    </dialog>
  );
}
