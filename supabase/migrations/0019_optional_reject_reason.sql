-- Optionele afkeurreden: admin mag rejected zonder reason.
alter table public.exercise_group_submissions
  drop constraint if exists exercise_group_submissions_reject_reason_required;
