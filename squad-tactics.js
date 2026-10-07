/* Footera V21.24 — Squad planning: individual tactics, roles and assignments. */
(function(){
 "use strict";
 const DEFAULT_TACTICS=Object.freeze({width:50,depth:50,pressing:50,buildUp:"balanced",attackFocus:"balanced",dribbling:50,crossing:50,longShots:50});
 const ASSIGNMENTS=Object.freeze([
  {key:"captain",label:"Kapitän",hint:"Führt die Mannschaft auf dem Platz."},
  {key:"cornerLeft",label:"Ecke links",hint:"Schlägt Eckbälle von der linken Seite."},
  {key:"cornerRight",label:"Ecke rechts",hint:"Schlägt Eckbälle von der rechten Seite."},
  {key:"freeKicks",label:"Freistöße",hint:"Übernimmt direkte Freistöße."},
  {key:"penalties",label:"Elfmeter",hint:"Tritt Strafstöße in der regulären Spielzeit."}
 ]);
 const h=v=>typeof esc==="function"?esc(String(v??"")):String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
 const clamp=(v,f=50)=>{const n=Number(v);return Number.isFinite(n)?Math.max(0,Math.min(100,Math.round(n))):f};
 function cleanTactics(raw={}){
  const x=raw&&typeof raw==="object"&&!Array.isArray(raw)?raw:{};
  return{width:clamp(x.width),depth:clamp(x.depth),pressing:clamp(x.pressing),buildUp:["balanced","patient","fast"].includes(x.buildUp)?x.buildUp:"balanced",attackFocus:["balanced","wide","inside"].includes(x.attackFocus)?x.attackFocus:"balanced",dribbling:clamp(x.dribbling),crossing:clamp(x.crossing),longShots:clamp(x.longShots)}
 }
 function planIndex(index=state?.activeSquadPreset){const n=Number(index);return Number.isInteger(n)&&n>=0&&n<3?n:0}
 function plans(){if(!state.squadPlans||typeof state.squadPlans!=="object"||Array.isArray(state.squadPlans))state.squadPlans={};return state.squadPlans}
 function planFor(index=planIndex()){
  const key=String(planIndex(index)),raw=plans()[key]&&typeof plans()[key]==="object"?plans()[key]:{};
  return{tactics:cleanTactics(raw.tactics),assignments:raw.assignments&&typeof raw.assignments==="object"?{...raw.assignments}:{}}
 }
 let saveTimer=0;
 function scheduleSave(){clearTimeout(saveTimer);saveTimer=setTimeout(()=>{try{save()}catch(e){}},80)}
 function writePlan(next,index=planIndex()){
  const key=String(planIndex(index)),prev=planFor(index);
  plans()[key]={tactics:cleanTactics(next?.tactics||prev.tactics),assignments:next?.assignments&&typeof next.assignments==="object"?{...next.assignments}:{...prev.assignments}};
  scheduleSave();return plans()[key]
 }
 function starterRows(){
  try{return squadItems().slice(0,11).map((item,index)=>item?{item,index,base:displayBase(item)}:null).filter(row=>row?.base)}catch(e){return[]}
 }
 function assignmentScore(key,row){
  const b=resolvedPlayer(row.base),ovr=itemRating(row.item),pas=Number(b?.pas||0),dri=Number(b?.dri||0),sho=Number(b?.sho||0),phy=Number(b?.phy||0);
  if(key==="captain")return ovr*3+phy+pas*.35;
  if(key==="cornerLeft"||key==="cornerRight")return pas*1.45+dri*.75+sho*.2;
  if(key==="freeKicks")return sho*1.1+pas*1.05+dri*.35;
  if(key==="penalties")return sho*1.65+ovr*.55+phy*.2;
  return ovr
 }
 function normalizeAssignments(raw=planFor().assignments,{auto=true,persist=true}={}){
  const rows=starterRows(),valid=new Set(rows.map(r=>String(r.item.uid))),out={};
  for(const row of ASSIGNMENTS){const uid=String(raw?.[row.key]||"");if(uid&&valid.has(uid))out[row.key]=uid}
  if(auto&&rows.length)for(const row of ASSIGNMENTS)if(!out[row.key])out[row.key]=[...rows].sort((a,b)=>assignmentScore(row.key,b)-assignmentScore(row.key,a))[0]?.item?.uid||"";
  if(persist&&JSON.stringify(out)!==JSON.stringify(planFor().assignments))writePlan({assignments:out});
  return out
 }
 function currentTactics(){return planFor().tactics}
 function mentalityLabel(){return({balanced:"Ausgeglichen",attacking:"Offensiv",defensive:"Defensiv"})[state?.tactic]||"Ausgeglichen"}
 function syncSummaries(){
  const t=currentTactics(),rows=starterRows(),assign=normalizeAssignments(undefined,{auto:true,persist:rows.length>0});
  const a=document.getElementById("squadTacticsSummary"),r=document.getElementById("squadRolesSummary"),x=document.getElementById("squadAssignmentsSummary");
  if(a)a.textContent=`${mentalityLabel()} · Breite ${t.width} · Tiefe ${t.depth}`;
  if(r)r.textContent=`${rows.length}/11 Spieler · Rollen & Fokus`;
  if(x){const captain=rows.find(row=>String(row.item.uid)===String(assign.captain));x.textContent=captain?`Kapitän: ${captain.base.name}`:"Kapitän · Ecken · Standards"}
 }
 function icon(type){
  if(type==="tactics")return '<svg viewBox="0 0 24 24"><path d="M4 6h10M18 6h2M10 12h10M4 12h2M4 18h8M16 18h4"/><circle cx="16" cy="6" r="2"/><circle cx="8" cy="12" r="2"/><circle cx="14" cy="18" r="2"/></svg>';
  if(type==="roles")return '<svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="3"/><path d="M6 20c.6-5 2.7-7.5 6-7.5s5.4 2.5 6 7.5M4 4l2 2M20 4l-2 2"/></svg>';
  return '<svg viewBox="0 0 24 24"><path d="M6 21V4M7 5h10l-2 4 2 4H7M10 18h9"/><circle cx="18" cy="18" r="2"/></svg>'
 }
 function mountUi(){
  const toolbar=document.querySelector("#squadView .toolbar");if(!toolbar||document.getElementById("squadPlanMenu"))return false;
  toolbar.insertAdjacentHTML("afterend",`<div id="squadPlanMenu" class="squad-plan-menu" aria-label="Mannschaft planen">
   <button id="openSquadTactics" class="squad-plan-btn tactics" type="button"><span class="squad-plan-icon">${icon("tactics")}</span><span class="squad-plan-copy"><small>Matchplan</small><strong>Individuelle Taktik</strong><em id="squadTacticsSummary">Breite 50 · Tiefe 50</em></span><b>›</b></button>
   <button id="openSquadRoles" class="squad-plan-btn roles" type="button"><span class="squad-plan-icon">${icon("roles")}</span><span class="squad-plan-copy"><small>Spieler</small><strong>Rollen & Fokus</strong><em id="squadRolesSummary">11 Positionen bearbeiten</em></span><b>›</b></button>
   <button id="openSquadAssignments" class="squad-plan-btn assignments" type="button"><span class="squad-plan-icon">${icon("assignments")}</span><span class="squad-plan-copy"><small>Standards</small><strong>Aufgaben</strong><em id="squadAssignmentsSummary">Kapitän · Ecken · Freistöße</em></span><b>›</b></button>
  </div>`);
  document.body.insertAdjacentHTML("beforeend",`<div id="squadTacticsModal" class="modal squad-plan-modal"><div class="modalinner"><div class="modalhead"><div><span class="plan-kicker">Mannschaft</span><h3>Individuelle Taktik</h3><div class="plan-sub">Dein Matchplan für dieses Team</div></div><button id="squadTacticsClose" class="secondary" type="button">Schließen</button></div><div id="squadTacticsBody"></div></div></div>
  <div id="squadRolesModal" class="modal squad-plan-modal"><div class="modalinner"><div class="modalhead"><div><span class="plan-kicker">Mannschaft</span><h3>Rollen & Fokus</h3><div class="plan-sub">Alle Startelfspieler separat einstellen</div></div><button id="squadRolesClose" class="secondary" type="button">Schließen</button></div><div class="plan-hero"><strong>Spielerrollen</strong><span>Rollen beeinflussen die Matchsimulation und bleiben an das aktuelle Team gebunden.</span></div><div class="role-column-head"><span>Spieler</span><span>Rolle</span><span>Fokus</span></div><div id="squadRoleHost"></div></div></div>
  <div id="squadAssignmentsModal" class="modal squad-plan-modal"><div class="modalinner"><div class="modalhead"><div><span class="plan-kicker">Mannschaft</span><h3>Aufgaben</h3><div class="plan-sub">Kapitän und Standards festlegen</div></div><button id="squadAssignmentsClose" class="secondary" type="button">Schließen</button></div><div class="plan-hero"><strong>Verantwortung verteilen</strong><span>Wähle Kapitän, beide Eckenschützen, Freistoß- und Elfmeterschützen aus deiner Startelf.</span></div><div id="assignmentList" class="assignment-list"></div></div></div>`);
  const roleList=document.getElementById("roleList"),host=document.getElementById("squadRoleHost");if(roleList&&host){roleList.classList.add("role-modal-list");host.appendChild(roleList);roleList.addEventListener("change",syncSummaries)}
  document.getElementById("openSquadTactics")?.addEventListener("click",()=>{renderTactics();showUiLayer("squadTacticsModal","squad-tactics")});
  document.getElementById("openSquadRoles")?.addEventListener("click",()=>{try{renderRoles(squadItems())}catch(e){}showUiLayer("squadRolesModal","squad-roles")});
  document.getElementById("openSquadAssignments")?.addEventListener("click",()=>{renderAssignments();showUiLayer("squadAssignmentsModal","squad-assignments")});
  document.getElementById("squadTacticsClose")?.addEventListener("click",()=>closeUiLayer("squadTacticsModal","squad-tactics"));
  document.getElementById("squadRolesClose")?.addEventListener("click",()=>closeUiLayer("squadRolesModal","squad-roles"));
  document.getElementById("squadAssignmentsClose")?.addEventListener("click",()=>closeUiLayer("squadAssignmentsModal","squad-assignments"));
  document.getElementById("assignmentList")?.addEventListener("change",e=>{const field=e.target.closest("[data-assignment]");if(!field)return;const plan=planFor(),assign=normalizeAssignments(plan.assignments,{auto:true,persist:false});assign[field.dataset.assignment]=field.value;writePlan({assignments:assign});syncSummaries()});
  const body=document.getElementById("squadTacticsBody");
  body?.addEventListener("input",e=>{const input=e.target.closest("[data-tactic-range]");if(!input)return;const plan=planFor(),key=input.dataset.tacticRange;plan.tactics=cleanTactics({...plan.tactics,[key]:Number(input.value)});writePlan(plan);body.querySelector(`[data-tactic-output="${key}"]`)?.replaceChildren(String(plan.tactics[key]));syncSummaries()});
  body?.addEventListener("change",e=>{if(e.target.matches("[data-base-tactic]")){state.tactic=["balanced","attacking","defensive"].includes(e.target.value)?e.target.value:"balanced";try{save()}catch(x){}syncSummaries();return}const select=e.target.closest("[data-tactic-select]");if(!select)return;const plan=planFor();plan.tactics=cleanTactics({...plan.tactics,[select.dataset.tacticSelect]:select.value});writePlan(plan);syncSummaries()});
  body?.addEventListener("click",e=>{if(e.target.closest("[data-plan-reset]")){writePlan({tactics:{...DEFAULT_TACTICS}});state.tactic="balanced";try{save()}catch(x){}renderTactics();syncSummaries();toast("Taktik auf Standard zurückgesetzt.");return}if(e.target.closest("[data-plan-done]"))closeUiLayer("squadTacticsModal","squad-tactics")});
  syncSummaries();return true
 }
 function slider(key,label,help,left,right){
  const value=currentTactics()[key];
  return `<label class="tactic-range-card"><span class="tactic-range-top"><span><strong>${h(label)}</strong><small>${h(help)}</small></span><output data-tactic-output="${key}">${value}</output></span><input type="range" min="0" max="100" value="${value}" data-tactic-range="${key}"><span class="tactic-range-scale"><span>${h(left)}</span><span>${h(right)}</span></span></label>`
 }
 function renderTactics(){
  const body=document.getElementById("squadTacticsBody");if(!body)return;const t=currentTactics(),opt=(v,l,c)=>`<option value="${v}" ${v===c?"selected":""}>${l}</option>`;
  body.innerHTML=`<div class="plan-hero"><strong>Dein Spiel, dein Matchplan</strong><span>Die Einstellungen greifen moderat in die Simulation ein. Spielerqualität, Chemie, Formation und Rollen bleiben entscheidend.</span></div>
  <div class="tactic-sections"><section class="tactic-section"><div class="tactic-section-head"><div><small>Grundidee</small><h4>Ausrichtung & Aufbau</h4></div><span>Wie dein Team steht</span></div><div class="tactic-select-grid">
   <label class="tactic-select-card"><span>Grundausrichtung</span><select data-base-tactic>${opt("balanced","Ausgeglichen",state.tactic)}${opt("attacking","Offensiv",state.tactic)}${opt("defensive","Defensiv",state.tactic)}</select></label>
   <label class="tactic-select-card"><span>Aufbauspiel</span><select data-tactic-select="buildUp">${opt("balanced","Ausgeglichen",t.buildUp)}${opt("patient","Ruhiger Aufbau",t.buildUp)}${opt("fast","Schneller Aufbau",t.buildUp)}</select></label>
   <label class="tactic-select-card"><span>Angriffsfokus</span><select data-tactic-select="attackFocus">${opt("balanced","Variabel",t.attackFocus)}${opt("wide","Über Außen",t.attackFocus)}${opt("inside","Durch die Mitte",t.attackFocus)}</select></label>
  </div><div class="tactic-range-list">${slider("width","Breite","Wie breit dein Team gegen und mit dem Ball steht.","Eng","Breit")}${slider("depth","Tiefe der Kette","Wie hoch deine letzte Linie verteidigt.","Tief","Hoch")}${slider("pressing","Pressing","Wie aggressiv der Ball zurückerobert wird.","Abwartend","Aggressiv")}</div></section>
  <section class="tactic-section"><div class="tactic-section-head"><div><small>Offensive</small><h4>Chance Creation</h4></div><span>Wie Angriffe entstehen</span></div><div class="tactic-range-list">${slider("dribbling","Dribbling","Häufigkeit direkter Eins-gegen-eins-Aktionen.","Kombination","Direkt")}${slider("crossing","Flanken","Wie stark Hereingaben gesucht werden.","Flach","Flanken")}${slider("longShots","Distanzschüsse","Bereitschaft aus der zweiten Reihe abzuschließen.","Geduldig","Früh schießen")}</div></section></div>
  <div class="plan-footer-actions"><button class="secondary" type="button" data-plan-reset>Alles auf Standard</button><button class="primary" type="button" data-plan-done>Übernehmen</button></div>`
 }
 function renderAssignments(){
  const list=document.getElementById("assignmentList");if(!list)return;const rows=starterRows(),assign=normalizeAssignments(undefined,{auto:true,persist:true});
  if(!rows.length){list.innerHTML='<div class="assignment-empty">Stelle zuerst Spieler in deine Startelf. Danach kannst du die Aufgaben vergeben.</div>';return}
  const options=selected=>rows.map(row=>`<option value="${h(row.item.uid)}" ${String(row.item.uid)===String(selected)?"selected":""}>${h(positionLabel(currentFormation()[row.index]?.p||row.base.position,row.base))} · ${h(row.base.name)}</option>`).join("");
  list.innerHTML=ASSIGNMENTS.map(row=>`<label class="assignment-row"><span class="assignment-copy"><strong>${h(row.label)}</strong><span>${h(row.hint)}</span></span><select data-assignment="${row.key}">${options(assign[row.key])}</select></label>`).join("")
 }
 function applyCustomMods(base,raw){
  const c=cleanTactics(raw),center=k=>(c[k]-50)/50,depth=center("depth"),width=center("width"),press=center("pressing"),dri=center("dribbling"),cross=center("crossing"),long=center("longShots");
  const buildAttack=c.buildUp==="fast"?1.018:c.buildUp==="patient"?.992:1,buildDefense=c.buildUp==="fast"?.992:c.buildUp==="patient"?1.008:1,buildPoss=c.buildUp==="patient"?1.5:c.buildUp==="fast"?-.7:0;
  const focus=c.attackFocus==="wide"?1+cross*.016:c.attackFocus==="inside"?1+dri*.012+long*.009:1+(dri+cross+long)*.003;
  return{attack:Math.max(.78,Math.min(1.26,base.attack*(1+depth*.018+dri*.010+long*.008)*buildAttack*focus)),defense:Math.max(.78,Math.min(1.26,base.defense*(1-depth*.018+press*.020)*buildDefense*(1-Math.abs(width)*.006))),poss:Math.max(-6,Math.min(6,base.poss+buildPoss+press*.55+width*.35+(c.attackFocus==="inside"?.35:c.attackFocus==="wide"?.15:0)))}
 }
 function installHooks(){
  const rawRender=renderSquad;renderSquad=function(){const out=rawRender.apply(this,arguments);syncSummaries();return out};
  const rawStart=startMatch;startMatch=function(){const out=rawStart.apply(this,arguments);if(match){const plan=planFor();match.customTactics={...plan.tactics};match.assignments={...normalizeAssignments(plan.assignments,{auto:true,persist:true})}}return out};
  const rawMods=tacticMods;tacticMods=function(t,custom){return applyCustomMods(rawMods(t),custom)};
  const rawGoal=logGoal;logGoal=function(side,scorer,assist,type){if(side==="home"&&(type==="freekick"||type==="penalty")){const key=type==="freekick"?"freeKicks":"penalties",uid=String(match?.assignments?.[key]||""),picked=uid?matchActorRows("home").find(row=>String(row.uid)===uid):null;if(picked)scorer=picked}return rawGoal(side,scorer,assist,type)};
  const rawFriend=friendAsOpponent;friendAsOpponent=function(fr){const out=rawFriend(fr),team=friendProfileTeams(fr)[0]||fr;out.customTactics=cleanTactics(team?.customTactics||fr?.customTactics);return out};
  const rawSnapshot=friendTeamSnapshotForPreset;friendTeamSnapshotForPreset=function(preset,indexSlot,isActive){const out=rawSnapshot(preset,indexSlot,isActive);if(out)out.customTactics={...planFor(indexSlot).tactics};return out};
  const rawEncode=encodeFriendProfile;encodeFriendProfile=function(){const code=rawEncode();try{const payload=decodeFriendProfile(code);if(!payload)return code;payload.customTactics={...currentTactics()};return btoa(unescape(encodeURIComponent(JSON.stringify(payload))))}catch(e){return code}}
 }
 try{mountUi();installHooks();window.FooteraSquadPlan={current:()=>({tactics:{...currentTactics()},assignments:{...normalizeAssignments(undefined,{auto:true,persist:false})}}),render:syncSummaries}}catch(e){console.error("Squad-Planung konnte nicht initialisiert werden",e)}
})();