-- Footera V21.140: compact service-only draw pool avoids downloading personal/player graphics
-- on every cold start. No browser, anonymous or normal authenticated access.
create or replace view public.footera_live_draw_pool
with (security_invoker=true)
as select player_id,base_rating,catalog_version,
  coalesce((card_snapshot->>'isIcon')::boolean,false) as is_icon
from public.footera_live_player_catalog
where approved_for_paid=true;
revoke all on public.footera_live_draw_pool from public,anon,authenticated;
grant select on public.footera_live_draw_pool to service_role;
