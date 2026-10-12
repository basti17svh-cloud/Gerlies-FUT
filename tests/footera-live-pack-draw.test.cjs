"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const read=name=>fs.readFileSync(path.join(__dirname,"..",name),"utf8");
const client=read("pack-odds.js");
const server=read("online/footera-live-pack-odds.mjs");
const apiClient=require("../pack-odds.js");
const apiServer=new Function(server.replace("export const FooteraPackOdds=","const FooteraPackOdds=")+"\nreturn FooteraPackOdds;")();
const edge=read("online/footera-live-pack-purchase.ts");
const migration=read("online/footera-live-atomic-packs-v21.139.sql");

test("server and browser use identical audited pack-odds source",()=>{
 const c=client.slice(client.indexOf('})(typeof window!=="undefined"?window:null,function(){')+
   '})(typeof window!=="undefined"?window:null,function(){'.length,client.lastIndexOf("\n});"));
 const s=server.slice(server.indexOf("(function(){")+"(function(){".length,server.lastIndexOf("\n})();"));
 assert.equal(s,c);
});
test("weighted server draw respects bronze/silver/gold ratings and guarantees",()=>{
 const players=Array.from({length:800},(_,i)=>({id:"g"+i,ovr:75+i%18}))
  .concat(Array.from({length:800},(_,i)=>({id:"s"+i,ovr:65+i%10})))
  .concat(Array.from({length:800},(_,i)=>({id:"b"+i,ovr:45+i%20})));
 const icons=Array.from({length:20},(_,i)=>({id:"i"+i,ovr:87+i%9}));
 const specs=[
  {count:5,composition:[{count:5,min:65,max:74}],guarantee:0,iconChance:0},
  {count:5,composition:[{count:5,min:75,max:99}],guarantee:0,iconChance:0.0002},
  {count:12,composition:[{count:12,min:75,max:99}],guarantee:82,iconChance:0.002},
  {count:6,composition:[{count:3,min:75,max:99},{count:2,min:65,max:74},{count:1,min:0,max:64}],guarantee:81,iconChance:0.001},
  {count:30,composition:[{count:30,min:75,max:99}],guarantee:84,iconChance:0.004},
 ];
 for(const pack of specs){
  const a=apiClient.draw(pack,players,{icons,random:()=>0.44});
  const b=apiServer.draw(pack,players,{icons,random:()=>0.44});
  assert.equal(a.available,true);
  assert.equal(b.available,true);
  assert.deepEqual(a.items.map(x=>x.base.id),b.items.map(x=>x.base.id));
  assert.equal(b.items.length,pack.count);
  assert.equal(new Set(b.items.map(x=>x.base.id)).size,pack.count);
  const target=pack.guarantee;
  if(target)assert.ok(b.items.some(x=>x.base.ovr>=target));
  let offset=0;
  for(const g of pack.composition)for(let n=0;n<g.count;n++){
   const value=b.items[offset++].base.ovr;
   assert.ok(value>=g.min&&value<=g.max);
  }
 }
});
test("server pack API rejects browser-supplied player rosters, bypass flags and cross-account ownership",()=>{
 for(const flag of ["FOOTERA_LIVE_PAYMENTS_ENABLED","FOOTERA_LIVE_SPENDING_ENABLED",
   "FOOTERA_LIVE_DELIVERY_ENABLED","FOOTERA_LIVE_PACKS_ENABLED"])
  assert.match(edge,new RegExp(flag));
 assert.match(edge,/crypto\.getRandomValues\(buffer\)/);
 assert.match(edge,/auth\.getUser\(token\)/);
 assert.match(edge,/footera_purchase_verified_live_pack/);
 assert.match(edge,/footera_live_draw_pool/);
 assert.match(edge,/previous\.user_id!==user\.id/);
 assert.doesNotMatch(edge,/body\.player_ids|body\.amount|body\.balance|Math\.random/);
});
test("database settles complete server inventory in same debit transaction",()=>{
 assert.match(migration,/create or replace function public\.footera_purchase_verified_live_pack/);
 assert.match(migration,/insert into public\.footera_live_point_spends/);
 assert.match(migration,/update public\.footera_live_points_wallets/);
 assert.match(migration,/insert into public\.footera_live_cards/);
 assert.match(migration,/insert into public\.footera_live_entitlements/);
 assert.match(migration,/Cannot deliver incomplete LIVE pack/);
 assert.match(migration,/Insufficient verified live Footera Points/);
 assert.match(migration,/revoke all on function public\.footera_purchase_verified_live_pack/);
 assert.match(migration,/status','already_processed/);
});
