-- Footera V20.45 – Freundesnachrichten + Online-Matchday
-- Im verbundenen Footera-Supabase-Projekt bereits angewendet.

drop policy if exists footera_messages_sender_insert on public.footera_messages;
create policy footera_messages_sender_insert
 on public.footera_messages
 for insert
 to authenticated
 with check (
   (select auth.uid()) = sender_user
   and recipient_user <> (select auth.uid())
 );

create or replace function public.footera_send_message(p_recipient uuid,p_body text)
returns public.footera_messages
language plpgsql
security definer
set search_path = ''
as $$
declare
  m public.footera_messages;
  clean_body text := btrim(coalesce(p_body,''));
begin
  if auth.uid() is null then raise exception 'Nicht angemeldet'; end if;
  if p_recipient is null or p_recipient = auth.uid() then raise exception 'Ungültiger Empfänger'; end if;
  if char_length(clean_body) < 1 or char_length(clean_body) > 500 then
    raise exception 'Nachricht muss 1 bis 500 Zeichen enthalten';
  end if;
  if not exists (select 1 from public.footera_online_profiles p where p.user_id = p_recipient) then
    raise exception 'Empfänger nicht gefunden';
  end if;

  insert into public.footera_messages(sender_user,recipient_user,body)
  values (auth.uid(),p_recipient,clean_body)
  returning * into m;
  return m;
end
$$;

revoke all on function public.footera_send_message(uuid,text) from public, anon;
grant execute on function public.footera_send_message(uuid,text) to authenticated;

alter table public.footera_duels
  add column if not exists home_shots smallint not null default 0,
  add column if not exists away_shots smallint not null default 0,
  add column if not exists home_xg numeric(5,2) not null default 0,
  add column if not exists away_xg numeric(5,2) not null default 0,
  add column if not exists home_possession numeric(5,2) not null default 50;

create or replace function public.footera_tick(p_id uuid)
returns public.footera_duels
language plpgsql
security definer
set search_path = ''
as $$
declare
 d public.footera_duels;
 h numeric; a numeric; ph numeric; pa numeric; roll numeric; shot_roll numeric;
 shot_h numeric; shot_a numeric; poss numeric; shot_xg numeric;
 side text; scorer jsonb; idx integer; ev jsonb := '[]'::jsonb; next_minute integer;
begin
 select * into d from public.footera_duels where id=p_id for update;
 if d.id is null or auth.uid() is null or auth.uid() not in (d.home_user,d.away_user) then raise exception 'Duell nicht verfügbar'; end if;
 if d.status <> 'live' or d.clock_at > now() - interval '850 milliseconds' then return d; end if;

 next_minute := d.minute + 1;
 h := greatest(45,least(99,(d.home_profile->>'rating')::numeric + (d.home_profile->>'chem')::numeric*.12));
 a := greatest(45,least(99,(d.away_profile->>'rating')::numeric + (d.away_profile->>'chem')::numeric*.12));
 poss := greatest(32,least(68,50+(h-a)*.42
  + case d.home_tactic when 'attacking' then 2.5 when 'defensive' then -1.5 else 0 end
  - case d.away_tactic when 'attacking' then 2.5 when 'defensive' then -1.5 else 0 end));
 d.home_possession := round((d.home_possession*.82+poss*.18)::numeric,2);

 shot_h := .075*greatest(.7,least(1.35,h/a))*case d.home_tactic when 'attacking' then 1.18 when 'defensive' then .84 else 1 end;
 shot_a := .075*greatest(.7,least(1.35,a/h))*case d.away_tactic when 'attacking' then 1.18 when 'defensive' then .84 else 1 end;
 shot_roll := random();
 if shot_roll < shot_h or shot_roll < shot_h + shot_a then
  side := case when shot_roll < shot_h then 'home' else 'away' end;
  idx := case when random()<.7 then 8+floor(random()*3)::integer else 5+floor(random()*3)::integer end;
  scorer := (case when side='home' then d.home_lineup else d.away_lineup end) -> idx;
  shot_xg := round((.05+random()*.22)::numeric,2);
  if side='home' then d.home_shots:=d.home_shots+1; d.home_xg:=d.home_xg+shot_xg;
  else d.away_shots:=d.away_shots+1; d.away_xg:=d.away_xg+shot_xg; end if;
  ev := ev||jsonb_build_array(jsonb_build_object('minute',next_minute,'kind','chance','side',side,'text',coalesce(scorer->>'name','Spieler')||' kommt zum Abschluss','player',scorer,'xg',shot_xg));
 end if;

 ph := .014*greatest(.65,least(1.4,h/a))*(case d.home_tactic when 'attacking' then 1.15 when 'defensive' then .86 else 1 end)*(case d.away_tactic when 'defensive' then .86 when 'attacking' then 1.12 else 1 end);
 pa := .014*greatest(.65,least(1.4,a/h))*(case d.away_tactic when 'attacking' then 1.15 when 'defensive' then .86 else 1 end)*(case d.home_tactic when 'defensive' then .86 when 'attacking' then 1.12 else 1 end);
 roll := random();
 if roll < ph or roll < ph + pa then
  side := case when roll < ph then 'home' else 'away' end;
  idx := case when random()<.7 then 8+floor(random()*3)::integer else 5+floor(random()*3)::integer end;
  scorer := (case when side='home' then d.home_lineup else d.away_lineup end) -> idx;
  ev := ev||jsonb_build_array(jsonb_build_object('minute',next_minute,'kind','goal','side',side,'text',coalesce(scorer->>'name','Spieler'),'player',scorer));
  if side='home' then d.home_score:=d.home_score+1; d.home_shots:=d.home_shots+1; d.home_xg:=d.home_xg+.32;
  else d.away_score:=d.away_score+1; d.away_shots:=d.away_shots+1; d.away_xg:=d.away_xg+.32; end if;
 end if;

 if next_minute=45 then ev:=ev||jsonb_build_array(jsonb_build_object('minute',45,'kind','break','text','Halbzeit'));
 elsif next_minute=90 then ev:=ev||jsonb_build_array(jsonb_build_object('minute',90,'kind','break','text','Abpfiff')); end if;

 update public.footera_duels set
  minute=next_minute,home_score=d.home_score,away_score=d.away_score,
  home_shots=d.home_shots,away_shots=d.away_shots,home_xg=d.home_xg,away_xg=d.away_xg,
  home_possession=d.home_possession,events=events||ev,clock_at=now(),
  status=case when next_minute=45 then 'halftime' when next_minute=90 then 'finished' else 'live' end,
  finished_at=case when next_minute=90 then now() else null end
 where id=p_id returning * into d;
 return d;
end
$$;

revoke all on function public.footera_tick(uuid) from public, anon;
grant execute on function public.footera_tick(uuid) to authenticated;
