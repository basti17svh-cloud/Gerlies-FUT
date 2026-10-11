-- V21.109: A per-user cloud backup, not an authoritative wallet for real-money transactions.
-- Applied to the connected Footera Supabase project on 2026-10-11.
create table if not exists public.footera_cloud_saves (
  user_id uuid primary key references auth.users(id) on delete cascade,
  save_data jsonb not null,
  revision bigint not null default 1 check (revision > 0),
  saved_at timestamptz not null default now(),
  constraint footera_cloud_save_object check (
    jsonb_typeof(save_data) = 'object'
    and jsonb_typeof(save_data->'profile') = 'object'
    and jsonb_typeof(save_data->'club') = 'array'
    and jsonb_typeof(save_data->'squad') = 'array'
    and pg_column_size(save_data) <= 12582912
  )
);
alter table public.footera_cloud_saves enable row level security;
revoke all on table public.footera_cloud_saves from public, anon, authenticated;
grant select on table public.footera_cloud_saves to authenticated;
drop policy if exists footera_cloud_save_read_owner on public.footera_cloud_saves;
create policy footera_cloud_save_read_owner on public.footera_cloud_saves
 for select to authenticated using (
  user_id = (select auth.uid()) and coalesce((auth.jwt()->>'is_anonymous')::boolean,true) = false
 );
create or replace function public.footera_store_cloud_save(p_save jsonb, p_base_revision bigint)
returns bigint language plpgsql security definer set search_path = ''
as $$
declare v_user uuid := auth.uid();
declare v_revision bigint;
begin
 if v_user is null or coalesce((auth.jwt()->>'is_anonymous')::boolean,true) then
   raise exception 'Dauerhaftes Footera-Konto erforderlich' using errcode='42501';
 end if;
 if p_save is null or jsonb_typeof(p_save) <> 'object'
    or jsonb_typeof(p_save->'profile') <> 'object'
    or jsonb_typeof(p_save->'club') <> 'array'
    or jsonb_typeof(p_save->'squad') <> 'array'
    or pg_column_size(p_save)>12582912 then
    raise exception 'Ungültiger oder zu großer Footera-Spielstand';
 end if;
 if p_base_revision is null or p_base_revision < 0 then
    raise exception 'Fehlende Speicherversion';
 end if;
 insert into public.footera_cloud_saves (user_id, save_data, revision, saved_at)
 values (v_user,p_save,1,now())
 on conflict (user_id) do update
 set save_data=excluded.save_data,
     revision=public.footera_cloud_saves.revision+1,
     saved_at=now()
 where public.footera_cloud_saves.revision=p_base_revision
 returning revision into v_revision;
 if v_revision is null then
   raise exception 'Cloud-Spielstand wurde auf einem anderen Gerät geändert. Bitte neu laden.' using errcode='40001';
 end if;
 return v_revision;
end;
$$;
revoke all on function public.footera_store_cloud_save(jsonb,bigint) from public,anon,authenticated;
grant execute on function public.footera_store_cloud_save(jsonb,bigint) to authenticated;
