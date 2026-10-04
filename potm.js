/* Verified FC 27 September POTMs, checked 4 October 2026.
   Requirements: FUT.GG; UTC expiry: FCData; OVR scores: EA launch update.
   Footera uses the published base OVR score, without Gallery/Holographic bonuses. */
(function(){
 "use strict";
 const asset="assets/footera/events/potm/";
 const releases=[
  {id:"potm-2026-09-olise",pid:"247827",name:"Michael Olise",shortName:"Olise",theme:"bundesliga",league:"Bundesliga",team:"Bayern München",nation:"France",ovr:91,position:"RW",alt:"RM,CAM",stats:[84,83,90,92,48,70],skillMoves:5,weakFoot:3,preferredFoot:"Left",target:700000,minRating:45,from:"2026-10-01T15:00:00Z",until:"2026-10-29T15:00:00Z",face:asset+"september-2026/olise.png",clubLogo:"./assets/badges/c008a1707e64.png",source:"https://www.fut.gg/sbc/players/27-39-bundesliga-potm-september/"},
  {id:"potm-2026-09-gross",pid:"190765",name:"Pascal Groß",shortName:"Groß",theme:"premier-league",league:"Premier League",team:"Brighton & Hove Albion",nation:"Germany",ovr:84,position:"CDM",alt:"CM",stats:[76,79,88,83,77,79],skillMoves:3,weakFoot:4,preferredFoot:"Right",target:18750,minRating:45,from:"2026-10-02T11:00:00Z",until:"2026-10-30T11:00:00Z",face:asset+"september-2026/gross.png",clubLogo:"./assets/badges/824cf0b045cd.png",source:"https://www.fut.gg/sbc/players/27-34-premier-league-potm-september/"},
  {id:"potm-2026-09-raphinha",pid:"233419",name:"Raphinha",shortName:"Raphinha",theme:"laliga",league:"LALIGA EA SPORTS",team:"FC Barcelona",nation:"Brazil",ovr:89,position:"ST",alt:"RM,LM,CAM,RW,LW",stats:[92,87,86,88,55,77],skillMoves:4,weakFoot:4,preferredFoot:"Left",target:1300000,minRating:45,from:"2026-10-02T16:00:00Z",until:"2026-10-30T16:00:00Z",face:asset+"september-2026/raphinha.png",clubLogo:"./assets/badges/f4fbaa2f0b8c.png",source:"https://www.fut.gg/sbc/players/27-33-laliga-potm-september/"},
  {id:"potm-2026-09-malen",pid:"231447",name:"Donyell Malen",shortName:"Malen",theme:"serie-a",league:"Serie A",team:"AS Roma",nation:"Netherlands",ovr:85,position:"ST",alt:"",stats:[87,85,75,86,39,70],skillMoves:4,weakFoot:4,preferredFoot:"Right",target:90000,minRating:45,from:"2026-10-01T13:00:00Z",until:"2026-10-29T13:00:00Z",face:asset+"september-2026/malen.png",clubLogo:"./assets/badges/f7ac4d2b0f6d.png",source:"https://www.fut.gg/sbc/players/27-32-serie-a-potm-september/"}
 ];
 const scores=[90,100,120,140,160,180,280,340,410,830,2100,4100,5500,8300,11000,14000,19000,20000,25000,30000,40000,55000,85000,90000,100000];
 function scoreForRating(rating){const r=Number(rating);if(!Number.isInteger(r)||r<45||r>99)return 0;return r<65?20:r<75?35:scores[r-75]}
 function release(id){return releases.find(r=>r.id===id)||null}
 function info(item){return item?.eventType==="potm-sbc"?release(item.eventReleaseId):null}
 function isActive(r,at=Date.now()){const t=Number(at instanceof Date?at.getTime():at);return !!r&&t>=Date.parse(r.from)&&t<Date.parse(r.until)}
 function activeSBCs(at=new Date()){return releases.filter(r=>isActive(r,at)).map(r=>({id:r.id,group:"POTM",name:r.name,once:true,scoreSbc:true,scoreTarget:r.target,minRating:r.minRating,expiresAt:Date.parse(r.until),reward:{}}))}
 function baseFor(r){
  let b=P_BY_ID.get(r.pid);
  if(!b){b={id:r.pid,name:r.name,fullName:r.name,ovr:r.ovr,position:r.position,alt:r.alt,nation:r.nation,team:r.team,league:r.league,face:typeof sofifaFace==="function"?sofifaFace(r.pid):"",gender:"male",source:"footera-potm-fallback"};for(const [i,k] of ["pac","sho","pas","dri","def","phy"].entries())b[k]=r.stats[i];P_BY_ID.set(r.pid,b)}
  return b
 }
 function itemFor(r,preview=false){
  const opts={variant:"special",eventType:"potm-sbc",eventName:"POTM "+r.league,eventReleaseId:r.id,dynamicFace:r.face,displayRating:r.ovr,eventStats:r.stats,overridePosition:r.position,rare:true,acquisitionSource:"SBC"};
  return preview?{...opts,pid:baseFor(r).id,uid:"preview-"+r.id,evo:0,evoStats:{},tradeable:false}:makeItem(baseFor(r),false,opts)
 }
 function progress(r){const p=state.potmProgress?.[r.id]||{};return{score:Math.min(r.target,Math.max(0,Math.floor(Number(p.score)||0))),submittedCount:Math.max(0,Math.floor(Number(p.submittedCount)||0)),claimedAt:p.claimedAt||null}}
 function completed(r){return !!(state.sbcCompletions?.[r.id]||progress(r).claimedAt)}
 function eligibleRows(r){
  const seen=new Set(),offered=new Set(state.transferList||[]);
  return sbcSourceItems().filter(({item})=>{
   const key=String(item.uid);if(seen.has(key)||offered.has(item.uid)||isFounderItem(item)||isStoryItem(item)||!displayBase(item)||itemRating(item)<r.minRating||!scoreForRating(itemRating(item)))return false;
   seen.add(key);return true
  })
 }
 function risksFor(item){const teams=[...new Set(sbcTeamUsageForUid(item.uid)||[])];if(!teams.length&&state.squad?.includes(item.uid))teams.push("Aktuelles Team");return{teams,evolution:!!activeEvolutionForUid(item.uid)}}
 function planSubmission(id,uids,at=Date.now()){
  const r=release(id);if(!isActive(r,at))return{ok:false,message:"Diese POTM-SBC ist nicht mehr aktiv."};
  if(completed(r))return{ok:false,message:"Diese POTM-SBC wurde bereits abgeschlossen."};
  const ids=[...new Set((Array.isArray(uids)?uids:[]).map(String).filter(Boolean))],pool=new Map(eligibleRows(r).map(x=>[String(x.item.uid),x]));
  if(!ids.length)return{ok:false,message:"Wähle zuerst Spieler aus."};
  if(ids.some(uid=>!pool.has(uid)))return{ok:false,message:"Ein ausgewählter Spieler ist nicht mehr verfügbar oder nicht abgabefähig."};
  const rows=ids.map(uid=>{const x=pool.get(uid);return{...x,points:scoreForRating(itemRating(x.item)),...risksFor(x.item)}}),points=rows.reduce((sum,x)=>sum+x.points,0),p=progress(r),remaining=r.target-p.score;
  const fingerprint=JSON.stringify({id,score:p.score,rows:rows.map(x=>[x.item.uid,x.source,x.points,x.teams,x.evolution])});
  return{ok:true,r,rows,points,remaining,newScore:Math.min(r.target,p.score+points),excess:Math.max(0,points-remaining),complete:points>=remaining,fingerprint}
 }
 let detailId="",search="",source="",showProtected=false,limit=24,review=null,overviewScrollY=0;
 function draft(r){state.potmDrafts=state.potmDrafts||{};const allowed=new Set(eligibleRows(r).map(x=>String(x.item.uid)));const arr=Array.isArray(state.potmDrafts[r.id])?state.potmDrafts[r.id]:[];return state.potmDrafts[r.id]=[...new Set(arr.map(String).filter(uid=>allowed.has(uid)))]}
 function commitSubmission(plan){
  if(!plan?.ok)return false;
  const fresh=planSubmission(plan.r.id,plan.rows.map(x=>x.item.uid));
  if(!fresh.ok){toast(fresh.message);review=null;renderSBC();return false}
  if(fresh.fingerprint!==plan.fingerprint){review=fresh;renderSBC();toast("Die Auswahl hat sich geändert. Bitte prüfe die Abgabe erneut.");return false}
  if(typeof pendingPack!=="undefined"&&pendingPack.length&&pendingResolved.size!==pendingPack.length){toast("Bitte zuerst deinen offenen Pack-Inhalt zuweisen.");return false}
  // Prepare the reward before consuming anything. It is saved as pending pack
  // content in the same save as the claim, so reload recovery cannot lose it.
  const reward=fresh.complete?itemFor(fresh.r):null,ids=new Set(fresh.rows.map(x=>x.item.uid)),p=progress(fresh.r);
  ensureObjectiveWindows();persistActiveSquadPreset(state);
  state.squad=(state.squad||[]).map(uid=>ids.has(uid)?null:uid);
  state.roles={...state.roles};state.focus={...state.focus};for(let i=0;i<11;i++)if(!state.squad[i]){delete state.roles[i];delete state.focus[i]}
  state.squadPresets=(state.squadPresets||[]).map(preset=>{
   if(!preset)return preset;const squad=(preset.squad||[]).map(uid=>ids.has(uid)?null:uid),roles={...preset.roles},focus={...preset.focus};
   for(let i=0;i<11;i++)if(!squad[i]){delete roles[i];delete focus[i]}return{...preset,squad,roles,focus}
  });
  for(const uid of ids)removeActiveEvolutionForUid(uid);
  state.club=(state.club||[]).filter(item=>!ids.has(item.uid));state.sbcStorage=(state.sbcStorage||[]).filter(item=>!ids.has(item.uid));state.transferList=(state.transferList||[]).filter(uid=>!ids.has(uid));
  state.potmProgress=state.potmProgress||{};state.potmProgress[fresh.r.id]={score:fresh.newScore,submittedCount:p.submittedCount+fresh.rows.length,claimedAt:reward?Date.now():null};
  if(reward){state.sbcCompletions=state.sbcCompletions||{};state.sbcCompletions[fresh.r.id]=true;state.stats.sbcs=(state.stats.sbcs||0)+1;pendingPack=[reward];pendingResolved=new Set();state.pendingPack=pendingPack;state.pendingResolved=[]}
  state.potmDrafts=state.potmDrafts||{};state.potmDrafts[fresh.r.id]=[];review=null;
  save();renderAll();if(reward)openPack("potm-sbc-player",[reward]);toast(reward?`${fresh.r.name} POTM freigeschaltet!`:`${fmt(fresh.points)} Punkte abgegeben. Dein Fortschritt ist gespeichert.`);return true
 }
 const dateLabel=r=>new Intl.DateTimeFormat("de-DE",{timeZone:"Europe/Berlin",day:"2-digit",month:"2-digit",year:"numeric",hour:"2-digit",minute:"2-digit"}).format(new Date(r.until))+" Uhr";
 function cardFor(r){const item=itemFor(r,true);return cardHTML(displayBase(item),item)}
 function progressHTML(r){const p=progress(r),pct=Math.round(p.score/r.target*100);return`<div class="potm-progress-label"><b>${fmt(p.score)} / ${fmt(r.target)} Punkte</b><span>${pct}%</span></div><div class="potm-progress" role="progressbar" aria-label="SBC-Fortschritt" aria-valuemin="0" aria-valuemax="${r.target}" aria-valuenow="${p.score}"><i style="width:${pct}%"></i></div>`}
 function feature(r,detail=false){const done=completed(r);return`<article class="potm-feature potm-theme-${r.theme}"><div class="potm-feature-head"><span>POTM · SEPTEMBER</span><span>${done?"ABGESCHLOSSEN":"AKTIV"}</span></div><div class="potm-feature-main"><div class="potm-art">${cardFor(r)}</div><div class="potm-feature-copy"><small>${esc(r.league)}</small><h3>${esc(r.name)}</h3><p>${esc(r.team)}</p><div class="potm-item-tags"><span>${r.ovr} GES</span><span>${esc(positionLabel(r.position))}</span><span>${r.skillMoves}★ Skills</span><span>${r.weakFoot}★ WF</span></div><p class="potm-reward-note">Spielerbelohnung · untauschbar</p></div></div>${progressHTML(r)}<div class="potm-feature-footer"><span>Bis ${esc(dateLabel(r))}<br><b>${isActive(r)?"Noch "+sbcTimeLeft(Date.parse(r.until)):"Abgelaufen"}</b></span>${detail?"":`<button class="primary" type="button" data-potm-open="${r.id}">${done?"Ansehen":"SBC öffnen"} ›</button>`}</div></article>`}
 function overviewHTML(){const rows=releases.filter(r=>isActive(r));return`<section class="potm-intro"><span>PLAYER OF THE MONTH</span><h3>Die Besten ihres Monats.</h3><p>Die POTMs der Top-Ligen. Wähle deine SBC und gib Spieler für Punkte ab.</p></section><div class="potm-feature-grid">${rows.map(r=>feature(r)).join("")||'<div class="online-note">Zurzeit ist keine POTM-SBC aktiv.</div>'}</div><div class="potm-awaiting"><img src="./${asset}logos/ligue-1.png" alt="Ligue 1"><div><b>Ligue 1</b><p>Für September ist noch keine POTM-SBC veröffentlicht.</p></div></div>`}
 function pickerRowHTML(row,selected){const item=row.item,b=displayBase(item),risk=risksFor(item),protectedText=[risk.teams.length?risk.teams.join(", "):"",risk.evolution?"Aktive Evolution":""].filter(Boolean).join(" · ");return`<button type="button" class="potm-picker-row ${selected?"selected":""}" data-potm-pick="${esc(item.uid)}" aria-pressed="${selected}" aria-label="${esc(b.name)}, ${itemRating(item)} GES, ${fmt(scoreForRating(itemRating(item)))} Punkte${selected?", ausgewählt":""}"><span class="potm-select-mark" aria-hidden="true">${selected?"✓":"+"}</span><div class="potm-picker-card">${cardHTML(b,item,true)}</div><div class="potm-picker-copy"><b>${esc(b.name)}</b><small>${itemRating(item)} GES · ${esc(positionLabel(b.position))} · ${row.source==="storage"?"SBC-Speicher":"Verein"}</small><strong>${fmt(scoreForRating(itemRating(item)))} Punkte</strong>${protectedText?`<em>${esc(protectedText)}</em>`:""}</div></button>`}
 function pickerHTML(r){const selected=new Set(draft(r)),query=search.trim().toLocaleLowerCase("de");let rows=eligibleRows(r).filter(x=>{
  const risk=risksFor(x.item),b=displayBase(x.item);return (!source||x.source===source)&&(showProtected||(!risk.teams.length&&!risk.evolution))&&(!query||[b.name,b.team,b.league,String(itemRating(x.item))].some(s=>String(s||"").toLocaleLowerCase("de").includes(query)))
 });rows.sort((a,b)=>itemRating(a.item)-itemRating(b.item)||String(displayBase(a.item).name).localeCompare(displayBase(b.item).name,"de"));
 return`<div class="potm-picker-count">${rows.length} verfügbare Spieler · ${selected.size} ausgewählt</div><div class="potm-picker-list">${rows.slice(0,limit).map(x=>pickerRowHTML(x,selected.has(String(x.item.uid)))).join("")||'<div class="online-note">Keine passenden Spieler. Passe deine Filter an oder öffne Packs im Store.</div>'}</div>${rows.length>limit?'<button type="button" class="secondary potm-more" data-potm-more>Mehr Spieler anzeigen</button>':""}`
 }
 function selectionHTML(r){const ids=draft(r),plan=planSubmission(r.id,ids),points=plan.ok?plan.points:0;return`<div class="potm-selection"><div><strong>${ids.length} Spieler · ${fmt(points)} Punkte</strong><small>${plan.ok&&plan.excess?`${fmt(plan.excess)} Punkte Überschuss verfallen.`:`Noch ${fmt(Math.max(0,r.target-progress(r).score-points))} Punkte nach dieser Abgabe.`}</small></div><div><button type="button" class="secondary" data-potm-clear ${ids.length?"":"disabled"}>Leeren</button><button type="button" class="primary" data-potm-review ${plan.ok?"":"disabled"}>${plan.ok&&plan.complete?"SBC abschließen":"Punkte abgeben"}</button></div></div>`}
 function reviewHTML(){if(!review?.ok)return"";const r=review.r,risks=review.rows.filter(x=>x.teams.length||x.evolution);return`<div class="potm-review-wrap" role="alertdialog" aria-modal="true" aria-labelledby="potmReviewTitle"><div class="potm-review"><h3 id="potmReviewTitle">Abgabe bestätigen</h3><p>${review.rows.length} Spieler ${review.rows.length===1?"wird":"werden"} dauerhaft aus deinem Verein bzw. SBC-Speicher entfernt.</p><strong>${fmt(review.points)} Punkte für ${esc(r.name)}</strong>${review.excess?`<p class="potm-risk">${fmt(review.excess)} Punkte Überschuss verfallen.</p>`:""}${risks.length?`<div class="potm-risks">${risks.map(x=>`<p><b>${esc(displayBase(x.item).name)}</b>${x.teams.length?`<br>Wird aus ${esc(x.teams.join(", "))} entfernt.`:""}${x.evolution?"<br>Aktive Evolution wird beendet. Offene Upgrades gehen verloren.":""}</p>`).join("")}</div>`:""}<div class="potm-review-actions"><button type="button" class="secondary" data-potm-cancel>Auswahl bearbeiten</button><button type="button" class="danger-confirm" data-potm-confirm>Verbindlich abgeben</button></div></div></div>`}
 function detailHTML(r){const done=completed(r),active=isActive(r);return`<div class="sbc-set-detail-nav"><button type="button" data-potm-back aria-label="Zurück zur POTM-Übersicht">‹</button><div><strong>${esc(r.name)} POTM</strong><span>${esc(r.league)} · September</span></div></div>${feature(r,true)}<section class="potm-requirements"><h3>SBC-Anforderungen</h3><div class="potm-requirement-grid"><div><small>PUNKTZIEL</small><b>${fmt(r.target)}</b></div><div><small>MINDESTWERTUNG</small><b>${r.minRating} GES</b></div><div><small>WIEDERHOLBAR</small><b>Nein</b></div><div><small>FORTSCHRITT</small><b>Teilabgaben möglich</b></div></div><p>Keine Chemie- oder Positionsvorgabe. Spieler aus Verein und SBC-Speicher sind erlaubt, auch mehrere Exemplare desselben Spielers. Die Punkte folgen der EA-Gesamtwertungstabelle ohne Galerie- oder Holografie-Boni.</p><details><summary>Punktewertung ansehen</summary><div class="potm-score-table">${[45,65,...Array.from({length:25},(_,i)=>75+i)].map(v=>`<span>${v===45?"45–64":v===65?"65–74":v} GES <b>${fmt(scoreForRating(v))}</b></span>`).join("")}</div></details></section>${done?'<div class="potm-success">✓ SBC abgeschlossen · Spielerbelohnung erhalten.</div>':!active?'<div class="online-note">Diese SBC ist abgelaufen. Bereits abgegebene Punkte können nicht zurückgenommen werden.</div>':`<section class="potm-picker"><h3>Spieler auswählen</h3><p>Spieler in deinen Teams und aktive Evolutions sind zunächst ausgeblendet. Founder- und Story-Karten sind geschützt.</p><div class="potm-picker-filters"><label>Spieler suchen<input type="search" id="potmSearch" value="${esc(search)}" placeholder="Name, Verein oder Wertung"></label><label>Quelle<select id="potmSource"><option value="" ${!source?"selected":""}>Verein + SBC-Speicher</option><option value="club" ${source==="club"?"selected":""}>Mein Verein</option><option value="storage" ${source==="storage"?"selected":""}>SBC-Speicher</option></select></label></div><label class="potm-protected-toggle"><input type="checkbox" id="potmProtected" ${showProtected?"checked":""}>Spieler aus meinen Teams und aktive Evolutions anzeigen</label><div id="potmPickerResults">${pickerHTML(r)}</div><div id="potmSelection">${selectionHTML(r)}</div></section>`}${reviewHTML()}`}
 function render(){
  const r=release(detailId);if(!r)detailId="";
  if(r){$("sbcTabs").innerHTML="";$("sbcGrid").innerHTML=detailHTML(r);return true}
  const preferred=["POTM","Profis","Live 19 Uhr","Top-Partien","Grundlagen","Verbesserungen","Ligen"],rows=allActiveSBCs();
  $("sbcTabs").innerHTML=preferred.filter(g=>g==="POTM"||rows.some(x=>x.group===g)).map(g=>`<button class="sbc-tab ${g==="POTM"?"active":""}" data-sbc-group="${esc(g)}">${esc(g)}</button>`).join("");$("sbcGrid").innerHTML=overviewHTML();return true
 }
 function updatePicker(){const r=release(detailId);if(!r||!$("potmPickerResults"))return;$("potmPickerResults").innerHTML=pickerHTML(r);$("potmSelection").innerHTML=selectionHTML(r)}
 function back(){if(review){review=null;renderSBC();return true}if(detailId){detailId="";if(history.state?.kind==="potm-sbc")replaceUiState("view",{view:"sbcView"});renderSBC();window.scrollTo({top:overviewScrollY,behavior:"auto"});return true}return false}
 function restore(h){review=null;detailId=h?.kind==="potm-sbc"&&release(h.potmId)?h.potmId:"";if(detailId){activeSbcGroup="POTM";activeSbcId=null;activeSbcSet=null;renderSBC()}}
 function handleBack(h){if(review){review=null;renderSBC();return true}if(h?.kind==="potm-sbc"&&h.potmId===detailId)return false;if(detailId){detailId="";if(h?.view!=="sbcView")return false;renderSBC();return true}return false}
 globalThis.FooteraPotm={releases,scoreForRating,info,isActive,activeSBCs,itemFor,progress,planSubmission,commitSubmission,render,handleBack,restore,busy:()=>!!(review||detailId)&&currentViewId()==="sbcView"};
 // Theme and metadata are scoped to the SBC item, never its normal base card.
 if(typeof cardClass==="function"){
  const originalClass=cardClass,originalBase=itemBase,originalDisplay=displayBase,originalEmblems=emblemCandidates;
  cardClass=function(p,item){const cls=originalClass(p,item),r=info(item);return r&&cls==="special"?"potm potm-"+r.theme:cls};
  itemBase=function(item){const r=info(item);if(r)baseFor(r);return originalBase(item)};
  displayBase=function(item){const b=originalDisplay(item),r=info(item);if(!b||!r)return b;return{...b,name:r.shortName,fullName:r.name,team:r.team,nation:r.nation,league:r.league,alt:r.alt,skillMoves:r.skillMoves,weakFoot:r.weakFoot,preferredFoot:r.preferredFoot,clubLogo:r.clubLogo,leagueLogo:"./"+asset+"logos/"+r.theme+".png",potmTheme:r.theme,dynamicFace:item.dynamicFace||r.face}};
  emblemCandidates=function(kind,p){if(p?.potmTheme&&(kind==="club"||kind==="league"))return[kind==="club"?p.clubLogo:"./"+asset+"logos/"+p.potmTheme+".png"];return originalEmblems(kind,p)}
 }
 if(typeof PACKS!=="undefined"&&!PACKS.some(p=>p.id==="potm-sbc-player"))PACKS.push({id:"potm-sbc-player",name:"POTM SBC-Spieler-Pack",coins:null,points:null,type:"special",count:1,min:0,max:99,store:false,reward:false,desc:"1 untauschbarer POTM SBC-Spieler",iconChance:0});
 if(typeof document==="undefined"||typeof $!=="function")return;
 $("sbcGrid")?.addEventListener("click",e=>{
  const open=e.target.closest("[data-potm-open]");if(open){overviewScrollY=window.scrollY;detailId=open.dataset.potmOpen;activeSbcId=null;activeSbcSet=null;review=null;search="";source="";showProtected=false;limit=24;pushUiState("potm-sbc",{view:"sbcView",potmId:detailId});renderSBC();window.scrollTo({top:0,behavior:"auto"});return}
  if(e.target.closest("[data-potm-back]")){back();return}
  const r=release(detailId);if(!r)return;
  if(e.target.closest("[data-potm-cancel]")){review=null;renderSBC();return}
  if(e.target.closest("[data-potm-confirm]")){const plan=review;review=null;commitSubmission(plan);return}
  if(e.target.closest("[data-potm-more]")){limit+=24;updatePicker();return}
  if(e.target.closest("[data-potm-clear]")){state.potmDrafts[r.id]=[];save();updatePicker();return}
  if(e.target.closest("[data-potm-review]")){const plan=planSubmission(r.id,draft(r));if(!plan.ok){toast(plan.message);renderSBC();return}review=plan;renderSBC();$("sbcGrid").querySelector("[data-potm-cancel]")?.focus();return}
  const pick=e.target.closest("[data-potm-pick]");if(pick&&!review){const ids=draft(r),uid=pick.dataset.potmPick;state.potmDrafts[r.id]=ids.includes(uid)?ids.filter(x=>x!==uid):[...ids,uid];save();updatePicker()}
 });
 $("sbcGrid")?.addEventListener("input",e=>{if(e.target.id!=="potmSearch")return;search=e.target.value;limit=24;updatePicker()});
 $("sbcGrid")?.addEventListener("change",e=>{if(e.target.id==="potmSource")source=e.target.value;else if(e.target.id==="potmProtected")showProtected=e.target.checked;else return;limit=24;updatePicker()});
 $("sbcTabs")?.addEventListener("click",e=>{if(e.target.closest("[data-sbc-group]")){detailId="";review=null}});
 $("sbcGrid")?.addEventListener("keydown",e=>{if(!review)return;if(e.key==="Escape"){review=null;renderSBC();return}if(e.key==="Tab"){const first=$("sbcGrid").querySelector("[data-potm-cancel]"),last=$("sbcGrid").querySelector("[data-potm-confirm]");if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus()}}});
 setInterval(()=>{if(currentViewId()==="sbcView"&&activeSbcGroup==="POTM"&&!review&&!$("potmSearch")?.matches(":focus"))renderSBC()},60000);
})();
