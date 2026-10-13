/* Footera V21.125 - Stripe Sandbox wallet, deliberately separate from client-generated game state.
   Server Points are read-only from the browser; each paid pack purchase requires verified server debit.
*/
(()=>{
 "use strict";
 let client=null,owner="",verified=false,balance=0,fetchInFlight=null,spending=false;
 let liveOwner="",liveVerified=false,liveBalance=0,liveReceipts=[],liveFetchInFlight=null;
 let render=()=>{},grant=()=>{};
 const OWNER_KEY="footera-cloud-owner";
 const asPoints=v=>Number.isSafeInteger(Number(v))&&Number(v)>=0?Number(v):0;
 // A LIVE shop never incorporates Sandbox wallet balances into in-game Points.
 // LIVE Points are a separate, server-verified wallet and must be spent using LIVE RPCs only.
 const liveMode=()=>window.FOOTERA_LIVE_STORE_ENABLED===true;
 function paidBalance(){return !liveMode()&&verified?balance:0}
 function ready(){return !liveMode()&&verified&&!!owner}
 function emit(){try{render()}catch(e){console.warn("Footera wallet rendering",e)}}
 function invalidate(){owner="";verified=false;balance=0;invalidateLive();emit()}
 function invalidateLive(){liveOwner="";liveVerified=false;liveBalance=0;liveReceipts=[]}
 function liveChanged(){
  try{if(typeof window.dispatchEvent==="function"&&typeof Event==="function")
   window.dispatchEvent(new Event("footera:live-wallet-updated"))}catch(_){}
 }
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
    if(!liveMode()&&ownedBy(user.id)&&Array.isArray(orders)&&orders.length){
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
 // LIVE is read-only until trusted server delivery and all release gates are met.
 // Never merge these balances or receipts with Sandbox or locally minted Points.
 async function refreshLive(){
  if(liveFetchInFlight)return liveFetchInFlight;
  liveFetchInFlight=(async()=>{
   try{
    const c=await connect(),{data:{user},error:authError}=await c.auth.getUser();
    if(authError||!user||user.is_anonymous||!user.email||!user.email_confirmed_at||!ownedBy(user.id)){
     invalidateLive();return false;
    }
    const [{data:wallet,error:walletError},{data:receipts,error:receiptError}]=await Promise.all([
     c.from("footera_live_points_wallets").select("balance_points").eq("user_id",user.id).maybeSingle(),
     c.from("footera_live_entitlements")
       .select("spend_id,item_key,item_type,delivery_status,created_at")
       .eq("user_id",user.id).order("created_at",{ascending:false}).limit(250),
    ]);
    if(walletError||receiptError)throw walletError||receiptError;
    const nextBalance=Number(wallet?.balance_points??0);
    if(!Number.isSafeInteger(nextBalance))throw Error("LIVE balance out of safe range");
    const {data:{user:currentUser}}=await c.auth.getUser();
    if(!currentUser||currentUser.id!==user.id||!ownedBy(user.id)) {
     invalidateLive();return false;
    }
    liveOwner=user.id;
    liveBalance=nextBalance; // negative balances after chargebacks must remain visible
    liveReceipts=Array.isArray(receipts)?receipts.map(x=>({
      spend_id:x.spend_id,item_key:x.item_key,item_type:x.item_type,
      delivery_status:x.delivery_status,created_at:x.created_at
    })):[];
    liveVerified=true;
    liveChanged();
    return true;
   }catch(e){
    invalidateLive();
    console.warn("Footera LIVE wallet could not be loaded",e);
    return false;
   }
  })();
  try{return await liveFetchInFlight}finally{liveFetchInFlight=null}
 }
 function liveState(){
  return {verified:liveVerified&&ownedBy(liveOwner),balance:liveVerified&&ownedBy(liveOwner)?liveBalance:0,
   receipts:liveVerified&&ownedBy(liveOwner)?liveReceipts.map(r=>({...r})):[]};
 }
 // Read-only access to the server's immutable paid card inventory.
 // This method does NOT grant items or trust a browser-submitted player result.
 // Stage LIVE card checkout; the Supabase endpoint stays fail-closed without
 // explicit production flags and valid independent LIVE Stripe secrets.
 async function checkoutLive(packId){
  if(document.documentElement.dataset.footeraPayments!=="enabled")
   throw Error("Der Erwerb von Footera Points ist vorübergehend pausiert.");
  const permitted=new Set(["100","500","1050","1600","2800","5900","12000","18500"]);
  if(!permitted.has(String(packId)))throw Error("Unbekanntes Footera Points Paket.");
  const c=await connect(),{data:{user},error:e}=await c.auth.getUser();
  if(e||!user||user.is_anonymous||!user.email_confirmed_at||!ownedBy(user.id))
   throw Error("Verifiziertes und verknüpftes Footera-Konto erforderlich.");
  const {data,error}=await c.functions.invoke("footera-live-checkout",{
   body:{pack_id:String(packId)}
  });
  if(error){
   let message="Echtgeld-Checkout ist derzeit deaktiviert.";
   if(error.context?.json)try{
    const body=await error.context.json();if(body?.error)message=body.error;
   }catch(_){}
   throw Error(message);
  }
  let url;
  try{url=new URL(data?.checkout_url)}catch{
   throw Error("Ungültige Stripe Checkout Adresse.");
  }
  if(url.protocol!=="https:"||url.hostname!=="checkout.stripe.com" ||
     !url.pathname.startsWith("/c/pay/"))
    throw Error("Unbekannte Stripe Checkout Adresse.");
  return url.toString();
 }
 async function fetchLiveCards(spendId=null){
  if(!(await refreshLive()))throw Error("Verifiziertes Live-Konto erforderlich.");
  const c=await connect(),{data:{user},error:e}=await c.auth.getUser();
  if(e||!user||user.id!==liveOwner||!ownedBy(user.id))
   throw Error("Dein Verein ist nicht mit diesem Echtgeldkonto verbunden.");
  let query=c.from("footera_live_cards")
   .select("card_id,spend_id,user_id,item_key,slot,player_id,card_snapshot,created_at")
   .eq("user_id",user.id).order("created_at",{ascending:false});
  if(spendId)query=query.eq("spend_id",spendId);
  const {data,error}=await query.limit(spendId?30:1000);
  if(error||!Array.isArray(data))throw Error("Live-Karten konnten nicht geladen werden.");
  const {data:{user:again}}=await c.auth.getUser();
  if(!again||again.id!==user.id||!ownedBy(user.id))
   throw Error("Footera-Konto hat sich während des Ladens geändert.");
  if(!spendId&&data.length>=1000)throw Error("Zu viele Live-Karten für eine sichere Einzelabfrage.");
  return data.filter(x=>x.user_id===user.id&&(!spendId||x.spend_id===spendId))
    .map(x=>({
      card_id:x.card_id,spend_id:x.spend_id,item_key:x.item_key,slot:x.slot,
      player_id:x.player_id,card_snapshot:{...x.card_snapshot},created_at:x.created_at
    }));
 }
 let livePackBusy=false;
 async function spendLivePack(packId){
  if(!["silver","gold"].includes(packId))
   throw Error("Dieser Echtgeld-Packtyp hat noch keine vollständige sichere Auslieferung.");
  if(livePackBusy)throw Error("Ein Echtgeld-Packkauf läuft bereits.");
  livePackBusy=true;
  try{
   if(!(await refreshLive()))throw Error("Echtgeld-Wallet nicht verfügbar.");
   const c=await connect(),{data:{user},error:e}=await c.auth.getUser();
   if(e||!user||user.id!==liveOwner||!ownedBy(user.id))
    throw Error("Das Echtgeld-Konto gehört nicht zu deinem Verein.");
   const itemKey="pack:"+packId,storeKey="footera-live-request:"+user.id+":"+itemKey;
   const existing=localStorage.getItem(storeKey);
   const requestId=existing||crypto.randomUUID();
   if(!existing)localStorage.setItem(storeKey,requestId);
   const {data,error}=await c.functions.invoke("footera-live-pack-purchase",{
    body:{item_key:itemKey,request_id:requestId}
   });
   if(error){
    let message="Echtgeld-Packkauf wurde nicht abgeschlossen.";
    if(error.context?.json)try{
     const body=await error.context.json();if(body?.error)message=body.error;
    }catch(_){}
    throw Error(message);
   }
   if(!data || data.request_id!==requestId || data.item_key!==itemKey ||
      !["spent","already_processed"].includes(data.status) ||
      data.delivery_status!=="delivered")
    throw Error("Server-Lieferbeleg nicht bestätigt. Kauf erneut prüfen.");
   const cards=await fetchLiveCards(requestId);
   if(cards.length!==5 ||
      cards.some(x=>x.item_key!==itemKey) ||
      new Set(cards.map(x=>x.slot)).size!==cards.length)
    throw Error("Nicht alle Karten sind sichtbar. Kauf-ID bleibt zur Wiederherstellung gespeichert.");
   localStorage.removeItem(storeKey);
   return {receipt:data,cards:cards.sort((a,b)=>a.slot-b.slot)};
  }finally{livePackBusy=false}
 }
 async function spendLivePass(){
  if(!(await refreshLive()))throw Error("Echtgeld-Wallet nicht verfügbar.");
  const c=await connect(),{data:{user},error:e}=await c.auth.getUser();
  if(e||!user||!ownedBy(user.id)||user.id!==liveOwner)throw Error("Footera-Konto nicht bestätigt.");
  const item="season_pass:s1";
  const cacheKey="footera-live-request:"+user.id+":"+item;
  const stored=localStorage.getItem(cacheKey);
  const id=stored||crypto.randomUUID();
  if(!stored)localStorage.setItem(cacheKey,id);
  const {data,error}=await c.functions.invoke("footera-live-spend",{body:{item_key:item,request_id:id}});
  if(error||!data||data.request_id!==id||data.item_key!==item||
     !["spent","already_processed"].includes(data.status)||data.delivery_status!=="delivered")
   throw Error("Live-Kauf noch nicht bestätigt. Bitte erneut versuchen.");
  localStorage.removeItem(cacheKey);
  await refreshLive();
  return data;
 }
 async function spend(packId){
  if(liveMode())throw Error("Sandbox-Points können im Echtgeldmodus nicht ausgegeben werden.");
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
   c.auth.onAuthStateChange(()=>{
    invalidateLive();
    setTimeout(()=>{
     refresh().catch(console.warn);
     refreshLive().catch(console.warn);
    },0);
   });
   return Promise.all([refresh(),refreshLive()]);
  }).catch(e=>console.warn("Footera Points startup",e));
  window.addEventListener("focus",()=>{
   refresh().catch(console.warn);
   refreshLive().catch(console.warn);
  });
  document.addEventListener("visibilitychange",()=>{if(!document.hidden){
   refresh().catch(console.warn);
   refreshLive().catch(console.warn);
  }});
  setInterval(()=>{if(!document.hidden&&navigator.onLine!==false){
   refresh().catch(console.warn);
   refreshLive().catch(console.warn);
  }},30000);
 }
 window.FooteraPaidWallet=Object.freeze({start,refresh,spend,paidBalance,ready,refreshLive,liveState,spendLivePass,fetchLiveCards,spendLivePack,checkoutLive});
})();
