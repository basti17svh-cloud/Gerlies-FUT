-- Footera V21.246: online friendlies get the Rivals matchday (3D scenes).
-- Function-only change, no table or data change. The database still owns
-- clock and result; it now pauses its clock while both clients show a scene:
--  * kick-off walk-out after accepting: 12 s
--  * goal (scene + replay): 20 s
--  * big chance (xG >= .22, same threshold as friend-online-3d.js): 12 s
CREATE OR REPLACE FUNCTION public.footera_respond(p_id uuid, p_accept boolean)
 RETURNS footera_duels
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
        declare
        d public.footera_duels;
        a public.footera_online_profiles;
        begin

        select *
        into d
        from public.footera_duels
        where id = p_id
        for update;

        if d.id is null
        or d.status <> 'invited'
        or (
        auth.uid() <> d.away_user
        and not (
        auth.uid() = d.home_user
        and p_accept = false
        )
        ) then
        raise exception 'Einladung nicht verfügbar';
        end if;

        if p_accept then

        select *
        into a
        from public.footera_online_profiles
        where user_id = auth.uid();

        if a.user_id is null then
        raise exception 'Online-Profil fehlt';
        end if;

        update public.footera_duels
        set
        away_profile = to_jsonb(a),
        away_lineup = a.squad,
        status = 'live',
        -- V21.246: hold the clock for the walk-out scene before kick-off
        clock_at = now() + interval '12 seconds',
        events = jsonb_build_array(
        jsonb_build_object(
        'minute',0,
        'kind','kickoff',
        'text','Anpfiff'
        )
        )
        where id = p_id
        returning * into d;

        else

        update public.footera_duels
        set
        status = 'declined',
        finished_at = now()
        where id = p_id
        returning * into d;

        end if;

        return d;
        end $function$;

CREATE OR REPLACE FUNCTION public.footera_tick(p_id uuid)
 RETURNS footera_duels
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
 d public.footera_duels;
 h numeric; a numeric; poss numeric;
 h_build numeric:=70; a_build numeric:=70; h_transition numeric:=70; a_transition numeric:=70; h_defense numeric:=70; a_defense numeric:=70;
 h_role_attack numeric:=0; h_role_defense numeric:=0; h_role_poss numeric:=0;
 a_role_attack numeric:=0; a_role_defense numeric:=0; a_role_poss numeric:=0;
 h_team jsonb:='{}'::jsonb; a_team jsonb:='{}'::jsonb;
 atk_team jsonb; def_team jsonb; atk_lineup jsonb; def_lineup jsonb;
 creator jsonb; attacker jsonb; defender jsonb; gk jsonb;
 creator_idx integer:=-1; attacker_idx integer:=-1; defender_idx integer:=-1;
 build_attack numeric; build_defense numeric; build_chance numeric;
 duel_attack numeric; duel_defense numeric; duel_chance numeric;
 role_attack numeric; role_defense numeric; role_poss numeric;
 tactic_attack numeric; tactic_defense numeric; tactic_poss numeric;
 def_tactic_defense numeric; def_tactic_poss numeric;
 shot_xg numeric; goal_chance numeric; finish_mult numeric; gk_factor numeric;
 side text; defending_side text;
 ev jsonb:='[]'::jsonb;
 next_minute integer;
begin
 select * into d from public.footera_duels where id=p_id for update;
 if d.id is null or auth.uid() is null or auth.uid() not in (d.home_user,d.away_user) then
  raise exception 'Duell nicht verfügbar';
 end if;
 if d.status <> 'live' or d.clock_at > now() - interval '850 milliseconds' then return d; end if;

 next_minute:=d.minute+1;
 h:=greatest(45,least(99,coalesce((d.home_profile->>'rating')::numeric,70)+coalesce((d.home_profile->>'chem')::numeric,0)*.12));
 a:=greatest(45,least(99,coalesce((d.away_profile->>'rating')::numeric,70)+coalesce((d.away_profile->>'chem')::numeric,0)*.12));

 select value into h_team from jsonb_array_elements(coalesce(d.home_profile->'squads','[]'::jsonb)) x(value) where value->>'active'='true' limit 1;
 if h_team is null then select value into h_team from jsonb_array_elements(coalesce(d.home_profile->'squads','[]'::jsonb)) x(value) limit 1; end if;
 h_team:=coalesce(h_team,'{}'::jsonb);
 select value into a_team from jsonb_array_elements(coalesce(d.away_profile->'squads','[]'::jsonb)) x(value) where value->>'active'='true' limit 1;
 if a_team is null then select value into a_team from jsonb_array_elements(coalesce(d.away_profile->'squads','[]'::jsonb)) x(value) limit 1; end if;
 a_team:=coalesce(a_team,'{}'::jsonb);

 select
  coalesce(avg(case
   when value in ('Advanced Forward','Shadow Striker') then .018 when value in ('Poacher','Inside Forward','Attacking Wingback') then .016
   when value='Box Crasher' then .014 when value in ('Half Winger','Winger','Target Forward','Classic 10') then .012
   when value='Wingback' then .010 when value='Box to Box' then .008 when value in ('False 9','Wide Playmaker','Inverted Wingback') then .006
   when value='Playmaker' then .004 when value='Wide Half' then .003 when value='Deep Lying Playmaker' then .002
   when value='Holding' then -.006 when value='Centre Half' then -.010 when value='Defender' then -.004 else 0 end),0),
  coalesce(avg(case
   when value='Centre Half' then .024 when value='Stopper' then .022 when value='Holding' then .020 when value='Defender' then .018
   when value in ('Fullback','Wide Back','Goalkeeper') then .012 when value='Wide Half' then .010 when value in ('Sweeper Keeper','Wide Midfielder') then .009
   when value in ('Ball Playing Defender','Box to Box') then .008 when value in ('Deep Lying Playmaker','Falseback') then .006
   when value in ('Ball Playing','Inverted Wingback') then .004 when value='Playmaker' then -.002 when value='Wide Playmaker' then -.003
   when value in ('Wingback','Target Forward','False 9') then -.004 when value='Half Winger' then -.005 when value='Box Crasher' then -.006
   when value='Inside Forward' then -.007 when value in ('Shadow Striker','Advanced Forward') then -.008
   when value in ('Classic 10','Poacher') then -.010 when value='Attacking Wingback' then -.012 else 0 end),0),
  coalesce(avg(case
   when value='Deep Lying Playmaker' then .90 when value='False 9' then .85 when value in ('Ball Playing','Playmaker','Wide Playmaker') then .80
   when value in ('Ball Playing Defender','Falseback') then .75 when value in ('Inverted Wingback','Classic 10') then .65
   when value='Wide Half' then .45 when value='Sweeper Keeper' then .40 when value in ('Wide Back','Wingback','Half Winger','Wide Midfielder') then .35
   when value='Attacking Wingback' then .25 when value in ('Fullback','Centre Half','Box to Box','Target Forward') then .20 when value='Holding' then .15
   when value='Box Crasher' then .10 when value in ('Shadow Striker','Inside Forward') then -.10 when value='Advanced Forward' then -.15
   when value='Stopper' then -.20 when value='Poacher' then -.35 else 0 end),0)
 into h_role_attack,h_role_defense,h_role_poss from jsonb_each_text(coalesce(h_team->'roles','{}'::jsonb));

 select h_role_attack+coalesce(avg(case value when 'Attack' then .012 when 'Build-Up' then .004 when 'Defend' then -.008 else 0 end),0),
        h_role_defense+coalesce(avg(case value when 'Attack' then -.008 when 'Build-Up' then -.002 when 'Defend' then .012 else 0 end),0),
        h_role_poss+coalesce(avg(case value when 'Attack' then -.10 when 'Build-Up' then .80 when 'Defend' then -.15 else 0 end),0)
 into h_role_attack,h_role_defense,h_role_poss from jsonb_each_text(coalesce(h_team->'focus','{}'::jsonb));

 select
  coalesce(avg(case
   when value in ('Advanced Forward','Shadow Striker') then .018 when value in ('Poacher','Inside Forward','Attacking Wingback') then .016
   when value='Box Crasher' then .014 when value in ('Half Winger','Winger','Target Forward','Classic 10') then .012
   when value='Wingback' then .010 when value='Box to Box' then .008 when value in ('False 9','Wide Playmaker','Inverted Wingback') then .006
   when value='Playmaker' then .004 when value='Wide Half' then .003 when value='Deep Lying Playmaker' then .002
   when value='Holding' then -.006 when value='Centre Half' then -.010 when value='Defender' then -.004 else 0 end),0),
  coalesce(avg(case
   when value='Centre Half' then .024 when value='Stopper' then .022 when value='Holding' then .020 when value='Defender' then .018
   when value in ('Fullback','Wide Back','Goalkeeper') then .012 when value='Wide Half' then .010 when value in ('Sweeper Keeper','Wide Midfielder') then .009
   when value in ('Ball Playing Defender','Box to Box') then .008 when value in ('Deep Lying Playmaker','Falseback') then .006
   when value in ('Ball Playing','Inverted Wingback') then .004 when value='Playmaker' then -.002 when value='Wide Playmaker' then -.003
   when value in ('Wingback','Target Forward','False 9') then -.004 when value='Half Winger' then -.005 when value='Box Crasher' then -.006
   when value='Inside Forward' then -.007 when value in ('Shadow Striker','Advanced Forward') then -.008
   when value in ('Classic 10','Poacher') then -.010 when value='Attacking Wingback' then -.012 else 0 end),0),
  coalesce(avg(case
   when value='Deep Lying Playmaker' then .90 when value='False 9' then .85 when value in ('Ball Playing','Playmaker','Wide Playmaker') then .80
   when value in ('Ball Playing Defender','Falseback') then .75 when value in ('Inverted Wingback','Classic 10') then .65
   when value='Wide Half' then .45 when value='Sweeper Keeper' then .40 when value in ('Wide Back','Wingback','Half Winger','Wide Midfielder') then .35
   when value='Attacking Wingback' then .25 when value in ('Fullback','Centre Half','Box to Box','Target Forward') then .20 when value='Holding' then .15
   when value='Box Crasher' then .10 when value in ('Shadow Striker','Inside Forward') then -.10 when value='Advanced Forward' then -.15
   when value='Stopper' then -.20 when value='Poacher' then -.35 else 0 end),0)
 into a_role_attack,a_role_defense,a_role_poss from jsonb_each_text(coalesce(a_team->'roles','{}'::jsonb));

 select a_role_attack+coalesce(avg(case value when 'Attack' then .012 when 'Build-Up' then .004 when 'Defend' then -.008 else 0 end),0),
        a_role_defense+coalesce(avg(case value when 'Attack' then -.008 when 'Build-Up' then -.002 when 'Defend' then .012 else 0 end),0),
        a_role_poss+coalesce(avg(case value when 'Attack' then -.10 when 'Build-Up' then .80 when 'Defend' then -.15 else 0 end),0)
 into a_role_attack,a_role_defense,a_role_poss from jsonb_each_text(coalesce(a_team->'focus','{}'::jsonb));

 h_role_attack:=greatest(-.08,least(.08,h_role_attack)); h_role_defense:=greatest(-.08,least(.08,h_role_defense));
 a_role_attack:=greatest(-.08,least(.08,a_role_attack)); a_role_defense:=greatest(-.08,least(.08,a_role_defense));
 h_role_poss:=greatest(-2.5,least(2.5,h_role_poss)); a_role_poss:=greatest(-2.5,least(2.5,a_role_poss));

 select
  coalesce(avg(coalesce((value->>'pas')::numeric,(value->>'ovr')::numeric,70)*.68+coalesce((value->>'dri')::numeric,(value->>'ovr')::numeric,70)*.32),70),
  coalesce(avg(coalesce((value->>'pac')::numeric,(value->>'ovr')::numeric,70)*.55+coalesce((value->>'dri')::numeric,(value->>'ovr')::numeric,70)*.45),70),
  coalesce(avg(coalesce((value->>'def')::numeric,(value->>'ovr')::numeric,70)*.62+coalesce((value->>'phy')::numeric,(value->>'ovr')::numeric,70)*.23+coalesce((value->>'pac')::numeric,(value->>'ovr')::numeric,70)*.15),70)
 into h_build,h_transition,h_defense
 from jsonb_array_elements(coalesce(d.home_lineup,'[]'::jsonb)) with ordinality p(value,ord) where ord<=11 and value<>'null'::jsonb;

 select
  coalesce(avg(coalesce((value->>'pas')::numeric,(value->>'ovr')::numeric,70)*.68+coalesce((value->>'dri')::numeric,(value->>'ovr')::numeric,70)*.32),70),
  coalesce(avg(coalesce((value->>'pac')::numeric,(value->>'ovr')::numeric,70)*.55+coalesce((value->>'dri')::numeric,(value->>'ovr')::numeric,70)*.45),70),
  coalesce(avg(coalesce((value->>'def')::numeric,(value->>'ovr')::numeric,70)*.62+coalesce((value->>'phy')::numeric,(value->>'ovr')::numeric,70)*.23+coalesce((value->>'pac')::numeric,(value->>'ovr')::numeric,70)*.15),70)
 into a_build,a_transition,a_defense
 from jsonb_array_elements(coalesce(d.away_lineup,'[]'::jsonb)) with ordinality p(value,ord) where ord<=11 and value<>'null'::jsonb;

 poss:=greatest(32,least(68,
  50+(h-a)*.42
  +case d.home_tactic when 'attacking' then 2.5 when 'defensive' then -1.5 else 0 end
  -case d.away_tactic when 'attacking' then 2.5 when 'defensive' then -1.5 else 0 end
  +(h_role_poss-a_role_poss)*1.2
  +(h_build-a_build)*.10
 ));
 d.home_possession:=round((d.home_possession*.82+poss*.18)::numeric,2);

 if random()<.42 then
  if random()<d.home_possession/100 then
   side:='home'; defending_side:='away'; atk_team:=h_team; def_team:=a_team; atk_lineup:=d.home_lineup; def_lineup:=d.away_lineup;
   role_attack:=h_role_attack; role_defense:=a_role_defense; role_poss:=h_role_poss-a_role_poss;
   tactic_attack:=case d.home_tactic when 'attacking' then 1.11 when 'defensive' then .91 else 1 end;
   tactic_poss:=case d.home_tactic when 'attacking' then 2.5 when 'defensive' then -2 else 0 end;
   def_tactic_defense:=case d.away_tactic when 'attacking' then .92 when 'defensive' then 1.11 else 1 end;
   def_tactic_poss:=case d.away_tactic when 'attacking' then 2.5 when 'defensive' then -2 else 0 end;
  else
   side:='away'; defending_side:='home'; atk_team:=a_team; def_team:=h_team; atk_lineup:=d.away_lineup; def_lineup:=d.home_lineup;
   role_attack:=a_role_attack; role_defense:=h_role_defense; role_poss:=a_role_poss-h_role_poss;
   tactic_attack:=case d.away_tactic when 'attacking' then 1.11 when 'defensive' then .91 else 1 end;
   tactic_poss:=case d.away_tactic when 'attacking' then 2.5 when 'defensive' then -2 else 0 end;
   def_tactic_defense:=case d.home_tactic when 'attacking' then .92 when 'defensive' then 1.11 else 1 end;
   def_tactic_poss:=case d.home_tactic when 'attacking' then 2.5 when 'defensive' then -2 else 0 end;
  end if;

  select value,(ord-1)::integer into creator,creator_idx
  from jsonb_array_elements(coalesce(atk_lineup,'[]'::jsonb)) with ordinality p(value,ord)
  where ord<=11 and value<>'null'::jsonb
  order by -ln(greatest(random(),.000001)) /
   greatest(.05,
    (case when ord between 6 and 8 then 4.0 when ord between 9 and 11 then 3.0 when ord between 2 and 5 then 1.3 else .3 end) *
    (.42+coalesce((value->>'pas')::numeric,(value->>'ovr')::numeric,70)/105+coalesce((value->>'dri')::numeric,(value->>'ovr')::numeric,70)/270) *
    (case coalesce((atk_team->'roles')->>((ord-1)::text),'') when 'Playmaker' then 1.24 when 'False 9' then 1.24 when 'Wide Playmaker' then 1.22 when 'Deep Lying Playmaker' then 1.18 when 'Winger' then 1.24 else 1 end) *
    (case coalesce((atk_team->'focus')->>((ord-1)::text),'Balanced') when 'Attack' then 1.04 when 'Build-Up' then 1.10 when 'Defend' then .96 else 1 end)
   ) asc limit 1;

  select value,(ord-1)::integer into defender,defender_idx
  from jsonb_array_elements(coalesce(def_lineup,'[]'::jsonb)) with ordinality p(value,ord)
  where ord between 2 and 11 and value<>'null'::jsonb
  order by -ln(greatest(random(),.000001)) /
   greatest(.05,
    (case when ord between 2 and 5 then 5.0 when ord between 6 and 8 then 2.4 else .55 end) *
    (.55+(coalesce((value->>'def')::numeric,(value->>'ovr')::numeric,70)*.58+coalesce((value->>'phy')::numeric,(value->>'ovr')::numeric,70)*.27+coalesce((value->>'pac')::numeric,(value->>'ovr')::numeric,70)*.15)/100)
   ) asc limit 1;

  if creator is not null then
   build_attack:=coalesce((creator->>'pas')::numeric,(creator->>'ovr')::numeric,70)*.68+coalesce((creator->>'dri')::numeric,(creator->>'ovr')::numeric,70)*.32;
   build_defense:=coalesce((defender->>'def')::numeric,(defender->>'ovr')::numeric,70)*.58+coalesce((defender->>'phy')::numeric,(defender->>'ovr')::numeric,70)*.27+coalesce((defender->>'pac')::numeric,(defender->>'ovr')::numeric,70)*.15;
   build_chance:=greatest(.42,least(.90,.72+(build_attack-build_defense)*.0055+role_poss*.010+(tactic_poss-def_tactic_poss)*.006));
   if random()>=build_chance then
    ev:=ev||jsonb_build_array(jsonb_build_object('minute',next_minute,'kind','defense','side',defending_side,'text',coalesce(defender->>'name','Verteidiger')||' fängt den Pass von '||coalesce(creator->>'name','Spieler')||' ab'));
   else
    select value,(ord-1)::integer into attacker,attacker_idx
    from jsonb_array_elements(coalesce(atk_lineup,'[]'::jsonb)) with ordinality p(value,ord)
    where ord<=11 and value<>'null'::jsonb
    order by -ln(greatest(random(),.000001)) /
     greatest(.05,
      (case when ord between 9 and 11 then 5.0 when ord between 6 and 8 then 2.2 when ord between 2 and 5 then .5 else .1 end) *
      (.38+coalesce((value->>'sho')::numeric,(value->>'ovr')::numeric,70)/145+coalesce((value->>'pac')::numeric,(value->>'ovr')::numeric,70)/300+coalesce((value->>'dri')::numeric,(value->>'ovr')::numeric,70)/300) *
      (case coalesce((atk_team->'roles')->>((ord-1)::text),'') when 'Poacher' then 1.30 when 'Shadow Striker' then 1.28 when 'Inside Forward' then 1.22 when 'Advanced Forward' then 1.20 when 'Box Crasher' then 1.22 else 1 end) *
      (case coalesce((atk_team->'focus')->>((ord-1)::text),'Balanced') when 'Attack' then 1.08 when 'Build-Up' then .96 when 'Defend' then .90 else 1 end)
     ) asc limit 1;

    select value,(ord-1)::integer into defender,defender_idx
    from jsonb_array_elements(coalesce(def_lineup,'[]'::jsonb)) with ordinality p(value,ord)
    where ord between 2 and 11 and value<>'null'::jsonb
    order by -ln(greatest(random(),.000001)) /
     greatest(.05,
      (case when ord between 2 and 5 then 5.0 when ord between 6 and 8 then 2.4 else .55 end) *
      (.55+(coalesce((value->>'def')::numeric,(value->>'ovr')::numeric,70)*.58+coalesce((value->>'phy')::numeric,(value->>'ovr')::numeric,70)*.27+coalesce((value->>'pac')::numeric,(value->>'ovr')::numeric,70)*.15)/100)
     ) asc limit 1;

    duel_attack:=coalesce((attacker->>'dri')::numeric,(attacker->>'ovr')::numeric,70)*.44+coalesce((attacker->>'pac')::numeric,(attacker->>'ovr')::numeric,70)*.34+coalesce((attacker->>'phy')::numeric,(attacker->>'ovr')::numeric,70)*.22;
    duel_defense:=coalesce((defender->>'def')::numeric,(defender->>'ovr')::numeric,70)*.58+coalesce((defender->>'phy')::numeric,(defender->>'ovr')::numeric,70)*.27+coalesce((defender->>'pac')::numeric,(defender->>'ovr')::numeric,70)*.15;
    duel_chance:=greatest(.28,least(.86,.60+(duel_attack-duel_defense)*.006+(role_attack-role_defense)*.85+(tactic_attack-def_tactic_defense)*.28));

    if random()>=duel_chance then
     ev:=ev||jsonb_build_array(jsonb_build_object('minute',next_minute,'kind','defense','side',defending_side,'text',coalesce(defender->>'name','Verteidiger')||' stoppt '||coalesce(attacker->>'name','Angreifer')||' im Zweikampf'));
    else
     shot_xg:=greatest(.05,least(.52,.09+random()*.16+(build_attack-build_defense)*.0015+(duel_attack-duel_defense)*.0022+(coalesce((creator->>'pas')::numeric,70)-70)*.0009+(coalesce((attacker->>'dri')::numeric,70)-70)*.0007));
     if side='home' then d.home_shots:=d.home_shots+1;d.home_xg:=d.home_xg+shot_xg; else d.away_shots:=d.away_shots+1;d.away_xg:=d.away_xg+shot_xg; end if;
     ev:=ev||jsonb_build_array(jsonb_build_object('minute',next_minute,'kind','chance','side',side,'text',coalesce(attacker->>'name','Spieler')||' kommt nach Zuspiel von '||coalesce(creator->>'name','Mitspieler')||' zum Abschluss','player',attacker,'xg',round(shot_xg,2)));

     select value into gk from jsonb_array_elements(coalesce(def_lineup,'[]'::jsonb)) with ordinality p(value,ord) where ord=1 limit 1;
     gk_factor:=greatest(.84,least(1.16,1-(coalesce((gk->>'ovr')::numeric,78)-78)*.012));
     finish_mult:=greatest(.72,least(1.30,1+(coalesce((attacker->>'sho')::numeric,(attacker->>'ovr')::numeric,70)-75)*.012));
     goal_chance:=greatest(.02,least(.70,shot_xg*finish_mult*gk_factor));

     if random()<goal_chance then
      if side='home' then d.home_score:=d.home_score+1; else d.away_score:=d.away_score+1; end if;
      ev:=ev||jsonb_build_array(jsonb_build_object('minute',next_minute,'kind','goal','side',side,'text',coalesce(attacker->>'name','Spieler'),'player',attacker,'creator',creator,'xg',round(shot_xg,2)));
     end if;
    end if;
   end if;
  end if;
 end if;

 if next_minute=45 then ev:=ev||jsonb_build_array(jsonb_build_object('minute',45,'kind','break','text','Halbzeit'));
 elsif next_minute=90 then ev:=ev||jsonb_build_array(jsonb_build_object('minute',90,'kind','break','text','Abpfiff')); end if;

 update public.footera_duels set
  minute=next_minute,home_score=d.home_score,away_score=d.away_score,home_shots=d.home_shots,away_shots=d.away_shots,
  home_xg=d.home_xg,away_xg=d.away_xg,home_possession=d.home_possession,events=events||ev,
  -- V21.246: hold the shared clock while both clients play the 3D scene (goal incl. replay / big chance).
  clock_at=now()+case
   when exists(select 1 from jsonb_array_elements(ev) x(value) where value->>'kind'='goal') then interval '20 seconds'
   when exists(select 1 from jsonb_array_elements(ev) x(value) where value->>'kind'='chance' and coalesce((value->>'xg')::numeric,0)>=.22) then interval '12 seconds'
   else interval '0 seconds' end,
  status=case when next_minute=45 then 'halftime' when next_minute=90 then 'finished' else 'live' end,
  finished_at=case when next_minute=90 then now() else null end
 where id=p_id returning * into d;
 return d;
end
$function$;

revoke all on function public.footera_respond(uuid,boolean),public.footera_tick(uuid) from public, anon;
grant execute on function public.footera_respond(uuid,boolean),public.footera_tick(uuid) to authenticated;
