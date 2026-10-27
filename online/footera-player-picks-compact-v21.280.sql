-- Small authenticated claim request/receipt. The server uses the already synchronized save.
-- Existing offers, duplicate routing, cloud CAS and unique pick identity remain authoritative.
create or replace function footera_private.choose_pick_compact(p_id uuid,p_option text,p_save_id text,p_base_revision bigint)
returns jsonb language plpgsql security definer set search_path='' set lock_timeout='2s'
as $$
declare
 u uuid:=footera_private.pick_user();
 c public.footera_cloud_saves%rowtype;
 p public.footera_player_picks%rowtype;
 result jsonb; item jsonb; destination text; rev bigint; replayed boolean:=false;
begin
 select * into c from public.footera_cloud_saves where user_id=u for update;
 select * into p from public.footera_player_picks where id=p_id and user_id=u for update;
 if not found or p.save_id is distinct from p_save_id or c.save_data#>>'{profile,saveId}' is distinct from p_save_id then
  raise exception 'Pick und Verein gehören nicht zu diesem Konto.' using errcode='42501';
 end if;
 if p.claimed_at is not null then
  if p.selected_id is distinct from p_option then raise exception 'Dieser Pick wurde bereits anders eingelöst.' using errcode='22023'; end if;
  item:=p.selected_item;rev:=p.claim_revision;replayed:=true;
 else
  if c.revision is distinct from p_base_revision then
   raise exception 'Der Online-Spielstand wurde inzwischen geändert. Bitte den Spielstand abgleichen.' using errcode='40001';
  end if;
  -- The client cannot send a save, card, rating or reward amount through this RPC.
  result:=footera_private.choose_pick(p_id,p_option,c.save_data,p_base_revision);
  item:=result->'item';rev:=(result->>'revision')::bigint;
  c.save_data:=result->'save_data';c.revision:=rev;
 end if;
 destination:=case when exists(select 1 from jsonb_array_elements(coalesce(c.save_data->'sbcStorage','[]')) x where x->>'uid'=p_id::text) then 'sbcStorage' else 'club' end;
 return jsonb_build_object('pick_id',p_id,'option_id',p_option,'save_id',p_save_id,
  'item',item,'destination',destination,'revision',rev,'cloud_revision',c.revision,'replayed',replayed);
end $$;
revoke all on function footera_private.choose_pick_compact(uuid,text,text,bigint) from public,anon,authenticated;
grant execute on function footera_private.choose_pick_compact(uuid,text,text,bigint) to authenticated;
create or replace function public.footera_choose_player_pick_compact(p_id uuid,p_option text,p_save_id text,p_base_revision bigint)
returns jsonb language sql security invoker set search_path=''
as $$select footera_private.choose_pick_compact(p_id,p_option,p_save_id,p_base_revision)$$;
revoke all on function public.footera_choose_player_pick_compact(uuid,text,text,bigint) from public,anon;
grant execute on function public.footera_choose_player_pick_compact(uuid,text,text,bigint) to authenticated;
