import Stripe from "npm:stripe@22.0.0";
import { createClient } from "npm:@supabase/supabase-js@2.95.0";

// Sandbox-only checkout: users can choose pack ID, never price or number of points.
const packs: Record<string, { cents: number; title: string }> = {
  "100": { cents: 59, title: "100 Footera Points" },
  "500": { cents: 299, title: "500 Footera Points" },
  "1050": { cents: 599, title: "1.050 Footera Points" },
  "1600": { cents: 899, title: "1.600 Footera Points" },
  "2800": { cents: 1499, title: "2.800 Footera Points" },
  "5900": { cents: 2999, title: "5.900 Footera Points" },
  "12000": { cents: 5999, title: "12.000 Footera Points" },
  "18500": { cents: 8999, title: "18.500 Footera Points" },
};
const baseUrl = "https://basti17svh-cloud.github.io/Gerlies-FUT/online/stripe-sandbox-test.html";
const trustedOrigin = "https://basti17svh-cloud.github.io";
const headers = {
  "Access-Control-Allow-Origin": trustedOrigin,
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json; charset=utf-8",
};
function reply(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), { status, headers });
}
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers });
  if (req.method !== "POST") return reply({ error: "Method not allowed" }, 405);
  const origin = req.headers.get("origin");
  if (origin && origin !== trustedOrigin) return reply({ error: "Not allowed" }, 403);
  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY") ?? "";
  if (!stripeKey.startsWith("sk_test_")) return reply({ error: "Sandbox not configured" }, 503);
  const authorization = req.headers.get("authorization") ?? "";
  const token = /^Bearer (.+)$/i.exec(authorization)?.[1];
  if (!token) return reply({ error: "Sign in to Footera first" }, 401);

  const admin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  const { data: { user }, error: authError } = await admin.auth.getUser(token);
  if (authError || !user || !user.email || !user.email_confirmed_at || user.is_anonymous) {
    return reply({ error: "Verified Footera email account required" }, 401);
  }

  let packId = "";
  try {
    const input = await req.json();
    if (!input || typeof input.pack_id !== "string") return reply({ error: "Invalid pack" }, 400);
    packId = input.pack_id;
  } catch {
    return reply({ error: "Invalid JSON" }, 400);
  }
  const pack = packs[packId];
  if (!pack) return reply({ error: "Unknown Footera Points pack" }, 400);

  try {
    const stripe = new Stripe(stripeKey);
    // Only use the exact ONE-TIME prices already created in the Stripe Sandbox catalog.
    const catalogue = await stripe.prices.list({
      limit: 100, active: true, type: "one_time", expand: ["data.product"],
    });
    const matching = catalogue.data.filter((p) => {
      const product = p.product;
      return p.unit_amount === pack.cents && p.currency === "eur" &&
        product && typeof product === "object" && "name" in product &&
        "active" in product && product.active && product.name === pack.title;
    });
    if (catalogue.has_more || matching.length !== 1) {
      console.warn("Stripe catalog mismatch", { packId, matching: matching.length });
      return reply({ error: "Point pack not uniquely configured in Stripe Sandbox" }, 409);
    }
    const checkout = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [{ price: matching[0].id, quantity: 1 }],
      client_reference_id: user.id,
      customer_email: user.email,
      metadata: { footera_pack_id: packId, footera_points: packId, footera_user_id: user.id },
      success_url: baseUrl + "?result=success",
      cancel_url: baseUrl + "?result=cancelled",
      payment_method_types: ["card"],
      submit_type: "pay",
    });
    if (!checkout.url) return reply({ error: "Stripe did not return checkout URL" }, 502);
    return reply({ checkout_url: checkout.url });
  } catch (e) {
    console.error("Footera sandbox checkout failed", String(e));
    return reply({ error: "Checkout temporarily unavailable" }, 502);
  }
});
