-- V21.139: lock each of the thirteen paid pack definitions to the validated
-- full FC27 player and Icon catalog; no public LIVE store availability is changed.
update public.footera_live_pack_specs
set catalog_version='fc27-20261007-530525ed'
where spec_version='v21.137' and enabled=false and catalog_version='fc27-pending';
