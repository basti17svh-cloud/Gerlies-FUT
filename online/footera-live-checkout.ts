// Footera V21.129 – STAGED Stripe LIVE checkout. NOT DEPLOYED / NOT ENABLED.
// Requires a human-approved business model, independent Stripe LIVE secret,
// live webhook, server-authoritative entitlements, and explicit release flag.
import Stripe from "npm:stripe@22.0.0";
import { createClient } from "npm:@supabase/supabase-js@2.95.0";

const trustedOrigin = "https://basti17svh-cloud.github.io";
const returnUrl = "https://basti17svh-cloud.github.io/Gerlies-FUT/";
const packs: Record<string, { cents: number; name: string; priceId: string }> = {
  "100":   { cents: 59,   name: "100 Footera Points",    priceId: "price_1UPdtOQsfnvccsH8pdYUhygp" },
  "500":   { cents: 299,  name: "500 Footera Points",    priceId: "price_1UPdtOQsfnvccsH80HCwRrM1" },
  "1050":  { cents: 599,  name: "1.050 Footera Points",  priceId: "price_1UPdtOQsfnvccsH8rFzOH13y" },
  "1600":  { cents: 899,  name: "1.600 Footera Points",  priceId: "price_1UPdtOQsfnvccsH8yCkvO3Jk" },
  "2800":  { cents: 1499, name: "2.800 Footera Points",  priceId: "price_1UPdtOQsfnvccsH8i5VxQkZ8" },
  "5900":  { cents: 2999, name: "5.900 Footera Points",  priceId: "price_1UPdtOQsfnvccsH8oq9eD9Fg" },
  "12000": { cents: 5999, name: "12.000 Footera Points", priceId: "price_1UPdtRQsfnvccsH80XIQSOGj" },
  "18500": { cents: 8999, name: "18.500 Footera Points", priceId: "price_1UPdtTQsfnvccsH8tcjwUyxt" },
};
const headers = {
  "Content-Type": "application/json; charset=utf-8",
  "Access-Control-Allow-Origin": trustedOrigin,
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const reply = (value: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(value), { status, headers });

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers });
  if (req.method !== "POST") return reply({ error: "Method not allowed" }, 405);
  if (req.headers.get("origin") !== trustedOrigin) return reply({ error: "Origin not allowed" }, 403);
  // Fail closed: availability of a live key alone does not activate real payments.
  if (Deno.env.get("FOOTERA_LIVE_PAYMENTS_ENABLED") !== "true")
    return reply({ error: "Footera Echtgeldzahlungen sind noch nicht freigeschaltet." }, 503);
  const key = Deno.env.get("FOOTERA_STRIPE_LIVE_SECRET_KEY") ?? "";
  if (!key.startsWith("sk_live_")) return reply({ error: "Live payment service unavailable" }, 503);
  const match = /^Bearer\s+(.+)$/i.exec(req.headers.get("authorization") ?? "");
  if (!match) return reply({ error: "Verified Footera account required" }, 401);
  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (!supabaseUrl || !serviceKey) return reply({ error: "Server not configured" }, 503);
  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: { user }, error } = await admin.auth.getUser(match[1]);
  if (error || !user || user.is_anonymous || !user.email || !user.email_confirmed_at)
    return reply({ error: "Confirm your Footera email account" }, 401);

  let packId: string;
  try {
    const body = await req.json();
    if (!body || typeof body.pack_id !== "string") throw Error("Invalid pack");
    packId = body.pack_id;
  } catch { return reply({ error: "Invalid package selection" }, 400); }
  const pack = packs[packId];
  if (!pack) return reply({ error: "Unknown Points package" }, 400);

  try {
    const stripe = new Stripe(key);
    // Do not allow arbitrary amount/price from the browser. Validate catalog in LIVE.
    const price = await stripe.prices.retrieve(pack.priceId, { expand: ["product"] });
    const product = price.product;
    if (!price.livemode || !price.active || price.type !== "one_time" ||
        price.currency !== "eur" || price.unit_amount !== pack.cents ||
        !product || typeof product !== "object" || "deleted" in product ||
        !product.active || product.name !== pack.name) {
      console.error("Footera live price catalog mismatch", { packId, priceId: pack.priceId });
      return reply({ error: "Footera Points package is not configured" }, 409);
    }
    const checkout = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [{ price: pack.priceId, quantity: 1 }],
      client_reference_id: user.id,
      customer_email: user.email,
      metadata: { footera_pack_id: packId, footera_points: packId, footera_user_id: user.id },
      success_url: returnUrl + "?footera_points_checkout=success",
      cancel_url: returnUrl + "?footera_points_checkout=cancelled",
      submit_type: "pay",
    });
    if (!checkout.livemode || !checkout.url)
      return reply({ error: "Stripe did not create a live checkout" }, 502);
    return reply({ checkout_url: checkout.url });
  } catch (e) {
    console.error("Footera LIVE checkout failed", String(e));
    return reply({ error: "Checkout temporarily unavailable" }, 502);
  }
});
