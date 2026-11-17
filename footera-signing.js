// V21.447 Spielervorstellung: the official presentation photo of a player, like the pictures clubs post when a
// transfer is done. The player stands in front of the club's press wall and holds up his shirt with name and number
// (or the club scarf over his head). Our own 3D render (3d-kabine-photo.mjs renderSigningPhoto) of the user's card:
// body, face, hair and skin from the player looks, the club's home kit and crest. Read-only: never changes the club,
// the squad or the save. Opened from the player menu (club card or pack card); after a big pack pull the new signing
// also posts his presentation photo in the Kabinen-Chat.
(function(root){
 "use strict";
 const MODAL_ID="playerSigningModal",KIND="player-signing",MODULE="./3d-kabine-photo.mjs?v=21461";
 // Typical shirt numbers by position, used when the card has no squad number yet.
 const NUMBERS={GK:1,RB:2,RWB:2,LB:3,LWB:3,CB:4,CDM:6,CM:8,RM:7,RW:7,LM:11,LW:11,CAM:10,CF:9,ST:9};
 let busy=false,current=null;
 const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
 function hash(text){let h=2166136261;for(const ch of String(text)){h^=ch.charCodeAt(0);h=Math.imul(h,16777619)>>>0}return h>>>0}
 function baseOf(item){try{return typeof displayBase==="function"?displayBase(item):null}catch(e){return null}}
 function ratingOf(item,b){try{return Number(typeof itemRating==="function"?itemRating(item):0)||Number(b?.ovr||0)}catch(e){return Number(b?.ovr||0)}}
 function posText(b){const raw=String(b?.position||"").toUpperCase();try{return typeof positionLabel==="function"?positionLabel(raw,b):raw}catch(e){return raw}}
 // Everything the picture needs, from the live club: name, number, looks, kit and crest (via the Kabinen-Chat helper).
 function spec(item,{seed="",variant=""}={}){
  const b=baseOf(item);if(!b)return null;
  const pos=String(b.position||"").toUpperCase();
  const entry={name:String(b.name||"Spieler"),uid:String(item?.uid||""),pid:String(b.id||item?.pid||""),pos};
  let squad=null;try{squad=root.FooteraKabine?.photoSquad?root.FooteraKabine.photoSquad({players:[entry]}):null}catch(e){}
  const p=squad?.players?.[0]||{name:entry.name,keeper:pos==="GK"};
  let number=null;try{number=typeof FooteraShirtNumbers!=="undefined"&&entry.uid?FooteraShirtNumbers.get(entry.uid):null}catch(e){}
  p.number=Number.isInteger(number)?number:(NUMBERS[pos]||7+hash(entry.name)%20);
  p.keeper=pos==="GK";p.pos=posText(b);p.ovr=ratingOf(item,b);p.icon=!!b.isIcon;
  let club="";try{club=squad?.club||(typeof clubIdentitySnapshot==="function"?clubIdentitySnapshot()?.name:"")||""}catch(e){}
  return{seed:seed||("sign|"+(entry.uid||entry.pid)),club:String(club||"Footera"),player:p,kit:squad?.kit||null,keeperKit:squad?.keeperKit||null,crestHTML:squad?.crestHTML||"",...(variant?{variant}:{})};
 }
 async function render(s,opts={}){const mod=await import(MODULE);return mod.renderSigningPhoto(s,{width:1080,height:1350,...opts})}

 function ensureModal(){
  if(document.getElementById(MODAL_ID))return;
  const el=document.createElement("div");el.id=MODAL_ID;el.className="modal sg-modal";
  el.innerHTML=`<div class="modalinner"><div class="modalhead"><div><h3>Spielervorstellung</h3><div class="sg-sub">Das offizielle Foto für deinen Neuzugang</div></div><button type="button" class="secondary" data-signing-close>Schließen</button></div><div id="playerSigningBody"></div></div>`;
  document.body.appendChild(el);
  el.addEventListener("click",async e=>{
   if(e.target.closest("[data-signing-close]")){close();return}
   if(e.target.closest("[data-signing-other]")&&current&&!busy){current.variant=current.variant==="scarf"?"shirt":"scarf";develop();return}
   if(e.target.closest("[data-signing-share]")&&current?.url){share(current.url,current.name)}
  });
 }
 function close(){try{if(typeof closeUiLayer==="function")closeUiLayer(MODAL_ID,KIND);else document.getElementById(MODAL_ID)?.classList.remove("active")}catch(e){}}
 function bodyHTML(state){
  const c=current||{};
  const pic=c.url?`<img class="sg-photo" src="${esc(c.url)}" alt="Spielervorstellung ${esc(c.name)}">`
   :`<div class="sg-photo sg-wait"><span aria-hidden="true">📸</span><small>${state==="error"?"Foto konnte nicht entwickelt werden":"Die Fotografen sind bereit …"}</small></div>`;
  return`${pic}<div class="sg-actions"><button type="button" class="primary" data-signing-share ${c.url?"":"disabled"}>Teilen</button><button type="button" class="secondary" data-signing-other ${busy?"disabled":""}>${c.variant==="scarf"?"👕 Mit Trikot":"🧣 Mit Schal"}</button></div><p class="sg-note">Dein Spieler in deinem Heimtrikot mit Wappen und Vereinsnamen. Das Bild entsteht auf deinem Gerät.</p>`;
 }
 function paint(state){const body=document.getElementById("playerSigningBody");if(body)body.innerHTML=bodyHTML(state)}
 async function develop(){
  if(!current)return;
  const ticket=current;busy=true;ticket.url="";paint();
  try{
   const s=spec(ticket.item,{variant:ticket.variant});if(!s)throw new Error("keine Karte");
   const r=await render(s);if(current!==ticket)return;
   ticket.url=r.url;ticket.variant=r.variant;busy=false;paint();
  }catch(e){console.warn("Spielervorstellung:",e);if(current===ticket){busy=false;paint("error")}}
  finally{if(current===ticket)busy=false}
 }
 function open(item){
  const b=baseOf(item);if(!b)return false;
  ensureModal();
  current={item,name:String(b.name||""),variant:"",url:""};
  // the first picture uses the card's own motif (shirt or scarf, fixed per card)
  try{const s=spec(item);current.variant=s?.variant||""}catch(e){}
  paint();
  if(typeof showUiLayer==="function")showUiLayer(MODAL_ID,KIND);else document.getElementById(MODAL_ID).classList.add("active");
  develop();return true;
 }
 async function share(url,name){
  try{const blob=await (await fetch(url)).blob(),file=new File([blob],"footera-neuzugang.jpg",{type:"image/jpeg"});
   if(navigator.canShare&&navigator.canShare({files:[file]}))await navigator.share({files:[file],title:"Footera Neuzugang",text:`✍️ Neuzugang: ${name} ⚽ #Footera`});
   else{const a=document.createElement("a");a.href=url;a.download="footera-neuzugang.jpg";a.click()}}catch(e){}
 }
 function menuHTML(attr,value){
  return`<button class="menu-action" ${attr}="${esc(value)}"><span><span>📸 Spieler vorstellen</span><small>Offizielles Vorstellungsfoto mit Trikot oder Schal vor deiner Pressewand.</small></span><b>›</b></button>`;
 }
 root.FooteraSigning={open,spec,render,menuHTML,NUMBERS,MODULE};
})(window);
