// Footera V21.129 – STAGED Stripe LIVE webhook. DO NOT DEPLOY/ENABLE YET.
// Needs independent LIVE signing secret, signed event validation and settlement tests.
// Refund/dispute handling still requires a complete production review before launch.
import Stripe from "npm:stripe@22.0.0";
import { createClient } from "npm:@supabase/supabase-js@2.95.0";

const packs: Record<string, { cents: number; priceId: string; name: string }> = {
  "100":   { cents: 59, priceId: "price_1UPdtOQsfnvccsH8pdYUhygp", name: "100 Footera Points" },
  "500":   { cents: 299, priceId: "price_1UPdtOQsfnvccsH80HCwRrM1", name: "500 Footera Points" },
  "1050":  { cents: 599, priceId: "price_1UPdtOQsfnvccsH8rFzOH13y", name: "1.050 Footera Points" },
  "1600":  { cents: 899, priceId: "price_1UPdtOQsfnvccsH8yCkvO3Jk", name: "1.600 Footera Points" },
  "2800":  { cents: 1499, priceId: "price_1UPdtOQsfnvccsH8i5VxQkZ8", name: "2.800 Footera Points" },
  "5900":  { cents: 2999, priceId: "price_1UPdtOQsfnvccsH8oq9eD9Fg", name: "5.900 Footera Points" },
  "12000": { cents: 5999, priceId: "price_1UPdtRQsfnvccsH80XIQSOGj", name: "12.000 Footera Points" },
  "18500": { cents: 8999, priceId: "price_1UPdtTQsfnvccsH8tcjwUyxt", name: "18.500 Footera Points" },
};
const respond = (text: string, status = 200) =>
  new Response(text, { status, headers: { "Content-Type": "text/plain; charset=utf-8" } });

// Always obtain CURRENT risk from the Stripe LIVE API, not from webhook-supplied amounts.
// This allows a dispute WIN to restore a hold while successful refunds remain permanent.
async function reconcileLiveRisk(stripe: Stripe, admin: ReturnType<typeof createClient>, chargeId: string) {
  const charge = await stripe.charges.retrieve(chargeId);
  if (!charge.livemode || !charge.paid || charge.currency !== "eur") throw Error("Not a settled LIVE charge");
  const paymentIntentId = typeof charge.payment_intent === "string"
    ? charge.payment_intent : charge.payment_intent?.id;
  if (!paymentIntentId) throw Error("Charge has no Payment Intent");
  const { data: payment, error: findError } = await admin.from("footera_live_stripe_payments")
    .select("stripe_checkout_session_id,amount_cents")
    .eq("stripe_payment_intent_id", paymentIntentId).maybeSingle();
  if (findError) throw findError;
  if (!payment) return "not_a_recorded_footera_charge";
  if (payment.amount_cents !== charge.amount) throw Error("Charge does not match Footera payment");

  let refundsTotal = 0;
  let cursor: string | undefined;
  for (let pageNo = 0; pageNo < 10; pageNo++) {
    const page = await stripe.refunds.list({
      charge: charge.id, limit: 100, ...(cursor ? { starting_after: cursor } : {}),
    });
    for (const refund of page.data) if (refund.status === "succeeded") refundsTotal += refund.amount;
    if (!page.has_more) { cursor = undefined; break; }
    cursor = page.data.at(-1)?.id;
    if (!cursor) throw Error("Cannot continue Stripe refund pagination");
  }
  if (cursor) throw Error("Too many refunds to reconcile automatically");

  let disputeHold = 0;
  let disputeCursor: string | undefined;
  for (let pageNo = 0; pageNo < 10; pageNo++) {
    const page = await stripe.disputes.list({
      charge: charge.id, limit: 100, ...(disputeCursor ? { starting_after: disputeCursor } : {}),
    });
    for (const dispute of page.data) {
      if (["won", "warning_closed", "prevented"].includes(dispute.status)) continue;
      disputeHold = Math.max(disputeHold, dispute.amount);
    }
    if (!page.has_more) { disputeCursor = undefined; break; }
    disputeCursor = page.data.at(-1)?.id;
    if (!disputeCursor) throw Error("Cannot continue Stripe dispute pagination");
  }
  if (disputeCursor) throw Error("Too many disputes to reconcile automatically");
  const { error } = await admin.rpc("footera_reconcile_verified_live_payment_risk", {
    p_checkout_session_id: payment.stripe_checkout_session_id,
    p_confirmed_refund_cents: refundsTotal,
    p_current_dispute_hold_cents: disputeHold,
  });
  if (error) throw Error("LIVE risk ledger: " + error.message);
  return "reconciled";
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return respond("Method not allowed", 405);
  if (Deno.env.get("FOOTERA_LIVE_WEBHOOK_ENABLED") !== "true")
    return respond("Footera live webhook not enabled", 503);
  const key = Deno.env.get("FOOTERA_STRIPE_LIVE_SECRET_KEY") ?? "";
  const secret = Deno.env.get("FOOTERA_STRIPE_LIVE_WEBHOOK_SECRET") ?? "";
  if (!key.startsWith("sk_live_") || !secret.startsWith("whsec_"))
    return respond("Live webhook is not configured", 503);
  const sig = req.headers.get("stripe-signature");
  if (!sig) return respond("Missing signature", 400);

  const stripe = new Stripe(key);
  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(
      await req.text(), sig, secret, undefined, Stripe.createSubtleCryptoProvider(),
    );
  } catch {
    return respond("Invalid Stripe signature", 400);
  }
  if (!event.livemode) return respond("Not a Stripe live event", 400);

  const url = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (!url || !serviceKey) return respond("Server not configured", 503);
  const admin = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  try {
    if (event.type === "checkout.session.completed" ||
        event.type === "checkout.session.async_payment_succeeded") {
      const incoming = event.data.object as Stripe.Checkout.Session;
      if (!incoming.id?.startsWith("cs_live_")) return respond("Invalid checkout", 422);
      const session = await stripe.checkout.sessions.retrieve(incoming.id);
      if (!session.livemode || session.mode !== "payment")
        return respond("Invalid live checkout mode", 422);
      if (session.payment_status === "unpaid" && event.type === "checkout.session.completed")
        return respond("Awaiting payment", 200);
      const id = session.metadata?.footera_pack_id ?? "";
      const pack = packs[id];
      const userId = session.metadata?.footera_user_id ?? "";
      const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      const intentId = typeof session.payment_intent === "string"
        ? session.payment_intent : session.payment_intent?.id;
      if (!pack || !uuid.test(userId) || session.metadata?.footera_points !== id ||
          session.client_reference_id !== userId || session.payment_status !== "paid" ||
          session.amount_total !== pack.cents || session.currency !== "eur" ||
          !intentId?.startsWith("pi_")) return respond("Invalid checkout fields", 422);
      const pi = await stripe.paymentIntents.retrieve(intentId);
      if (!pi.livemode || pi.status !== "succeeded" || pi.amount !== pack.cents ||
          pi.amount_received !== pack.cents || pi.currency !== "eur")
        return respond("Payment Intent not settled", 422);
      const items = await stripe.checkout.sessions.listLineItems(session.id, { limit: 10 });
      if (items.has_more || items.data.length !== 1 || items.data[0].quantity !== 1 ||
          items.data[0].price?.id !== pack.priceId ||
          items.data[0].price?.unit_amount !== pack.cents)
        return respond("Unknown live product or unexpected quantity", 422);
      const { data, error } = await admin.rpc("footera_credit_verified_live_stripe_points", {
        p_checkout_session_id: session.id,
        p_payment_intent_id: intentId,
        p_user_id: userId,
        p_pack_points: Number(id),
        p_amount_cents: pack.cents,
      });
      if (error) {
        console.error("Stripe LIVE credit failed", error.code, error.message);
        return respond("Credit unavailable: retry", 500);
      }
      // Reconcile any refund/dispute that was emitted before this payment was recorded.
      const charge = typeof pi.latest_charge === "string" ? pi.latest_charge : pi.latest_charge?.id;
      if (!charge) throw Error("Paid Checkout is missing its settled charge");
      await reconcileLiveRisk(stripe, admin, charge);
      console.info("Footera LIVE payment processed", { session: session.id, result: data });
      return respond("ok", 200);
    }
    if (event.type === "charge.refunded" || event.type.startsWith("charge.dispute.")) {
      const chargeId = event.type === "charge.refunded"
        ? (event.data.object as Stripe.Charge).id
        : (event.data.object as Stripe.Dispute).charge;
      if (!chargeId || typeof chargeId !== "string")
        return respond("Cannot resolve Stripe charge", 422);
      return respond(await reconcileLiveRisk(stripe, admin, chargeId), 200);
    }
    return respond("ignored", 200);
  } catch (e) {
    console.error("Footera LIVE Stripe webhook error", String(e));
    return respond("Retry later", 500);
  }
});
