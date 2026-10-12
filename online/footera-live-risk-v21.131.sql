-- Footera V21.131: reconciled LIVE risk (refunds and disputes, including won disputes).
-- This supersedes the monotonic-only live reversal helper from V21.129.
alter table public.footera_live_stripe_payments
 add column if not exists confirmed_refund_cents integer not null default 0
    check (confirmed_refund_cents >= 0 and confirmed_refund_cents <= amount_cents),
 add column if not exists dispute_hold_cents integer not null default 0
    check (dispute_hold_cents >= 0 and dispute_hold_cents <= amount_cents);
alter table public.footera_live_points_wallets
 add column if not exists lifetime_restored_points bigint not null default 0
    check (lifetime_restored_points>=0);

create or replace function public.footera_reconcile_verified_live_payment_risk(
 p_checkout_session_id text,
 p_confirmed_refund_cents integer,
 p_current_dispute_hold_cents integer
) returns jsonb
language plpgsql security definer set search_path=''
as $$
declare
 v_payment public.footera_live_stripe_payments%rowtype;
 v_refunds integer;
 v_total integer;
 v_target_points integer;
 v_delta integer;
 v_balance bigint;
begin
 if p_checkout_session_id is null or p_checkout_session_id !~ '^cs_live_' or
    p_confirmed_refund_cents is null or p_confirmed_refund_cents < 0 or
    p_current_dispute_hold_cents is null or p_current_dispute_hold_cents < 0 then
   raise exception 'Invalid LIVE payment risk parameters';
 end if;
 select * into v_payment from public.footera_live_stripe_payments
 where stripe_checkout_session_id=p_checkout_session_id for update;
 if not found then raise exception 'Unknown LIVE payment'; end if;
 if p_confirmed_refund_cents > v_payment.amount_cents or
    p_current_dispute_hold_cents > v_payment.amount_cents then
   raise exception 'LIVE payment risk exceeds paid amount';
 end if;
 -- Confirmed refunds are cumulative and never go backwards.
 -- Dispute hold is a current Stripe risk state, reverses on confirmed dispute win.
 v_refunds := greatest(v_payment.confirmed_refund_cents,p_confirmed_refund_cents);
 v_total := least(v_payment.amount_cents,v_refunds+p_current_dispute_hold_cents);
 v_target_points := (v_payment.pack_points::bigint*v_total/v_payment.amount_cents)::integer;
 v_delta := v_target_points-v_payment.reversed_points;
 update public.footera_live_stripe_payments set
   confirmed_refund_cents=v_refunds,
   dispute_hold_cents=p_current_dispute_hold_cents,
   reversed_cents=v_total,
   reversed_points=v_target_points,
   updated_at=now()
 where stripe_checkout_session_id=p_checkout_session_id;
 if v_delta<>0 then
   update public.footera_live_points_wallets set
      balance_points=balance_points-v_delta,
      lifetime_reversed_points=lifetime_reversed_points+greatest(v_delta,0),
      lifetime_restored_points=lifetime_restored_points+greatest(-v_delta,0),
      updated_at=now()
    where user_id=v_payment.user_id
    returning balance_points into v_balance;
   if not found then raise exception 'LIVE wallet missing'; end if;
 else
   select balance_points into v_balance from public.footera_live_points_wallets
   where user_id=v_payment.user_id;
   if not found then raise exception 'LIVE wallet missing'; end if;
 end if;
 return jsonb_build_object(
    'status',case when v_delta=0 then 'unchanged' else 'reconciled' end,
    'delta_points',v_delta,'balance',v_balance,
    'refund_cents',v_refunds,'dispute_hold_cents',p_current_dispute_hold_cents,
    'reversed_points',v_target_points);
end;
$$;

revoke all on function public.footera_reconcile_verified_live_payment_risk(text,integer,integer)
 from public,anon,authenticated;
grant execute on function public.footera_reconcile_verified_live_payment_risk(text,integer,integer)
 to service_role;
-- Deprecated helper cannot safely release a won dispute.
revoke execute on function public.footera_reconcile_verified_live_payment_loss(text,integer)
 from service_role;
