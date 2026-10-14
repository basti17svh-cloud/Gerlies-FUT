/* Footera V21.149 – purely visual card treatments; base content never mutated. */
(function(){
"use strict";
const SKINS=[
 {id:"momentum",title:"MOMENTUM",text:"Verleihe einer vorhandenen Karte den blauen MOMENTUM-Look.",coins:5000,theme:"MOMENTUM"},
 {id:"totw",title:"TOTW Style",text:"Schwarzes Team-of-the-Week-Design, ohne einen TOTW-Spieler zu erzeugen.",coins:7500,theme:"TOTW"},
 {id:"red",title:"Champions Rot",text:"Klassisches rot-goldenes Weekend-League-Design.",minWins:5,everyWins:10,theme:"WEEKEND LEAGUE"},
 {id:"red-pro",title:"Champions Prestige Rot",text:"Exklusiver rot-goldener Elite-Rahmen für langjährige Champions.",minWins:25,everyWins:25,theme:"ELITE CHAMPIONS"}
];
let selectedSkin="",selectedUid="";
const byId=id=>SKINS.find(x=>x.id===id)||null;
const htmlEscape=x=>String(x??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
const wins=()=>Math.max(0,Number(state.champions?.totalWins||0));
const earned=s=>s.minWins?(wins()<s.minWins?0:1+Math.floor((wins()-s.minWins)/s.everyWins)):Infinity;
const spent=s=>Math.max(0,Number(state.cosmeticClaims?.[s.id]||0));
const remaining=s=>s.minWins?Math.max(0,earned(s)-spent(s)):Infinity;
const isEligible=item=>!!item&&!!displayBase(item)&&!isFounderItem(item)&&!isStoryItem(item)&&!isFooteraLiveCard(item);
const candidates=()=>state.club.filter(isEligible).sort((a,b)=>itemRating(b)-itemRating(a));
const selected=()=>state.club.find(i=>String(i.uid)===String(selectedUid))||null;
const mock=(i,skin)=>({...i,cosmeticDesign:skin});
function price(s){
 if(s.coins)return Number(state.coins||0)<s.coins?"Benötigt "+s.coins.toLocaleString("de-DE")+" Coins":s.coins.toLocaleString("de-DE")+" Coins";
 return "WL-Siege "+wins()+" · Marken "+remaining(s);
}
function preview(item,skin){
 return cardHTML(displayBase(item),mock(item,skin),true);
}
function render(){
 const el=document.getElementById("evoGrid");if(!el)return;
 const skin=byId(selectedSkin),person=selected();
 const info='<div class="cosmetic-note"><strong>Nur Kartendesign.</strong> Rating, Tempo, Werte, Positionen, PlayStyles, Teamchemie, Seltenheit und Tauschbarkeit bleiben unverändert. Bei späteren spielerischen Evolutions bleibt die gewählte Optik erhalten. Die Änderung belegt keinen der 3 Evo-Plätze.</div>';
 if(!skin){
  const example=candidates()[0]||null;
  el.innerHTML=info+'<div class="cosmetic-offers">'+SKINS.map(s=>'<article class="cosmetic-offer"><span class="cosmetic-tag">'+htmlEscape(s.theme)+'</span><h3>'+htmlEscape(s.title)+'</h3><p>'+htmlEscape(s.text)+'</p><div class="cosmetic-offer-preview">'+(example?preview(example,s.id):'<div class="cosmetic-tag">Vereinskarte auswählen</div>')+'</div><div class="cosmetic-meta">'+htmlEscape(price(s))+'</div><button type="button" class="primary" data-cosmetic-open="'+s.id+'">Spieler auswählen</button></article>').join("")+'</div>';return
 }
 if(!person||!isEligible(person)){
  selectedUid="";
  el.innerHTML=info+'<div class="cosmetic-head"><button class="secondary" data-cosmetic-back>← Designs</button><h3>'+htmlEscape(skin.title)+'</h3></div><div class="cosmetic-note">'+htmlEscape(price(skin))+'</div><div class="cosmetic-player-grid">'+candidates().map(i=>'<button class="cosmetic-player-choice" type="button" data-cosmetic-player="'+htmlEscape(i.uid)+'">'+cardHTML(displayBase(i),i,true)+'<strong>'+htmlEscape(displayBase(i).name)+'</strong></button>').join("")+'</div>'+(candidates().length?"":'<div class="evo-empty">Keine geeignete Vereinskarte vorhanden.</div>');return
 }
 const old=String(person.cosmeticDesign||"");
 const affordable=skin.coins?Number(state.coins||0)>=skin.coins:remaining(skin)>0;
 const unchanged=old===skin.id;
 const message=unchanged?"Dieses Design ist bereits angewendet.":skin.coins?"Es werden "+skin.coins.toLocaleString("de-DE")+" Coins abgezogen.":"Verbraucht eine Champions-Designmarke. Diese wird beim Zurücksetzen nicht erstattet.";
 el.innerHTML=info+'<div class="cosmetic-head"><button class="secondary" data-cosmetic-players>← Spieler wechseln</button><h3>'+htmlEscape(skin.title)+' · '+htmlEscape(displayBase(person).name)+'</h3></div><div class="cosmetic-before-after"><div><small>VORHER</small>'+cardHTML(displayBase(person),person,true)+'</div><span>→</span><div><small>NACHHER</small>'+preview(person,skin.id)+'</div></div><div class="cosmetic-note">'+htmlEscape(message)+'</div><div class="cosmetic-footer"><button type="button" class="primary" data-cosmetic-apply '+(!affordable||unchanged?"disabled":"")+'>'+(unchanged?"Bereits angewendet":affordable?"Design anwenden":htmlEscape(price(skin)))+'</button>'+(old?'<button class="secondary" type="button" data-cosmetic-clear>Originaldesign wiederherstellen</button>':"")+'</div>';
}
function apply(){
 const s=byId(selectedSkin),i=selected();
 if(!s||!isEligible(i))return;
 if(i.cosmeticDesign===s.id)return;
 if(s.coins){if(Number(state.coins||0)<s.coins)return toast("Nicht genügend Coins.");state.coins-=s.coins}
 else{
  if(remaining(s)<=0)return toast("Diese Champions-Designmarke ist noch nicht freigeschaltet.");
  state.cosmeticClaims=state.cosmeticClaims||{};
  state.cosmeticClaims[s.id]=spent(s)+1
 }
 i.cosmeticDesign=s.id;
 save();renderAll();selectedUid=i.uid;render();toast(s.title+" angewendet – Werte unverändert.")
}
document.addEventListener("click",e=>{
 if(!e.target.closest("#evoGrid")||!document.getElementById("evolutionView")?.classList.contains("active"))return;
 const hit=e.target.closest("[data-cosmetic-open],[data-cosmetic-back],[data-cosmetic-players],[data-cosmetic-player],[data-cosmetic-apply],[data-cosmetic-clear]");
 if(!hit)return;
 if(hit.hasAttribute("data-cosmetic-open")){selectedSkin=hit.dataset.cosmeticOpen;selectedUid="";render()}
 if(hit.hasAttribute("data-cosmetic-back")){selectedSkin="";selectedUid="";render()}
 if(hit.hasAttribute("data-cosmetic-players")){selectedUid="";render()}
 if(hit.hasAttribute("data-cosmetic-player")){selectedUid=hit.dataset.cosmeticPlayer;render()}
 if(hit.hasAttribute("data-cosmetic-apply")){apply()}
 if(hit.hasAttribute("data-cosmetic-clear")){
  const i=selected();if(!isEligible(i)||!i.cosmeticDesign)return;
  delete i.cosmeticDesign;save();renderAll();render();toast("Originaldesign wiederhergestellt.")
 }
});
globalThis.FooteraCosmetics={render,skins:SKINS,eligible:isEligible};
})();
