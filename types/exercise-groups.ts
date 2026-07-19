/**
 * Types voor user-facing oefeningengroepen (leerplan + community).
 */

import type {
  ExerciseGroupSnapshot,
  ExerciseGroupSubmissionRow,
  GroupSubmissionStatus,
} from "@/types/exercise-group-submission";

/** Laatste community-aanbiedstatus van een persoonlijke groep (geen historie). */
export type GroupOfferState =
  | "available"
  | "pending"
  | "approved"
  | "rejected"
  | "empty";

export type ExerciseGroupListItem = {
  id: string;
  name: string;
  exerciseCount: number;
  /** Alleen relevant voor personal: actief in oefenen/SRS via topic-prefs. */
  isActive?: boolean;
  /** Alleen relevant voor community-corpus: al overgenomen in leerplan. */
  alreadyCopied?: boolean;
  /** ISO-timestamp van de personal kopie; null als niet overgenomen. */
  copiedAt?: string | null;
  /** Geaggregeerde tags van lid-oefeningen (voor zoeken op Overnemen). */
  tagText?: string;
  /** Community: laatste aanbiedstatus (of empty/available). */
  offerState?: GroupOfferState;
  /** ISO-timestamp van die laatste status; null als nooit aangeboden. */
  offerStatusAt?: string | null;
  /** Community: afwijsreden van de laatste submission (alleen bij rejected). */
  rejectReason?: string | null;
  /**
   * Personal: bron-community-groep; null = zelf gemaakt (of legacy zonder link).
   */
  sourceGroupId?: string | null;
  /**
   * Personal: minstens één lid-oefening handmatig aangepast (tekst/tags).
   */
  isEdited?: boolean;
  /**
   * Personal: minstens één lid-oefening heeft Tatoeba-audio (`audio_path`).
   */
  hasAudio?: boolean;
};

export type ExerciseGroupsDeleteSuccess = {
  ok: true;
};

export type ExerciseGroupMember = {
  id: string;
  source_text: string;
  target_text: string;
  tags: string;
  topic: string | null;
};

export type ExerciseGroupDetail = {
  id: string;
  name: string;
  exerciseCount: number;
  alreadyCopied: boolean;
  /** ISO-timestamp van de personal kopie; null als niet overgenomen. */
  copiedAt?: string | null;
  members: ExerciseGroupMember[];
  offerState?: GroupOfferState;
};

export type ExerciseGroupsListSuccess = {
  ok: true;
  groups: ExerciseGroupListItem[];
};

export type ExerciseGroupDetailSuccess = {
  ok: true;
  group: ExerciseGroupDetail;
};

export type ExerciseGroupCopySuccess = {
  ok: true;
  personalGroupId: string;
  name: string;
  exerciseCount: number;
};

export type ExerciseGroupBulkCopySuccess = {
  ok: true;
  copied: number;
  skipped: number;
  errors: string[];
};

export type ExerciseGroupsFailure = {
  ok: false;
  error: string;
  code?: "NAME_CONFLICT";
  suggestedName?: string;
};

export type ExerciseGroupSubmitSuccess = {
  ok: true;
  submissionId: string;
  status: "pending";
};

export type MyGroupSubmissionListItem = {
  id: string;
  source_group_id: string;
  status: GroupSubmissionStatus;
  reject_reason: string | null;
  created_at: string;
  updated_at: string;
  reviewed_at: string | null;
  /** Snapshot-naam (losgekoppeld van personal). */
  name: string;
  exerciseCount: number;
};

export type MyGroupSubmissionsListSuccess = {
  ok: true;
  rows: MyGroupSubmissionListItem[];
};

export type MyGroupSubmissionDetailSuccess = {
  ok: true;
  row: Pick<
    ExerciseGroupSubmissionRow,
    | "id"
    | "source_group_id"
    | "status"
    | "reject_reason"
    | "created_at"
    | "updated_at"
    | "reviewed_at"
    | "resulting_group_id"
  > & {
    snapshot: ExerciseGroupSnapshot;
  };
};
