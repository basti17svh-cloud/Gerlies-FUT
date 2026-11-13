/* Footera V21.408 – automatic error reports (proposal #11, 13.11.2026).
   Only with the existing statistics consent ("Besucherstatistik", footera-visit-consent-v1 = yes).
   Sends: build version, current screen, device class, error text and file:line. No player name,
   no club, no e-mail, no URL query. The random statistics browser id is only used to count how
   many browsers saw an error and is hashed on the server, like the visit statistics.
   Loaded first in index.html so errors during the start are caught as well. */
(()=>{
 "use strict";
 if(window.FooteraErrorReport)return;
 const CONSENT="footera-visit-consent-v1",VISITOR="footera-visit-id-v1";
 const endpoint="https://idxydyrihtyecvfjvtuk.supabase.co/functions/v1/footera-analytics";
 const MAX_PER_PAGE=8,SEND_DELAY=4000;
 const safe=k=>{try{return localStorage.getItem(k)}catch{return null}};
 const seen=new Set(),queue=[];let sent=0,timer=0;
 const enabled=()=>safe(CONSENT)==="yes"&&/^[0-9a-f-]{36}$/i.test(safe(VISITOR)||"");
 function build(){return String((typeof GFUT_BUILD!=="undefined"&&GFUT_BUILD)||document.getElementById("buildBadge")?.textContent||"").trim().slice(0,16)||"?"}
 function screen(){
  try{
   const top=[...document.querySelectorAll(".modal.active")].pop();
   if(top?.id)return top.id.slice(0,40);
   const view=document.querySelector("section.view.active");
   return (view?.id||"start").slice(0,40);
  }catch{return"?"}
 }
 function device(){
  const ua=navigator.userAgent||"",w=Math.round(innerWidth||0);
  const os=/iPhone|iPad|iPod/.test(ua)?"iOS":/Android/.test(ua)?"Android":/Windows/.test(ua)?"Windows":/Mac OS/.test(ua)?"Mac":"Andere";
  const br=/CriOS|Chrome\//.test(ua)&&!/Edg\//.test(ua)?"Chrome":/Edg\//.test(ua)?"Edge":/Firefox|FxiOS/.test(ua)?"Firefox":/Safari\//.test(ua)?"Safari":"Andere";
  const size=w<=380?"≤380":w<=430?"≤430":w<=900?"≤900":">900";
  return `${os} · ${br} · ${size} px`;
 }
 // Removes anything that could identify a person or session from the error text.
 function clean(text){
  return String(text||"").replace(/https?:\/\/[^\s)'"]+/g,m=>{try{const u=new URL(m);return u.pathname.split("/").pop()||u.hostname}catch{return"url"}})
   .replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g,"<email>")
   .replace(/\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi,"<id>")
   .replace(/\beyJ[\w-]{10,}\.[\w-]+\.[\w-]+/g,"<token>")
   .replace(/\s+/g," ").trim().slice(0,300);
 }
 function where(file,line,col){
  if(!file)return"";
  let name=String(file);try{name=new URL(name,location.href).pathname.split("/").pop()}catch{}
  return `${name.slice(0,60)}:${Number(line)||0}:${Number(col)||0}`;
 }
 function firstFrame(stack){
  const m=/((?:https?:\/\/|\.\/)[^\s)]+?):(\d+):(\d+)/.exec(String(stack||""));
  return m?where(m[1],m[2],m[3]):"";
 }
 function ignorable(message,source){
  if(!message)return true;
  if(/^Script error\.?$/i.test(message))return true; // cross-origin, no content
  if(/ResizeObserver loop/i.test(message))return true; // harmless browser notice
  if(/^(chrome|moz|safari)(-web)?-extension:/i.test(source||""))return true;
  if(/AbortError|The user aborted a request|Load failed|Failed to fetch|NetworkError/i.test(message))return true; // offline, not a bug
  return false;
 }
 function add(kind,message,source){
  if(!enabled()||sent+queue.length>=MAX_PER_PAGE)return;
  const msg=clean(message);if(ignorable(msg,source))return;
  const key=kind+"|"+msg+"|"+source;if(seen.has(key))return;seen.add(key);
  queue.push({kind,message:msg,source:String(source||"").slice(0,90),build:build(),screen:screen(),device:device()});
  clearTimeout(timer);timer=setTimeout(flush,SEND_DELAY);
 }
 async function flush(){
  if(!queue.length||!enabled())return;
  const key=window.FOOTERA_ONLINE_CONFIG?.publishableKey;
  if(!key){timer=setTimeout(flush,SEND_DELAY);return}
  const errors=queue.splice(0,queue.length);sent+=errors.length;
  try{
   await fetch(endpoint,{method:"POST",mode:"cors",cache:"no-store",keepalive:true,
    headers:{"Content-Type":"application/json","apikey":key},
    body:JSON.stringify({action:"error",consent:true,visitor_id:safe(VISITOR),errors})});
  }catch{/* reporting must never cause new errors */}
 }
 window.addEventListener("error",e=>{
  if(e.target&&e.target!==window)return; // missing image/script files are not script errors
  add("error",e.message||e.error?.message,where(e.filename,e.lineno,e.colno)||firstFrame(e.error?.stack));
 });
 window.addEventListener("unhandledrejection",e=>{
  const r=e.reason;const msg=r instanceof Error?(r.name&&r.name!=="Error"?r.name+": ":"")+r.message:typeof r==="string"?r:"";
  add("promise",msg,r instanceof Error?firstFrame(r.stack):"");
 });
 document.addEventListener("visibilitychange",()=>{if(document.hidden)flush()});
 window.FooteraErrorReport=Object.freeze({enabled,_clean:clean,_queue:()=>queue.slice(),_flush:flush,
  report:(message,source="manual")=>add("manual",message,source)});
})();
