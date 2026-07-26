"use client";

import { useEffect, useRef, type ReactNode } from "react";

import type { ExerciseMemberSnapshot } from "@/types/exercise-group-submission";
import type {
  ExerciseGroupMember,
  GroupOfferState,
} from "@/types/exercise-groups";

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
  /** Alleen bij rejected: inhoud gewijzigd t.o.v. afgekeurde snapshot. */
  changedSinceReject?: boolean;
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

export function membersFromLive(members: ExerciseGroupMember[]): MemberView[] {
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

function offerButtonLabel(
  state: GroupOfferState | undefined,
  busy: boolean,
  changedSinceReject: boolean,
) {
  if (busy) return "Bezig…";
  if (state === "pending") return "Al aangeboden (Pending)";
  if (state === "approved") return "Al goedgekeurd";
  if (state === "empty") return "Leeg topic";
  if (state === "rejected") {
    return changedSinceReject
      ? "Opnieuw aanbieden aan de community"
      : "Eerst wijzigen in Leerplan";
  }
  return "Aanbieden aan de community";
}

function canOfferWithState(
  state: GroupOfferState | undefined,
  changedSinceReject: boolean,
): boolean {
  if (state === "available") return true;
  if (state === "rejected") return changedSinceReject;
  return false;
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
  changedSinceReject = false,
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
    canOfferWithState(offerState, changedSinceReject) &&
    !busy &&
    !loading &&
    members.length > 0;

  const showRejectInfo =
    mode === "offer" &&
    (offerState === "rejected" || Boolean(rejectReason?.trim()));

  let footer: ReactNode = null;
  if (mode === "offer") {
    footer = (
      <footer className="border-border space-y-3 border-t px-5 py-3">
        {showRejectInfo ? (
          <div className="border-border bg-muted/40 rounded-md border px-3 py-2">
            <p className="text-foreground text-xs font-medium">
              Eerder afgekeurd
            </p>
            <p className="text-foreground mt-1 text-sm">
              {rejectReason?.trim()
                ? rejectReason.trim()
                : "Geen reden opgegeven."}
            </p>
            {offerState === "rejected" && !changedSinceReject ? (
              <p className="text-muted-foreground mt-2 text-xs">
                Pas dit topic aan in je Leerplan om opnieuw aan te bieden.
              </p>
            ) : null}
          </div>
        ) : null}
        <div className="flex flex-wrap items-center justify-end gap-2">
          <button
            type="button"
            disabled={!canOffer}
            onClick={onOffer}
            className="bg-accent text-accent-foreground hover:bg-accent/90 inline-flex min-h-10 items-center rounded-md px-4 text-sm font-medium transition-colors disabled:opacity-50"
          >
            {offerButtonLabel(offerState, busy, changedSinceReject)}
          </button>
        </div>
      </footer>
    );
  } else if (rejectReason?.trim()) {
    footer = (
      <footer className="border-border border-t px-5 py-3">
        <p className="text-muted-foreground text-xs">Afkeurreden</p>
        <p className="text-foreground text-sm">{rejectReason.trim()}</p>
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
              : mode === "snapshot"
                ? `${members.length} oefening${members.length === 1 ? "" : "en"} in de ingeleverde snapshot`
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
                key={ex.key}
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
