// V21.462 Manager als Person (Basti 2026-11-17): next to the Trainerkarte the user designs his manager as a person:
// name, Trainer or Trainerin, skin, haircut, hair colour, beard, glasses, age, build and clothes (suit, tracksuit
// or polo) in his own colours. The manager is one of our own 3D humans (3d-manager.mjs): his picture is the portrait
// on the Trainerkarte, he stands on the Siegerfoto in the Kabine, and before kick-off he is shown with his card.
// Saved in the game save as state.profile.manager (only the settings, a few short strings; written only when the
// user changes something in the editor). The rendered portrait is kept on this device only.
(function(root){
 "use strict";
 const MODULE="./3d-manager.mjs?v=21467",PORTRAIT_KEY="footera-manager-portrait-v2";
 const HEX=/^#[0-9a-f]{6}$/i;
 const escText=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));

 const OPTIONS=Object.freeze({
  gender:[["male","Trainer"],["female","Trainerin"]],
  skin:[["#f1d2b3","Sehr hell"],["#e6bf9c","Hell"],["#dbad88","Hell-mittel"],["#c88f69","Mittel"],["#a96d4b","Oliv"],["#8a5a3c","Braun"],["#6b4128","Dunkelbraun"],["#4a2e1f","Sehr dunkel"]],
  hair:[["short01","Kurzhaar"],["short02","Fransen"],["short04","Zurückgekämmt"],["afro01","Afro"],["dreads01","Dreadlocks"],["ponytail01","Zopf"],["bob02","Schulterlang"],["Braid01","Flechtzopf"],["bald","Glatze"]],
  hairColor:[["#14110f","Schwarz"],["#3b2a1f","Dunkelbraun"],["#6e5038","Braun"],["#9a7448","Hellbraun"],["#c9a061","Blond"],["#e8d7a8","Hellblond"],["#a4552a","Rot"],["#8f8c88","Grau"],["#e9e6df","Silber"]],
  beard:[["none","Kein Bart"],["Full_beard","Vollbart"],["Moustache","Schnauzer"]],
  glasses:[["none","Keine Brille"],["black","Schwarze Brille"],["gold","Goldbrille"]],
  age:[["young","Jung"],["prime","Erfahren"],["veteran","Altmeister"]],
  build:[["slim","Schlank"],["normal","Normal"],["strong","Kräftig"]],
  outfit:[["suit","Anzug"],["tracksuit","Trainingsanzug"],["polo","Polo"]]
 });
 // Clothing colours to tap; a colour field next to them takes any colour.
 const COLORS=["#111318","#1d2330","#2c3e63","#0d2a5c","#3a4a3c","#5a5f66","#9aa1a9","#f2f2f2","#c8b48a","#6b4a2e","#8a1c2b","#c4122f","#e85d1a","#f4c20d","#1f8a4c","#d8ff3e"];
 const COLOR_FIELDS=Object.freeze({
  suit:[["top","Sakko"],["trousers","Hose"],["accent","Hemd"],["tie","Krawatte"]],
  tracksuit:[["top","Jacke"],["trousers","Hose"],["accent","Streifen"]],
  polo:[["top","Polo"],["trousers","Hose"],["accent","Kragen"]]
 });
 const DEFAULT=Object.freeze({name:"",gender:"male",skin:"#c88f69",hair:"short04",hairColor:"#3b2a1f",beard:"none",glasses:"none",age:"prime",build:"normal",
  outfit:"suit",top:"#1d2330",trousers:"#1d2330",accent:"#f2f2f2",tie:"#8a1c2b"});
 const pick=(v,list,fb)=>list.some(o=>o[0]===v)?v:fb;
 const hex=(v,fb)=>HEX.test(String(v||""))?String(v).toLowerCase():fb;
 // Pure: a clean manager from whatever is saved (or nothing).
 function clean(raw){
  const x=raw&&typeof raw==="object"?raw:{},d=DEFAULT;
  const gender=pick(x.gender,OPTIONS.gender,d.gender);
  let hair=pick(x.hair,OPTIONS.hair,d.hair);if(hair==="Braid01"&&gender!=="female")hair="ponytail01";
  return{name:String(x.name||"").replace(/[\u0000-\u001f<>]/g,"").trim().slice(0,22),gender,skin:hex(x.skin,d.skin),hair,hairColor:hex(x.hairColor,d.hairColor),
   beard:gender==="female"?"none":pick(x.beard,OPTIONS.beard,d.beard),glasses:pick(x.glasses,OPTIONS.glasses,d.glasses),age:pick(x.age,OPTIONS.age,d.age),build:pick(x.build,OPTIONS.build,d.build),
   outfit:pick(x.outfit,OPTIONS.outfit,d.outfit),top:hex(x.top,d.top),trousers:hex(x.trousers,d.trousers),accent:hex(x.accent,d.accent),tie:hex(x.tie,d.tie)};
 }
 const live=()=>typeof state!=="undefined"&&state&&typeof state==="object"?state:null;
 // The manager of a save: the saved one, named after the profile when he has no own name yet.
 function get(s=live()){
  const m=clean(s?.profile?.manager);
  if(!m.name)m.name=String(s?.profile?.username||"").trim().slice(0,22)||"Trainer";
  return m;
 }
 const designed=(s=live())=>!!(s?.profile?.manager&&typeof s.profile.manager==="object");
 function set(patch){
  const s=live();if(!s)return null;
  s.profile=s.profile||{};
  const next=clean({...get(s),...patch});
  s.profile.manager=next;
  try{if(typeof save==="function")save()}catch(e){}
  return next;
 }
 // Club colours as a starting point: tracksuit/polo in the home kit, suit stays dark with a club tie.
 function clubColors(m){
  let k=null;try{k=typeof clubIdentitySnapshot==="function"?clubIdentitySnapshot()?.kits?.home:null}catch(e){}
  const a=hex(k?.shirtPrimary,"#971d42"),b=hex(k?.shirtSecondary,"#f3f4ee"),c=hex(k?.shorts,"#16191d");
  if(m.outfit==="suit")return{top:"#1d2330",trousers:"#1d2330",accent:"#f2f2f2",tie:a};
  return{top:a,trousers:c,accent:b};
 }
 function crestMarkup(){try{if(typeof crestHTML==="function"&&typeof clubIdentitySnapshot==="function")return String(crestHTML(clubIdentitySnapshot(),true)||"")}catch(e){}return""}

 /* ---------- portrait (device cache) ---------- */
 function keyOf(m,crest){let h=2166136261;for(const ch of JSON.stringify([m,crest.length,crest.slice(0,400)])){h^=ch.charCodeAt(0);h=Math.imul(h,16777619)>>>0}return h.toString(36)}
 function cached(){try{const c=JSON.parse(localStorage.getItem(PORTRAIT_KEY)||"null");return c&&typeof c.url==="string"&&c.url.startsWith("data:image/")?c:null}catch(e){return null}}
 // V21.467: v2 = tighter card bust; drop the old v1 picture so the card never shows the small one again.
 try{localStorage.removeItem("footera-manager-portrait-v1")}catch(e){}
 let mod=null,pending=null,pendingKey="",failed=false;
 function load(){return mod||(mod=import(MODULE).catch(e=>{mod=null;throw e}))}
 function portraitUrl(m=get()){const c=cached();return c&&c.key===keyOf(m,crestMarkup())?c.url:(c?.url||"")}
 function portraitFresh(m=get()){const c=cached();return!!c&&c.key===keyOf(m,crestMarkup())}
 // Renders the card portrait when the saved one is missing or out of date. Resolves to the URL ("" on failure).
 function ensurePortrait(m=get()){
  if(!designed())return Promise.resolve("");
  const crest=crestMarkup(),key=keyOf(m,crest);
  if(portraitFresh(m))return Promise.resolve(cached().url);
  if(pending&&pendingKey===key)return pending;
  pendingKey=key;
  pending=(async()=>{
   try{const M=await load();const url=await M.renderManagerPortrait({manager:m,crestHTML:crest},{width:390,height:424,framing:"bust",pose:"crossed"});
    try{localStorage.setItem(PORTRAIT_KEY,JSON.stringify({key,url}))}catch(e){}
    failed=false;refreshCards();return url}
   catch(e){console.warn("Manager-Porträt:",e);failed=true;return""}
   finally{if(pendingKey===key)pending=null}
  })();
  return pending;
 }
 function refreshCards(){
  if(typeof document==="undefined")return;
  const url=portraitUrl();if(!url)return;
  document.querySelectorAll(".coach-card .coach-face").forEach(el=>{if(!el.querySelector(".coach-manager-face"))el.innerHTML=`<img class="coach-manager-face" src="${escText(url)}" alt="">`;else el.querySelector("img").src=url});
 }
 // Card face: the manager portrait when one is designed and rendered, else null (the card keeps the crest).
 function cardFace(){if(!designed())return null;const url=portraitUrl();if(!url){ensurePortrait();return null}if(!portraitFresh())ensurePortrait();return`<img class="coach-manager-face" src="${escText(url)}" alt="">`}

 /* ---------- editor ---------- */
 let preview=null,previewTimer=0,previewSeq=0;
 function chips(field,list,value){return`<div class="mg-chips" role="radiogroup">${list.map(([v,l])=>`<button type="button" class="mg-chip${v===value?" on":""}" data-mg-set="${field}" data-mg-value="${escText(v)}" aria-pressed="${v===value}">${escText(l)}</button>`).join("")}</div>`}
 function swatches(field,list,value,labelled){return`<div class="mg-swatches">${list.map(o=>{const [v,l]=Array.isArray(o)?o:[o,o];return`<button type="button" class="mg-swatch${v===value?" on":""}" style="--sw:${v}" data-mg-set="${field}" data-mg-value="${v}" aria-label="${escText(labelled?l:field+" "+v)}" title="${escText(l)}"></button>`}).join("")}<label class="mg-swatch mg-custom" title="Eigene Farbe"><input type="color" value="${escText(value)}" data-mg-color="${field}" aria-label="Eigene Farbe"></label></div>`}
 function editorHTML(m){
  const hairs=OPTIONS.hair.filter(([v])=>v!=="Braid01"||m.gender==="female");
  const fields=COLOR_FIELDS[m.outfit]||COLOR_FIELDS.suit;
  return`<div class="mg-editor">
  <div class="mg-preview"><div class="mg-stage" data-mg-stage>${preview?`<img src="${escText(preview)}" alt="Dein Manager">`:`<div class="mg-wait">Manager wird eingekleidet …</div>`}</div><small class="mg-hint">Dein Manager steht auf dem Siegerfoto und wird vor jedem Spiel mit seiner Karte gezeigt.</small></div>
  <div class="mg-controls">
   <label class="mg-row"><span>Name</span><input type="text" maxlength="22" value="${escText(m.name)}" data-mg-name placeholder="Name des Managers" autocomplete="off"></label>
   <div class="mg-row"><span>Person</span>${chips("gender",OPTIONS.gender,m.gender)}</div>
   <div class="mg-row"><span>Hautfarbe</span>${swatches("skin",OPTIONS.skin,m.skin,true)}</div>
   <div class="mg-row"><span>Frisur</span>${chips("hair",hairs,m.hair)}</div>
   <div class="mg-row"><span>Haarfarbe</span>${swatches("hairColor",OPTIONS.hairColor,m.hairColor,true)}</div>
   ${m.gender==="female"?"":`<div class="mg-row"><span>Bart</span>${chips("beard",OPTIONS.beard,m.beard)}</div>`}
   <div class="mg-row"><span>Brille</span>${chips("glasses",OPTIONS.glasses,m.glasses)}</div>
   <div class="mg-row"><span>Alter</span>${chips("age",OPTIONS.age,m.age)}</div>
   <div class="mg-row"><span>Statur</span>${chips("build",OPTIONS.build,m.build)}</div>
   <div class="mg-row"><span>Kleidung</span>${chips("outfit",OPTIONS.outfit,m.outfit)}<button type="button" class="mg-club" data-mg-club>Vereinsfarben übernehmen</button></div>
   ${fields.map(([f,l])=>`<div class="mg-row"><span>${escText(l)}</span>${swatches(f,COLORS,m[f])}</div>`).join("")}
  </div></div>`;
 }
 function renderEditor(){
  const host=document.getElementById("managerEditorBody");if(!host)return;
  const scroll=host.closest(".modalinner")?.scrollTop;
  host.innerHTML=editorHTML(get());
  if(scroll!=null){const box=host.closest(".modalinner");if(box)box.scrollTop=scroll}
 }
 function schedulePreview(){
  clearTimeout(previewTimer);
  const stage=document.querySelector("[data-mg-stage]");if(stage)stage.classList.add("busy");
  previewTimer=setTimeout(async()=>{
   const seq=++previewSeq,m=get();
   try{const M=await load();const url=await M.renderManagerPortrait({manager:m,crestHTML:crestMarkup()},{width:360,height:600,framing:"full",pose:"down",yaw:-.32});
    if(seq!==previewSeq)return;preview=url;
    const st=document.querySelector("[data-mg-stage]");if(st){st.classList.remove("busy");st.innerHTML=`<img src="${escText(url)}" alt="Dein Manager">`}}
   catch(e){console.warn("Manager-Vorschau:",e);const st=document.querySelector("[data-mg-stage]");if(st){st.classList.remove("busy");st.innerHTML=`<div class="mg-wait">3D-Vorschau auf diesem Gerät nicht möglich. Deine Auswahl wird trotzdem gespeichert.</div>`}}
  },280);
 }
 function change(patch,rerender=true){
  if(!designed()){const first=get();set({...first,...patch})}else set(patch);
  if(rerender)renderEditor();
  schedulePreview();
 }
 function onClick(e){
  const b=e.target.closest("[data-mg-set]");
  if(b){change({[b.dataset.mgSet]:b.dataset.mgValue});return true}
  if(e.target.closest("[data-mg-club]")){change(clubColors(get()));return true}
  return false;
 }
 function onInput(e){
  const n=e.target.closest("[data-mg-name]");if(n){change({name:n.value},false);return true}
  return false;
 }
 function onColor(e){const c=e.target.closest("[data-mg-color]");if(c){change({[c.dataset.mgColor]:c.value});return true}return false}
 function openEditor(){
  if(typeof document==="undefined")return;
  const host=document.getElementById("managerEditorBody");if(!host)return;
  renderEditor();schedulePreview();
 }
 // Leaving the editor: the card picks up the new face.
 function closeEditor(){clearTimeout(previewTimer);previewSeq++;if(designed())ensurePortrait().then(()=>refreshCards())}

 /* ---------- after the walk-out: the manager at the bench, his card in the action frame ---------- */
 // V21.467 (Basti 2026-11-17): replaces the old pop-up before kick-off. Plain copies for the 3D scene;
 // the default manager stands there too when the user never designed one.
 function forKickoff(){
  try{
   const s=live();if(!s)return null;
   const mgr=get(s),C=root.FooteraCoachCard,d=C?.data?.(s);
   if(designed(s))ensurePortrait();
   return{manager:{...mgr},cardHTML:d&&C.cardHTML?C.cardHTML(d):"",label:mgr.gender==="female"?"DEINE TRAINERIN":"DEIN TRAINER",name:mgr.name,
    detail:d?`${d.type?.title||"Trainer"} · GES ${d.ovr}`:""};
  }catch(e){return null}
 }

 /* ---------- Siegerfoto ---------- */
 // What the photo needs about the manager (a copy); null when the user never designed one.
 function forPhoto(){return designed()?get():null}

 function start(){
  document.addEventListener("click",e=>{if(e.target.closest("#managerEditorBody"))onClick(e)});
  document.addEventListener("input",e=>{if(e.target.closest("#managerEditorBody"))onInput(e)});
  document.addEventListener("change",e=>{if(e.target.closest("#managerEditorBody"))onColor(e)});
 }
 root.FooteraManager={OPTIONS,COLORS,COLOR_FIELDS,DEFAULT,clean,get,set,designed,clubColors,editorHTML,openEditor,closeEditor,cardFace,portraitUrl,ensurePortrait,forKickoff,forPhoto,MODULE,PORTRAIT_KEY};
 if(typeof document!=="undefined"){if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start);else start()}
})(typeof window!=="undefined"?window:globalThis);
