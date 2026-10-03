-- Footera V20.41 – Freundesnachrichten und Realtime-Benachrichtigungen

create table if not exists public.footera_messages (
 id uuid primary key default gen_random_uuid(),
 sender_user uuid not null references public.footera_online_profiles(user_id) on delete cascade,
 recipient_user uuid not null references public.footera_online_profiles(user_id) on delete cascade,
 body text not null check (char_length(trim(body)) between 1 and 500),
 created_at timestamptz not null default now(),
 read_at timestamptz,
 check (sender_user <> recipient_user)
);

create index if not exists footera_messages_sender_created
 on public.footera_messages(sender_user,created_at desc);
create index if not exists footera_messages_recipient_created
 on public.footera_messages(recipient_user,created_at desc);

alter table public.footera_messages enable row level security;

drop policy if exists footera_messages_participants_read on public.footera_messages;
create policy footera_messages_participants_read
 on public.footera_messages
 for select
 to authenticated
 using ((select auth.uid()) in (sender_user,recipient_user));

drop policy if exists footera_messages_sender_insert on public.footera_messages;
create policy footera_messages_sender_insert
 on public.footera_messages
 for insert
 to authenticated
 with check (
   (select auth.uid()) = sender_user
   and recipient_user <> (select auth.uid())
   and exists (
     select 1 from public.footera_online_profiles p
     where p.user_id = recipient_user
   )
 );

drop policy if exists footera_messages_recipient_read_update on public.footera_messages;
create policy footera_messages_recipient_read_update
 on public.footera_messages
 for update
 to authenticated
 using ((select auth.uid()) = recipient_user)
 with check ((select auth.uid()) = recipient_user);

revoke all on public.footera_messages from anon, authenticated;
grant select, insert on public.footera_messages to authenticated;
grant update(read_at) on public.footera_messages to authenticated;

do $$
begin
 if not exists (
  select 1
  from pg_publication_tables
  where pubname='supabase_realtime'
    and schemaname='public'
    and tablename='footera_messages'
 ) then
  alter publication supabase_realtime add table public.footera_messages;
 end if;
end
$$;
