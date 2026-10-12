"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const vm=require("node:vm");

const walletCode=fs.readFileSync(path.join(__dirname,"../footera-paid-wallet.js"),"utf8");
const userId="550e8400-e29b-41d4-a716-446655440000";
const requestId="550e8400-e29b-41d4-a716-446655440001";
function setup({owned=true,failFirst=false}={}){
 const saved=new Map([["footera-cloud-owner",owned?userId:"other"]]);
 const localStorage={
  getItem:key=>saved.get(key)||null,
  setItem:(key,val)=>saved.set(key,val),
  removeItem:key=>saved.delete(key),
 };
 const calls=[],events=[];
 let fail=failFirst;
 const user={id:userId,email:"test@example.com",email_confirmed_at:"2026-10-12",is_anonymous:false};
 const client={
  auth:{getUser:async()=>({data:{user},error:null})},
  from(table){
   assert.ok(["footera_live_points_wallets","footera_live_entitlements"].includes(table));
   return {
    select(){return this},eq(){return this},order(){return this},
    maybeSingle:async()=>({data:{balance_points:600},error:null}),
    limit:async()=>({data:[],error:null}),
   };
  },
  functions:{invoke:async(name,{body})=>{
   calls.push({name,body});
   if(fail){fail=false;return{data:null,error:Error("network")}}
   return{data:{status:"spent",request_id:body.request_id,item_key:body.item_key,
    points_cost:500,balance:100,delivery_status:"delivered"},error:null};
  }},
 };
 const window={FooteraOnline:{authClient:async()=>client},
  dispatchEvent:event=>events.push(event.type)};
 vm.runInNewContext(walletCode,{window,localStorage,console,
  crypto:{randomUUID:()=>requestId},Event:class{constructor(type){this.type=type}}});
 return{wallet:window.FooteraPaidWallet,saved,calls,events};
}

test("server-confirmed LIVE season pass spends once and restores account receipts",async()=>{
 const app=setup();
 const result=await app.wallet.spendLivePass();
 assert.equal(result.delivery_status,"delivered");
 assert.equal(app.calls.length,1);
 assert.equal(app.calls[0].name,"footera-live-spend");
 assert.equal(app.calls[0].body.item_key,"season_pass:s1");
 assert.equal(app.calls[0].body.request_id,requestId);
 assert.equal(app.wallet.liveState().verified,true);
 assert.equal(app.saved.has("footera-live-request:"+userId+":season_pass:s1"),false);
});

test("failed connection retains exact request ID for safe replay",async()=>{
 const app=setup({failFirst:true});
 await assert.rejects(()=>app.wallet.spendLivePass());
 assert.equal(app.saved.get("footera-live-request:"+userId+":season_pass:s1"),requestId);
 await app.wallet.spendLivePass();
 assert.equal(app.calls[0].body.request_id,app.calls[1].body.request_id);
 assert.equal(app.saved.has("footera-live-request:"+userId+":season_pass:s1"),false);
});

test("club cannot spend another authenticated account's LIVE balance",async()=>{
 const app=setup({owned:false});
 await assert.rejects(()=>app.wallet.spendLivePass());
 assert.equal(app.calls.length,0);
});

test("premium UI never touches free Points on a verified LIVE purchase",()=>{
 const season=fs.readFileSync(path.join(__dirname,"../season-system.js"),"utf8");
 assert.match(season,/currency==="live"/);
 assert.match(season,/spendLivePass\(\)/);
 assert.match(season,/if\(!confirm\("500 gekaufte Footera Points/);
 assert.match(season,/const price=PASS_PRICE\[currency\]/);
});
