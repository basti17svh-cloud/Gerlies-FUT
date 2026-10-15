/* Footera V21.150 – cosmetic Evolutions with an SBC-consistent special card category. */
(function(){
"use strict";
const SKINS=[
 {id:"momentum",title:"MOMENTUM-Evolution",text:"Blaues MOMENTUM-Design · zählt auch als MOMENTUM in SBCs.",coins:12000,theme:"MOMENTUM"},
 {id:"totw",title:"TOTW-Evolution",text:"Schwarze TOTW-Karte · zählt als TOTW in SBCs. Kein offizielles Team-der-Woche-Release.",coins:20000,theme:"TOTW"},
 {id:"red",title:"Champions Rot",text:"Klassisches rot-goldenes Weekend-League-Design.",minWins:5,everyWins:10,theme:"WEEKEND LEAGUE"},
 {id:"red-pro",title:"Champions Prestige Rot",text:"Exklusiver rot-goldener Elite-Rahmen für langjährige Champions.",minWins:25,everyWins:25,theme:"ELITE CHAMPIONS"}
];
let selectedSkin="",selectedUid="",search="",page=0;
const PAGE_SIZE=12;
const byId=id=>SKINS.find(x=>x.id===id)||null;
const htmlEscape=x=>String(x??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
const wins=()=>Math.max(0,Number(state.champions?.totalWins||0));
const earned=s=>s.minWins?(wins()<s.minWins?0:1+Math.floor((wins()-s.minWins)/s.everyWins)):Infinity;
const spent=s=>Math.max(0,Number(state.cosmeticClaims?.[s.id]||0));
const remaining=s=>s.minWins?Math.max(0,earned(s)-spent(s)):Infinity;
const isEligible=(item,skinId="")=>!!item&&!!displayBase(item)&&!isFounderItem(item)&&!isStoryItem(item)&&!isFooteraLiveCard(item)&&!(typeof activeTransferSaleForUid==="function"&&activeTransferSaleForUid(item.uid))&&(!["totw","momentum"].includes(skinId)||(itemRating(item)>=75&&!item.variant));
const candidates=(skinId="")=>state.club.filter(i=>isEligible(i,skinId)).sort((a,b)=>itemRating(b)-itemRating(a));
const selected=()=>state.club.find(i=>String(i.uid)===String(selectedUid))||null;
const mock=(i,skin)=>({...i,cosmeticDesign:skin});
function price(s){
 if(s.coins)return Number(state.coins||0)<s.coins?"Benötigt "+s.coins.toLocaleString("de-DE")+" Coins":s.coins.toLocaleString("de-DE")+" Coins";
 return "WL-Siege "+wins()+" · Marken "+remaining(s);
}
function preview(item,skin){
 return cardHTML(displayBase(item),mock(item,skin),true);
}
function rules(){
 return '<details class="cosmetic-rules"><summary>Was verändert eine dekorative Evolution?</summary><p>Rating, Attribute, PlayStyles und Chemie bleiben erhalten. Kein aktiver Evo-Platz nötig. Das Design bleibt bei späteren Upgrades bestehen.</p><p>TOTW und MOMENTUM zählen nach Anwendung auch in SBCs als dieser Kartentyp. Champions ist ein eigener Typ.</p><p><strong>Die Karte wird dauerhaft untauschbar.</strong> Zurücksetzen erstattet keine Coins oder Marken und stellt die Tauschbarkeit nicht wieder her.</p></details>';
}
function status(s){
 if(s.coins)return s.coins.toLocaleString("de-DE")+' Coins';
 const n=remaining(s);if(n)return n+' '+(n===1?'Marke verfügbar':'Marken verfügbar');
 const next=s.minWins+earned(s)*s.everyWins;
 return 'Noch '+Math.max(0,next-wins())+' Siege bis zur Marke';
}
function studio(body,step,title,subtitle){
 return '<div class="cosmetic-studio"><header class="cosmetic-intro"><div><span class="cosmetic-eyebrow">DEKORATIVE EVOLUTIONS</span><h2>'+title+'</h2><p>'+subtitle+'</p></div><div class="cosmetic-win-count"><strong>'+wins()+'</strong><span>Champions-Siege</span></div></header><ol class="cosmetic-steps" aria-label="Design anwenden">'+['Design','Spieler','Vorschau'].map((x,i)=>'<li class="'+(i+1===step?'current':i+1<step?'done':'')+'"'+(i+1===step?' aria-current="step"':'')+'><span>'+(i+1)+'</span>'+x+'</li>').join('')+'</ol>'+body+'</div>';
}
function offer(s){
 const example=candidates(s.id)[0],available=s.coins?Number(state.coins||0)>=s.coins:remaining(s)>0;
 const next=s.minWins+earned(s)*s.everyWins,progress=s.minWins?Math.min(100,wins()/next*100):0;
 return '<article class="cosmetic-offer cosmetic-theme-'+s.id+'"><div class="cosmetic-offer-top"><span class="cosmetic-tag">'+(s.coins?'COIN-DESIGN':s.id==='red-pro'?'PRESTIGE':'CHAMPIONS')+'</span><span class="cosmetic-availability '+(available?'available':'locked')+'">'+(available?'Verfügbar':'Gesperrt')+'</span></div><div class="cosmetic-offer-preview">'+(example?preview(example,s.id):'<div class="cosmetic-empty-preview">Deine Karte<br>im neuen Design</div>')+'</div><h3>'+htmlEscape(s.title)+'</h3><p>'+(s.id==='red-pro'?'Dunkler Rubin · veredelter Goldrahmen':s.id==='red'?'Rubinrot · goldene Champions-Prägung':s.id==='totw'?'Schwarz-Gold · SBC-Typ TOTW':'Blau · SBC-Typ MOMENTUM')+'</p><div class="cosmetic-meta">'+htmlEscape(status(s))+'</div>'+(s.minWins?'<div class="cosmetic-progress" role="progressbar" aria-label="Champions-Siege für die nächste Marke" aria-valuenow="'+Math.min(wins(),next)+'" aria-valuemin="0" aria-valuemax="'+next+'"><i style="width:'+progress+'%"></i></div><small class="cosmetic-unlock">Erste Marke: '+s.minWins+' Siege · danach alle '+s.everyWins+'</small>':'<small class="cosmetic-unlock">Für normale Goldkarten ab 75 GES</small>')+'<button type="button" class="secondary" data-cosmetic-open="'+s.id+'">Vorschau öffnen <span aria-hidden="true">→</span></button></article>';
}
function playerResults(skin){
 const query=search.trim().toLocaleLowerCase('de-DE');
 const list=candidates(skin.id).filter(i=>{const b=displayBase(i);return !query||String((b.fullName||'')+' '+b.name).toLocaleLowerCase('de-DE').includes(query)});
 const pages=Math.max(1,Math.ceil(list.length/PAGE_SIZE));page=Math.min(page,pages-1);
 return '<div class="cosmetic-result-count" role="status">'+list.length+' passende '+(list.length===1?'Karte':'Karten')+' · nach Gesamtstärke</div><div class="cosmetic-player-grid">'+list.slice(page*PAGE_SIZE,(page+1)*PAGE_SIZE).map(i=>'<button class="cosmetic-player-choice" type="button" data-cosmetic-player="'+htmlEscape(i.uid)+'" aria-label="'+htmlEscape(displayBase(i).name)+' auswählen">'+cardHTML(displayBase(i),i,true)+'<strong>'+htmlEscape(displayBase(i).name)+'</strong><span>'+itemRating(i)+' GES · Auswählen</span></button>').join('')+'</div>'+(list.length?'':'<div class="cosmetic-empty">'+(query?'Keine Karte mit diesem Namen gefunden.':'Keine geeignete Karte vorhanden. Founder-, Story- und Live-Karten sowie laufende Verkäufe sind ausgeschlossen.')+'</div>')+(pages>1?'<nav class="cosmetic-pagination" aria-label="Spielerauswahl"><button type="button" class="secondary" data-cosmetic-page="'+(page-1)+'" '+(!page?'disabled':'')+'>← Zurück</button><span>'+(page+1)+' / '+pages+'</span><button type="button" class="secondary" data-cosmetic-page="'+(page+1)+'" '+(page>=pages-1?'disabled':'')+'>Weiter →</button></nav>':'');
}
function render(){
 const el=document.getElementById("evoGrid");if(!el)return;
 const skin=byId(selectedSkin),person=selected();
 if(!skin){
  const groups=[['Designs für Coins','Sofort mit deinen Coins anwenden.',SKINS.filter(s=>s.coins)],['Deine Champions-Belohnungen','Mit Champions-Siegen Designmarken verdienen.',SKINS.filter(s=>s.minWins)]];
  el.innerHTML=studio(groups.map(([title,text,items])=>'<section class="cosmetic-collection"><div class="cosmetic-section-head"><h3>'+title+'</h3><p>'+text+'</p></div><div class="cosmetic-offers">'+items.map(offer).join('')+'</div></section>').join('')+rules(),1,'Dein Spieler. Dein Design.','Wähle einen Look und prüfe ihn auf deiner Vereinskarte.');return;
 }
 if(!person||!isEligible(person,skin.id)){
  selectedUid="";
  el.innerHTML=studio('<div class="cosmetic-head"><button type="button" class="secondary" data-cosmetic-back>← Designs</button><div><h3>'+htmlEscape(skin.title)+'</h3><span>'+htmlEscape(status(skin))+'</span></div></div><label class="cosmetic-search"><span>Spieler suchen</span><input type="search" data-cosmetic-search placeholder="Name eingeben …" value="'+htmlEscape(search)+'" autocomplete="off"></label><div id="cosmeticResults">'+playerResults(skin)+'</div>'+rules(),2,'Wähle deine Karte','Nur geeignete Spieler aus deinem Verein werden angezeigt.');return;
 }
 const old=String(person.cosmeticDesign||""),affordable=skin.coins?Number(state.coins||0)>=skin.coins:remaining(skin)>0,unchanged=old===skin.id;
 const message=unchanged?'Dieses Design ist bereits angewendet.':skin.coins?'Kosten: '+skin.coins.toLocaleString('de-DE')+' Coins':'Kosten: 1 Champions-Designmarke';
 el.innerHTML=studio('<div class="cosmetic-head"><button type="button" class="secondary" data-cosmetic-players>← Spieler wechseln</button><div><h3>'+htmlEscape(displayBase(person).name)+'</h3><span>'+htmlEscape(skin.title)+'</span></div></div><div class="cosmetic-before-after"><div><small>AKTUELL</small>'+cardHTML(displayBase(person),person,true)+'</div><span aria-hidden="true">→</span><div><small>NEUES DESIGN</small>'+preview(person,skin.id)+'</div></div><div class="cosmetic-review"><div><span>Dein Upgrade</span><strong>'+htmlEscape(skin.title)+'</strong></div><div><span>Werte &amp; PlayStyles</span><strong>Bleiben erhalten</strong></div><div><span>'+htmlEscape(message)+'</span></div></div><p class="cosmetic-warning">Die Karte wird dauerhaft <strong>untauschbar</strong>. Auch beim Zurücksetzen gibt es keine Erstattung.</p><div class="cosmetic-footer"><button type="button" class="primary" data-cosmetic-apply '+(!affordable||unchanged?'disabled':'')+'>'+(unchanged?'Bereits angewendet':affordable?'Design jetzt anwenden':skin.coins?'Nicht genügend Coins':htmlEscape(status(skin)))+'</button>'+(old?'<button class="secondary" type="button" data-cosmetic-clear>Originaldesign wiederherstellen</button>':'')+'</div>'+rules(),3,'Deine Vorschau','Vergleiche beide Karten, bevor du das Design anwendest.');
}
function apply(){
 const s=byId(selectedSkin),i=selected();
 if(!s||!isEligible(i,s.id))return;
 if(i.cosmeticDesign===s.id)return;
 if(s.coins){if(Number(state.coins||0)<s.coins)return toast("Nicht genügend Coins.");state.coins-=s.coins}
 else{
  if(remaining(s)<=0)return toast("Diese Champions-Designmarke ist noch nicht freigeschaltet.");
  state.cosmeticClaims=state.cosmeticClaims||{};
  state.cosmeticClaims[s.id]=spent(s)+1
 }
 i.cosmeticDesign=s.id;
 i.tradeable=false;
 if(Array.isArray(state.transferList))state.transferList=state.transferList.filter(uid=>String(uid)!==String(i.uid));
 save();renderAll();selectedUid=i.uid;render();toast(s.title+" erhalten – SBC-Typ angepasst, Werte unverändert.")
}
document.addEventListener("click",e=>{
 if(!e.target.closest("#evoGrid")||!document.getElementById("evolutionView")?.classList.contains("active"))return;
 const hit=e.target.closest("[data-cosmetic-open],[data-cosmetic-back],[data-cosmetic-players],[data-cosmetic-player],[data-cosmetic-apply],[data-cosmetic-clear],[data-cosmetic-page]");
 if(!hit)return;
 if(hit.hasAttribute("data-cosmetic-open")){selectedSkin=hit.dataset.cosmeticOpen;selectedUid="";search="";page=0;render()}
 if(hit.hasAttribute("data-cosmetic-back")){selectedSkin="";selectedUid="";render()}
 if(hit.hasAttribute("data-cosmetic-players")){selectedUid="";render()}
 if(hit.hasAttribute("data-cosmetic-player")){selectedUid=hit.dataset.cosmeticPlayer;render()}
 if(hit.hasAttribute("data-cosmetic-page")){page=Math.max(0,Number(hit.dataset.cosmeticPage)||0);render()}
 if(hit.hasAttribute("data-cosmetic-apply")){apply()}
 if(hit.hasAttribute("data-cosmetic-clear")){
  const i=selected();if(!isEligible(i)||!i.cosmeticDesign)return;
  delete i.cosmeticDesign;save();renderAll();render();toast("Originaldesign wiederhergestellt.")
 }
});
document.addEventListener("input",e=>{
 if(!e.target.matches?.('[data-cosmetic-search]'))return;
 const skin=byId(selectedSkin),results=document.getElementById('cosmeticResults');if(!skin||!results)return;
 search=e.target.value;page=0;results.innerHTML=playerResults(skin);
});
globalThis.FooteraCosmetics={render,skins:SKINS,eligible:isEligible};
})();
