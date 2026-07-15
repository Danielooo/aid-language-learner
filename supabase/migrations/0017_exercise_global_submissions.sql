-- PR A: global-aanbiedingen (snapshot/pending) + AI-platformflags op profiles.
-- Trekt te ruime admin-peep uit 0016 terug i.l.t. docs/REQUIREMENTS-ROLES.md:
-- admin beheert globals via service-role APIs, geen inzage in andermans personal/progress.

-- 1. profiles: AI disable + daglimiet-counters --------------------------------

alter table public.profiles
  add column if not exists ai_disabled boolean not null default false,
  add column if not exists ai_requests_date date,
  add column if not exists ai_requests_count integer not null default 0;

alter table public.profiles
  drop constraint if exists profiles_ai_requests_count_nonnegative;

alter table public.profiles
  add constraint profiles_ai_requests_count_nonnegative
    check (ai_requests_count >= 0);

comment on column public.profiles.ai_disabled is
  'Als true mag deze user geen AI-generatie starten (admin-toggle).';
comment on column public.profiles.ai_requests_date is
  'UTC-datum van de huidige AI-request-teller.';
comment on column public.profiles.ai_requests_count is
  'Aantal AI-requests op ai_requests_date (limiet: 10/dag voor non-admin).';

-- 2. exercise_global_submissions ----------------------------------------------

create table if not exists public.exercise_global_submissions (
  id                   uuid        primary key default gen_random_uuid(),
  source_exercise_id   uuid        not null
    references public.exercises (id) on delete cascade,
  submitted_by         uuid        not null
    references public.profiles (id) on delete cascade,
  snapshot             jsonb       not null,
  status               text        not null default 'pending'
    check (status in ('pending', 'approved', 'rejected', 'withdrawn')),
  reject_reason        text,
  reviewed_by          uuid
    references public.profiles (id) on delete set null,
  reviewed_at          timestamptz,
  resulting_exercise_id uuid
    references public.exercises (id) on delete set null,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  constraint exercise_global_submissions_reject_reason_required
    check (
      status <> 'rejected'
      or (reject_reason is not null and char_length(trim(reject_reason)) > 0)
    ),
  constraint exercise_global_submissions_approved_has_result
    check (
      status <> 'approved'
      or resulting_exercise_id is not null
    )
);

comment on table public.exercise_global_submissions is
  'Snapshot + reviewstatus voor user-aanbiedingen naar het global corpus (copy-on-approve).';

create index if not exists exercise_global_submissions_submitted_by_idx
  on public.exercise_global_submissions (submitted_by, created_at desc);

create index if not exists exercise_global_submissions_status_idx
  on public.exercise_global_submissions (status, created_at desc);

create index if not exists exercise_global_submissions_source_idx
  on public.exercise_global_submissions (source_exercise_id);

-- Max één pending per source-oefening
create unique index if not exists exercise_global_submissions_one_pending
  on public.exercise_global_submissions (source_exercise_id)
  where status = 'pending';

-- Max één goedgekeurde global per source-oefening
create unique index if not exists exercise_global_submissions_one_approved
  on public.exercise_global_submissions (source_exercise_id)
  where status = 'approved';

-- Blokkeer nieuwe pending/approved inserts als source al approved is
create or replace function public.prevent_resubmit_after_approved()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.status in ('pending', 'approved')
     and exists (
       select 1
       from public.exercise_global_submissions s
       where s.source_exercise_id = new.source_exercise_id
         and s.status = 'approved'
         and s.id is distinct from new.id
     )
  then
    raise exception 'Deze oefening is al goedgekeurd als global en kan niet opnieuw worden aangeboden.'
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

drop trigger if exists exercise_global_submissions_no_resubmit_after_approved
  on public.exercise_global_submissions;

create trigger exercise_global_submissions_no_resubmit_after_approved
  before insert or update of status, source_exercise_id
  on public.exercise_global_submissions
  for each row
  execute function public.prevent_resubmit_after_approved();

create or replace function public.set_exercise_global_submissions_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists exercise_global_submissions_set_updated_at
  on public.exercise_global_submissions;

create trigger exercise_global_submissions_set_updated_at
  before update on public.exercise_global_submissions
  for each row
  execute function public.set_exercise_global_submissions_updated_at();

-- 3. RLS op submissions -------------------------------------------------------
-- Users: eigen rows lezen/aanmaken; update alleen pending → withdrawn.
-- Approve/reject/copy: service role (bypass), na assertAdmin in API.

alter table public.exercise_global_submissions enable row level security;

drop policy if exists "exercise_global_submissions_select_own"
  on public.exercise_global_submissions;
drop policy if exists "exercise_global_submissions_insert_own"
  on public.exercise_global_submissions;
drop policy if exists "exercise_global_submissions_update_withdraw_own"
  on public.exercise_global_submissions;

create policy "exercise_global_submissions_select_own"
  on public.exercise_global_submissions for select
  to authenticated
  using (submitted_by = auth.uid());

create policy "exercise_global_submissions_insert_own"
  on public.exercise_global_submissions for insert
  to authenticated
  with check (
    submitted_by = auth.uid()
    and status = 'pending'
    and reviewed_by is null
    and reviewed_at is null
    and resulting_exercise_id is null
    and reject_reason is null
  );

create policy "exercise_global_submissions_update_withdraw_own"
  on public.exercise_global_submissions for update
  to authenticated
  using (submitted_by = auth.uid() and status = 'pending')
  with check (submitted_by = auth.uid() and status = 'withdrawn');

-- 4. RLS terug naar own-row (geen admin-peep op personal/progress) -----------
-- Admin global writes blijven via service-role APIs + assertAdmin.

drop policy if exists "exercises_select_seed_or_own" on public.exercises;
drop policy if exists "exercises_insert_own" on public.exercises;
drop policy if exists "exercises_update_own" on public.exercises;
drop policy if exists "exercises_delete_own" on public.exercises;

create policy "exercises_select_seed_or_own"
  on public.exercises for select
  to authenticated
  using (owner_id is null or owner_id = auth.uid());

create policy "exercises_insert_own"
  on public.exercises for insert
  to authenticated
  with check (owner_id = auth.uid());

create policy "exercises_update_own"
  on public.exercises for update
  to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create policy "exercises_delete_own"
  on public.exercises for delete
  to authenticated
  using (owner_id = auth.uid());

drop policy if exists "quiz_attempts_select_own" on public.quiz_attempts;
drop policy if exists "quiz_attempts_insert_own" on public.quiz_attempts;
drop policy if exists "quiz_attempts_update_own" on public.quiz_attempts;
drop policy if exists "quiz_attempts_delete_own" on public.quiz_attempts;

create policy "quiz_attempts_select_own"
  on public.quiz_attempts for select
  to authenticated
  using (user_id = auth.uid());

create policy "quiz_attempts_insert_own"
  on public.quiz_attempts for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "quiz_attempts_update_own"
  on public.quiz_attempts for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "quiz_attempts_delete_own"
  on public.quiz_attempts for delete
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "exercise_progress_select_own" on public.exercise_progress;
drop policy if exists "exercise_progress_insert_own" on public.exercise_progress;
drop policy if exists "exercise_progress_update_own" on public.exercise_progress;
drop policy if exists "exercise_progress_delete_own" on public.exercise_progress;

create policy "exercise_progress_select_own"
  on public.exercise_progress for select
  to authenticated
  using (user_id = auth.uid());

create policy "exercise_progress_insert_own"
  on public.exercise_progress for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "exercise_progress_update_own"
  on public.exercise_progress for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "exercise_progress_delete_own"
  on public.exercise_progress for delete
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "user_topic_preferences_select_own" on public.user_topic_preferences;
drop policy if exists "user_topic_preferences_insert_own" on public.user_topic_preferences;
drop policy if exists "user_topic_preferences_update_own" on public.user_topic_preferences;
drop policy if exists "user_topic_preferences_delete_own" on public.user_topic_preferences;

create policy "user_topic_preferences_select_own"
  on public.user_topic_preferences for select
  to authenticated
  using (user_id = auth.uid());

create policy "user_topic_preferences_insert_own"
  on public.user_topic_preferences for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "user_topic_preferences_update_own"
  on public.user_topic_preferences for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "user_topic_preferences_delete_own"
  on public.user_topic_preferences for delete
  to authenticated
  using (user_id = auth.uid());

-- profiles: admin mag ai_disabled e.d. zetten (platformbeheer); users eigen rij.
-- (select blijft open voor authenticated — usernames in UI.)
