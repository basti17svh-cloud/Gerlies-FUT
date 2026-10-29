-- Empty catalogue dependency for isolated reward tests; never run on Supabase.
create role service_role;
create table public.footera_live_player_catalog (
 player_id text primary key, base_rating smallint not null,
 card_snapshot jsonb not null, approved_for_paid boolean not null default false
);
