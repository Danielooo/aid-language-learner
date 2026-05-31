-- Promoot de dev-tabellen naar productie-tabellen met auth + RLS.
-- Hernoemt `dev_exercises` → `exercises` en `dev_quiz_attempts` → `quiz_attempts`,
-- voegt `profiles` toe (1:1 met auth.users), introduceert eigenaarschap en
-- schakelt RLS in. Bestaande rijen blijven bewaard:
--   * `exercises.owner_id` blijft NULL → publiek/seed (zichtbaar voor iedereen).
--   * `quiz_attempts.user_id` is NULL na deze migration; de seed-script vult
--     dat voor de bestaande 62 rijen, daarna maakt 0005 de kolom NOT NULL.

-- 1. profiles + trigger ----------------------------------------------------

create table if not exists public.profiles (
  id         uuid        primary key references auth.users(id) on delete cascade,
  username   text        not null unique,
  created_at timestamptz not null default now()
);

-- Trigger maakt automatisch een profile aan bij elke nieuwe auth.users-rij.
-- SECURITY DEFINER omdat de trigger over RLS heen moet inserten; search_path
-- expliciet op public zodat een geknoeide search_path 'm niet kan misleiden.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  resolved_username text;
begin
  resolved_username := coalesce(
    nullif(new.raw_user_meta_data->>'username', ''),
    split_part(new.email, '@', 1)
  );

  insert into public.profiles (id, username)
  values (new.id, resolved_username)
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

-- 2. exercises (was dev_exercises) -----------------------------------------

alter table public.dev_exercises rename to exercises;

alter table public.exercises
  add column if not exists owner_id uuid references auth.users(id) on delete set null;

-- 3. quiz_attempts (was dev_quiz_attempts) ---------------------------------

alter table public.dev_quiz_attempts rename to quiz_attempts;

alter table public.quiz_attempts
  add column if not exists user_id uuid references auth.users(id) on delete cascade;

-- 4. indexen herzien -------------------------------------------------------
-- Oude index-namen opruimen (Postgres hernoemt indexen niet automatisch
-- mee bij `alter table rename`) en nieuwe indexen toevoegen voor RLS-paden.

drop index if exists public.dev_exercises_created_at_idx;
drop index if exists public.dev_quiz_attempts_created_at_idx;
drop index if exists public.dev_quiz_attempts_exercise_id_idx;

create index if not exists exercises_created_at_idx
  on public.exercises (created_at desc);

create index if not exists exercises_owner_id_idx
  on public.exercises (owner_id);

create index if not exists exercises_topic_idx
  on public.exercises (topic);

create index if not exists quiz_attempts_created_at_idx
  on public.quiz_attempts (created_at desc);

create index if not exists quiz_attempts_exercise_id_idx
  on public.quiz_attempts (exercise_id);

create index if not exists quiz_attempts_user_id_idx
  on public.quiz_attempts (user_id);

-- 5. RLS aan + policies ----------------------------------------------------

alter table public.profiles      enable row level security;
alter table public.exercises     enable row level security;
alter table public.quiz_attempts enable row level security;

-- Profiles: alle ingelogde users mogen profielen zien (om usernames in UI
-- te tonen). Wijzigen mag alleen je eigen profile.

create policy "profiles_select_authenticated"
  on public.profiles for select
  to authenticated
  using (true);

create policy "profiles_insert_own"
  on public.profiles for insert
  to authenticated
  with check (id = auth.uid());

create policy "profiles_update_own"
  on public.profiles for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- Exercises: seed-rijen (owner_id IS NULL) zijn publiek voor authenticated.
-- Schrijven (insert/update/delete) alleen op eigen rijen — seed kun je
-- daardoor niet wissen vanuit de app.

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

-- Quiz attempts: alle CRUD strikt eigen.

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
