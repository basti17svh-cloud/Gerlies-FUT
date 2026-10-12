// Footera V21.130 – staged LIVE Points spend endpoint. DO NOT DEPLOY/ENABLE until release audit.
// Account identity and wallet authority are verified on server. No price from browser.
import { createClient } from "npm:@supabase/supabase-js@2.95.0";

const allowedOrigin = "https://basti17svh-cloud.github.io";
const headers = {
  "Content-Type": "application/json; charset=utf-8",
  "Access-Control-Allow-Origin": allowedOrigin,
  "Access-Control-Allow-Methods": "OPTIONS, POST",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
};
const respond = (data: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(data), { status, headers });

// A deliberately narrow set of entitlements. Never accept player submitted Points cost.
const catalog = new Set([
  "pack:silver","pack:gold","pack:goldplayers","pack:mixed6",
  "pack:primegold","pack:electrum","pack:raremixed","pack:ultimate",
  "pack:jumbo-rare","pack:rare-mixed","pack:mega","pack:83x15","pack:84x10",
  "season_pass:s1",
]);

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers });
  if (req.method !== "POST") return respond({ error: "Method not allowed" }, 405);
  if (req.headers.get("origin") !== allowedOrigin)
    return respond({ error: "Origin not allowed" }, 403);
  // This is separate from LIVE Checkout. It must only be enabled after
  // authenticated paid entitlements can be granted atomically and restored after crashes.
  if (Deno.env.get("FOOTERA_LIVE_SPENDING_ENABLED") !== "true" ||
      Deno.env.get("FOOTERA_LIVE_DELIVERY_ENABLED") !== "true")
    return respond({ error: "Echtgeld-Purchases bleiben bis zur sicheren Lieferung deaktiviert." }, 503);
  const match = /^Bearer\s+(.+)$/i.exec(req.headers.get("authorization") || "");
  if (!match) return respond({ error: "Footera Anmeldung erforderlich." }, 401);
  const endpoint = Deno.env.get("SUPABASE_URL") || "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  if (!endpoint || !serviceKey) return respond({ error: "Server unavailable" }, 503);
  const admin = createClient(endpoint, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: { user }, error: userError } = await admin.auth.getUser(match[1]);
  if (userError || !user || user.is_anonymous || !user.email || !user.email_confirmed_at)
    return respond({ error: "Verifiziertes Footera-Konto erforderlich." }, 401);
  let itemKey: string, requestId: string;
  try {
    const body = await req.json();
    if (!body || typeof body.item_key !== "string" || typeof body.request_id !== "string")
      return respond({ error: "Invalid purchase request" }, 400);
    itemKey = body.item_key;
    requestId = body.request_id;
  } catch { return respond({ error: "Invalid request body" }, 400); }
  if (!catalog.has(itemKey) ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(requestId))
    return respond({ error: "Ungültige Artikel- oder Kauf-ID." }, 400);
  try {
    const { data, error } = await admin.rpc("footera_spend_verified_live_points", {
      p_request_id: requestId,
      p_user_id: user.id,
      p_item_key: itemKey,
    });
    if (error) {
      if (error.message.includes("Insufficient verified live Footera Points"))
        return respond({ error: "Nicht genügend verifizierte Echtgeld-Points." }, 409);
      if (error.message.includes("Live item unavailable"))
        return respond({ error: "Dieser Artikel ist noch nicht für Echtgeld erhältlich." }, 409);
      if (error.code === "23505") return respond({ error: "Dieser Season Pass wurde bereits gekauft." }, 409);
      console.error("Footera live wallet spend", error.code, error.message);
      return respond({ error: "Buchung konnte nicht abgeschlossen werden." }, 500);
    }
    if (!data || data.item_key !== itemKey || data.request_id !== requestId ||
        !["spent", "already_processed"].includes(data.status) ||
        !Number.isSafeInteger(Number(data.balance)) ||
        !Number.isSafeInteger(Number(data.points_cost)) ||
        !["pending", "delivered"].includes(data.delivery_status))
      return respond({ error: "Buchungsbestätigung ungültig." }, 502);
    // Points spending is not a delivered pack/pass. Never mark success when
    // the game-server has not yet persisted the purchased entitlement.
    if (data.delivery_status !== "delivered")
      return respond({ ...data, status: "delivery_pending" }, 202);
    return respond(data);
  } catch (e) {
    console.error("Footera live spend runtime", String(e));
    return respond({ error: "Server vorübergehend nicht erreichbar." }, 503);
  }
});
