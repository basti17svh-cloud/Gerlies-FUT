"use strict";
/* Footera LIVE staging guardrails. Run: node --test tests/footera-live-payments.test.cjs */
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const root=path.resolve(__dirname,"..");
const read=p=>fs.readFileSync(path.join(root,p),"utf8");
const checkout=read("online/footera-live-checkout.ts");
const webhook=read("online/footera-live-webhook.ts");
const spend=read("online/footera-live-spend.ts");
const migration=read("online/footera-live-entitlements-v21.135.sql");
const shop=read("footera-points-shop.js");

test("all live Points tiers have identical fixed cents and price IDs in checkout and webhook",()=>{
 const parse=code=>{
  const items=[...code.matchAll(/"(\d+)":\s*\{\s*cents:\s*(\d+),[^\n]*priceId:\s*"([^"]+)"/g)];
  return new Map(items.map(m=>[m[1],{cents:Number(m[2]),id:m[3]}]));
 };
 const a=parse(checkout),b=parse(webhook);
 assert.equal(a.size,8);
 assert.deepEqual([...a.entries()],[...b.entries()]);
 assert.deepEqual([...a.entries()].map(([id,p])=>[id,p.cents]),[
  ["100",59],["500",299],["1050",599],["1600",899],
  ["2800",1499],["5900",2999],["12000",5999],["18500",8999],
 ]);
 for(const [,p] of a)assert.match(p.id,/^price_/);
});

test("LIVE checkout always requires an explicit release flag and server-verified user",()=>{
 assert.match(checkout,/FOOTERA_LIVE_PAYMENTS_ENABLED/);
 assert.match(checkout,/!== "true"/);
 assert.match(checkout,/sk_live_/);
 assert.match(checkout,/auth\.getUser\(/);
 assert.match(checkout,/is_anonymous/);
 assert.match(checkout,/email_confirmed_at/);
 assert.match(checkout,/prices\.retrieve/);
 assert.match(checkout,/amount_total|pack\.cents/);
 assert.doesNotMatch(checkout,/sk_test_/);
});

test("LIVE webhook rejects unsigned, sandbox or unpaid events",()=>{
 assert.match(webhook,/FOOTERA_LIVE_WEBHOOK_ENABLED/);
 assert.match(webhook,/constructEventAsync/);
 assert.match(webhook,/stripe-signature/);
 assert.match(webhook,/!event\.livemode/);
 assert.match(webhook,/cs_live_/);
 assert.match(webhook,/session\.payment_status !== "paid"/);
 assert.match(webhook,/pi\.status !== "succeeded"/);
 assert.match(webhook,/listLineItems/);
 assert.match(webhook,/reconcileLiveRisk/);
 assert.match(webhook,/refunds\.list/);
 assert.match(webhook,/disputes\.list/);
 assert.doesNotMatch(webhook,/sk_test_/);
});

test("LIVE spends are fail-closed until both spending and delivery are approved",()=>{
 assert.match(spend,/FOOTERA_LIVE_SPENDING_ENABLED/);
 assert.match(spend,/FOOTERA_LIVE_DELIVERY_ENABLED/);
 assert.match(spend,/footera_spend_verified_live_points/);
 assert.match(spend,/delivery_status !== "delivered"/);
 assert.match(spend,/status: "delivery_pending"/);
 assert.match(spend,/auth\.getUser/);
 assert.match(spend,/is_anonymous/);
 assert.doesNotMatch(spend,/body\.price|body\.amount|body\.points_cost/);
});

test("database provides atomic server-owned entitlements and replay protection",()=>{
 assert.match(migration,/create table if not exists public\.footera_live_entitlements/);
 assert.match(migration,/spend_id uuid primary key references public\.footera_live_point_spends/);
 assert.match(migration,/enable row level security/);
 assert.match(migration,/grant select on public\.footera_live_entitlements to authenticated/);
 assert.match(migration,/user_id = \(select auth\.uid\(\)\)/);
 assert.match(migration,/is_anonymous/);
 assert.match(migration,/insert into public\.footera_live_entitlements/);
 assert.match(migration,/delivery_status','pending'/);
 assert.match(migration,/status','already_processed'/);
 assert.match(migration,/Insufficient verified live Footera Points/);
 assert.match(migration,/revoke all on function public\.footera_spend_verified_live_points/);
 assert.match(migration,/to service_role/);
 assert.doesNotMatch(migration,/FOOTERA_LIVE_PAYMENTS_ENABLED\s*=\s*true/);
});

test("public shop still routes to Sandbox only; no accidental live purchase UI",()=>{
 assert.match(shop,/stripe-sandbox-test\.html/);
 assert.doesNotMatch(shop,/footera-live-checkout/);
 assert.doesNotMatch(shop,/sk_live_/);
});
