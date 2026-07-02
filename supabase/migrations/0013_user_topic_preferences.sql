-- Per-user voorkeur welke topics actief zijn voor oefenen en SRS.

create table if not exists public.user_topic_preferences (
  user_id    uuid        not null references auth.users(id) on delete cascade,
  topic      text        not null,
  is_active  boolean     not null default false,
  updated_at timestamptz not null default now(),
  primary key (user_id, topic)
);

create index if not exists user_topic_preferences_user_active_idx
  on public.user_topic_preferences (user_id)
  where is_active;

alter table public.user_topic_preferences enable row level security;

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
