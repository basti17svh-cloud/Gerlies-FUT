-- Business conflicts are HTTP 409, not retryable serialization failures.
-- Preserve each existing function's complete body, checks, settings and grants.
do $patch$
declare f record; changed integer:=0;
begin
 for f in
  select p.oid,pg_get_functiondef(p.oid) definition
  from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where (n.nspname,p.proname) in (
   ('public','footera_store_cloud_save'),('public','footera_claim_guest_save'),
   ('footera_private','choose_pick'),('footera_private','choose_pick_compact'))
   and p.prosrc like '%40001%'
 loop
  execute replace(f.definition,'''40001''','''PT409''');
  changed:=changed+1;
 end loop;
 if exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where n.nspname in ('public','footera_private') and p.prosrc like '%40001%')
 then raise exception 'Unexpected remaining custom serialization code'; end if;
end $patch$;
