/* Footera V21.85 — persistent club shirt numbers, presentation only. */
(function(){
 "use strict";
 const MIN=1,MAX=99;
 const fallback=[9,10,7,11,18,21,6,8,4,5,3,2,14,17,15,20];
 const valid=value=>{const n=Number(value);return Number.isInteger(n)&&n>=MIN&&n<=MAX?n:null};
 const escapeHTML=value=>typeof esc==="function"?esc(String(value??"")):String(value??"").replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
 function numbers(){
  if(!state.shirtNumbers||typeof state.shirtNumbers!=="object"||Array.isArray(state.shirtNumbers))state.shirtNumbers={};
  return state.shirtNumbers;
 }
 function rows(){
  if(typeof squadItems!=="function")return [];
  return squadItems().map((item,index)=>{
   if(!item?.uid)return null;
   const base=typeof displayBase==="function"?displayBase(item):null;
   return {item,uid:String(item.uid),index,base};
  }).filter(Boolean);
 }
 function isGoalkeeper(row){
  const pos=row.index<11?(typeof currentFormation==="function"?currentFormation()?.[row.index]?.p:""):row.base?.position;
  return /^(GK|TW|TH)$/i.test(String(pos||row.base?.position||""));
 }
 function preferences(row){
  if(isGoalkeeper(row))return [1,12,13,22];
  const pos=String(row.index<11?(typeof currentFormation==="function"?currentFormation()?.[row.index]?.p:""):row.base?.position||"").toUpperCase();
  if(/^(ST|CF)$/.test(pos))return [9,11,19,20,21];
  if(/^(CAM|ZOM)$/.test(pos))return [10,8,18,16];
  if(/^(CM|ZM|CDM|ZDM)$/.test(pos))return [6,8,10,14,16];
  if(/^(LW|RW|LM|RM|LF|RF)$/.test(pos))return [7,11,17,18,20];
  if(/^(CB|IV)$/.test(pos))return [4,5,6,15,16];
  if(/^(LB|RB|LV|RV|LWB|RWB)$/.test(pos))return [2,3,12,13,22];
  return [];
 }
 function ensure(){
  const map=numbers(),active=rows(),used=new Set(),missing=[];
  let changed=false;
  for(const row of active){
   const n=valid(map[row.uid]);
   if(n!==null&&!used.has(n)){used.add(n);continue}
   missing.push(row);
  }
  for(const row of missing){
   const n=preferences(row).find(v=>!used.has(v))||Array.from({length:MAX},(_,i)=>i+1).find(v=>!used.has(v));
   if(!n)continue;
   if(map[row.uid]!==n){map[row.uid]=n;changed=true}
   used.add(n);
  }
  if(changed&&typeof save==="function")save();
  return map;
 }
 function assign(uid,value){
  const n=valid(value);
  if(n===null)return {ok:false,reason:"Bitte eine Nummer zwischen 1 und 99 eingeben."};
  const active=rows();
  if(!active.some(row=>row.uid===String(uid)))return {ok:false,reason:"Spieler nicht mehr in dieser Mannschaft."};
  const map=ensure(),old=valid(map[uid]),other=active.find(row=>row.uid!==String(uid)&&valid(map[row.uid])===n);
  if(old===n)return {ok:true,unchanged:true};
  map[uid]=n;
  if(other&&old!==null)map[other.uid]=old;
  if(typeof save==="function")save();
  return {ok:true,swapped:other?.base?.name||null};
 }
 function posName(row){
  const pos=row.index<11?(typeof currentFormation==="function"?currentFormation()?.[row.index]?.p:""):row.base?.position;
  return typeof positionLabel==="function"?positionLabel(pos||row.base?.position,row.base):String(pos||row.base?.position||"SPIELER");
 }
 function section(label,start,end,active,map){
  const items=active.filter(row=>row.index>=start&&row.index<end);
  if(!items.length)return "";
  return '<section class="shirt-number-section"><h4>'+label+' <span>'+items.length+' Spieler</span></h4>'+
   items.map(row=>'<label class="shirt-number-row"><span class="shirt-number-name"><strong>'+escapeHTML(row.base?.name||"Spieler")+'</strong><small>'+escapeHTML(posName(row))+'</small></span>'+
    '<span class="shirt-number-edit"><span>#</span><input type="number" inputmode="numeric" min="1" max="99" step="1" aria-label="Rückennummer '+escapeHTML(row.base?.name||"Spieler")+'" data-shirt-uid="'+escapeHTML(row.uid)+'" value="'+map[row.uid]+'"></span></label>').join("")+'</section>';
 }
 function render(){
  const body=document.getElementById("shirtNumbersBody"),summary=document.getElementById("squadShirtNumbersSummary");
  const active=rows(),map=ensure();
  if(summary)summary.textContent=active.length+' Spieler · Nummern 1–99';
  if(!body)return;
  body.innerHTML='<div class="plan-hero"><strong>Deine Nummern. Dein Verein.</strong><span>Einmal festlegen, dauerhaft behalten. Nummern werden beim Anstoß auf die 3D-Trikots übertragen. Doppelte Nummern werden automatisch getauscht.</span></div>'+
    section("Startelf",0,11,active,map)+section("Ersatzbank",11,18,active,map)+section("Reserve",18,23,active,map)+
    (!active.length?'<div class="assignment-empty">Stelle zuerst Spieler in deine Mannschaft.</div>':'');
 }
 function mount(){
  const menu=document.getElementById("squadPlanMenu");
  if(!menu||document.getElementById("openSquadShirtNumbers"))return false;
  menu.insertAdjacentHTML("beforeend",'<button id="openSquadShirtNumbers" class="squad-plan-btn numbers" type="button"><span class="squad-plan-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M8 3 4 6 2 12l5 2v7h10v-7l5-2-2-6-4-3-4 3z"/><path d="M10 11v6m-2-4 2-2"/></svg></span><span class="squad-plan-copy"><small>Trikots</small><strong>Rückennummern</strong><em id="squadShirtNumbersSummary">Nummern 1–99</em></span><b>›</b></button>');
  document.body.insertAdjacentHTML("beforeend",'<div id="shirtNumbersModal" class="modal squad-plan-modal" aria-label="Rückennummern"><div class="modalinner"><div class="modalhead"><div><span class="plan-kicker">Mannschaft</span><h3>Rückennummern</h3><div class="plan-sub">Für jeden Spieler festlegen</div></div><button id="shirtNumbersClose" class="secondary" type="button">Schließen</button></div><div id="shirtNumbersBody"></div></div></div>');
  document.getElementById("openSquadShirtNumbers").addEventListener("click",()=>{render();showUiLayer("shirtNumbersModal","shirt-numbers")});
  document.getElementById("shirtNumbersClose").addEventListener("click",()=>closeUiLayer("shirtNumbersModal","shirt-numbers"));
  document.getElementById("shirtNumbersBody").addEventListener("change",event=>{
   const input=event.target.closest("[data-shirt-uid]");if(!input)return;
   const result=assign(input.dataset.shirtUid,input.value);render();
   if(!result.ok&&typeof toast==="function")toast(result.reason);
   else if(result.swapped&&typeof toast==="function")toast("Rückennummern automatisch getauscht.");
  });
  render();return true;
 }
 function installHooks(){
  const originalRender=renderSquad;
  renderSquad=function(){
   const result=originalRender.apply(this,arguments);
   ensure();
   if(document.getElementById("shirtNumbersModal")?.classList.contains("active"))render();
   else {const summary=document.getElementById("squadShirtNumbersSummary");if(summary)summary.textContent=rows().length+' Spieler · Nummern 1–99'}
   return result;
  };
  const originalStart=startMatch;
  startMatch=function(){
   const map={...ensure()};
   const result=originalStart.apply(this,arguments);
   if(typeof match!=="undefined"&&match&&!match.shirtNumbers)match.shirtNumbers=map;
   return result;
  };
 }
 try{
  mount();installHooks();
  window.FooteraShirtNumbers={get(uid){return valid(ensure()[String(uid)])},assign,ensure,render};
 }catch(error){console.error("Rückennummern konnten nicht initialisiert werden",error)}
})();
