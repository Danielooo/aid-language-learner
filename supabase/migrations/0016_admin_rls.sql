-- Admin-rol in RLS via JWT app_metadata.role.
-- Gewone users blijven own-row; admins mogen alle user-data beheren
-- (behalve Auth/wachtwoorden, die buiten deze policies blijven).

-- 1. Helper -----------------------------------------------------------------

create or replace function public.is_admin()
returns boolean
language sql
stable
set search_path = public
as $$
  select coalesce(
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin',
    false
  );
$$;

revoke all on function public.is_admin() from public;
revoke all on function public.is_admin() from anon;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.is_admin() to service_role;

-- 2. profiles ---------------------------------------------------------------
-- SELECT blijft open voor authenticated (usernames in UI).
-- UPDATE: eigen rij of admin.

drop policy if exists "profiles_update_own" on public.profiles;

create policy "profiles_update_own"
  on public.profiles for update
  to authenticated
  using (id = auth.uid() or public.is_admin())
  with check (id = auth.uid() or public.is_admin());

-- 3. exercises --------------------------------------------------------------
-- Admin mag alle oefeningen lezen/schrijven, inclusief seed (owner_id NULL).

drop policy if exists "exercises_select_seed_or_own" on public.exercises;
drop policy if exists "exercises_insert_own" on public.exercises;
drop policy if exists "exercises_update_own" on public.exercises;
drop policy if exists "exercises_delete_own" on public.exercises;

create policy "exercises_select_seed_or_own"
  on public.exercises for select
  to authenticated
  using (owner_id is null or owner_id = auth.uid() or public.is_admin());

create policy "exercises_insert_own"
  on public.exercises for insert
  to authenticated
  with check (owner_id = auth.uid() or public.is_admin());

create policy "exercises_update_own"
  on public.exercises for update
  to authenticated
  using (owner_id = auth.uid() or public.is_admin())
  with check (owner_id = auth.uid() or public.is_admin());

create policy "exercises_delete_own"
  on public.exercises for delete
  to authenticated
  using (owner_id = auth.uid() or public.is_admin());

-- 4. quiz_attempts ----------------------------------------------------------

drop policy if exists "quiz_attempts_select_own" on public.quiz_attempts;
drop policy if exists "quiz_attempts_insert_own" on public.quiz_attempts;
drop policy if exists "quiz_attempts_update_own" on public.quiz_attempts;
drop policy if exists "quiz_attempts_delete_own" on public.quiz_attempts;

create policy "quiz_attempts_select_own"
  on public.quiz_attempts for select
  to authenticated
  using (user_id = auth.uid() or public.is_admin());

create policy "quiz_attempts_insert_own"
  on public.quiz_attempts for insert
  to authenticated
  with check (user_id = auth.uid() or public.is_admin());

create policy "quiz_attempts_update_own"
  on public.quiz_attempts for update
  to authenticated
  using (user_id = auth.uid() or public.is_admin())
  with check (user_id = auth.uid() or public.is_admin());

create policy "quiz_attempts_delete_own"
  on public.quiz_attempts for delete
  to authenticated
  using (user_id = auth.uid() or public.is_admin());

-- 5. exercise_progress ------------------------------------------------------

drop policy if exists "exercise_progress_select_own" on public.exercise_progress;
drop policy if exists "exercise_progress_insert_own" on public.exercise_progress;
drop policy if exists "exercise_progress_update_own" on public.exercise_progress;
drop policy if exists "exercise_progress_delete_own" on public.exercise_progress;

create policy "exercise_progress_select_own"
  on public.exercise_progress for select
  to authenticated
  using (user_id = auth.uid() or public.is_admin());

create policy "exercise_progress_insert_own"
  on public.exercise_progress for insert
  to authenticated
  with check (user_id = auth.uid() or public.is_admin());

create policy "exercise_progress_update_own"
  on public.exercise_progress for update
  to authenticated
  using (user_id = auth.uid() or public.is_admin())
  with check (user_id = auth.uid() or public.is_admin());

create policy "exercise_progress_delete_own"
  on public.exercise_progress for delete
  to authenticated
  using (user_id = auth.uid() or public.is_admin());

-- 6. user_topic_preferences -------------------------------------------------

drop policy if exists "user_topic_preferences_select_own" on public.user_topic_preferences;
drop policy if exists "user_topic_preferences_insert_own" on public.user_topic_preferences;
drop policy if exists "user_topic_preferences_update_own" on public.user_topic_preferences;
drop policy if exists "user_topic_preferences_delete_own" on public.user_topic_preferences;

create policy "user_topic_preferences_select_own"
  on public.user_topic_preferences for select
  to authenticated
  using (user_id = auth.uid() or public.is_admin());

create policy "user_topic_preferences_insert_own"
  on public.user_topic_preferences for insert
  to authenticated
  with check (user_id = auth.uid() or public.is_admin());

create policy "user_topic_preferences_update_own"
  on public.user_topic_preferences for update
  to authenticated
  using (user_id = auth.uid() or public.is_admin())
  with check (user_id = auth.uid() or public.is_admin());

create policy "user_topic_preferences_delete_own"
  on public.user_topic_preferences for delete
  to authenticated
  using (user_id = auth.uid() or public.is_admin());
