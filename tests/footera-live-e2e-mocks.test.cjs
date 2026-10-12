"use strict";
/*
 * Footera LIVE payment integration contract tests. Everything uses local mocks:
 * no Stripe API key, no network, no real checkout, no Points ledger changes.
 * Node 22.16+ supports stripTypeScriptTypes.
 */
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const vm=require("node:vm");
const {stripTypeScriptTypes}=require("node:module");

const root=path.resolve(__dirname,"..");
const USER="cf3e69b1-62cd-42d4-ae31-7b9830f9a228";
const PRICE="price_1UPdtOQsfnvccsH8pdYUhygp";
function load(kind,opts={}){
 const source=fs.readFileSync(path.join(root,"online","footera-live-"+kind+".ts"),"utf8")
  .replace(/^import\s+.*?;\s*$/gm,"");
 const code=stripTypeScriptTypes(source);
 const state={
  config:{
   FOOTERA_LIVE_PAYMENTS_ENABLED:"true",
   FOOTERA_LIVE_WEBHOOK_ENABLED:"true",
   FOOTERA_STRIPE_LIVE_SECRET_KEY:"rk_live_fake_for_unit_tests",
   FOOTERA_STRIPE_LIVE_WEBHOOK_SECRET:"whsec_fake_for_unit_tests",
   SUPABASE_URL:"https://fake.supabase.co",
   SUPABASE_SERVICE_ROLE_KEY:"fake_service_role",
   ...opts.env
  },
  rpc:[], created:[], mockUser:{id:USER,email:"unit@example.invalid",email_confirmed_at:"2026-10-12T00:00:00Z",is_anonymous:false},
  session:null, pi:null, price:null, lineItems:null, charge:null,
  refunds:{data:[],has_more:false}, disputes:{data:[],has_more:false},
  storedPayment:null, creditSet:new Set()
 };
 state.session={
  id:"cs_live_mock_1",livemode:true,mode:"payment",payment_status:"paid",currency:"eur",
  amount_total:59,client_reference_id:USER,
  metadata:{footera_pack_id:"100",footera_points:"100",footera_user_id:USER},
  payment_intent:"pi_mock_1"
 };
 state.pi={id:"pi_mock_1",livemode:true,status:"succeeded",amount:59,amount_received:59,currency:"eur",latest_charge:"ch_mock_1"};
 state.price={
  id:PRICE,livemode:true,active:true,type:"one_time",currency:"eur",unit_amount:59,
  product:{id:"prod_mock_1",name:"100 Footera Points",active:true}
 };
 state.lineItems={data:[{quantity:1,price:{id:PRICE,unit_amount:59}}],has_more:false};
 state.charge={id:"ch_mock_1",livemode:true,paid:true,currency:"eur",amount:59,payment_intent:"pi_mock_1"};
 class StripeMock{
  constructor(){
   this.prices={retrieve:async()=>state.price};
   this.checkout={sessions:{
    create:async request=>{state.created.push(request);return {livemode:true,url:"https://checkout.stripe.com/c/pay/mock"};},
    retrieve:async()=>state.session,
    listLineItems:async()=>state.lineItems,
   }};
   this.paymentIntents={retrieve:async()=>state.pi};
   this.charges={retrieve:async()=>state.charge};
   this.refunds={list:async()=>state.refunds};
   this.disputes={list:async()=>state.disputes};
   this.webhooks={constructEventAsync:async(raw,sig)=>{
     if(sig!=="unit-signature")throw Error("invalid signature");
     return JSON.parse(raw);
   }};
  }
  static createSubtleCryptoProvider(){return {}}
 }
 const admin={
  auth:{getUser:async()=>({data:{user:state.mockUser},error:null})},
  rpc:async(name,args)=>{
   state.rpc.push({name,args});
   if(name==="footera_credit_verified_live_stripe_points"){
    const id=args.p_checkout_session_id;
    if(state.creditSet.has(id))return {data:{status:"already_credited"},error:null};
    state.creditSet.add(id);
    state.storedPayment={stripe_checkout_session_id:id,amount_cents:args.p_amount_cents};
    return {data:{status:"credited"},error:null};
   }
   return {data:{status:"reconciled"},error:null};
  },
  from:()=>({
   select:()=>({eq:()=>({maybeSingle:async()=>({data:state.storedPayment,error:null})})})
  })
 };
 const environment={
  Stripe:StripeMock,createClient:()=>admin,
  Deno:{env:{get:k=>state.config[k]??null},serve:f=>{state.handle=f}},
  Request,Response,URL,URLSearchParams,TextEncoder,TextDecoder,crypto,
  console:{info(){},error(){},warn(){}}
 };
 vm.runInNewContext(code,environment,{timeout:2000});
 assert.equal(typeof state.handle,"function");
 return state;
}
function post(url,body,headers={}){
 return new Request(url,{method:"POST",headers,body:typeof body==="string"?body:JSON.stringify(body)});
}
async function checkout(state,payload={pack_id:"100"},headers={}){
 return state.handle(post("https://fake.supabase.co/functions/v1/footera-live-checkout",payload,{
  origin:"https://basti17svh-cloud.github.io",
  authorization:"Bearer fake-verified-jwt",
  ...headers
 }));
}
async function hook(state,overrides={},signature="unit-signature"){
 const event={type:"checkout.session.completed",livemode:true,data:{object:{id:"cs_live_mock_1"}},...overrides};
 return state.handle(post("https://fake.supabase.co/functions/v1/footera-live-webhook",event,
  signature===null?{}:{"stripe-signature":signature}));
}

test("LIVE checkout: release flag stays fail-closed without auth/charging",async()=>{
 const s=load("checkout",{env:{FOOTERA_LIVE_PAYMENTS_ENABLED:"false"}});
 assert.equal((await checkout(s)).status,503);
 assert.equal(s.created.length,0);
});
test("LIVE checkout: rejects invalid origin and missing auth",async()=>{
 const s=load("checkout");
 assert.equal((await checkout(s,{pack_id:"100"},{origin:"https://evil.invalid"})).status,403);
 assert.equal((await checkout(s,{pack_id:"100"},{authorization:""})).status,401);
 assert.equal(s.created.length,0);
});
test("LIVE checkout: requires confirmed Footera account",async()=>{
 const s=load("checkout");s.mockUser.email_confirmed_at=null;
 assert.equal((await checkout(s)).status,401);assert.equal(s.created.length,0);
});
test("LIVE checkout: rejects a test secret",async()=>{
 const s=load("checkout",{env:{FOOTERA_STRIPE_LIVE_SECRET_KEY:"sk_test_mock"}});
 assert.equal((await checkout(s)).status,503);
});
test("LIVE checkout: unknown package never reaches Stripe",async()=>{
 const s=load("checkout");
 assert.equal((await checkout(s,{pack_id:"999999"})).status,400);
 assert.equal(s.created.length,0);
});
test("LIVE checkout: rejects changed live price, never creates a checkout",async()=>{
 const s=load("checkout");s.price.unit_amount=2;
 assert.equal((await checkout(s)).status,409);assert.equal(s.created.length,0);
});
test("LIVE checkout: authentic server-selected price, account and metadata",async()=>{
 const s=load("checkout");
 const res=await checkout(s,{pack_id:"100",amount_total:0,price:"attacker",user_id:"attacker"});
 assert.equal(res.status,200);
 assert.equal((await res.json()).checkout_url,"https://checkout.stripe.com/c/pay/mock");
 assert.equal(s.created.length,1);
 const request=s.created[0];
 assert.equal(request.mode,"payment");
 assert.equal(request.line_items[0].price,PRICE);
 assert.equal(request.line_items[0].quantity,1);
 assert.equal(request.client_reference_id,USER);
 assert.equal(request.metadata.footera_user_id,USER);
 assert.equal(request.metadata.footera_pack_id,"100");
 assert.equal(request.customer_email,"unit@example.invalid");
});
test("LIVE webhook: disabled flag rejects before reading or crediting",async()=>{
 const s=load("webhook",{env:{FOOTERA_LIVE_WEBHOOK_ENABLED:"false"}});
 assert.equal((await hook(s)).status,503);assert.equal(s.rpc.length,0);
});
test("LIVE webhook: rejects missing or invalid signature",async()=>{
 const s=load("webhook");
 assert.equal((await hook(s,{},null)).status,400);
 assert.equal((await hook(s,{},"invalid")).status,400);
 assert.equal(s.rpc.length,0);
});
test("LIVE webhook: rejects Sandbox events",async()=>{
 const s=load("webhook");
 assert.equal((await hook(s,{livemode:false})).status,400);assert.equal(s.rpc.length,0);
});
test("LIVE webhook: unpaid session is never credited",async()=>{
 const s=load("webhook");s.session.payment_status="unpaid";
 assert.equal((await hook(s)).status,200);assert.equal(s.rpc.length,0);
});
test("LIVE webhook: tampered amount, price, identity, or unsettled intent block credits",async()=>{
 const changes=[
  s=>{s.session.amount_total=1;},
  s=>{s.lineItems.data[0].price.id="price_forged";},
  s=>{s.session.client_reference_id="other";},
  s=>{s.pi.status="requires_payment_method";}
 ];
 for(const change of changes){
  const s=load("webhook");change(s);
  assert.equal((await hook(s)).status,422);
  assert.equal(s.rpc.filter(x=>x.name==="footera_credit_verified_live_stripe_points").length,0);
 }
});
test("LIVE webhook: successful verified event credits once and reconciles risk",async()=>{
 const s=load("webhook");
 assert.equal((await hook(s)).status,200);
 assert.equal(s.creditSet.size,1);
 assert.equal(s.rpc.filter(x=>x.name==="footera_credit_verified_live_stripe_points").length,1);
 assert.equal(s.rpc.filter(x=>x.name==="footera_reconcile_verified_live_payment_risk").length,1);
 const credit=s.rpc.find(x=>x.name==="footera_credit_verified_live_stripe_points").args;
 assert.equal(credit.p_amount_cents,59);
 assert.equal(credit.p_pack_points,100);
 assert.equal(credit.p_user_id,USER);
});
test("LIVE webhook: duplicate delivery cannot grant a second mocked credit",async()=>{
 const s=load("webhook");
 assert.equal((await hook(s)).status,200);
 assert.equal((await hook(s)).status,200);
 assert.equal(s.creditSet.size,1);
 assert.equal(s.rpc.filter(x=>x.name==="footera_credit_verified_live_stripe_points").length,2);
});
test("LIVE webhook: refund event reconciles verified Stripe current amounts",async()=>{
 const s=load("webhook");await hook(s);
 s.rpc.length=0;
 s.refunds={data:[{status:"succeeded",amount:30},{status:"pending",amount:29}],has_more:false};
 assert.equal((await hook(s,{type:"charge.refunded",data:{object:{id:"ch_mock_1"}}})).status,200);
 const calls=s.rpc.filter(x=>x.name==="footera_reconcile_verified_live_payment_risk");
 assert.equal(calls.length,1);
 assert.equal(calls[0].args.p_confirmed_refund_cents,30);
});
test("LIVE webhook: disputes create holds and won disputes release holds",async()=>{
 const s=load("webhook");await hook(s);
 s.rpc.length=0;
 s.disputes={data:[{status:"needs_response",amount:59}],has_more:false};
 const dispute={type:"charge.dispute.updated",data:{object:{charge:"ch_mock_1"}}};
 assert.equal((await hook(s,dispute)).status,200);
 assert.equal(s.rpc.at(-1).args.p_current_dispute_hold_cents,59);
 s.disputes={data:[{status:"won",amount:59}],has_more:false};
 assert.equal((await hook(s,dispute)).status,200);
 assert.equal(s.rpc.at(-1).args.p_current_dispute_hold_cents,0);
});
