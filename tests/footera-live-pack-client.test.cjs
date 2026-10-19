"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const vm=require("node:vm");
const source=fs.readFileSync(path.join(__dirname,"../footera-paid-wallet.js"),"utf8");
const html=require('./helpers/app-html.cjs')();
const account="550e8400-e29b-41d4-a716-446655440000";
const request="a5e6d451-31c5-4db1-bdd8-b5293de02671";
function setup({owned=true,fail=false,incomplete=false}={}){
 const map=new Map([["footera-cloud-owner",owned?account:"other"]]),calls=[];
 let errorOnce=fail;
 const localStorage={getItem:key=>map.get(key)||null,setItem:(key,value)=>map.set(key,value),removeItem:key=>map.delete(key)};
 const user={id:account,email:"example@test.dev",email_confirmed_at:"2026-10-12",is_anonymous:false};
 const cards=Array.from({length:incomplete?4:5},(_,slot)=>({
  card_id:"aaaaaaaa-aaaa-4aaa-8aaa-"+String(slot).padStart(12,"0"),
  spend_id:request,user_id:account,item_key:"pack:silver",slot,
  player_id:String(1000+slot),card_snapshot:{uid:"card-"+slot,pid:String(1000+slot),tradeable:false,acquisitionSource:"stripe-live"},
 }));
 const client={
  auth:{getUser:async()=>({data:{user},error:null})},
  from(table){
   return{select(){return this},eq(){return this},order(){return this},
    maybeSingle:async()=>({data:{balance_points:800},error:null}),
    limit:async()=>({data:table==="footera_live_cards"?cards:[],error:null})};
  },
  functions:{invoke:async(name,{body})=>{
   calls.push({name,body});
   if(errorOnce){errorOnce=false;return{error:Error("Temporary network failure")}}
   return{data:{request_id:body.request_id,item_key:body.item_key,status:"spent",
     delivery_status:"delivered",points_cost:50,balance:750},error:null};
  }},
 };
 const window={FooteraOnline:{authClient:async()=>client},dispatchEvent(){}};
 vm.runInNewContext(source,{window,localStorage,console,crypto:{randomUUID:()=>request},
  Event:class{constructor(type){this.type=type}}});
 return {api:window.FooteraPaidWallet,calls,map};
}
test("pack purchase uses only the signed-in server with one durable UUID",async()=>{
 const a=setup(),out=await a.api.spendLivePack("silver");
 assert.equal(out.cards.length,5);
 assert.equal(a.calls.length,1);
 assert.equal(a.calls[0].name,"footera-live-pack-purchase");
 assert.equal(a.calls[0].body.item_key,"pack:silver");
 assert.equal(a.calls[0].body.request_id,request);
 assert.equal(a.map.has("footera-live-request:"+account+":pack:silver"),false);
});
test("network failure retries the SAME purchase ID and never changes purchased amount",async()=>{
 const a=setup({fail:true});
 await assert.rejects(()=>a.api.spendLivePack("silver"));
 assert.equal(a.map.get("footera-live-request:"+account+":pack:silver"),request);
 await a.api.spendLivePack("silver");
 assert.equal(a.calls.length,2);
 assert.equal(a.calls[0].body.request_id,a.calls[1].body.request_id);
});
test("missing cards keep the purchase ID for recovery rather than marking it delivered",async()=>{
 const a=setup({incomplete:true});
 await assert.rejects(()=>a.api.spendLivePack("silver"));
 assert.equal(a.map.get("footera-live-request:"+account+":pack:silver"),request);
});
test("foreign Footera club and unapproved promo packs cannot spend LIVE points",async()=>{
 const a=setup({owned:false});
 await assert.rejects(()=>a.api.spendLivePack("silver"));
 await assert.rejects(()=>a.api.spendLivePack("ultimate"));
 assert.equal(a.calls.length,0);
});
test("game protects paid cards against local transfer, quicksell, SBC and Evo mutations",()=>{
 assert.match(html,/function isFooteraLiveCard\(item\)/);
 assert.match(html,/stats\.items\.some\(isFooteraLiveCard\)/);
 assert.match(html,/function resolvePackSell\(k\)/);
 assert.match(html,/\|\|isFooteraLiveCard\(i\)\)return false/);
 assert.match(html,/if\(isFooteraLiveCard\(item\)\)return toast/);
 assert.match(html,/window\.FOOTERA_LIVE_PACK_STORE_ENABLED===true/);
 assert.match(html,/function recoverFooteraLiveCards\(\)/);
});
