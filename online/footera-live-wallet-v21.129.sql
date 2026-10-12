-- Footera V21.129: PREPARATION ONLY. No checkout, webhook, or real-money UI enabled.
-- Fully separate from footera_points_wallets / footera_stripe_point_payments (Stripe Sandbox).
-- Loss adjustments may make a wallet negative (owed Points), intentionally blocking future spending.
create table if not exists public.footera_live_points_wallets (
  user_id uuid primary key,
  balance_points bigint not null default 0,
  lifetime_credited_points bigint not null default 0 check (lifetime_credited_points >= 0),
  lifetime_reversed_points bigint not null default 0 check (lifetime_reversed_points >= 0),
  updated_at timestamptz not null default now()
);
create table if not exists public.footera_live_stripe_payments (
  stripe_checkout_session_id text primary key check (stripe_checkout_session_id ~ '^cs_live_'),
  stripe_payment_intent_id text not null unique check (stripe_payment_intent_id ~ '^pi_'),
  user_id uuid not null,
  pack_points integer not null check (pack_points > 0),
  amount_cents integer not null check (amount_cents > 0),
  currency text not null default 'eur' check (currency = 'eur'),
  reversed_cents integer not null default 0 check (reversed_cents >= 0 and reversed_cents <= amount_cents),
  reversed_points integer not null default 0 check (reversed_points >= 0 and reversed_points <= pack_points),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists footera_live_stripe_payments_user_idx
 on public.footera_live_stripe_payments (user_id, created_at desc);

alter table public.footera_live_points_wallets enable row level security;
alter table public.footera_live_stripe_payments enable row level security;
-- Only the authenticated owner may see their balance. Never grant browser WRITE on money.
revoke all on public.footera_live_points_wallets from public, anon, authenticated;
revoke all on public.footera_live_stripe_payments from public, anon, authenticated;
grant select on public.footera_live_points_wallets to authenticated;
grant all on public.footera_live_points_wallets, public.footera_live_stripe_payments to service_role;
drop policy if exists footera_live_wallet_owner_select on public.footera_live_points_wallets;
create policy footera_live_wallet_owner_select
 on public.footera_live_points_wallets for select to authenticated
 using (user_id = (select auth.uid()));
-- Payment ledger intentionally has NO browser RLS policy; service-role access only.

create or replace function public.footera_credit_verified_live_stripe_points(
 p_checkout_session_id text, p_payment_intent_id text, p_user_id uuid,
 p_pack_points integer, p_amount_cents integer
) returns text
language plpgsql security definer set search_path = ''
as $$
declare
 v_expected integer;
 v_existing public.footera_live_stripe_payments%rowtype;
 v_inserted text;
begin
 if p_checkout_session_id is null or p_checkout_session_id !~ '^cs_live_' or
    p_payment_intent_id is null or p_payment_intent_id !~ '^pi_' or
    p_user_id is null then
   raise exception 'Invalid live payment identity';
 end if;
 v_expected := case p_pack_points
   when 100 then 59 when 500 then 299 when 1050 then 599
   when 1600 then 899 when 2800 then 1499 when 5900 then 2999
   when 12000 then 5999 when 18500 then 8999 else null end;
 if v_expected is null or p_amount_cents is distinct from v_expected then
   raise exception 'Price does not match Footera live catalogue';
 end if;
 if not exists (
    select 1 from auth.users u
    where u.id = p_user_id and u.email_confirmed_at is not null
 ) then
   raise exception 'Verified Footera account is required';
 end if;
 insert into public.footera_live_stripe_payments(
   stripe_checkout_session_id,stripe_payment_intent_id,user_id,pack_points,amount_cents
 ) values (p_checkout_session_id,p_payment_intent_id,p_user_id,p_pack_points,p_amount_cents)
 on conflict (stripe_checkout_session_id) do nothing
 returning stripe_checkout_session_id into v_inserted;
 if v_inserted is null then
   select * into v_existing from public.footera_live_stripe_payments
    where stripe_checkout_session_id=p_checkout_session_id;
   if not found or v_existing.stripe_payment_intent_id is distinct from p_payment_intent_id or
      v_existing.user_id is distinct from p_user_id or
      v_existing.pack_points is distinct from p_pack_points or
      v_existing.amount_cents is distinct from p_amount_cents then
      raise exception 'Conflicting live Stripe payment identity';
   end if;
   return 'already_credited';
 end if;
 insert into public.footera_live_points_wallets
    (user_id,balance_points,lifetime_credited_points)
 values (p_user_id,p_pack_points,p_pack_points)
 on conflict (user_id) do update set
    balance_points = public.footera_live_points_wallets.balance_points + excluded.balance_points,
    lifetime_credited_points = public.footera_live_points_wallets.lifetime_credited_points + excluded.lifetime_credited_points,
    updated_at = now();
 return 'credited';
end;
$$;

-- Call ONLY after an authenticated Stripe LIVE API lookup confirms the cumulative
-- monetary loss on a previously credited payment (refund / lost dispute).
-- Cumulative amounts make retries and out-of-order lower totals harmless.
-- Negative wallet balance intentionally represents debt after spent/withdrawn Points.
create or replace function public.footera_reconcile_verified_live_payment_loss(
 p_checkout_session_id text, p_total_lost_cents integer
) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
 v_payment public.footera_live_stripe_payments%rowtype;
 v_target_points integer;
 v_delta integer;
 v_new_balance bigint;
begin
 if p_checkout_session_id is null or p_checkout_session_id !~ '^cs_live_' or
    p_total_lost_cents is null or p_total_lost_cents < 0 then
    raise exception 'Invalid live payment loss';
 end if;
 select * into v_payment from public.footera_live_stripe_payments
  where stripe_checkout_session_id = p_checkout_session_id for update;
 if not found then raise exception 'Unknown live Stripe payment'; end if;
 if p_total_lost_cents > v_payment.amount_cents then
   raise exception 'Loss exceeds payment amount';
 end if;
 if p_total_lost_cents <= v_payment.reversed_cents then
   return jsonb_build_object('status','already_applied','reversed_points',v_payment.reversed_points);
 end if;
 v_target_points := (v_payment.pack_points::bigint * p_total_lost_cents / v_payment.amount_cents)::integer;
 v_delta := v_target_points - v_payment.reversed_points;
 update public.footera_live_stripe_payments set
   reversed_cents=p_total_lost_cents,reversed_points=v_target_points,updated_at=now()
   where stripe_checkout_session_id=p_checkout_session_id;
 update public.footera_live_points_wallets set
   balance_points=balance_points-v_delta,
   lifetime_reversed_points=lifetime_reversed_points+v_delta,
   updated_at=now()
   where user_id=v_payment.user_id
   returning balance_points into v_new_balance;
 if not found then raise exception 'Live wallet missing'; end if;
 return jsonb_build_object('status','reversed','delta_points',v_delta,
  'reversed_points',v_target_points,'balance',v_new_balance);
end;
$$;

revoke all on function public.footera_credit_verified_live_stripe_points(text,text,uuid,integer,integer)
 from public, anon, authenticated;
revoke all on function public.footera_reconcile_verified_live_payment_loss(text,integer)
 from public, anon, authenticated;
grant execute on function public.footera_credit_verified_live_stripe_points(text,text,uuid,integer,integer)
 to service_role;
grant execute on function public.footera_reconcile_verified_live_payment_loss(text,integer)
 to service_role;
