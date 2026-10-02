/* Footera live friendlies: the database owns the clock, result and match ledger. */
(()=>{
 const config=window.FOOTERA_ONLINE_CONFIG||{};
 const available=/^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/i.test(config.url||"")&&/^(sb_publishable_[\w-]{16,}|eyJ[\w-]+\.[\w-]+\.[\w-]+)$/.test(config.publishableKey||"");
 const online={available,ready:false,registered:false,userId:"",init,render,invite,showComparison,syncProfile,queueProfileSync,fetchFriendProfile};
 window.FooteraOnline=online;
 if(!available)return;
 $("onlinePanel").hidden=false;
 let client=null,started=null,channel=null,active=null,rows=[],comparison=null,comparing="",ticker=null,pollTimer=null,profileSyncTimer=null,lastProfileSignature="",seenGoal="",notified=new Set(),draftSubOut="",draftSubIn="";
 const escape=s=>esc(String(s??""));
 const team=(d,side)=>d?.[`${side}_profile`]?.club_name||"Footera Club";
 const sideOf=d=>d?.home_user===online.userId?"home":"away";
 const currentView=()=>document.querySelector(".view.active")?.id;
 const validUid=v=>/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(v||"");
 function errorText(e){return String(e?.message||"Online-Dienst nicht erreichbar.").replace(/^.*?:\s*/,"").slice(0,160)}
 async function loadSdk(){
  if(window.supabase?.createClient)return window.supabase;
  await new Promise((resolve,reject)=>{const script=document.createElement("script");script.src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.js";script.onload=resolve;script.onerror=()=>reject(new Error("Online-Bibliothek konnte nicht geladen werden"));document.head.append(script)});
  if(!window.supabase?.createClient)throw new Error("Online-Bibliothek fehlt");
  return window.supabase
 }
 async function init(){
  if(!state.profile?.username||!state.onboarded)return;
  if(started)return started;
  started=(async()=>{
   try{
    const sdk=await loadSdk();client=sdk.createClient(config.url.replace(/\/$/,""),config.publishableKey,{auth:{persistSession:true,autoRefreshToken:true}});
    let {data:{session},error}=await client.auth.getSession();if(error)throw error;
    if(!session){const r=await client.auth.signInAnonymously();if(r.error)throw r.error;session=r.data.session}
    online.userId=session?.user?.id||"";if(!validUid(online.userId))throw new Error("Online-Anmeldung fehlgeschlagen");
    online.ready=true;
    await syncProfile();await refresh();
    channel=client.channel(`footera-duels-${online.userId}`).on("postgres_changes",{event:"*",schema:"public",table:"footera_duels"},payload=>{
     if(payload.new?.id&&active?.id===payload.new.id)applyMatch(payload.new);
     refresh().catch(console.warn)
    }).subscribe();
    pollTimer=setInterval(()=>{if(document.visibilityState==="visible"&&(currentView()==="socialView"||$("onlineDuelModal").classList.contains("active")))refresh().catch(console.warn)},15000);
    document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="visible")refresh().catch(console.warn)});
    if(currentView()==="socialView")renderSocial()
   }catch(e){online.ready=false;started=null;const node=$("onlineStatus");if(node)node.textContent=`Online-Verbindung: ${errorText(e)}`;console.warn("Footera online:",e)}
  })();return started
 }

 async function syncProfile(){
  if(!online.ready)return false;
  const snapshot=decodeFriendProfile(encodeFriendProfile()),m=squadMetrics(),teams=typeof friendOnlineTeamsSnapshot==="function"?friendOnlineTeamsSnapshot():[];
  if(!snapshot||m.filled<18||snapshot.squad.some(x=>!x)){online.registered=false;return false}
  const sharedTeams=teams.filter(team=>team&&team.filled===18&&Array.isArray(team.squad)&&team.squad.length===18).slice(0,3).map(team=>({slot:Number(team.slot||0),name:String(team.name||"Team").slice(0,24),active:!!team.active,formation:team.formation,rating:Number(team.rating||0),chem:Number(team.chem||0),squad:team.squad}));
  const stable={user_id:online.userId,username:String(state.profile.username||"").slice(0,20),club_name:String(state.profile.clubName||"Footera Club").slice(0,30),rating:Math.min(99,Math.max(0,m.rating||0)),chem:Math.min(33,Math.max(0,m.chem||0)),formation:state.formation,squad:snapshot.squad,squads:sharedTeams,active_preset:Number(state.activeSquadPreset||0)};
  const signature=JSON.stringify(stable);if(signature===lastProfileSignature&&online.registered)return true;
  let profile={...stable,updated_at:new Date().toISOString()},result=await client.from("footera_online_profiles").upsert(profile,{onConflict:"user_id"});
  if(result.error&&(result.error.code==="PGRST204"||/squads|active_preset/i.test(String(result.error.message||"")))){
   const legacy={user_id:stable.user_id,username:stable.username,club_name:stable.club_name,rating:stable.rating,chem:stable.chem,formation:stable.formation,squad:stable.squad,updated_at:profile.updated_at};
   result=await client.from("footera_online_profiles").upsert(legacy,{onConflict:"user_id"})
  }
  if(result.error)throw result.error;lastProfileSignature=signature;online.registered=true;return true
 }
 function queueProfileSync(delay=700){
  if(!online.ready)return;clearTimeout(profileSyncTimer);
  profileSyncTimer=setTimeout(()=>{profileSyncTimer=null;syncProfile().catch(e=>console.warn("Online-Profil:",e))},Math.max(200,Number(delay)||700))
 }
 async function fetchFriendProfile(friend){
  if(!online.ready||!validUid(friend?.onlineUid))return null;
  const {data,error}=await client.rpc("footera_friend_profile",{p_friend:friend.onlineUid});
  if(error){
   if(error.code==="PGRST202"||error.code==="42883"||/footera_friend_profile/i.test(String(error.message||"")))return null;
   throw error
  }
  if(!data||typeof data!=="object")return null;
  const teams=Array.isArray(data.squads)?data.squads:Array.isArray(friend.teams)?friend.teams:[];
  return{username:data.username||friend.username||"",clubName:data.club_name||friend.clubName||"Footera Club",rating:Number(data.rating||friend.rating||0),chem:Number(data.chem||friend.chem||0),formation:data.formation||friend.formation||"4-3-3",squad:Array.isArray(data.squad)?data.squad:friend.squad,teams,activeSquadPreset:Number(data.active_preset||0),_liveUpdatedAt:data.updated_at||new Date().toISOString()}
 }
 async function refresh(){
  if(!online.ready)return;
  const {data,error}=await client.from("footera_duels").select("*").order("created_at",{ascending:false}).limit(60);
  if(error)throw error;rows=data||[];
  for(const d of rows)if(d.status==="invited"&&d.away_user===online.userId&&!notified.has(d.id)){notified.add(d.id);if(currentView()!=="socialView")toast(`${team(d,"home")} fordert dich zum Live-Duell heraus.`)}
  if(active){const fresh=rows.find(r=>r.id===active.id);if(fresh)applyMatch(fresh)}
  render()
 }
 function applyMatch(row){
  if(!active||active.id!==row.id)return;
  const old=active;active=row;
  const goal=row.events?.filter(e=>e.kind==="goal").at(-1);const mark=goal?`${row.id}-${goal.minute}-${row.events.length}`:"";
  if(goal&&mark!==seenGoal&&row.events.length>(old.events?.length||0)){seenGoal=mark}
  renderMatch()
 }
 async function invite(friend){
  if(!online.ready){toast("Online-Verbindung noch nicht bereit.");return}
  if(!validUid(friend?.onlineUid)){toast("Bitte einen neuen Profilcode deines Freundes hinzufügen.");return}
  try{
   if(!await syncProfile())return toast("Für ein Live-Duell brauchst du 11 Starter und 7 Bankspieler.");const {data,error}=await client.rpc("footera_invite",{p_away:friend.onlineUid});if(error)throw error;
   active=data;seenGoal="";draftSubOut="";draftSubIn="";showUiLayer("onlineDuelModal","online-duel");renderMatch();await refresh()
  }catch(e){toast(`Einladung: ${errorText(e)}`)}
 }
 async function respond(id,accept){
  try{
   if(accept&&!await syncProfile())return toast("Für ein Live-Duell brauchst du 11 Starter und 7 Bankspieler.");const {data,error}=await client.rpc("footera_respond",{p_id:id,p_accept:accept});if(error)throw error;
   if(accept){active=data;seenGoal="";draftSubOut="";draftSubIn="";showUiLayer("onlineDuelModal","online-duel");renderMatch()}
   await refresh()
  }catch(e){toast(`Duell: ${errorText(e)}`)}
 }
 function openMatch(id){const row=rows.find(r=>r.id===id);if(!row)return;active=row;seenGoal="";draftSubOut="";draftSubIn="";showUiLayer("onlineDuelModal","online-duel");renderMatch()}
 async function command(kind,args={}){
  if(!active)return;
  try{const {data,error}=await client.rpc("footera_command",{p_id:active.id,p_command:kind,p_value:args.value??null,p_out:args.out??null,p_in:args.in??null});if(error)throw error;if(kind==="sub"){draftSubOut="";draftSubIn=""}applyMatch(data)}
  catch(e){toast(errorText(e))}
 }
 async function tick(){
  if(!active||!$("onlineDuelModal").classList.contains("active")){stopTick();return}
  if(active.status!=="live"||document.visibilityState!=="visible")return;
  try{const {data,error}=await client.rpc("footera_tick",{p_id:active.id});if(error)throw error;if(data)applyMatch(data)}
  catch(e){stopTick();toast(`Matchday: ${errorText(e)}`)}
 }
 function stopTick(){if(ticker){clearInterval(ticker);ticker=null}}
 function maybeTick(){if(active?.status==="live"&&$("onlineDuelModal").classList.contains("active")&&!ticker){ticker=setInterval(tick,1000)}else if(active?.status!=="live"||!$("onlineDuelModal").classList.contains("active"))stopTick()}
 function render(){
  if(!online.ready)return;
  const status=$("onlineStatus"),list=$("onlineDuelList");if(!status||!list)return;
  status.textContent=online.registered?"Online · Einladungen und Ergebnisse werden synchronisiert. Freundescodes nach dem ersten Online-Start erneut austauschen.":"Online verbunden · Für Live-Duelle und einen neuen Profilcode fehlen noch 11 Starter und 7 Bankspieler.";
  const pending=rows.filter(d=>d.status==="invited"),recent=rows.filter(d=>d.status!=="declined").slice(0,8);
  list.innerHTML=(pending.length?`<h4>Einladungen</h4>${pending.map(d=>`<div class="online-duel-row"><span>${escape(team(d,"home"))} – ${escape(team(d,"away"))}</span>${d.away_user===online.userId?`<button class="primary" data-online-accept="${d.id}">Annehmen</button><button class="secondary" data-online-decline="${d.id}">Ablehnen</button>`:`<span>Wartet auf Antwort</span><button class="secondary" data-online-decline="${d.id}">Zurückziehen</button>`}</div>`).join("")}`:"")+
   (recent.length?`<h4>Letzte Duelle</h4>${recent.map(d=>`<div class="online-duel-row"><span>${escape(team(d,"home"))} ${d.home_score}:${d.away_score} ${escape(team(d,"away"))}<small>${d.status==="finished"?"Abpfiff":d.status==="abandoned"?"Abgebrochen":d.status==="halftime"?"Halbzeit":d.status==="invited"?"Einladung":"Live · "+d.minute+"′"}</small></span><button class="secondary" data-online-open="${d.id}">${d.status==="finished"?"Ergebnis":"Matchday"}</button></div>`).join("")}`:"<p>Noch keine Live-Duelle. Wähle einen Freund mit aktuellem Profilcode aus.</p>");
  if(comparing)renderComparison()
 }
 function rankRows(matches,self,friend,selfName,friendName){
  const ranks=new Map([[self,{id:self,name:selfName,sp:0,s:0,u:0,n:0,tore:0,gt:0,pkt:0}],[friend,{id:friend,name:friendName,sp:0,s:0,u:0,n:0,tore:0,gt:0,pkt:0}]]);
  for(const m of matches){if(m.status!=="finished"||!ranks.has(m.home_user)||!ranks.has(m.away_user))continue;
   const h=ranks.get(m.home_user),a=ranks.get(m.away_user);h.sp++;a.sp++;h.tore+=m.home_score;a.tore+=m.away_score;h.gt+=m.away_score;a.gt+=m.home_score;
   if(m.home_score>m.away_score){h.s++;h.pkt+=3;a.n++}else if(m.home_score<m.away_score){a.s++;a.pkt+=3;h.n++}else{h.u++;a.u++;h.pkt++;a.pkt++}
  }
  return [...ranks.values()].sort((a,b)=>b.pkt-a.pkt||(b.tore-b.gt)-(a.tore-a.gt)||b.tore-a.tore||a.name.localeCompare(b.name,"de"))
 }
 async function showComparison(friend){
  if(!online.ready||!validUid(friend?.onlineUid))return toast("Für diesen Freund fehlt noch ein aktueller Online-Profilcode.");
  comparing=friend.onlineUid;comparison={friend,rows:[],loading:true};renderComparison();
  try{
   const all=[];let from=0;while(from<5000){
    const {data,error}=await client.from("footera_duels").select("id,home_user,away_user,home_score,away_score,status,finished_at,home_profile,away_profile")
     .eq("status","finished").in("home_user",[online.userId,friend.onlineUid]).in("away_user",[online.userId,friend.onlineUid]).order("finished_at",{ascending:false}).range(from,from+499);
    if(error)throw error;all.push(...(data||[]));if(!data||data.length<500)break;from+=500
   }
   comparison={friend,rows:all,loading:false};renderComparison()
  }catch(e){comparison={friend,rows:[],loading:false,error:errorText(e)};renderComparison()}
 }
 function renderComparison(){
  const el=$("onlineComparison");if(!el||!comparison)return;
  if(comparison.loading){el.innerHTML="<p>Direkter Vergleich wird geladen …</p>";return}
  if(comparison.error){el.textContent=comparison.error;return}
  const {friend,rows:games}=comparison,self=online.userId,opp=friend.onlineUid;
  const ranks=rankRows(games,self,opp,state.profile.clubName||"Mein Team",friend.clubName||"Freund");
  el.innerHTML=`<h4>Freundesliga · direkter Vergleich mit ${escape(friend.clubName||"Freund")}</h4><div class="online-table-wrap"><table class="online-table"><thead><tr><th>Team</th><th>Sp</th><th>S</th><th>U</th><th>N</th><th>Tore</th><th>Diff</th><th>Pkt</th></tr></thead><tbody>${ranks.map((r,i)=>`<tr><th>${i+1}. ${escape(r.name)}</th><td>${r.sp}</td><td>${r.s}</td><td>${r.u}</td><td>${r.n}</td><td>${r.tore}:${r.gt}</td><td>${r.tore-r.gt>0?"+":""}${r.tore-r.gt}</td><td><strong>${r.pkt}</strong></td></tr>`).join("")}</tbody></table></div><p>${games.length} gemeinsame Live-Duelle · Sieg 3, Remis 1, Niederlage 0 Punkte.</p>${games.slice(0,5).map(g=>`<div class="online-duel-row">${escape(team(g,"home"))} ${g.home_score}:${g.away_score} ${escape(team(g,"away"))}</div>`).join("")}`
 }
 function renderMatch(){
  const d=active,el=$("onlineDuelBody");if(!d||!el)return;maybeTick();
  if(["onlineSubOut","onlineSubIn"].includes(document.activeElement?.id))return;
  $("onlineDuelModalTitle").textContent="Freundesduell · Live-Matchday";
  const side=sideOf(d),own=d[`${side}_lineup`]||[],subs=d[`${side}_subs`]||0,used=d[`${side}_used_bench`]||[];
  const goal=[...(d.events||[])].reverse().find(e=>e.kind==="goal"),last=(d.events||[]).at(-1),ownReady=d[`${side}_ready`];
  const phase=d.status==="invited"?"Einladung ausstehend":d.status==="halftime"?"Halbzeit":d.status==="finished"?"Abpfiff":d.status==="declined"?"Abgelehnt":d.status==="abandoned"?"Abgebrochen":"LIVE";
  const enabled=d.status==="live"||d.status==="halftime";
  const tactic=d[`${side}_tactic`]||"balanced";
  const other=side==="home"?"away":"home";
  const moment=goal?.player?`<div class="online-goal-card"><span>⚽ ${goal.minute}′ · ${goal.side===side?"Dein Team":"Gegner"}</span>${friendCard(goal.player,goal.player.position,false)}<strong>${escape(goal.text)}</strong></div>`:"";
  el.innerHTML=`<div class="online-matchday"><div class="online-live-pill">${phase} · ${d.minute}′</div><div class="online-score"><span>${escape(team(d,"home"))}</span><strong>${d.home_score} : ${d.away_score}</strong><span>${escape(team(d,"away"))}</span></div><div class="online-match-pitch"><div class="online-pitch-middle">⚽</div><span>${escape((d.events||[]).at(-1)?.text||"Anpfiff")}</span></div>${moment}<div class="online-matches-controls"><label>Deine Taktik<select id="onlineTactic" ${enabled?"":"disabled"}><option value="balanced" ${tactic==="balanced"?"selected":""}>Ausgeglichen</option><option value="attacking" ${tactic==="attacking"?"selected":""}>Offensiv</option><option value="defensive" ${tactic==="defensive"?"selected":""}>Defensiv</option></select></label><div class="online-sub"><span>Wechsel ${subs}/5</span><select id="onlineSubOut" ${enabled&&subs<5?"":"disabled"}><option value="">Auswechseln …</option>${own.slice(0,11).map((p,i)=>`<option value="${i}" ${draftSubOut===String(i)?"selected":""}>${escape(p?.name||"Position "+(i+1))}</option>`).join("")}</select><select id="onlineSubIn" ${enabled&&subs<5?"":"disabled"}><option value="">Einwechseln …</option>${own.slice(11,18).map((p,i)=>used.includes(i+11)?"":`<option value="${i+11}" ${draftSubIn===String(i+11)?"selected":""}>${escape(p?.name||"Bank "+(i+1))}</option>`).join("")}</select><button id="onlineSubBtn" class="secondary" ${enabled&&subs<5?"":"disabled"}>Wechsel bestätigen</button></div>${d.status==="halftime"?`<button id="onlineReadyBtn" class="primary" ${ownReady?"disabled":""}>${ownReady?"Warte auf deinen Freund …":"Bereit für die 2. Halbzeit"}</button>`:""}${enabled?'<button id="onlineAbandonBtn" class="secondary">Duell abbrechen</button>':""}</div><div class="online-timeline"><h4>Spielverlauf</h4>${(d.events||[]).slice().reverse().map(e=>`<div class="online-event"><b>${e.minute}′ ${e.kind==="goal"?"⚽":e.kind==="sub"?"↔":"•"}</b><span>${escape(e.text||"")}</span></div>`).join("")}</div>${d.status==="finished"?`<p class="online-result">${d[`${side}_score`]>d[`${other}_score`]?"Sieg":d[`${side}_score`]<d[`${other}_score`]?"Niederlage":"Unentschieden"} · Dieses Ergebnis zählt für euren direkten Vergleich. Keine Coins oder Rivals-Punkte.</p>`:""}</div>`;
  if(last?.kind==="goal"&&last!==goal)seenGoal="";
 }
 $("onlineDuelModalClose")?.addEventListener("click",()=>{stopTick();active=null;closeUiLayer("onlineDuelModal","online-duel")});
 $("onlineDuelList")?.addEventListener("click",e=>{
  const accept=e.target.closest("[data-online-accept]"),decline=e.target.closest("[data-online-decline]"),open=e.target.closest("[data-online-open]");
  if(accept)respond(accept.dataset.onlineAccept,true);else if(decline)respond(decline.dataset.onlineDecline,false);else if(open)openMatch(open.dataset.onlineOpen)
 });
 $("onlineDuelBody")?.addEventListener("change",e=>{if(e.target.id==="onlineTactic")command("tactic",{value:e.target.value});if(e.target.id==="onlineSubOut")draftSubOut=e.target.value;if(e.target.id==="onlineSubIn")draftSubIn=e.target.value});
 $("onlineDuelBody")?.addEventListener("click",e=>{
  if(e.target.closest("#onlineReadyBtn"))command("ready");
  if(e.target.closest("#onlineAbandonBtn")&&confirm("Duell wirklich abbrechen? Es zählt dann nicht für den direkten Vergleich."))command("abandon");
  if(e.target.closest("#onlineSubBtn")){const out=Number($("onlineSubOut")?.value),sub=Number($("onlineSubIn")?.value);if(!$("onlineSubOut")?.value||!$("onlineSubIn")?.value)return toast("Zwei Spieler auswählen.");command("sub",{out,in:sub})}
 });
 window.addEventListener("pagehide",stopTick);
 if(typeof module!=="undefined")module.exports={rankRows};
})();
