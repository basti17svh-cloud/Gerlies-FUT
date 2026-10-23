-- V21.234: guest progress survives registration in another browser.
-- In-app browsers (Snapchat, Instagram, TikTok) keep their own storage. The
-- email confirmation then opens in Safari/Chrome without the guest session.
-- 1. Guests may back up and read their OWN cloud save (same user id after the
--    upgrade, so the confirmed account restores it in any browser).
-- 2. A verified account may adopt the cloud save of a guest that requested
--    exactly this email address (anonymous user with pending email_change).
-- Run once in the Supabase SQL editor. No existing row is changed by running it.

drop policy if exists footera_cloud_save_read_owner on public.footera_cloud_saves;
create policy footera_cloud_save_read_owner on public.footera_cloud_saves
 for select to authenticated using (user_id = (select auth.uid()));

-- Same as V21.170, but guests are allowed. Player Picks and paid packs keep
-- their own permanent-account checks.
create or replace function public.footera_store_cloud_save(p_save jsonb,p_base_revision bigint)
returns bigint language plpgsql security definer set search_path=''
as $$
declare
 v_user uuid := auth.uid();
 v_revision bigint;
 v_previous jsonb;
begin
 if v_user is null then
   raise exception 'Footera-Anmeldung erforderlich' using errcode='42501';
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

create schema if not exists footera_private;

-- Server-side copy of every cloud club replaced by a guest takeover.
create table if not exists footera_private.replaced_cloud_saves (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  save_data jsonb not null,
  revision bigint not null,
  replaced_at timestamptz not null default now(),
  reason text not null
);
revoke all on table footera_private.replaced_cloud_saves from public,anon,authenticated;

-- The guest whose pending (unconfirmed) email change equals the caller's
-- confirmed email. Proving that mailbox is exactly what the guest's own
-- confirmation link would have proven.
create or replace function footera_private.guest_for_email()
returns uuid language sql stable security definer set search_path=''
as $$
 select g.id
 from auth.users me
 join auth.users g on g.is_anonymous
   and lower(g.email_change)=lower(me.email)
   and g.email_change_sent_at>now()-interval '30 days'
 join public.footera_cloud_saves s on s.user_id=g.id
 where me.id=auth.uid() and not me.is_anonymous and me.email is not null
   and me.email_confirmed_at is not null
   and coalesce((auth.jwt()->>'is_anonymous')::boolean,true)=false
 order by s.saved_at desc
 limit 1
$$;
revoke all on function footera_private.guest_for_email() from public,anon,authenticated;

create or replace function public.footera_guest_save_offer()
returns table(guest_id uuid,save_id text,club_name text,username text,cards integer,coins bigint,saved_at timestamptz)
language sql stable security definer set search_path=''
as $$
 select s.user_id,s.save_data#>>'{profile,saveId}',s.save_data#>>'{profile,clubName}',s.save_data#>>'{profile,username}',
   jsonb_array_length(s.save_data->'club'),
   case when jsonb_typeof(s.save_data->'coins')='number' then floor((s.save_data->>'coins')::numeric)::bigint else 0 end,
   s.saved_at
 from public.footera_cloud_saves s
 where s.user_id=footera_private.guest_for_email()
$$;
revoke all on function public.footera_guest_save_offer() from public,anon,authenticated;
grant execute on function public.footera_guest_save_offer() to authenticated;

-- Replaces the caller's cloud club with the guest club. Refused when the
-- caller's current cloud save holds server-confirmed rewards, or when the
-- caller's cloud changed since the client looked at it (p_base_revision).
create or replace function public.footera_claim_guest_save(p_guest uuid,p_base_revision bigint)
returns table(revision bigint,save_data jsonb)
language plpgsql security definer set search_path=''
as $$
#variable_conflict use_column
declare
 v_user uuid := auth.uid();
 v_guest uuid := footera_private.guest_for_email();
 v_save jsonb;
 v_previous public.footera_cloud_saves%rowtype;
 v_revision bigint;
begin
 if v_user is null or coalesce((auth.jwt()->>'is_anonymous')::boolean,true) then
   raise exception 'Dauerhaftes Footera-Konto erforderlich' using errcode='42501';
 end if;
 if v_guest is null or v_guest is distinct from p_guest then
   raise exception 'Kein passender Gast-Verein für diese E-Mail-Adresse gefunden.' using errcode='42501';
 end if;
 select s.save_data into v_save from public.footera_cloud_saves s where s.user_id=v_guest;
 select * into v_previous from public.footera_cloud_saves s where s.user_id=v_user for update;
 if coalesce(v_previous.revision,0)<>coalesce(p_base_revision,-1) then
   raise exception 'Cloud-Spielstand wurde während des Abgleichs geändert. Bitte erneut prüfen.' using errcode='40001';
 end if;
 if v_previous.user_id is not null and (
      coalesce(v_previous.save_data->'playerPickClaims','{}'::jsonb)<>'{}'::jsonb
   or coalesce(v_previous.save_data->'paidPackClaims','{}'::jsonb)<>'{}'::jsonb) then
   raise exception 'Der aktuelle Konto-Verein enthält bestätigte Belohnungen. Übernahme gesperrt.' using errcode='23514';
 end if;
 if v_previous.user_id is not null then
   insert into footera_private.replaced_cloud_saves(user_id,save_data,revision,reason)
   values (v_user,v_previous.save_data,v_previous.revision,'guest-claim:'||v_guest);
 end if;
 insert into public.footera_cloud_saves as c (user_id,save_data,revision,saved_at)
 values (v_user,v_save,1,now())
 on conflict (user_id) do update
 set save_data=excluded.save_data,revision=c.revision+1,saved_at=now()
 returning c.revision into v_revision;
 return query select v_revision,v_save;
end;
$$;
revoke all on function public.footera_claim_guest_save(uuid,bigint) from public,anon,authenticated;
grant execute on function public.footera_claim_guest_save(uuid,bigint) to authenticated;
