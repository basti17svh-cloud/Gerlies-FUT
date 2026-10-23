/* Footera - per-pack transparency UI. Reads live player data; never charges currency. */
(function(){
 "use strict";
 let formerFocus=null;
 const byId=id=>document.getElementById(id);
 const safe=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
 function classify(base){
  const rating=Number(base?.ovr)||0;
  if(isActiveEventSbcBase(base))return{rating,kind:"base"};
  const event=activePromoPackEntry(base);
  if(event)return{rating:Number(event.info?.ovr)||rating,kind:"event"};
  const totw=activeTotwWeek()?totwInfo(base):null;
  if(totw)return{rating:Math.max(rating,Number(totw.ovr)||0),kind:"totw"};
  return{rating,kind:"base"};
 }
 function close(){
  const modal=byId("packOddsModal");if(!modal)return;
  modal.classList.remove("active");
  if(formerFocus?.focus)formerFocus.focus();
  formerFocus=null;
 }
 function open(packId){
  const pack=PACKS.find(p=>p.id===packId),modal=byId("packOddsModal"),body=byId("packOddsBody");
  if(!pack||!modal||!body)return;
  byId("packOddsTitle").textContent=pack.name+" – Wahrscheinlichkeiten";
  let html='<p class="pack-odds-intro">Die Prozentwerte gelten pro vollständigem Pack. Sie werden mit den tatsächlich verwendeten Ziehungsgewichten mathematisch berechnet; Rating-Grenzen können sich überschneiden.</p>';
  if(founderRuleForPack(pack.id)){
   html+='<div class="pack-odds-guarantees"><strong>100 % garantiert</strong><span>'+safe(pack.desc||"Eine fest zugeordnete Founder-Karte")+'</span></div>';
   html+='<p class="pack-odds-note">Dieses personalisierte Pack enthält eine feste Karte und keine zufällige Spielerziehung.</p>';
  }else if(pack.recipientSaveId){
   html+='<div class="pack-odds-guarantees"><strong>Feste Sonderinhalte</strong><span>2 Icons und 1 Momentum-Karte; dazu 9 zufällige Karten aus dem Premium-Goldspieler-Pack.</span></div>';
   html+='<p class="pack-odds-note">Für dieses einmalige Sondergeschenk liegt keine berechnete Gesamtquote der neun zusätzlichen Spieler vor.</p>';
  }else{
   const api=window.FooteraPackOdds;
   const event=pack.eventSlot?EVENT_PROMO_RELEASES.find(e=>e.id===pack.eventSlot):null;
   if(event){
    const share=100/Math.max(1,event.players.length);
    html+='<div class="pack-odds-guarantees"><strong>100 % garantiert</strong><span>1 '+safe(event.name)+'-Karte. Jede der '+event.players.length+' Karten ist gleich wahrscheinlich ('+share.toLocaleString("de-DE",{minimumFractionDigits:2,maximumFractionDigits:2})+' % je Karte).</span></div><p class="pack-odds-note">Die folgenden Werte gelten für die übrigen '+(pack.count-1)+' Spieler des Packs.</p>';
   }
   const drawPack=event?eventSlotDrawPack(pack):pack,pool=event?PLAYERS.filter(x=>!event.players.some(i=>String(i.pid)===String(x.id))):PLAYERS;
   const result=api?.calculate(drawPack,pool,{icons:MID_ICON_BASES,classify});
   if(!result?.available){
    html+='<p class="pack-odds-error">Wahrscheinlichkeiten momentan nicht verfügbar. '+safe(result?.reason||"Spielerdaten fehlen.")+'</p>';
   }else{
    const thresholds=pack.type==="bronze"?[55,60,63,65]:pack.type==="silver"?[65,70,73,75]:[75,80,82,83,84,85,86,87,88,89,90,91,93];
    html+='<h4>Spielerstärke – mindestens eine Karte</h4><div class="pack-odds-table-wrap"><table class="pack-odds-table"><thead><tr><th>GES</th><th>Chance pro Pack</th></tr></thead><tbody>';
    for(const n of thresholds){
     const row=result.rows.find(x=>x.threshold===n);
     if(row)html+='<tr><td>'+n+'+</td><td>'+api.percent(row)+'</td></tr>';
    }
    html+='</tbody></table></div><h4>Spezialkarten und Garantien</h4><div class="pack-odds-specials">';
    const detail=(label,value)=>'<div class="pack-odds-special-row"><span>'+safe(label)+'</span><strong>'+value+'</strong></div>';
    html+=detail("Event-Spezialkarte",api.percent(result.events));
    html+=detail("Team of the Week",api.percent(result.totw));
    html+=detail("Irgendeine Spezialkarte inkl. Icon",api.percent(result.special));
    html+=detail("Icon – direkte Zusatzchance",packChanceLabel(result.iconExact));
    if(pack.rareCount)html+=detail("Mindestens "+pack.rareCount+" seltene Karten","100 % (garantiert)");
    if(pack.chemBoostSlots?.slots&&Number(pack.chemBoostSlots.chance)===1)
     html+=detail(pack.chemBoostSlots.slots+" Chemie-Boosts","100 % (garantiert)");
    if(pack.guarantee)html+=detail("Mindestens 1× "+pack.guarantee+"+ im garantierten Slot","100 % (garantiert)");
    html+='</div><p class="pack-odds-note"><strong>Berechnungsmodell:</strong> Jede zulässige Kombination unterschiedlicher Spieler ist proportional zum Produkt ihrer Gewichte wahrscheinlich. Garantierte Ratings, aktive Spezialkarten und die unabhängige Icon-Ziehchance sind berücksichtigt. Es handelt sich nicht um eine Simulation; die angegebenen Dezimalwerte sind gerundet. Bei Änderungen am Kartenpool oder aktiven Events werden die Prozentwerte neu berechnet.</p>';
   }
  }
  html+='<p class="pack-odds-disclaimer">Packs enthalten zufällige virtuelle Inhalte. Vorherige Packkäufe erhöhen die Chancen nicht. Ein bestimmter Spieler ist nur dann garantiert, wenn dies ausdrücklich genannt wird.</p>';
  body.innerHTML=html;
  formerFocus=document.activeElement;
  modal.classList.add("active");
  byId("packOddsClose").focus();
 }
 document.addEventListener("click",event=>{
  const trigger=event.target.closest?.("[data-pack-odds]");
  if(trigger){event.preventDefault();open(trigger.dataset.packOdds);return}
  if(event.target===byId("packOddsModal")||event.target.closest?.("#packOddsClose"))close();
 });
 document.addEventListener("keydown",event=>{
  if(event.key==="Escape"&&byId("packOddsModal")?.classList.contains("active")){
   event.preventDefault();close()
  }
 });
 window.FooteraPackOddsUI={open,close};
})();
