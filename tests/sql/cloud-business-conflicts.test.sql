-- Minimal isolated fixture; no existing player data is read or changed.
begin;
set local statement_timeout='5s';
do $test$
declare u uuid:=gen_random_uuid(); s jsonb; rev bigint; rejected boolean:=false;
begin
 insert into auth.users(id,email,email_confirmed_at) values (u,'cpu-regression-'||u||'@example.invalid',now());
 perform set_config('request.jwt.claims',jsonb_build_object('sub',u,'role','authenticated','is_anonymous',false)::text,true);
 s:=jsonb_build_object('version',128,'profile',jsonb_build_object('saveId','cpu-regression','clubName','CPU Fixture'),'club','[]'::jsonb,'squad','[]'::jsonb,'coins',10,'points',0);
 rev:=public.footera_store_cloud_save(s,0);
 if rev<>1 then raise exception 'Initial save failed'; end if;
 begin perform public.footera_store_cloud_save(s,0);
 exception when sqlstate 'PT409' then rejected:=true; end;
 if not rejected then raise exception 'Stale save was not rejected with PT409'; end if;
 if (select revision from public.footera_cloud_saves where user_id=u)<>1 then raise exception 'Conflict changed revision'; end if;
 rev:=public.footera_store_cloud_save(s,1);
 if rev<>2 then raise exception 'Valid continuation failed'; end if;
 if exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname in ('public','footera_private') and p.prosrc like '%40001%') then
  raise exception 'Custom serialization error would reintroduce PostgREST 14 retries';
 end if;
end $test$;
rollback;
select 'ALL OK: business conflicts reject once and preserve revisions';
