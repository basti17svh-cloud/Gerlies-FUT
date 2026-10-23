-- Footera V21.211 – Einladungsbelohnung.
-- Wer über einen Einladungslink (?invite=CODE) neu startet, wird hier mit dem Einladenden verknüpft.
-- Hat der neue Spieler 3 Spiele gespielt, bekommen beide je ein 82+ Players Pack.
-- Nur neue Online-Konten (höchstens 2 Tage alt) zählen, frühestens 10 Minuten nach dem Start,
-- und ein Einladender bekommt höchstens 10 Belohnungen. Die Funktionen geben nur Belohnungs-IDs
-- zurück; das Pack legt das Spiel lokal mit diesen IDs ab (doppelt abholen ist so ausgeschlossen).
-- Rein additiv: neue Tabelle und neue Funktionen, keine bestehenden Daten werden geändert.

create table if not exists public.footera_referrals (
  invitee uuid primary key references auth.users(id) on delete cascade,
  inviter uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  qualified_at timestamptz,
  invitee_claimed_at timestamptz,
  inviter_claimed_at timestamptz,
  check (invitee <> inviter)
);
create index if not exists footera_referrals_inviter on public.footera_referrals(inviter);
alter table public.footera_referrals enable row level security;
revoke all on public.footera_referrals from public, anon, authenticated;
grant all on public.footera_referrals to service_role;

create or replace function public.footera_register_referral(p_code text)
returns text language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := auth.uid();
  v_code text := upper(regexp_replace(coalesce(p_code, ''), '[^A-Za-z0-9]', '', 'g'));
  v_inviter uuid;
  v_created timestamptz;
begin
  if v_user is null then raise exception 'Nicht angemeldet' using errcode = '42501'; end if;
  if v_code !~ '^[A-HJ-NP-Z2-9]{8}$' then return 'invalid'; end if;
  select user_id into v_inviter from public.footera_online_profiles where friend_code = v_code;
  if v_inviter is null then return 'invalid'; end if;
  if v_inviter = v_user then return 'own'; end if;
  if exists (select 1 from public.footera_referrals where invitee = v_user) then return 'known'; end if;
  select created_at into v_created from auth.users where id = v_user;
  if v_created is null or v_created < now() - interval '2 days' then return 'not_new'; end if;
  insert into public.footera_referrals(invitee, inviter) values (v_user, v_inviter)
  on conflict (invitee) do nothing;
  return 'registered';
end $$;

create or replace function public.footera_referral_progress(p_matches integer)
returns text language plpgsql security definer set search_path = '' as $$
declare v_user uuid := auth.uid(); r public.footera_referrals%rowtype;
begin
  if v_user is null then raise exception 'Nicht angemeldet' using errcode = '42501'; end if;
  select * into r from public.footera_referrals where invitee = v_user for update;
  if not found then return 'none'; end if;
  if r.qualified_at is not null then return 'qualified'; end if;
  if coalesce(p_matches, 0) < 3 or r.created_at > now() - interval '10 minutes' then return 'pending'; end if;
  update public.footera_referrals set qualified_at = now() where invitee = v_user;
  return 'qualified';
end $$;

-- Marks every reward that is due as claimed and returns them, plus the caller's invite stats.
create or replace function public.footera_claim_referral_rewards()
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := auth.uid();
  v_rewards jsonb := '[]'::jsonb;
  v_done integer;
  r record;
begin
  if v_user is null then raise exception 'Nicht angemeldet' using errcode = '42501'; end if;
  update public.footera_referrals set invitee_claimed_at = now()
  where invitee = v_user and qualified_at is not null and invitee_claimed_at is null;
  get diagnostics v_done = row_count;
  if v_done > 0 then
    v_rewards := v_rewards || jsonb_build_array(jsonb_build_object('id', 'referral-invitee-' || v_user::text, 'role', 'invitee'));
  end if;
  select count(*) into v_done from public.footera_referrals where inviter = v_user and inviter_claimed_at is not null;
  for r in
    select invitee from public.footera_referrals
    where inviter = v_user and qualified_at is not null and inviter_claimed_at is null
    order by qualified_at limit greatest(0, 10 - v_done)
    for update
  loop
    update public.footera_referrals set inviter_claimed_at = now() where invitee = r.invitee;
    v_rewards := v_rewards || jsonb_build_array(jsonb_build_object('id', 'referral-inviter-' || r.invitee::text, 'role', 'inviter'));
  end loop;
  return jsonb_build_object(
    'rewards', v_rewards,
    'invited', (select count(*) from public.footera_referrals where inviter = v_user),
    'qualified', (select count(*) from public.footera_referrals where inviter = v_user and qualified_at is not null),
    'invitedBy', exists (select 1 from public.footera_referrals where invitee = v_user),
    'ownQualified', exists (select 1 from public.footera_referrals where invitee = v_user and qualified_at is not null)
  );
end $$;

revoke all on function public.footera_register_referral(text), public.footera_referral_progress(integer),
  public.footera_claim_referral_rewards() from public, anon;
grant execute on function public.footera_register_referral(text), public.footera_referral_progress(integer),
  public.footera_claim_referral_rewards() to authenticated;
