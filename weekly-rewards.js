"use strict";
/* Footera weekly competition rewards – presentation only.
   The competition systems remain the sole source of ranks, rewards and claiming. */
(function(){
 const MODE_NAMES={rivals:"Division Rivals",squad:"Squad Battles",champions:"Footera Champions"};
 const MODE_SHORT={rivals:"RIVALS",squad:"SQUAD BATTLES",champions:"CHAMPIONS"};
 let selectedKey="";

 function rewardKey(row){return String(row.mode)+"|"+String(row.week)}
 function rewardRows(){
  syncCompetitionWeeks();
  return competitionPending().filter(row=>MODE_NAMES[row.mode]&&row.reward&&Array.isArray(row.reward.packs))
   .slice().sort((a,b)=>Number(b.week)-Number(a.week));
 }
 function rankTitle(row){
  if(row.mode==="rivals")return Number(row.division)===0?"Elite Division":"Division "+String(row.division);
  return String(row.rank||"Erreichter Rang");
 }
 function details(row){
  if(row.mode==="rivals")return String(row.milestone||0)+" Wochenpunkte · "+(Number(row.milestone)>=35?"Upgrade-Belohnung":"Basisbelohnung");
  if(row.mode==="squad")return fmt(Number(row.points||0))+" Battle-Punkte";
  return String(Number(row.wins||0))+" Siege · "+String(Number(row.losses||0))+" Niederlagen";
 }
 function rewardCount(rows){return rows.length+" "+(rows.length===1?"Belohnung":"Belohnungen")}
 function renderHomeRewardNotice(){
  const host=document.getElementById("weeklyRewardHome");if(!host)return;
  const rows=rewardRows();
  host.hidden=!rows.length;
  if(!rows.length){host.innerHTML="";return}
  const modes=[...new Set(rows.map(row=>row.mode))];
  const label=modes.map(mode=>MODE_SHORT[mode]).join(" · ");
  host.innerHTML='<button type="button" class="weekly-reward-banner" data-weekly-reward-open aria-label="Wettbewerbsbelohnungen öffnen">'+
   '<span class="weekly-reward-gift" aria-hidden="true"><svg viewBox="0 0 48 48" fill="none"><path d="M8 20h32v22H8V20Zm-3-6h38v8H5v-8ZM24 14v28M14 14C7 12 8 4 14 4c6 0 10 10 10 10M34 14c7-2 6-10 0-10-6 0-10 10-10 10" stroke="currentColor" stroke-width="2.6" stroke-linejoin="round" stroke-linecap="round"/></svg></span>'+
   '<span class="weekly-reward-banner-copy"><small>DEINE WOCHENREWARDS</small><strong>'+esc(rewardCount(rows))+' abholbereit</strong><span>'+esc(label)+' · Jetzt ansehen</span></span>'+
   '<span class="weekly-reward-arrow" aria-hidden="true">›</span></button>';
 }
 function groupedRewardPacks(packs){
  const groups=new Map();
  for(const pack of packs){
   const id=String(pack.id||"");
   const tradeable=pack.tradeable!==false;
   const key=JSON.stringify([id,tradeable]);
   if(!groups.has(key))groups.set(key,{...pack,qty:0});
   groups.get(key).qty++;
  }
  return [...groups.values()];
 }
 function packPreview(pack){
  const id=String(pack.id||""),definition=PACKS.find(p=>p.id===id),rated=/^reward-(\d+)-(\d+)$/.exec(id);
  const name=definition?.name||id||"Reward-Pack";
  const quality=rated?rated[1]+"+":"FOOTERA";
  const amount=pack.qty;
  const art=rated?"./assets/footera/gold.webp":packArtSrc(id);
  return '<div class="weekly-reward-pack"><div class="weekly-reward-pack-art">'+
   '<img src="'+esc(art)+'" alt="" loading="lazy" decoding="async">'+
   '<span class="weekly-reward-pack-rating">'+esc(quality)+'</span>'+
   '<span class="weekly-reward-pack-count">'+esc(String(amount))+'×</span></div>'+
   '<strong>'+esc(name)+'</strong><small>'+(pack.tradeable===false?"Untauschbar":"Tauschbar")+'</small></div>';
 }
 function renderRewardDetails(row){
  const packs=row.reward.packs||[],groupedPacks=groupedRewardPacks(packs),coins=Math.max(0,Number(row.reward.coins||0));
  const coinHtml=coins?'<div class="weekly-reward-coin"><img src="./assets/footera/coins.webp" alt="" loading="lazy">'+
   '<strong>'+fmt(coins)+'</strong><span>Footera Coins</span></div>':"";
  const week=Number(row.week),date=Number.isFinite(week)&&week>0?new Intl.DateTimeFormat("de-DE",{timeZone:"Europe/Berlin",day:"2-digit",month:"2-digit",year:"numeric"}).format(new Date(week)):"";
  return '<section class="weekly-reward-detail">'+
   '<div class="weekly-reward-rank"><small>'+esc(MODE_NAMES[row.mode])+' · WOCHE '+esc(date)+'</small>'+
   '<span class="weekly-reward-rank-icon" aria-hidden="true">◆</span><strong>'+esc(rankTitle(row))+'</strong>'+
   '<span>'+esc(details(row))+'</span></div>'+
   '<div class="weekly-reward-detail-head"><h4>DEINE BELOHNUNGEN</h4><small>'+packs.length+' '+(packs.length===1?"Pack":"Packs")+(coins?" + Coins":"")+'</small></div>'+
   '<div class="weekly-reward-prizes">'+coinHtml+groupedPacks.map(packPreview).join("")+'</div>'+
   '<p class="weekly-reward-note">Beim Abholen werden Münzen direkt gutgeschrieben. Packs landen in deinem Store-Inventar.</p>'+
   '<button type="button" class="weekly-reward-claim" data-weekly-reward-claim="'+esc(String(row.mode))+'" data-week="'+esc(String(row.week))+'">Belohnungen abholen <span aria-hidden="true">→</span></button>'+
   '</section>';
 }
 function renderRewardCenter(){
  const host=document.getElementById("weeklyRewardModalBody");if(!host)return;
  const rows=rewardRows();
  if(!rows.length){
   host.innerHTML='<div class="weekly-reward-empty"><div class="weekly-reward-check" aria-hidden="true">✓</div><h4>Alles abgeholt!</h4><p>Deine Wettbewerb-Rewards sind deinem Club gutgeschrieben. Neue Belohnungen erscheinen nach der nächsten Wertung automatisch hier.</p><button type="button" class="weekly-reward-store" data-weekly-reward-store>Zum Store</button></div>';
   return
  }
  const row=rows.find(r=>rewardKey(r)===selectedKey)||rows[0];selectedKey=rewardKey(row);
  const tabs=rows.length>1?'<div class="weekly-reward-tabs" role="group" aria-label="Abholbare Wettbewerb-Belohnungen">'+rows.map(r=>
   '<button type="button" data-weekly-reward-select="'+esc(rewardKey(r))+'" class="'+(rewardKey(r)===selectedKey?"active":"")+'" aria-pressed="'+String(rewardKey(r)===selectedKey)+'">'+esc(MODE_SHORT[r.mode])+'<span>'+esc(rankTitle(r))+'</span></button>').join("")+'</div>':"";
  host.innerHTML='<div class="weekly-reward-intro"><small>BUILD YOUR ERA · WÖCHENTLICHE REWARDS</small><h3>'+esc(MODE_NAMES[row.mode])+'</h3><p>'+esc(rewardCount(rows))+' bereit · Dein erspielter Rang entscheidet über die Belohnungen.</p></div>'+tabs+renderRewardDetails(row);
 }
 function openRewardCenter(mode="",week=""){
  const rows=rewardRows();if(!rows.length)return;
  const chosen=rows.find(r=>r.mode===mode&&String(r.week)===String(week));
  selectedKey=rewardKey(chosen||rows[0]);renderRewardCenter();
  showUiLayer("weeklyRewardModal","weekly-rewards");
  setTimeout(()=>document.getElementById("weeklyRewardModalClose")?.focus(),60);
 }
 const originalRenderCompetitionHome=renderCompetitionHome;
 renderCompetitionHome=function(){originalRenderCompetitionHome();renderHomeRewardNotice();if(document.getElementById("weeklyRewardModal")?.classList.contains("active"))renderRewardCenter()};
 document.addEventListener("click",function(event){
  const open=event.target.closest("[data-weekly-reward-open]");
  if(open){event.preventDefault();openRewardCenter(open.dataset.weeklyRewardMode||"",open.dataset.weeklyRewardWeek||"");return}
  const select=event.target.closest("[data-weekly-reward-select]");
  if(select){selectedKey=select.dataset.weeklyRewardSelect;renderRewardCenter();return}
  const claim=event.target.closest("[data-weekly-reward-claim]");
  if(claim){
   const row=rewardRows().find(r=>r.mode===claim.dataset.weeklyRewardClaim&&String(r.week)===claim.dataset.week);
   if(!row)return;
   claim.disabled=true;
   if(claimCompetitionReward(row.mode,row.week)){renderHomeRewardNotice();renderRewardCenter()}
   else claim.disabled=false;
   return
  }
  if(event.target.closest("#weeklyRewardModalClose")){closeUiLayer("weeklyRewardModal","weekly-rewards");return}
  if(event.target.closest("[data-weekly-reward-store]")){
   removeUiLayer("weeklyRewardModal");
   switchView("storeView");
  }
 });

 // One-time developer test reissue. Keep the original rank and reward payload:
 // do not calculate a new rank, change match progress or award packs here.
 const RIVALS_RETEST_CODE="rivalstest28";
 const RIVALS_RETEST_MARKER="rivals-weekly-retest-v2128";
 function tryRivalsRetest(){
  const input=document.getElementById("promoCodeInput");
  if(String(input?.value||"").normalize("NFC").trim().toLocaleLowerCase("de-DE")!==RIVALS_RETEST_CODE)return false;
  const status=document.getElementById("promoStatus");
  const feedback=(message,error=false)=>{
   if(status){status.className="promo-status "+(error?"error":"success");status.textContent=message}
  };
  state.directClaims=state.directClaims||{};
  if(state.directClaims[RIVALS_RETEST_MARKER]){
   feedback("Rivals-Testfreigabe wurde in diesem Spielstand bereits verwendet.");return true
  }
  const alreadyPending=competitionPending("rivals");
  if(alreadyPending.length){
   feedback("Du hast bereits eine Rivals-Belohnung zur Abholung. Öffne sie über die Startseite.");return true
  }
  const claimed=(state.weeklyRewards||[])
   .filter(row=>row&&row.mode==="rivals"&&row.claimed===true&&row.reward&&Array.isArray(row.reward.packs))
   .sort((a,b)=>Number(b.week)-Number(a.week));
  if(!claimed.length){
   feedback("Keine bereits abgeholte Rivals-Belohnung in diesem Spielstand gefunden.",true);return true
  }
  const last=claimed[0];
  last.claimed=false;
  state.directClaims[RIVALS_RETEST_MARKER]={claimedAt:Date.now(),week:last.week};
  save();renderAll();renderHomeRewardNotice();
  input.value="";
  feedback("Deine letzte Rivals-Belohnung wurde einmalig erneut freigegeben. Du kannst sie über die Startseite abholen.");
  toast("Rivals-Rewards erneut abholbereit.");
  return true
 }
 function onRivalsRetestPromo(event){
  const redeemClick=event.type==="click"&&event.target.closest?.("#redeemPromoCode");
  const redeemEnter=event.type==="keydown"&&event.key==="Enter"&&event.target.id==="promoCodeInput";
  if(!(redeemClick||redeemEnter)||!tryRivalsRetest())return;
  event.preventDefault();event.stopImmediatePropagation();
 }
 // Capture before the normal promo-code handler; all other codes remain unchanged.
 document.addEventListener("click",onRivalsRetestPromo,true);
 document.addEventListener("keydown",onRivalsRetestPromo,true);
 window.FooteraWeeklyRewards={open:openRewardCenter,renderNotice:renderHomeRewardNotice,renderCenter:renderRewardCenter};
})();
