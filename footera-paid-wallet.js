/* Footera V21.125 - Stripe Sandbox wallet, deliberately separate from client-generated game state.
   Server Points are read-only from the browser; each paid pack purchase requires verified server debit.
*/
(()=>{
 "use strict";
 let client=null,owner="",verified=false,balance=0,fetchInFlight=null,spending=false;
 let render=()=>{},grant=()=>{};
 const OWNER_KEY="footera-cloud-owner";
 const asPoints=v=>Number.isSafeInteger(Number(v))&&Number(v)>=0?Number(v):0;
 function paidBalance(){return verified?balance:0}
 function ready(){return verified&&!!owner}
 function emit(){try{render()}catch(e){console.warn("Footera wallet rendering",e)}}
 function invalidate(){owner="";verified=false;balance=0;emit()}
 function ownedBy(u){return !!u&&localStorage.getItem(OWNER_KEY)===u}
 async function connect(){
  if(!client)client=await window.FooteraOnline.authClient();
  return client;
 }
 async function refresh(){
  if(fetchInFlight)return fetchInFlight;
  fetchInFlight=(async()=>{
   try{
    const c=await connect();
    const {data:{user},error:authError}=await c.auth.getUser();
    if(authError||!user||user.is_anonymous||!user.email||!user.email_confirmed_at){invalidate();return false}
    if(owner!==user.id){owner=user.id;verified=false;balance=0;emit()}
    const [{data:w,error:walletError},{data:orders,error:ordersError}]=await Promise.all([
     c.from("footera_points_wallets").select("balance_points").eq("user_id",user.id).maybeSingle(),
     c.from("footera_points_spends").select("id,pack_id,points_cost,created_at").eq("user_id",user.id).order("created_at",{ascending:true}).limit(1000),
    ]);
    if(walletError||ordersError)throw walletError||ordersError;
    if(owner!==user.id)return false;
    balance=asPoints(w?.balance_points);
    verified=true;
    emit();
    if(ownedBy(user.id)&&Array.isArray(orders)&&orders.length){
     grant(orders,user.id);
    }
    return true;
   }catch(e){
    // Do not show stale server money on network failures, but never modify local Points.
    verified=false;balance=0;emit();
    console.warn("Footera server Points konnten nicht geladen werden",e);
    return false;
   }
  })();
  try{return await fetchInFlight}finally{fetchInFlight=null}
 }
 async function spend(packId){
  if(spending)throw Error("Ein anderer Points-Kauf wird gerade abgeschlossen.");
  spending=true;
  try{
   if(!(await refresh())||!verified)throw Error("Dein Serverguthaben konnte nicht geladen werden. Bitte erneut versuchen.");
   const c=await connect(),{data:{user},error:authError}=await c.auth.getUser();
   if(authError||!user||user.id!==owner||!ownedBy(owner))
    throw Error("Dieser Verein muss mit deinem bestätigten Footera-Konto verbunden sein.");
   const requestId=crypto.randomUUID();
   const {data,error}=await c.functions.invoke("footera-spend-points",{
    body:{pack_id:packId,request_id:requestId}
   });
   if(error){
    let message="Points-Kauf konnte nicht abgeschlossen werden.";
    if(error.context?.json){try{const body=await error.context.json();if(body?.error)message=body.error}catch(_){}}
    throw Error(message);
   }
   if(!data||data.request_id!==requestId||data.pack_id!==packId||
      !["spent","already_processed"].includes(data.status)||
      !Number.isSafeInteger(Number(data.balance))||Number(data.balance)<0)
    throw Error("Serverantwort konnte nicht bestätigt werden. Bitte Guthaben aktualisieren.");
   balance=Number(data.balance);
   emit();
   // A successful server debit comes with a durable ID. Grant only one locally
   // and use the ledger to restore a pack if the browser closed after payment.
   grant([{id:requestId,pack_id:packId,points_cost:data.points_cost}],owner);
   return data;
  }finally{spending=false}
 }
 function start(callbacks){
  render=typeof callbacks?.render==="function"?callbacks.render:()=>{};
  grant=typeof callbacks?.grant==="function"?callbacks.grant:()=>{};
  connect().then(c=>{
   c.auth.onAuthStateChange(()=>setTimeout(()=>refresh().catch(console.warn),0));
   return refresh();
  }).catch(e=>console.warn("Footera Points startup",e));
  window.addEventListener("focus",()=>refresh().catch(console.warn));
  document.addEventListener("visibilitychange",()=>{if(!document.hidden)refresh().catch(console.warn)});
  setInterval(()=>{if(!document.hidden&&navigator.onLine!==false)refresh().catch(console.warn)},30000);
 }
 window.FooteraPaidWallet=Object.freeze({start,refresh,spend,paidBalance,ready});
})();
