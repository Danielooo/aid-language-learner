"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

import type {
  ExerciseGroupSnapshot,
  GroupSubmissionStatus,
} from "@/types/exercise-group-submission";

type AdminReviewGroupModalProps = {
  open: boolean;
  snapshot: ExerciseGroupSnapshot | null;
  tab: GroupSubmissionStatus;
  busy: boolean;
  onClose: () => void;
  onApprove: () => void;
  onReject: (reason: string) => void;
  onReopen: () => void;
};

function CheckIcon() {
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
      <path d="M3.5 8.5 6.5 11.5 12.5 4.5" />
    </svg>
  );
}

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

function InboxIcon() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 16 16"
      className="size-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M2.5 8.5 4 4.5h8l1.5 4v3.5a1 1 0 0 1-1 1h-10a1 1 0 0 1-1-1V8.5Z" />
      <path d="M2.5 8.5h3l1 1.5h3l1-1.5h3" />
    </svg>
  );
}

const iconBtnClass =
  "group relative inline-flex size-9 shrink-0 items-center justify-center rounded-md disabled:opacity-50";

function ActionIconButton({
  label,
  ariaLabel,
  disabled,
  onClick,
  className,
  children,
}: {
  label: string;
  ariaLabel?: string;
  disabled: boolean;
  onClick: () => void;
  className: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={ariaLabel ?? label}
      disabled={disabled}
      onClick={onClick}
      className={`${iconBtnClass} ${className}`}
    >
      <span
        className="pointer-events-none absolute -top-6 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-foreground px-1.5 py-0.5 text-[10px] font-medium text-background opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
        aria-hidden
      >
        {label}
      </span>
      {children}
    </button>
  );
}

/**
 * Detailmodal: lid-oefeningen + statusacties per review-tab.
 */
export function AdminReviewGroupModal({
  open,
  snapshot,
  tab,
  busy,
  onClose,
  onApprove,
  onReject,
  onReopen,
}: AdminReviewGroupModalProps) {
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  useEffect(() => {
    const node = dialogRef.current;
    if (!node) return;
    if (open && !node.open) {
      node.showModal();
    } else if (!open && node.open) {
      node.close();
    }
  }, [open]);

  useEffect(() => {
    if (!open) setRejectReason("");
  }, [open]);

  if (!snapshot) return null;

  const exercises = Array.isArray(snapshot.exercises) ? snapshot.exercises : [];

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      className="fixed inset-0 m-auto h-fit max-h-[85vh] w-[min(720px,90vw)] rounded-lg border border-border bg-card p-0 text-card-foreground backdrop:bg-foreground/40"
    >
      <div className="flex h-full max-h-[85vh] flex-col">
        <header className="relative space-y-1 border-b border-border px-5 py-3 pr-12">
          <h2 className="text-base font-semibold">{snapshot.name}</h2>
          <p className="text-xs text-muted-foreground">
            {exercises.length} oefening{exercises.length === 1 ? "" : "en"} in
            deze groep
          </p>
          <button
            type="button"
            aria-label="Sluiten"
            disabled={busy}
            onClick={onClose}
            className="absolute right-3 top-3 inline-flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-50"
          >
            <CrossIcon />
          </button>
        </header>

        <div className="flex-1 space-y-3 overflow-auto px-5 py-3">
          {exercises.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Geen oefeningen in de snapshot.
            </p>
          ) : (
            exercises.map((ex, index) => (
              <div
                key={`${ex.source_text}-${index}`}
                className="space-y-1 rounded-md border border-border/60 px-3 py-2"
              >
                <p className="text-sm font-medium text-foreground">
                  {ex.source_text}
                </p>
                <p className="text-sm text-muted-foreground">{ex.target_text}</p>
                {ex.tags?.trim() ? (
                  <p className="text-[11px] text-muted-foreground">
                    Tags: {ex.tags}
                  </p>
                ) : null}
              </div>
            ))
          )}
        </div>

        <footer className="space-y-3 border-t border-border px-5 pt-8 pb-3">
          {(tab === "pending" || tab === "approved") && (
            <div className="flex min-w-0 flex-col gap-1">
              <label
                htmlFor="modal-reject-reason"
                className="text-[11px] text-muted-foreground"
              >
                Afkeurreden (optioneel)
              </label>
              <input
                id="modal-reject-reason"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="h-9 rounded-md border border-border bg-background px-2 text-sm"
                placeholder="Bijv. onduidelijke vertalingen"
                disabled={busy}
              />
            </div>
          )}

          <div className="flex flex-wrap items-center justify-end gap-2">
            {tab === "pending" && (
              <>
                <ActionIconButton
                  label="Goedkeuren"
                  disabled={busy}
                  onClick={onApprove}
                  className="bg-accent text-accent-foreground hover:bg-accent/90"
                >
                  <CheckIcon />
                </ActionIconButton>
                <ActionIconButton
                  label="Afkeuren"
                  ariaLabel={
                    rejectReason.trim()
                      ? "Afkeuren"
                      : "Afkeuren zonder reden"
                  }
                  disabled={busy}
                  onClick={() => onReject(rejectReason)}
                  className="bg-destructive/90 text-destructive-foreground hover:bg-destructive"
                >
                  <CrossIcon />
                </ActionIconButton>
              </>
            )}

            {tab === "approved" && (
              <>
                <ActionIconButton
                  label="Pending"
                  disabled={busy}
                  onClick={onReopen}
                  className="bg-amber-500 text-white hover:bg-amber-500/90"
                >
                  <InboxIcon />
                </ActionIconButton>
                <ActionIconButton
                  label="Afkeuren"
                  disabled={busy}
                  onClick={() => onReject(rejectReason)}
                  className="bg-destructive/90 text-destructive-foreground hover:bg-destructive"
                >
                  <CrossIcon />
                </ActionIconButton>
              </>
            )}

            {tab === "rejected" && (
              <>
                <ActionIconButton
                  label="Pending"
                  disabled={busy}
                  onClick={onReopen}
                  className="bg-amber-500 text-white hover:bg-amber-500/90"
                >
                  <InboxIcon />
                </ActionIconButton>
                <ActionIconButton
                  label="Goedkeuren"
                  disabled={busy}
                  onClick={onApprove}
                  className="bg-accent text-accent-foreground hover:bg-accent/90"
                >
                  <CheckIcon />
                </ActionIconButton>
              </>
            )}
          </div>
        </footer>
      </div>
    </dialog>
  );
}
