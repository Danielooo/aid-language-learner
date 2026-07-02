-- Metadata op quiz_attempts voor dashboard-analytics (retentie, oefentype, SRS-context).

alter table public.quiz_attempts
  add column if not exists selection_mode text,
  add column if not exists practice_type text,
  add column if not exists direction text,
  add column if not exists typing_mode text,
  add column if not exists is_mistake_review boolean not null default false,
  add column if not exists response_time_ms integer,
  add column if not exists interval_days_before integer,
  add column if not exists repetition_count_before integer,
  add column if not exists is_scheduled_review boolean not null default false;

create index if not exists quiz_attempts_user_created_at_idx
  on public.quiz_attempts (user_id, created_at desc);

create index if not exists quiz_attempts_user_scheduled_review_idx
  on public.quiz_attempts (user_id, is_scheduled_review, created_at desc)
  where is_scheduled_review = true;

create index if not exists quiz_attempts_user_practice_type_idx
  on public.quiz_attempts (user_id, practice_type, created_at desc)
  where practice_type is not null;
