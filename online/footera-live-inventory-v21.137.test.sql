-- V21.137 isolated inventory-security regression; run as one transaction, no data persists.
begin;
do $proof$
declare
  u uuid:=gen_random_uuid();
  other_user uuid:=gen_random_uuid();
  pay_id uuid:=gen_random_uuid();
  card_id uuid:=gen_random_uuid();
  denied integer:=0;
  snapshot jsonb;
begin
  insert into public.footera_live_point_spends(id,user_id,item_key,item_type,points_cost)
    values(pay_id,u,'pack:gold','pack',150);
  insert into public.footera_live_player_catalog(player_id,catalog_version,base_rating,card_snapshot)
    values('test-v2137-unique','test-v2137',78,'{"name":"Test Player","ovr":78,"position":"ST"}');
  -- Catalogue entry and recipe both default to not approved.
  begin
    insert into public.footera_live_cards(spend_id,user_id,item_key,slot,player_id,card_snapshot)
    values(pay_id,u,'pack:gold',0,'test-v2137-unique','{}');
    raise exception 'FAIL: unapproved card minted';
  exception when others then
    if sqlerrm like 'FAIL:%' then raise; end if;
    denied:=denied+1;
  end;
  update public.footera_live_pack_specs set enabled=true where item_key='pack:gold';
  begin
    insert into public.footera_live_cards(spend_id,user_id,item_key,slot,player_id,card_snapshot)
    values(pay_id,u,'pack:gold',0,'test-v2137-unique','{}');
    raise exception 'FAIL: unapproved player minted';
  exception when others then
    if sqlerrm like 'FAIL:%' then raise; end if;
    denied:=denied+1;
  end;
  update public.footera_live_player_catalog set approved_for_paid=true where player_id='test-v2137-unique';
  insert into public.footera_live_cards(card_id,spend_id,user_id,item_key,slot,player_id,card_snapshot)
    values(card_id,pay_id,u,'pack:gold',0,'test-v2137-unique','{"hacked":true}');
  select card_snapshot into snapshot from public.footera_live_cards where public.footera_live_cards.card_id=card_id;
  if snapshot->>'acquisitionSource' <> 'stripe-live' or snapshot->>'tradeable'<>'false' then
    raise exception 'FAIL: signed card metadata not enforced';
  end if;
  begin
    insert into public.footera_live_cards(spend_id,user_id,item_key,slot,player_id,card_snapshot)
    values(pay_id,u,'pack:gold',0,'test-v2137-unique','{}');
    raise exception 'FAIL: duplicate pack slot granted';
  exception when others then
    if sqlerrm like 'FAIL:%' then raise; end if;
    denied:=denied+1;
  end;
  begin
    insert into public.footera_live_cards(spend_id,user_id,item_key,slot,player_id,card_snapshot)
    values(pay_id,other_user,'pack:gold',1,'test-v2137-unique','{}');
    raise exception 'FAIL: cross-account card granted';
  exception when others then
    if sqlerrm like 'FAIL:%' then raise; end if;
    denied:=denied+1;
  end;
  begin
    insert into public.footera_live_cards(spend_id,user_id,item_key,slot,player_id,card_snapshot)
    values(pay_id,u,'pack:gold',5,'test-v2137-unique','{}');
    raise exception 'FAIL: exceeding paid pack count accepted';
  exception when others then
    if sqlerrm like 'FAIL:%' then raise; end if;
    denied:=denied+1;
  end;
  if denied<>5 then raise exception 'FAIL: only % of 5 deny-cases worked',denied; end if;
  raise notice 'PASS: 5 refusal scenarios; immutable snapshots; one valid card';
end
$proof$;
rollback;