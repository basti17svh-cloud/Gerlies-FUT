-- Local check of online/footera-guest-cloud-v21.234.sql on an EMPTY Postgres:
--   createdb t && psql -d t -v ON_ERROR_STOP=1 -f tests/sql/auth-mock.sql -f online/footera-accounts-v21.109.sql \
--     -f online/footera-cloud-rewards-guard-v21.170.sql -f online/footera-guest-cloud-v21.234.sql -f tests/sql/guest-cloud-v21.234.test.sql
-- Every refusal check raises unless the expected error happens; the run ends with ALL OK.
\set ON_ERROR_STOP 1
insert into auth.users(id,email,email_confirmed_at,is_anonymous,email_change,email_change_sent_at) values
 ('00000000-0000-4000-8000-0000000000a1',null,null,true,'hsv@example.invalid',now()),
 ('00000000-0000-4000-8000-0000000000b1','hsv@example.invalid',now(),false,null,null),
 ('00000000-0000-4000-8000-0000000000c1','other@example.invalid',now(),false,null,null),
 ('00000000-0000-4000-8000-0000000000d1','late@example.invalid',null,false,null,null);
set role authenticated;
-- guest stores its own save
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-0000000000a1","role":"authenticated","is_anonymous":true}',false);
select public.footera_store_cloud_save('{"coins":900,"profile":{"saveId":"g1","clubName":"HSV FC"},"club":[1,2,3],"squad":[]}',0) as guest_rev;
select public.footera_store_cloud_save('{"coins":950,"profile":{"saveId":"g1","clubName":"HSV FC"},"club":[1,2,3,4],"squad":[]}',1) as guest_rev2;
select count(*) as guest_reads_own from public.footera_cloud_saves;
select count(*) as guest_offer from public.footera_guest_save_offer();
-- registered account with own new club and cloud save
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-0000000000b1","role":"authenticated","is_anonymous":false}',false);
select public.footera_store_cloud_save('{"coins":5,"profile":{"saveId":"n1","clubName":"HSV FC neu"},"club":[1],"squad":[]}',0) as new_rev;
select count(*) as reads_only_own from public.footera_cloud_saves;
select * from public.footera_guest_save_offer();
do $$ begin perform public.footera_claim_guest_save('00000000-0000-4000-8000-0000000000a1',0); raise exception 'stale base accepted'; exception when sqlstate '40001' then raise notice 'stale base refused ok'; end $$;
do $$ begin perform public.footera_claim_guest_save('00000000-0000-4000-8000-0000000000c1',1); raise exception 'wrong guest accepted'; exception when sqlstate '42501' then raise notice 'wrong guest refused ok'; end $$;
select revision, save_data->'profile'->>'clubName' club from public.footera_claim_guest_save('00000000-0000-4000-8000-0000000000a1',1);
select revision, save_data->'profile'->>'saveId' sid from public.footera_cloud_saves;
-- further normal saves on the adopted club work
select public.footera_store_cloud_save('{"coins":951,"profile":{"saveId":"g1","clubName":"HSV FC"},"club":[1,2,3,4],"squad":[]}',2) as after_claim_rev;
-- other verified account gets no offer and cannot claim
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-0000000000c1","role":"authenticated","is_anonymous":false}',false);
select count(*) as other_offer from public.footera_guest_save_offer();
do $$ begin perform public.footera_claim_guest_save('00000000-0000-4000-8000-0000000000a1',0); raise exception 'other claimed'; exception when sqlstate '42501' then raise notice 'other refused ok'; end $$;
-- guest itself cannot claim
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-0000000000a1","role":"authenticated","is_anonymous":true}',false);
do $$ begin perform public.footera_claim_guest_save('00000000-0000-4000-8000-0000000000a1',2); raise exception 'guest claimed'; exception when sqlstate '42501' then raise notice 'guest refused ok'; end $$;
-- reward-protected cloud blocks claim
reset role;
update public.footera_cloud_saves set save_data=jsonb_set(save_data,'{playerPickClaims}','{"p1":{"x":1}}') where user_id='00000000-0000-4000-8000-0000000000b1';
set role authenticated;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-0000000000b1","role":"authenticated","is_anonymous":false}',false);
do $$ begin perform public.footera_claim_guest_save('00000000-0000-4000-8000-0000000000a1',3); raise exception 'rewards overwritten'; exception when sqlstate '23514' then raise notice 'rewards protected ok'; end $$;
select 'ALL OK';
reset role;
select user_id, revision, reason, save_data->'profile'->>'saveId' from footera_private.replaced_cloud_saves;
