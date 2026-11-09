// V21.378 Pack-Tagebuch: the last packs you opened, with date, pack name, best pull and everything else in it.
// Kept in a small device-local log (localStorage), the save stays untouched.
(function(root){
 "use strict";
 const KEY="footera-pack-diary-v1",KEEP=80,MODAL_ID="packDiaryModal",KIND="pack-diary";
 const read=()=>{try{const v=JSON.parse(localStorage.getItem(KEY)||"[]");return Array.isArray(v)?v.filter(x=>x&&typeof x==="object"):[]}catch(e){return[]}};
 const write=v=>{try{localStorage.setItem(KEY,JSON.stringify(v.slice(-KEEP)))}catch(e){}};
 const num=v=>{const n=Number(v);return Number.isFinite(n)?n:0};
 const escText=v=>typeof esc==="function"?esc(v):String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
 function snapshot(item){
  if(!item||typeof item!=="object")return null;
  try{const out={};for(const [k,v] of Object.entries(item)){if(k==="clubStats"||typeof v==="function")continue;out[k]=v}return JSON.parse(JSON.stringify(out))}catch(e){return null}
 }
 function row(item){
  const b=typeof displayBase==="function"?displayBase(item):null;if(!b)return null;
  const ovr=num(typeof itemRating==="function"?itemRating(item):b.ovr)||num(b.ovr);
  return{name:String(b.name||"Spieler"),ovr,pos:String(item.overridePosition||b.position||""),special:item.variant==="special"||item.variant==="icon-mid",event:String(item.eventName||"")};
 }
 const rank=(a,c)=>c.ovr-a.ovr||(c.special?1:0)-(a.special?1:0);
 function packName(id){
  try{const p=typeof PACKS!=="undefined"&&Array.isArray(PACKS)?PACKS.find(x=>x.id===id):null;if(p?.name)return String(p.name)}catch(e){}
  return String(id||"Pack");
 }
 function record(id,items,at=Date.now()){
  try{
   if(!Array.isArray(items)||!items.length)return null;
   const rows=[];let best=null,bestRow=null;
   for(const item of items){const r=row(item);if(!r)continue;rows.push(r);if(!bestRow||rank(r,bestRow)<0){bestRow=r;best=item}}
   if(!rows.length)return null;
   rows.sort(rank);
   const entry={at:num(at)||Date.now(),id:String(id||""),name:packName(id),players:rows,best:snapshot(best)};
   const list=read();list.push(entry);write(list);
   return entry;
  }catch(e){console.warn("Pack-Tagebuch:",e);return null}
 }
 function entries(){return read().sort((a,c)=>num(c.at)-num(a.at))}
 function stats(list=entries()){
  let players=0,top=null,big=0;
  for(const e of list)for(const p of e.players||[]){players++;if(num(p.ovr)>=85)big++;if(!top||rank(p,top)<0)top=p}
  return{packs:list.length,players,big,top};
 }
 const when=at=>{try{return new Date(num(at)).toLocaleString("de-DE",{timeZone:"Europe/Berlin",weekday:"short",day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit"})}catch(e){return""}};
 function cardFor(entry){
  try{if(!entry.best||typeof cardHTML!=="function"||typeof displayBase!=="function")return"";const b=displayBase(entry.best);return b?`<div class="pd-card">${cardHTML(b,entry.best,true)}</div>`:""}catch(e){return""}
 }
 function chip(p){return`<span class="pd-chip ${num(p.ovr)>=85?"big":""} ${p.special?"special":""}"><b>${num(p.ovr)}</b> ${escText(p.name)}${p.pos?` <em>${escText(typeof positionLabel==="function"?positionLabel(p.pos):p.pos)}</em>`:""}</span>`}
 function html({onlyBig=false}={}){
  const all=entries(),s=stats(all);
  if(!all.length)return`<div class="pd-empty"><strong>Noch keine Einträge</strong><p>Ab jetzt landet jedes Pack, das du öffnest, hier im Tagebuch.</p></div>`;
  const list=onlyBig?all.filter(e=>(e.players||[]).some(p=>num(p.ovr)>=85)):all;
  const head=`<div class="pd-stats"><div><b>${s.packs}</b><span>Packs</span></div><div><b>${s.players}</b><span>Spieler</span></div><div><b>${s.big}</b><span>85+</span></div></div>${s.top?`<p class="pd-top">Beste Ziehung bisher: <strong>${escText(s.top.name)} ${num(s.top.ovr)}</strong></p>`:""}<div class="pd-filter"><button type="button" class="${onlyBig?"":"active"}" data-pd-filter="all">Alle</button><button type="button" class="${onlyBig?"active":""}" data-pd-filter="big">Nur mit 85+</button></div>`;
  const rows=list.length?list.map(e=>{const ps=e.players||[],first=ps[0];return`<article class="pd-entry">${cardFor(e)}<div class="pd-info"><div class="pd-meta"><strong>${escText(e.name)}</strong><small>${escText(when(e.at))}</small></div>${first?`<p class="pd-best">${escText(first.name)} <b>${num(first.ovr)}</b>${first.event?` · ${escText(first.event)}`:""}</p>`:""}<div class="pd-chips">${ps.slice(1).map(chip).join("")}</div></div></article>`}).join(""):`<p class="pd-none">Noch keine 85+ Ziehung im Tagebuch.</p>`;
  return head+`<div class="pd-list">${rows}</div><p class="pd-note">Die letzten ${KEEP} Packs auf diesem Gerät.</p>`;
 }
 let onlyBig=false;
 function $(sel){return document.querySelector(sel)}
 function ensureModal(){
  if($("#"+MODAL_ID))return;
  const el=document.createElement("div");el.id=MODAL_ID;el.className="modal";
  el.innerHTML=`<div class="modalinner"><div class="modalhead"><h3>Pack-Tagebuch</h3><button type="button" class="secondary" data-pd-close>Schließen</button></div><div id="packDiaryBody"></div></div>`;
  document.body.appendChild(el);
  el.addEventListener("click",e=>{
   if(e.target.closest("[data-pd-close]")){typeof closeUiLayer==="function"?closeUiLayer(MODAL_ID,KIND):el.classList.remove("active");return}
   const f=e.target.closest("[data-pd-filter]");if(f){onlyBig=f.dataset.pdFilter==="big";render()}
  });
 }
 function render(){const body=$("#packDiaryBody");if(body)body.innerHTML=html({onlyBig})}
 function open(){
  ensureModal();onlyBig=false;render();
  if(typeof showUiLayer==="function")showUiLayer(MODAL_ID,KIND);else $("#"+MODAL_ID).classList.add("active");
 }
 function start(){document.addEventListener("click",e=>{if(e.target.closest?.("[data-pack-diary-open]"))open()})}
 root.FooteraPackDiary={record,entries,stats,html,open,KEY};
 if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start);else start();
})(window);
