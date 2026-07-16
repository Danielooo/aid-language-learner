/**
 * Types voor user-facing oefeningengroepen (leerplan + community).
 */

import type {
  ExerciseGroupSnapshot,
  ExerciseGroupSubmissionRow,
  GroupSubmissionStatus,
} from "@/types/exercise-group-submission";

/** Of een persoonlijke groep aangeboden mag worden aan de community. */
export type GroupOfferState =
  | "available"
  | "pending"
  | "approved"
  | "empty";

export type ExerciseGroupListItem = {
  id: string;
  name: string;
  exerciseCount: number;
  /** Alleen relevant voor personal: actief in oefenen/SRS via topic-prefs. */
  isActive?: boolean;
  /** Alleen relevant voor community-corpus: al een eigen groep met dezelfde naam. */
  alreadyCopied?: boolean;
  /** Community: mag deze personal groep (opnieuw) aangeboden worden? */
  offerState?: GroupOfferState;
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

export type ExerciseGroupsFailure = {
  ok: false;
  error: string;
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
