/* Footera V21.133 – optional first-party visitor analytics. No tracking before consent.
   A browser (not a person) is represented by a local random UUID. No IP or URL is sent. */
(()=>{
 "use strict";
 if(window.FooteraVisitorAnalytics)return;
 const CONSENT="footera-visit-consent-v1", VISITOR="footera-visit-id-v1",
       ATTR="footera-visit-source-v1",PENDING="footera-visit-forget-v1";
 const origin="https://idxydyrihtyecvfjvtuk.supabase.co";
 const endpoint=origin+"/functions/v1/footera-analytics";
 const safe=v=>{try{return localStorage.getItem(v)}catch{return null}};
 const save=(k,v)=>{try{localStorage.setItem(k,v);return true}catch{return false}};
 const erase=k=>{try{localStorage.removeItem(k)}catch{}};
 let sending=false,lastSend=0,prevAuthId="",showing=false,authBound=false;
 const now=()=>Date.now();
 function attribution(){
   try{
     const p=new URLSearchParams(location.search);
     const u=(p.get("utm_source")||p.get("source")||"").trim().toLowerCase();
     if(["ig","instagram","insta"].includes(u))return"instagram";
     if(["fb","facebook"].includes(u))return"facebook";
     if(["tiktok","tt"].includes(u))return"tiktok";
     if(["google","search"].includes(u))return"google";
     const r=new URL(document.referrer||"https://example.invalid");
     if(/(^|\.)instagram\.com$/.test(r.hostname))return"instagram";
     if(/(^|\.)facebook\.com$/.test(r.hostname)||r.hostname==="l.facebook.com")return"facebook";
     if(/(^|\.)tiktok\.com$/.test(r.hostname))return"tiktok";
     if(/(^|\.)google\./.test(r.hostname))return"google";
   }catch{}
   return"direct";
 }
 function uuid(){
   if(!crypto?.randomUUID)return null;
   return crypto.randomUUID();
 }
 async function config(){
   if(window.FOOTERA_ONLINE_CONFIG?.publishableKey)return window.FOOTERA_ONLINE_CONFIG;
   await new Promise((resolve,reject)=>{
     const s=document.createElement("script");s.src="./online-config.js";
     s.onload=resolve;s.onerror=reject;document.head.append(s);
   }).catch(()=>{});
   return window.FOOTERA_ONLINE_CONFIG;
 }
 let authed=null;
 async function accessToken(){
   try{
     const c=await window.FooteraOnline?.authClient?.();
     if(!c)return null;
     if(!authed){
       authed=c;
       if(!authBound&&c.auth?.onAuthStateChange){
         authBound=true;
         c.auth.onAuthStateChange(()=>setTimeout(()=>track(true),500));
       }
     }
     const {data:{session}}=await c.auth.getSession();
     const u=session?.user;
     const id=(!u?.is_anonymous&&u?.email_confirmed_at)?u.id:"";
     if(id&&id!==prevAuthId){prevAuthId=id;lastSend=0}
     return session?.access_token||null;
   }catch{return null}
 }
 async function send(action,id,source){
   const c=await config();
   if(!c?.publishableKey)throw Error("Online-Konfiguration nicht verfügbar");
   const token=await accessToken();
   const res=await fetch(endpoint,{
      method:"POST",mode:"cors",cache:"no-store",
      headers:{"Content-Type":"application/json","apikey":c.publishableKey,...(token?{Authorization:"Bearer "+token}:{})},
      body:JSON.stringify({action,consent:true,visitor_id:id, ...(action==="visit"?{source}:{})})
   });
   if(!res.ok)throw Error("Statistikdienst antwortet nicht");
   const data=await res.json();
   if(!data.ok)throw Error("Fehler beim Speichern der Statistik");
   return true;
 }
 async function track(force=false){
   if(safe(CONSENT)!=="yes"||document.hidden||sending)return;
   if(!force&&now()-lastSend<15*60*1000)return;
   const id=safe(VISITOR);
   if(!id)return;
   sending=true;
   try{
     await send("visit",id,safe(ATTR)||attribution());
     lastSend=now();
   }catch(e){console.warn("Footera-Statistik derzeit nicht erreichbar:",String(e))}
   finally{sending=false}
 }
 async function finishPendingDeletion(){
   const id=safe(PENDING);
   if(!id)return;
   try{await send("forget",id);erase(PENDING)}
   catch{ /* Retry at next visit without tracking */ }
 }
 function hidePanel(){const el=document.getElementById("footeraAnalyticsConsent");if(el)el.remove();showing=false}
 function panel(){
   if(showing)return;
   showing=true;
   const root=document.createElement("section");
   root.id="footeraAnalyticsConsent";
   root.setAttribute("role","dialog");
   root.setAttribute("aria-label","Footera Besucherstatistik");
   root.style.cssText="position:fixed;z-index:2147482000;left:12px;right:12px;bottom:calc(16px + env(safe-area-inset-bottom,0px));max-width:440px;margin:auto;background:#190c15;color:#fff;border:1px solid #bb5073;border-radius:15px;padding:15px 17px;box-shadow:0 9px 35px #000b;font:14px/1.45 system-ui,-apple-system,Arial,sans-serif";
   const consent=safe(CONSENT)==="yes";
   const headline=document.createElement("strong");
   headline.textContent="Footera · Besucherstatistik";
   headline.style.cssText="display:block;font-size:15px;margin-bottom:7px;color:#ffb8d2";
   const details=document.createElement("p");
   details.textContent="Möchtest du uns helfen, Besuche und Instagram-Reichweite zu zählen? Wir verwenden dazu nur eine zufällige Browser-ID, keine IP-Adresse und keine vollständige Besuchs-URL. Freiwillig und jederzeit widerrufbar.";
   details.style.cssText="margin:0 0 12px;color:#e9c9d5";
   const actions=document.createElement("div");
   actions.style.cssText="display:flex;gap:9px;flex-wrap:wrap";
   function button(label,kind,handler){
      const b=document.createElement("button");b.type="button";b.textContent=label;
      b.style.cssText="flex:1;min-width:100px;padding:9px 12px;border-radius:10px;font:700 13px system-ui;cursor:pointer;border:1px solid #ca6a8a;color:#fff;background:"+(kind==="yes"?"#c72559":"#34202e");
      b.addEventListener("click",handler);actions.append(b);
   }
   const message=document.createElement("small");
   message.style.cssText="display:block;margin-top:10px;color:#e6becd";
   button(consent?"Aktiv lassen":"Zustimmen","yes",()=>{
      if(!save(CONSENT,"yes")){message.textContent="Browser-Speicherung ist blockiert. Keine Statistik aktiviert.";return}
      if(!safe(VISITOR)&&!save(VISITOR,uuid()||"")){message.textContent="Statistik nicht verfügbar.";return}
      save(ATTR,attribution());hidePanel();track(true);
   });
   button(consent?"Widerrufen & löschen":"Nein, danke","no",async()=>{
      const id=safe(VISITOR);
      save(CONSENT,"no");erase(ATTR);
      if(id){save(PENDING,id);erase(VISITOR)}
      hidePanel();
      await finishPendingDeletion();
   });
   const help=document.createElement("p");
   help.style.cssText="font-size:11px;margin:8px 0 0;color:#cda5b7";
   help.textContent="Ohne Zustimmung erfassen wir hier keine Besucherstatistik. Die App bleibt vollständig nutzbar.";
   root.append(headline,details,actions,message,help);
   document.body.append(root);
 }
 function init(){
   if(!document.body)return;
   const manage=document.createElement("button");manage.type="button";
   manage.textContent="Statistik";manage.title="Optionale Besucherstatistik verwalten";
   manage.id="footeraAnalyticsSettings";
   manage.style.cssText="position:fixed;z-index:900;left:8px;bottom:calc(4px + env(safe-area-inset-bottom,0px));padding:2px 6px;border-radius:7px;background:#160b12d9;border:1px solid #653048;color:#cba8b8;font:10px system-ui;opacity:.83;cursor:pointer";
   manage.addEventListener("click",panel);document.body.append(manage);
   finishPendingDeletion();
   if(safe(CONSENT)==="yes")track(true);
   else if(safe(CONSENT)!=="no")panel();
   window.addEventListener("focus",()=>track());
   document.addEventListener("visibilitychange",()=>{if(!document.hidden)track()});
   setInterval(()=>{if(!document.hidden)track()},15*60*1000);
 }
 window.FooteraVisitorAnalytics=Object.freeze({
   openSettings:panel,enabled:()=>safe(CONSENT)==="yes"
 });
 if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});
 else init();
})();
