-- Track van welke community-groep een personal kopie afkomstig is.
-- Gebruikt voor "al overgenomen" + timestamp op Community → Overnemen.

alter table public.exercise_groups
  add column if not exists source_group_id uuid
    references public.exercise_groups (id) on delete set null;

comment on column public.exercise_groups.source_group_id is
  'Alleen personal: id van de community-groep waaruit gekopieerd is; null = zelf gemaakt of legacy.';

-- Eén personal copy per user per bron-groep.
create unique index if not exists exercise_groups_owner_source_uidx
  on public.exercise_groups (owner_id, source_group_id)
  where owner_id is not null and source_group_id is not null;

create index if not exists exercise_groups_source_group_id_idx
  on public.exercise_groups (source_group_id)
  where source_group_id is not null;
