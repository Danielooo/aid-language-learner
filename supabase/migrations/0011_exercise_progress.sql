-- Spaced repetition voortgang per user/oefening (SM-2 metadata).

create table if not exists public.exercise_progress (
  user_id          uuid        not null references auth.users(id) on delete cascade,
  exercise_id      uuid        not null references public.exercises(id) on delete cascade,
  ease_factor      numeric(4,2) not null default 2.50,
  interval_days    integer     not null default 0,
  repetition_count integer     not null default 0,
  next_review_at   timestamptz not null default now(),
  last_reviewed_at timestamptz,
  is_suspended     boolean     not null default false,
  primary key (user_id, exercise_id)
);

create index if not exists exercise_progress_user_due_idx
  on public.exercise_progress (user_id, next_review_at)
  where not is_suspended;

create index if not exists exercise_progress_exercise_id_idx
  on public.exercise_progress (exercise_id);

alter table public.exercise_progress enable row level security;

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
