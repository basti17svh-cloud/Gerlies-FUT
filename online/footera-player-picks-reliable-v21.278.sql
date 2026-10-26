-- V21.278: use unambiguous digit classes. Double-escaped [0-9] silently rejected real wins/weeks.
-- Existing source/week/slot uniqueness makes retries and missing-slot recovery idempotent.
create or replace function footera_private.list_picks(p_save_id text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare u uuid:=footera_private.pick_user(); s jsonb; r jsonb; n int; rating int; typ text; opts int; k int; wins int; divn int;
begin
 select save_data into s from public.footera_cloud_saves where user_id=u;
 if s#>>'{profile,saveId}' is distinct from p_save_id then raise exception 'Der Verein gehört nicht zu diesem Konto.' using errcode='42501'; end if;
 -- Competition results already live in the game's cloud save. Only server rules determine
 -- the pick count and quality; client-supplied reward definitions never set these values.
 for r in select value from jsonb_array_elements(coalesce(s->'weeklyRewards','[]')) loop
  if r->>'claimed' is distinct from 'true' or jsonb_typeof(r#>'{reward,playerPicks}') is distinct from 'array' then continue; end if;
  if jsonb_array_length(r#>'{reward,playerPicks}')=0 then continue; end if;
  n:=0; rating:=80; typ:='standard'; opts:=3;
  if r->>'mode'='champions' and coalesce(r->>'wins','') ~ '^[0-9]{1,2}$' then
   wins:=(r->>'wins')::int;
   if wins between 5 and 15 then n:=case when wins=15 then 3 when wins>=11 then 2 else 1 end; end if;
   rating:=85; typ:='champions-red'; opts:=4;
  elsif r->>'mode'='rivals' and coalesce(r->>'division','') ~ '^[0-5]$' and r->>'milestone' in ('15','35') then
   divn:=(r->>'division')::int;n:=1;rating:=case when divn<=2 then 84 else 82 end;
  elsif r->>'mode'='squad' and r->>'rank' in ('Gold 2','Gold 1','Elite 3','Elite 2','Elite 1') then
   n:=1;rating:=case when r->>'rank'='Elite 1' then 83 else 80 end;
  end if;
  if n=0 or coalesce(r->>'week','') !~ '^[0-9]{13}$' then continue; end if;
  for k in 1..n loop
   insert into public.footera_player_picks(user_id,save_id,source,source_key,slot,type,choices,min_rating)
   values(u,p_save_id,r->>'mode',r->>'week',k,typ,opts,rating)
   on conflict(user_id,source,source_key,slot) do nothing;
  end loop;
 end loop;
 return coalesce((select jsonb_agg(to_jsonb(p)-'user_id'-'selected_item' order by created_at,id)
  from public.footera_player_picks p where user_id=u and save_id=p_save_id and claimed_at is null),'[]');
end $$;
