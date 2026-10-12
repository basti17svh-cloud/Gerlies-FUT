import Stripe from "npm:stripe@22.0.0";
import { createClient } from "npm:@supabase/supabase-js@2.95.0";

// STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET must be configured in Supabase Edge Secrets.
// Signed Stripe events are the ONLY way to credit the server-side wallet.
const amounts: Record<string, number> = {
  "100": 59, "500": 299, "1050": 599, "1600": 899,
  "2800": 1499, "5900": 2999, "12000": 5999, "18500": 8999,
};
const stripeKey = Deno.env.get("STRIPE_SECRET_KEY") ?? "";
const stripe = stripeKey.startsWith("sk_test_") ? new Stripe(stripeKey) : null;
const cryptoProvider = Stripe.createSubtleCryptoProvider();
const response = (body: string, status: number) =>
  new Response(body, { status, headers: { "Content-Type": "text/plain; charset=utf-8" } });

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return response("Method not allowed", 405);
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET") ?? "";
  if (!stripe || !webhookSecret.startsWith("whsec_")) return response("Webhook not configured", 503);
  const signature = req.headers.get("stripe-signature");
  if (!signature) return response("Missing signature", 400);

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(
      await req.text(), signature, webhookSecret, undefined, cryptoProvider,
    );
  } catch (e) {
    console.warn("Invalid Stripe signature", String(e));
    return response("Invalid signature", 400);
  }

  if (event.livemode || !["checkout.session.completed", "checkout.session.async_payment_succeeded"].includes(event.type)) {
    return response("Ignored", 200);
  }

  const incoming = event.data.object as Stripe.Checkout.Session;
  if (!incoming.id?.startsWith("cs_test_")) return response("Sandbox only", 400);

  try {
    // Do not trust any fields provided by the player or a redirect URL.
    const session = await stripe.checkout.sessions.retrieve(incoming.id);
    const id = session.metadata?.footera_pack_id ?? "";
    const expected = amounts[id];
    const userId = session.metadata?.footera_user_id ?? "";
    const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!expected || !uuid.test(userId) || session.livemode || session.mode !== "payment" ||
        session.payment_status !== "paid" || session.currency !== "eur" ||
        session.amount_total !== expected || session.client_reference_id !== userId ||
        session.metadata?.footera_points !== id) {
      // On asynchronous methods, checkout.session.completed can arrive before payment.
      if (session.payment_status === "unpaid" && event.type === "checkout.session.completed")
        return response("Awaiting payment", 200);
      console.error("Unexpected Stripe checkout details", { id: session.id, type: event.type });
      return response("Invalid checkout details", 422);
    }
    const intent = typeof session.payment_intent === "string"
      ? session.payment_intent : session.payment_intent?.id;
    if (!intent?.startsWith("pi_")) return response("Missing payment intent", 422);

    const items = await stripe.checkout.sessions.listLineItems(session.id, {
      limit: 10, expand: ["data.price.product"],
    });
    if (items.data.length !== 1 || items.has_more || items.data[0].quantity !== 1 ||
        items.data[0].price?.currency !== "eur" ||
        items.data[0].price?.unit_amount !== expected) return response("Invalid line items", 422);
    const product = items.data[0].price?.product;
    const name = typeof product === "string" ? (await stripe.products.retrieve(product)).name
      : product && !("deleted" in product && product.deleted) ? product.name : "";
    const displayAmount = Number(id).toLocaleString("de-DE");
    if (name !== displayAmount + " Footera Points") return response("Unknown Stripe product", 422);

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    if (!serviceKey || !supabaseUrl) return response("Server not configured", 503);
    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data, error } = await admin.rpc("footera_credit_verified_stripe_points", {
      p_checkout_session_id: session.id,
      p_payment_intent_id: intent,
      p_user_id: userId,
      p_pack_points: Number(id),
      p_amount_cents: expected,
    });
    if (error) {
      console.error("Footera Stripe wallet credit failed", error.code, error.message);
      return response("Wallet unavailable, retry later", 500);
    }
    console.info("Footera Stripe sandbox payment", { session: session.id, result: data });
    return response("ok", 200);
  } catch (e) {
    console.error("Footera Stripe webhook failure", String(e));
    return response("Retry later", 500);
  }
});
