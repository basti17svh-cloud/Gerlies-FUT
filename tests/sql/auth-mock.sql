-- Minimal Supabase auth stand-in for local SQL checks on an empty Postgres (never run on Supabase).
create role anon; create role authenticated;
create schema auth;
create table auth.users(id uuid primary key, email text, email_confirmed_at timestamptz, is_anonymous boolean not null default false, email_change text, email_change_sent_at timestamptz);
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claims',true)::jsonb->>'sub','')::uuid $$;
create function auth.jwt() returns jsonb language sql stable as $$ select current_setting('request.jwt.claims',true)::jsonb $$;
grant usage on schema auth to authenticated,anon; grant execute on all functions in schema auth to authenticated,anon;
grant usage on schema public to authenticated;
