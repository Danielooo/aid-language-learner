-- Oefeningengroepen + group-level global submissions (copy-on-approve).
-- Vervangt per-oefening exercise_global_submissions.

-- 1. exercise_groups ----------------------------------------------------------

create table if not exists public.exercise_groups (
  id         uuid        primary key default gen_random_uuid(),
  name       text        not null,
  owner_id   uuid        references public.profiles (id) on delete cascade,
  is_active  boolean     not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint exercise_groups_name_nonempty
    check (char_length(trim(name)) > 0)
);

comment on table public.exercise_groups is
  'Oefeningengroep: owner_id null = global corpus; is_active soft-hide voor globals.';
comment on column public.exercise_groups.owner_id is
  'null = global; uuid = persoonlijke groep van die user.';
comment on column public.exercise_groups.is_active is
  'false = niet zichtbaar/oefenbaar voor users (admin soft-deactivate).';

create index if not exists exercise_groups_owner_id_idx
  on public.exercise_groups (owner_id);

create index if not exists exercise_groups_global_active_idx
  on public.exercise_groups (is_active)
  where owner_id is null;

create or replace function public.set_exercise_groups_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists exercise_groups_set_updated_at on public.exercise_groups;

create trigger exercise_groups_set_updated_at
  before update on public.exercise_groups
  for each row
  execute function public.set_exercise_groups_updated_at();

-- 2. exercises.group_id + backfill --------------------------------------------

alter table public.exercises
  add column if not exists group_id uuid
    references public.exercise_groups (id) on delete cascade;

-- Eén groep per (owner_id, genormaliseerde topic-naam)
insert into public.exercise_groups (name, owner_id, is_active)
select distinct
  coalesce(nullif(trim(e.topic), ''), 'ongegroepeerd') as name,
  e.owner_id,
  true
from public.exercises e
where e.group_id is null
  and not exists (
    select 1
    from public.exercise_groups g
    where g.owner_id is not distinct from e.owner_id
      and g.name = coalesce(nullif(trim(e.topic), ''), 'ongegroepeerd')
  );

update public.exercises e
set group_id = g.id
from public.exercise_groups g
where e.group_id is null
  and g.owner_id is not distinct from e.owner_id
  and g.name = coalesce(nullif(trim(e.topic), ''), 'ongegroepeerd');

alter table public.exercises
  alter column group_id set not null;

create index if not exists exercises_group_id_idx
  on public.exercises (group_id);

-- 3. exercise_group_submissions -----------------------------------------------

create table if not exists public.exercise_group_submissions (
  id                  uuid        primary key default gen_random_uuid(),
  source_group_id     uuid        not null
    references public.exercise_groups (id) on delete cascade,
  submitted_by        uuid        not null
    references public.profiles (id) on delete cascade,
  snapshot            jsonb       not null,
  status              text        not null default 'pending'
    check (status in ('pending', 'approved', 'rejected', 'withdrawn')),
  reject_reason       text,
  reviewed_by         uuid
    references public.profiles (id) on delete set null,
  reviewed_at         timestamptz,
  resulting_group_id  uuid
    references public.exercise_groups (id) on delete set null,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  constraint exercise_group_submissions_reject_reason_required
    check (
      status <> 'rejected'
      or (reject_reason is not null and char_length(trim(reject_reason)) > 0)
    ),
  constraint exercise_group_submissions_approved_has_result
    check (
      status <> 'approved'
      or resulting_group_id is not null
    )
);

comment on table public.exercise_group_submissions is
  'Snapshot + reviewstatus voor groep-aanbiedingen naar het global corpus (copy-on-approve).';

create index if not exists exercise_group_submissions_submitted_by_idx
  on public.exercise_group_submissions (submitted_by, created_at desc);

create index if not exists exercise_group_submissions_status_idx
  on public.exercise_group_submissions (status, created_at desc);

create index if not exists exercise_group_submissions_source_idx
  on public.exercise_group_submissions (source_group_id);

create unique index if not exists exercise_group_submissions_one_pending
  on public.exercise_group_submissions (source_group_id)
  where status = 'pending';

create unique index if not exists exercise_group_submissions_one_approved
  on public.exercise_group_submissions (source_group_id)
  where status = 'approved';

create or replace function public.prevent_group_resubmit_after_approved()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.status in ('pending', 'approved')
     and exists (
       select 1
       from public.exercise_group_submissions s
       where s.source_group_id = new.source_group_id
         and s.status = 'approved'
         and s.id is distinct from new.id
     )
  then
    raise exception 'Deze oefeningengroep is al goedgekeurd als global en kan niet opnieuw worden aangeboden.'
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

drop trigger if exists exercise_group_submissions_no_resubmit_after_approved
  on public.exercise_group_submissions;

create trigger exercise_group_submissions_no_resubmit_after_approved
  before insert or update of status, source_group_id
  on public.exercise_group_submissions
  for each row
  execute function public.prevent_group_resubmit_after_approved();

create or replace function public.set_exercise_group_submissions_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists exercise_group_submissions_set_updated_at
  on public.exercise_group_submissions;

create trigger exercise_group_submissions_set_updated_at
  before update on public.exercise_group_submissions
  for each row
  execute function public.set_exercise_group_submissions_updated_at();

-- 4. RLS exercise_groups ------------------------------------------------------

alter table public.exercise_groups enable row level security;

drop policy if exists "exercise_groups_select_own_or_active_global"
  on public.exercise_groups;
drop policy if exists "exercise_groups_insert_own"
  on public.exercise_groups;
drop policy if exists "exercise_groups_update_own"
  on public.exercise_groups;
drop policy if exists "exercise_groups_delete_own"
  on public.exercise_groups;

create policy "exercise_groups_select_own_or_active_global"
  on public.exercise_groups for select
  to authenticated
  using (
    owner_id = auth.uid()
    or (owner_id is null and is_active = true)
  );

create policy "exercise_groups_insert_own"
  on public.exercise_groups for insert
  to authenticated
  with check (owner_id = auth.uid());

create policy "exercise_groups_update_own"
  on public.exercise_groups for update
  to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create policy "exercise_groups_delete_own"
  on public.exercise_groups for delete
  to authenticated
  using (owner_id = auth.uid());

-- 5. RLS exercise_group_submissions -------------------------------------------

alter table public.exercise_group_submissions enable row level security;

drop policy if exists "exercise_group_submissions_select_own"
  on public.exercise_group_submissions;
drop policy if exists "exercise_group_submissions_insert_own"
  on public.exercise_group_submissions;
drop policy if exists "exercise_group_submissions_update_withdraw_own"
  on public.exercise_group_submissions;

create policy "exercise_group_submissions_select_own"
  on public.exercise_group_submissions for select
  to authenticated
  using (submitted_by = auth.uid());

create policy "exercise_group_submissions_insert_own"
  on public.exercise_group_submissions for insert
  to authenticated
  with check (
    submitted_by = auth.uid()
    and status = 'pending'
    and reviewed_by is null
    and reviewed_at is null
    and resulting_group_id is null
    and reject_reason is null
  );

create policy "exercise_group_submissions_update_withdraw_own"
  on public.exercise_group_submissions for update
  to authenticated
  using (submitted_by = auth.uid() and status = 'pending')
  with check (submitted_by = auth.uid() and status = 'withdrawn');

-- 6. exercises SELECT: hide inactive global groups ----------------------------

drop policy if exists "exercises_select_seed_or_own" on public.exercises;

create policy "exercises_select_own_or_active_global"
  on public.exercises for select
  to authenticated
  using (
    owner_id = auth.uid()
    or (
      owner_id is null
      and exists (
        select 1
        from public.exercise_groups g
        where g.id = exercises.group_id
          and g.owner_id is null
          and g.is_active = true
      )
    )
  );

-- 7. Drop per-oefening submissions --------------------------------------------

drop trigger if exists exercise_global_submissions_no_resubmit_after_approved
  on public.exercise_global_submissions;
drop trigger if exists exercise_global_submissions_set_updated_at
  on public.exercise_global_submissions;

drop function if exists public.prevent_resubmit_after_approved();
drop function if exists public.set_exercise_global_submissions_updated_at();

drop table if exists public.exercise_global_submissions;
