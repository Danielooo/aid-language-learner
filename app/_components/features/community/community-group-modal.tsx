"use client";

import { useEffect, useRef, type ReactNode } from "react";

import type { ExerciseMemberSnapshot } from "@/types/exercise-group-submission";
import type { ExerciseGroupMember, GroupOfferState } from "@/types/exercise-groups";

type MemberView = {
  key: string;
  source_text: string;
  target_text: string;
  tags: string;
};

type CommunityGroupModalProps = {
  open: boolean;
  name: string | null;
  members: MemberView[];
  loading: boolean;
  busy: boolean;
  error: string | null;
  /** Live personal groep: aanbied-actie. Snapshot-tabs: alleen bekijken. */
  mode: "offer" | "snapshot";
  offerState?: GroupOfferState;
  rejectReason?: string | null;
  onClose: () => void;
  onOffer?: () => void;
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

export function membersFromLive(
  members: ExerciseGroupMember[],
): MemberView[] {
  return members.map((m) => ({
    key: m.id,
    source_text: m.source_text,
    target_text: m.target_text,
    tags: m.tags,
  }));
}

export function membersFromSnapshot(
  exercises: ExerciseMemberSnapshot[],
): MemberView[] {
  return exercises.map((ex, index) => ({
    key: `${ex.source_text}-${index}`,
    source_text: ex.source_text,
    target_text: ex.target_text,
    tags: ex.tags ?? "",
  }));
}

function offerButtonLabel(state: GroupOfferState | undefined, busy: boolean) {
  if (busy) return "Bezig…";
  if (state === "pending") return "Al aangeboden (pending)";
  if (state === "approved") return "Al goedgekeurd";
  if (state === "empty") return "Lege groep";
  return "Aanbieden aan de community";
}

/**
 * Modal voor Community: live aanbieden of snapshot bekijken.
 */
export function CommunityGroupModal({
  open,
  name,
  members,
  loading,
  busy,
  error,
  mode,
  offerState = "available",
  rejectReason,
  onClose,
  onOffer,
}: CommunityGroupModalProps) {
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

  const canOffer =
    mode === "offer" &&
    offerState === "available" &&
    !busy &&
    !loading &&
    members.length > 0;

  let footer: ReactNode = null;
  if (mode === "offer") {
    footer = (
      <footer className="flex flex-wrap items-center justify-end gap-2 border-t border-border px-5 py-3">
        {offerState === "pending" || offerState === "approved" ? (
          <p className="mr-auto text-sm text-muted-foreground">
            {offerState === "pending"
              ? "Deze oefeningengroep wacht op review."
              : "Deze oefeningengroep is al goedgekeurd voor de community."}
          </p>
        ) : null}
        <button
          type="button"
          disabled={!canOffer}
          onClick={onOffer}
          className="inline-flex min-h-10 items-center rounded-md bg-accent px-4 text-sm font-medium text-accent-foreground transition-colors hover:bg-accent/90 disabled:opacity-50"
        >
          {offerButtonLabel(offerState, busy)}
        </button>
      </footer>
    );
  } else if (rejectReason?.trim()) {
    footer = (
      <footer className="border-t border-border px-5 py-3">
        <p className="text-xs text-muted-foreground">Afkeurreden</p>
        <p className="text-sm text-foreground">{rejectReason.trim()}</p>
      </footer>
    );
  }

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
            {loading
              ? "Laden…"
              : mode === "snapshot"
                ? `${members.length} oefening${members.length === 1 ? "" : "en"} in de ingeleverde snapshot`
                : `${members.length} oefening${members.length === 1 ? "" : "en"} in deze oefeningengroep`}
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
          {error ? (
            <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          ) : null}

          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="h-16 animate-pulse rounded-md border border-border bg-muted/40"
                />
              ))}
            </div>
          ) : members.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Geen oefeningen in deze oefeningengroep.
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
                {ex.tags?.trim() ? (
                  <p className="text-[11px] text-muted-foreground">
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
