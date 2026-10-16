-- V21.170: preserve confirmed entitlements on every cloud save.
-- Locks the caller's own row, never a global table. Existing expected-revision
-- CAS remains mandatory, including through footera_private.choose_pick.
create or replace function public.footera_store_cloud_save(p_save jsonb,p_base_revision bigint)
returns bigint language plpgsql security definer set search_path=''
as $$
declare
 v_user uuid := auth.uid();
 v_revision bigint;
 v_previous jsonb;
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

 -- One owner row is locked; concurrent writes by the same owner serialize.
 -- Other owners are never blocked by this row lock.
 select save_data into v_previous
 from public.footera_cloud_saves where user_id=v_user for update;
 if v_previous is not null then
    if v_previous#>>'{profile,saveId}' is distinct from p_save#>>'{profile,saveId}' then
       raise exception 'Die Cloud enthält einen anderen Verein.' using errcode='42501';
    end if;
    if not (coalesce(p_save->'playerPickClaims','{}'::jsonb)
         @> coalesce(v_previous->'playerPickClaims','{}'::jsonb)) then
       raise exception 'Bestätigte Player Picks dürfen nicht verloren gehen.' using errcode='23514';
    end if;
    if not (coalesce(p_save->'paidPackClaims','{}'::jsonb)
         @> coalesce(v_previous->'paidPackClaims','{}'::jsonb)) then
       raise exception 'Bestätigte Pack-Käufe dürfen nicht verloren gehen.' using errcode='23514';
    end if;
 end if;

 insert into public.footera_cloud_saves (user_id,save_data,revision,saved_at)
 values (v_user,p_save,1,now())
 on conflict (user_id) do update
 set save_data=excluded.save_data,
     revision=public.footera_cloud_saves.revision+1,
     saved_at=now()
 where public.footera_cloud_saves.revision=p_base_revision
 returning revision into v_revision;
 if v_revision is null then
   raise exception 'Cloud-Spielstand wurde während des Abgleichs geändert. Bitte erneut prüfen.' using errcode='40001';
 end if;
 return v_revision;
end;
$$;
-- CREATE OR REPLACE preserves previously configured function grants.
