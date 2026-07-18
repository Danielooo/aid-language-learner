import type { GroupOfferState } from "@/types/exercise-groups";

/** Submission-rij die we gebruiken voor de laatste community-status. */
export type OfferSubmissionRow = {
  source_group_id: string;
  status: "pending" | "approved" | "rejected";
  created_at: string;
  updated_at: string;
  reviewed_at: string | null;
};

export type ResolvedGroupOffer = {
  offerState: GroupOfferState;
  offerStatusAt: string | null;
};

/**
 * Kiest per source_group_id de nieuwste submission (created_at DESC).
 * withdrawn wordt genegeerd door de caller (niet in de query).
 */
export function latestOfferByGroup(
  rows: OfferSubmissionRow[],
): Map<string, OfferSubmissionRow> {
  const byGroup = new Map<string, OfferSubmissionRow>();
  for (const row of rows) {
    const existing = byGroup.get(row.source_group_id);
    if (!existing || row.created_at > existing.created_at) {
      byGroup.set(row.source_group_id, row);
    }
  }
  return byGroup;
}

/** Timestamp van de huidige status: review-moment, anders created_at bij pending. */
export function offerStatusTimestamp(row: OfferSubmissionRow): string {
  if (row.status === "pending") return row.created_at;
  return row.reviewed_at ?? row.updated_at;
}

/**
 * Map laatste submission + leegte naar offerState / offerStatusAt.
 * Heeft een submission voorrang (ook bij 0 oefeningen), zodat Afgekeurd/Pending
 * niet verdwijnt na legen van de groep. `empty` alleen zonder submission.
 */
export function resolveGroupOfferState(
  exerciseCount: number,
  latest: OfferSubmissionRow | undefined,
): ResolvedGroupOffer {
  if (latest) {
    return {
      offerState: latest.status,
      offerStatusAt: offerStatusTimestamp(latest),
    };
  }
  if (exerciseCount === 0) {
    return { offerState: "empty", offerStatusAt: null };
  }
  return { offerState: "available", offerStatusAt: null };
}
