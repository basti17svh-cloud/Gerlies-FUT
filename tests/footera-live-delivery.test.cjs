"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const read=(p)=>fs.readFileSync(path.join(__dirname,"..",p),"utf8");
const sql=read("online/footera-live-delivery-v21.136.sql");
const spend=read("online/footera-live-spend.ts");
const wallet=read("footera-paid-wallet.js");
const season=read("season-system.js");

test("no LIVE Points debit without database-enforced delivery",()=>{
 assert.match(sql,/fulfillment_ready boolean not null default false/);
 assert.match(sql,/set fulfillment_ready=false/);
 assert.match(sql,/before insert on public\.footera_live_entitlements/);
 assert.match(sql,/enabled=true and fulfillment_ready=true/);
 assert.match(sql,/Live item fulfillment not implemented/);
 assert.match(sql,/new\.delivery_status:='delivered'/);
 assert.match(sql,/jsonb_build_object\('season_key','s1','premium',true\)/);
});

test("LIVE spending verifies database receipt and not just RPC status",()=>{
 assert.match(spend,/from\("footera_live_entitlements"\)/);
 assert.match(spend,/receipt\.delivery_status !== "delivered"/);
 assert.match(spend,/receipt\.user_id !== user\.id/);
 assert.match(spend,/FOOTERA_LIVE_DELIVERY_ENABLED/);
});

test("LIVE wallet never merges with Sandbox and retries preserve idempotency",()=>{
 assert.match(wallet,/footera_live_points_wallets/);
 assert.match(wallet,/footera_points_wallets/);
 assert.match(wallet,/footera-live-request:/);
 assert.match(wallet,/localStorage\.setItem\(cacheKey,id\)/);
 assert.match(wallet,/localStorage\.removeItem\(cacheKey\)/);
 assert.match(wallet,/item_key:item,request_id:id/);
});

test("season pass applies only verified delivered LIVE ownership",()=>{
 assert.match(season,/function syncVerifiedLiveSeasonPass/);
 assert.match(season,/verified\?\.verified/);
 assert.match(season,/r\.delivery_status==="delivered"/);
 assert.match(season,/r\.item_key==="season_pass:"\+season\.key/);
});
