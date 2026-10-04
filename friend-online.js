/* Footera live friendlies: the database owns the clock, result and match ledger. */
(()=>{
 const config=window.FOOTERA_ONLINE_CONFIG||{};
 const available=/^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/i.test(config.url||"")&&/^(sb_publishable_[\w-]{16,}|eyJ[\w-]+\.[\w-]+\.[\w-]+)$/.test(config.publishableKey||"");
 const online={available,ready:false,registered:false,userId:"",friendCode:"",init,render,invite,showComparison,syncProfile,queueProfileSync,fetchFriendProfile,getFriendCode,resolveFriendCode,openChat,unreadCount,unreadSummary,presence,refreshPresence,duelStats};
 window.FooteraOnline=online;
 const unreadCounts=new Map(),duelStatus=new Map(),presenceRows=new Map();
 let presenceBusy=false,presenceLastAttempt=-Infinity,presenceKey="",presenceTimer=null;
 if(!available)return;
 $("onlinePanel").hidden=false;
 let client=null,started=null,channel=null,messageChannel=null,active=null,rows=[],rowsLoaded=false,comparison=null,comparing="",ticker=null,pollTimer=null,profileSyncTimer=null,lastProfileSignature="",seenGoal="",notified=new Set(),draftSubOut="",draftSubIn="",chatFriend=null,chatMessages=[],noticeTimer=0,onlineManagerOpen=false,goalMomentUntil=0,goalMomentTimer=null;
 const escape=s=>esc(String(s??""));
 const team=(d,side)=>d?.[`${side}_profile`]?.club_name||"Footera Club";
 const sideOf=d=>d?.home_user===online.userId?"home":"away";
 const currentView=()=>document.querySelector(".view.active")?.id;
 const validUid=v=>/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(v||"");
 function errorText(e){return String(e?.message||"Online-Dienst nicht erreichbar.").replace(/^.*?:\s*/,"").slice(0,160)}
 function friendByUid(uid){return (state.friends||[]).find(f=>f?.onlineUid===uid)||null}
 function unreadCount(uid){return Number(unreadCounts.get(uid)||0)}
 function unreadSummary(){if(!available)return[];return [...unreadCounts.entries()].filter(([,count])=>Number(count)>0).map(([uid,count])=>{const friend=friendByUid(uid);return friend?{uid,count:Number(count),name:friend.clubName||friend.username||"Freund"}:null}).filter(Boolean).sort((a,b)=>b.count-a.count||a.name.localeCompare(b.name,"de"))}
 function presence(uid){
  if(!available||!online.ready||!uid||document.visibilityState!=="visible"||navigator.onLine===false)return "unknown";
  const row=presenceRows.get(uid),now=performance.now();
  if(!row||now-row.checkedAt>45000)return "unknown";
  return row.isOnline&&now<row.expiresAt?"online":row.isOnline===null?"unknown":"offline"
 }
 async function refreshPresence(force=false){
  if(!online.ready||document.visibilityState!=="visible")return;
  const ids=[...new Set((state.friends||[]).map(f=>f.onlineUid).filter(validUid))].slice(0,1000),key=ids.join(",");
  if(presenceBusy||(!force&&key===presenceKey&&performance.now()-presenceLastAttempt<15000))return;
  presenceBusy=true;presenceKey=key;presenceLastAttempt=performance.now();
  try{
   if(!ids.length){presenceRows.clear();return}
   const {data,error}=await client.rpc("footera_friend_statuses",{p_friends:ids});if(error)throw error;
   presenceRows.clear();const now=performance.now();
   for(const row of data||[])presenceRows.set(row.user_id,{isOnline:typeof row.is_online==="boolean"?row.is_online:null,checkedAt:now,expiresAt:presenceLastAttempt+Math.min(90,Math.max(0,Number(row.expires_in)||0))*1000});
  }catch(e){presenceRows.clear();console.warn("Freundesstatus:",e)}
  finally{presenceBusy=false;if(currentView()==="socialView")window.FooteraFriendsHub?.render()}
 }
 async function heartbeat(){
  if(!online.ready||!online.registered||document.visibilityState!=="visible")return;
  try{const {error}=await client.rpc("footera_presence_heartbeat");if(error)throw error}catch(e){console.warn("Aktivitätsstatus:",e)}
 }
 function duelStats(){
  if(!online.ready||!rowsLoaded)return null;
  const friends=new Set((state.friends||[]).map(f=>f.onlineUid).filter(Boolean)),games=rows.filter(g=>g.status==="finished"&&(g.home_user===online.userId&&friends.has(g.away_user)||g.away_user===online.userId&&friends.has(g.home_user)));
  const stats={matches:games.length,wins:0,draws:0,losses:0,goals:0,conceded:0};
  for(const g of games){const home=g.home_user===online.userId,own=Number(home?g.home_score:g.away_score)||0,opp=Number(home?g.away_score:g.home_score)||0;stats.goals+=own;stats.conceded+=opp;if(own>opp)stats.wins++;else if(own<opp)stats.losses++;else stats.draws++}
  return stats
 }
 function ensureCommsUi(){
  if(!$("footeraMessageNotice")){
   document.body.insertAdjacentHTML("beforeend",`
    <button id="footeraMessageNotice" class="footera-message-notice" type="button" aria-live="polite">
     <span class="footera-message-icon">F</span><span><strong id="footeraMessageNoticeTitle">Neue Nachricht</strong><small id="footeraMessageNoticeBody"></small></span>
    </button>
    <div id="incomingInviteModal" class="modal incoming-invite-modal" role="dialog" aria-modal="true" aria-labelledby="incomingInviteTitle">
     <div class="incoming-invite-card"><div class="incoming-invite-pulse">⚽</div><small>FOOTERA LIVE</small><h2 id="incomingInviteTitle">Spieleinladung</h2><p id="incomingInviteClub">Ein Freund möchte spielen.</p><div class="incoming-invite-actions"><button id="incomingInviteDecline" class="incoming-decline" type="button">Ablehnen</button><button id="incomingInviteAccept" class="incoming-accept" type="button">Annehmen</button></div></div>
    </div>
    <div id="footeraChatModal" class="modal footera-chat-modal" role="dialog" aria-modal="true" aria-labelledby="footeraChatTitle">
     <div class="modalinner footera-chat-inner">
      <div class="footera-chat-head"><div><small>FOOTERA NACHRICHTEN</small><h3 id="footeraChatTitle">Chat</h3></div><button id="footeraChatClose" class="secondary" type="button">Schließen</button></div>
      <div id="footeraChatMessages" class="footera-chat-messages"><p>Nachrichten werden geladen …</p></div>
      <div class="footera-chat-compose"><textarea id="footeraChatInput" maxlength="500" rows="2" placeholder="Nachricht schreiben …"></textarea><button id="footeraChatSend" class="primary" type="button">Senden</button></div>
     </div>
    </div>`);
   $("footeraMessageNotice")?.addEventListener("click",()=>{const uid=$("footeraMessageNotice")?.dataset.uid,friend=friendByUid(uid);hideNotice();if(friend)openChat(friend)});
   $("incomingInviteAccept")?.addEventListener("click",()=>{const id=$("incomingInviteModal")?.dataset.duelId;if(id){hideIncomingInvite();respond(id,true)}});
   $("incomingInviteDecline")?.addEventListener("click",()=>{const id=$("incomingInviteModal")?.dataset.duelId;if(id){hideIncomingInvite();respond(id,false)}});
   $("footeraChatClose")?.addEventListener("click",()=>{chatFriend=null;closeUiLayer("footeraChatModal","friend-chat")});
   $("footeraChatSend")?.addEventListener("click",sendChatMessage);
   $("footeraChatInput")?.addEventListener("keydown",e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();sendChatMessage()}});
  }
 }
 async function systemNotify(title,body,tag){
  if(document.visibilityState==="visible"||!("Notification" in window)||Notification.permission!=="granted")return;
  try{const reg=await navigator.serviceWorker?.getRegistration("./");if(reg?.showNotification)await reg.showNotification(title,{body,tag,icon:"./icon-192.png",badge:"./icon-192.png"})}catch(e){}
 }
 function hideNotice(){const el=$("footeraMessageNotice");if(el){el.classList.remove("active");el.dataset.uid=""}clearTimeout(noticeTimer);noticeTimer=0}
 function showNotice(title,body,friend=null){
  ensureCommsUi();const el=$("footeraMessageNotice");if(!el)return;
  $("footeraMessageNoticeTitle").textContent=title;$("footeraMessageNoticeBody").textContent=body;
  el.dataset.uid=friend?.onlineUid||"";el.classList.add("active");clearTimeout(noticeTimer);noticeTimer=setTimeout(hideNotice,5200);
  systemNotify(title,body,"footera-"+(friend?.onlineUid||title)).catch(()=>{})
 }
 function showIncomingInvite(d){
  ensureCommsUi();if(!d||d.away_user!==online.userId||d.status!=="invited")return;
  const modal=$("incomingInviteModal");if(!modal)return;
  modal.dataset.duelId=d.id;$("incomingInviteClub").textContent=`${team(d,"home")} möchte ein Live-Duell mit dir starten.`;
  showUiLayer("incomingInviteModal","incoming-invite",{},"none");
  try{navigator.vibrate?.([250,120,250,120,450])}catch(e){}
  systemNotify("Footera · Spieleinladung",`${team(d,"home")} fordert dich heraus.`,"footera-invite-"+d.id).catch(()=>{})
 }
 function hideIncomingInvite(){try{navigator.vibrate?.(0)}catch(e){}removeUiLayer("incomingInviteModal")}
 async function loadUnreadCounts(){
  unreadCounts.clear();
  const {data,error}=await client.from("footera_messages").select("sender_user").eq("recipient_user",online.userId).is("read_at",null).limit(500);
  if(error){if(error.code!=="42P01"&&error.code!=="PGRST205")console.warn("Ungelesene Nachrichten:",error);return}
  for(const row of data||[])unreadCounts.set(row.sender_user,(unreadCounts.get(row.sender_user)||0)+1);
  if(currentView()==="socialView")renderSocial();if(currentView()==="homeView")renderHome()
 }
 async function markConversationRead(friendUid){
  if(!validUid(friendUid))return;
  const {error}=await client.from("footera_messages").update({read_at:new Date().toISOString()}).eq("recipient_user",online.userId).eq("sender_user",friendUid).is("read_at",null);
  if(error)console.warn("Nachrichten gelesen:",error);
  unreadCounts.set(friendUid,0);if(currentView()==="socialView")renderSocial();if(currentView()==="homeView")renderHome()
 }
 async function loadConversation(friend){
  const a=online.userId,b=friend.onlineUid;
  const filter=`and(sender_user.eq.${a},recipient_user.eq.${b}),and(sender_user.eq.${b},recipient_user.eq.${a})`;
  const {data,error}=await client.from("footera_messages").select("id,sender_user,recipient_user,body,created_at,read_at").or(filter).order("created_at",{ascending:true}).limit(120);
  if(error)throw error;chatMessages=data||[];renderChat();await markConversationRead(b)
 }
 function renderChat(){
  const box=$("footeraChatMessages");if(!box||!chatFriend)return;
  $("footeraChatTitle").textContent=chatFriend.clubName||chatFriend.username||"Freund";
  box.innerHTML=chatMessages.length?chatMessages.map(m=>{const own=m.sender_user===online.userId,t=(()=>{try{return new Date(m.created_at).toLocaleTimeString("de-DE",{hour:"2-digit",minute:"2-digit"})}catch(e){return""}})();return `<div class="footera-chat-row ${own?"own":"other"}"><div class="footera-chat-bubble"><span>${escape(m.body)}</span><small>${escape(t)}${own&&m.read_at?" · gelesen":""}</small></div></div>`}).join(""):'<div class="footera-chat-empty">Noch keine Nachrichten. Schreib die erste Nachricht.</div>';
  requestAnimationFrame(()=>{box.scrollTop=box.scrollHeight})
 }
 async function openChat(friend){
  if(!online.ready||!validUid(friend?.onlineUid))return toast("Nachrichten sind erst mit einem aktuellen Freundescode verfügbar.");
  ensureCommsUi();chatFriend=friend;chatMessages=[];$("footeraChatMessages").innerHTML="<p>Nachrichten werden geladen …</p>";showUiLayer("footeraChatModal","friend-chat");
  try{await loadConversation(friend)}catch(e){$("footeraChatMessages").textContent="Nachrichten konnten nicht geladen werden.";console.warn(e)}
 }
 async function sendChatMessage(){
  if(!chatFriend||!client)return;
  const input=$("footeraChatInput"),body=String(input?.value||"").trim();
  if(!body)return;
  if(body.length>500)return toast("Nachrichten dürfen höchstens 500 Zeichen lang sein.");
  if(!validUid(chatFriend.onlineUid))return toast("Für diesen Freund fehlt eine gültige Online-ID.");
  const button=$("footeraChatSend");if(button)button.disabled=true;
  try{
   let {data,error}=await client.rpc("footera_send_message",{p_recipient:chatFriend.onlineUid,p_body:body});
   if(error&&(error.code==="PGRST202"||error.code==="42883"||/footera_send_message/i.test(String(error.message||"")))){
    const fallback=await client.from("footera_messages").insert({sender_user:online.userId,recipient_user:chatFriend.onlineUid,body}).select("id,sender_user,recipient_user,body,created_at,read_at").single();
    data=fallback.data;error=fallback.error
   }
   if(error)throw error;
   const message=Array.isArray(data)?data[0]:data;
   if(message&&typeof message==="object"){
    if(!chatMessages.some(m=>m.id===message.id))chatMessages.push(message)
   }else chatMessages.push({id:"local-"+Date.now(),sender_user:online.userId,recipient_user:chatFriend.onlineUid,body,created_at:new Date().toISOString(),read_at:null});
   if(input)input.value="";renderChat()
  }catch(e){
   toast("Nachricht konnte nicht gesendet werden: "+errorText(e));
   console.warn("Footera Nachricht:",e)
  }finally{
   if(button)button.disabled=false;
   input?.focus()
  }
 }
 async function handleIncomingMessage(message){
  if(!message||message.recipient_user!==online.userId)return;
  const friend=friendByUid(message.sender_user);
  if(chatFriend?.onlineUid===message.sender_user&&$("footeraChatModal")?.classList.contains("active")){
   if(!chatMessages.some(m=>m.id===message.id))chatMessages.push(message);renderChat();await markConversationRead(message.sender_user);return
  }
  unreadCounts.set(message.sender_user,(unreadCounts.get(message.sender_user)||0)+1);
  if(currentView()==="socialView")renderSocial();if(currentView()==="homeView")renderHome();
  showNotice(friend?.clubName||friend?.username||"Neue Footera-Nachricht",String(message.body||"").slice(0,120),friend)
 }
 function handleDuelRealtime(payload){
  const d=payload?.new;if(!d?.id)return;
  const previous=duelStatus.get(d.id);duelStatus.set(d.id,d.status);
  if(d.status==="invited"&&d.away_user===online.userId&&!notified.has(d.id)){notified.add(d.id);showIncomingInvite(d)}
  if(previous&&previous!==d.status&&d.home_user===online.userId){
   const friend=friendByUid(d.away_user);
   if(d.status==="live")showNotice("Spieleinladung angenommen",`${team(d,"away")} ist bereit für das Live-Duell.`,friend);
   else if(d.status==="declined")showNotice("Spieleinladung abgelehnt",`${team(d,"away")} hat die Einladung abgelehnt.`,friend)
  }
  if(active?.id===d.id)applyMatch(d);
  refresh().catch(console.warn)
 }
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
    online.ready=true;ensureCommsUi();
    await syncProfile();await refresh();await loadUnreadCounts();
    heartbeat();refreshPresence();
    clearInterval(presenceTimer);presenceTimer=setInterval(()=>{heartbeat();if(currentView()==="socialView")refreshPresence(true)},25000);
    channel=client.channel(`footera-duels-${online.userId}`).on("postgres_changes",{event:"*",schema:"public",table:"footera_duels"},handleDuelRealtime).subscribe();
    messageChannel=client.channel(`footera-messages-${online.userId}`).on("postgres_changes",{event:"INSERT",schema:"public",table:"footera_messages",filter:`recipient_user=eq.${online.userId}`},payload=>handleIncomingMessage(payload.new).catch(console.warn)).subscribe();
    pollTimer=setInterval(()=>{if(document.visibilityState==="visible"&&(currentView()==="socialView"||$("onlineDuelModal").classList.contains("active")))refresh().catch(console.warn)},15000);
    document.addEventListener("visibilitychange",()=>{presenceRows.clear();if(document.visibilityState==="visible"){heartbeat();refreshPresence(true);refresh().catch(console.warn)}else if(currentView()==="socialView")window.FooteraFriendsHub?.render()});
    window.addEventListener("offline",()=>{presenceRows.clear();if(currentView()==="socialView")window.FooteraFriendsHub?.render()});
    window.addEventListener("online",()=>{heartbeat();refreshPresence(true)});
    if(currentView()==="socialView")renderSocial()
   }catch(e){online.ready=false;started=null;const node=$("onlineStatus");if(node)node.textContent=`Online-Verbindung: ${errorText(e)}`;console.warn("Footera online:",e)}
  })();return started
 }

 async function syncProfile(){
  if(!online.ready)return false;
  const snapshot=decodeFriendProfile(encodeFriendProfile()),m=squadMetrics(),teams=typeof friendOnlineTeamsSnapshot==="function"?friendOnlineTeamsSnapshot():[];
  if(!snapshot||m.filled<18||snapshot.squad.some(x=>!x)){online.registered=false;return false}
  const sharedTeams=teams.filter(team=>team&&team.filled===18&&Array.isArray(team.squad)&&team.squad.length===18).slice(0,3).map(team=>({slot:Number(team.slot||0),name:String(team.name||"Team").slice(0,24),active:!!team.active,formation:team.formation,rating:Number(team.rating||0),chem:Number(team.chem||0),squad:team.squad}));
  const identity=typeof clubIdentitySnapshot==="function"?clubIdentitySnapshot():null;const stable={user_id:online.userId,username:String(state.profile.username||"").slice(0,20),club_name:String(state.profile.clubName||"Footera Club").slice(0,30),club_short_name:String(state.profile.clubShortName||"FTR").toUpperCase().replace(/[^A-Z0-9]/g,"").slice(0,4)||"FTR",club_identity:identity,rating:Math.min(99,Math.max(0,m.rating||0)),chem:Math.min(33,Math.max(0,m.chem||0)),formation:state.formation,squad:snapshot.squad,squads:sharedTeams,active_preset:Number(state.activeSquadPreset||0)};
  const signature=JSON.stringify(stable);if(signature===lastProfileSignature&&online.registered)return true;
  let profile={...stable,updated_at:new Date().toISOString()},result=await client.from("footera_online_profiles").upsert(profile,{onConflict:"user_id"});
  if(result.error&&(result.error.code==="PGRST204"||/squads|active_preset/i.test(String(result.error.message||"")))){
   const legacy={user_id:stable.user_id,username:stable.username,club_name:stable.club_name,rating:stable.rating,chem:stable.chem,formation:stable.formation,squad:stable.squad,updated_at:profile.updated_at};
   result=await client.from("footera_online_profiles").upsert(legacy,{onConflict:"user_id"})
  }
  if(result.error)throw result.error;lastProfileSignature=signature;online.registered=true;
  try{
   const codeResult=await client.rpc("footera_my_friend_code");
   if(!codeResult.error&&codeResult.data)online.friendCode=String(codeResult.data).toUpperCase()
  }catch(e){}
  return true
 }
 function queueProfileSync(delay=700){
  if(!online.ready)return;clearTimeout(profileSyncTimer);
  profileSyncTimer=setTimeout(()=>{profileSyncTimer=null;syncProfile().catch(e=>console.warn("Online-Profil:",e))},Math.max(200,Number(delay)||700))
 }
 async function getFriendCode(){
  if(!online.ready)return "";
  if(!online.registered){const ok=await syncProfile();if(!ok)return ""}
  if(online.friendCode)return online.friendCode;
  const {data,error}=await client.rpc("footera_my_friend_code");
  if(error)throw error;
  online.friendCode=String(data||"").toUpperCase();
  return online.friendCode
 }
 async function resolveFriendCode(code){
  if(!online.ready)return null;
  const normalized=String(code||"").toUpperCase().replace(/[^A-Z0-9]/g,"");
  if(!/^[A-HJ-NP-Z2-9]{8}$/.test(normalized))return null;
  const {data,error}=await client.rpc("footera_friend_by_code",{p_code:normalized});
  if(error)throw error;
  if(!data||typeof data!=="object")return null;
  const teams=Array.isArray(data.squads)?data.squads:[];
  return{v:5,onlineUid:data.user_id||"",username:data.username||"",clubName:data.club_name||"Footera Club",clubShortName:data.club_short_name||"FTR",clubIdentity:data.club_identity&&typeof data.club_identity==="object"?data.club_identity:null,rating:Number(data.rating||0),chem:Number(data.chem||0),formation:data.formation||"4-3-3",division:10,record:{w:0,d:0,l:0},squad:Array.isArray(data.squad)?data.squad:[],teams,activeSquadPreset:Number(data.active_preset||0),_liveUpdatedAt:data.updated_at||new Date().toISOString()}
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
  return{username:data.username||friend.username||"",clubName:data.club_name||friend.clubName||"Footera Club",clubShortName:data.club_short_name||friend.clubShortName||"FTR",clubIdentity:data.club_identity&&typeof data.club_identity==="object"?data.club_identity:(friend.clubIdentity||null),rating:Number(data.rating||friend.rating||0),chem:Number(data.chem||friend.chem||0),formation:data.formation||friend.formation||"4-3-3",squad:Array.isArray(data.squad)?data.squad:friend.squad,teams,activeSquadPreset:Number(data.active_preset||0),_liveUpdatedAt:data.updated_at||new Date().toISOString()}
 }
 async function refresh(){
  if(!online.ready)return;
  const {data,error}=await client.from("footera_duels").select("*").order("created_at",{ascending:false}).limit(60);
  if(error)throw error;rows=data||[];rowsLoaded=true;
  for(const d of rows){duelStatus.set(d.id,d.status);if(d.status==="invited"&&d.away_user===online.userId&&!notified.has(d.id)){notified.add(d.id);showIncomingInvite(d)}}
  if(active){const fresh=rows.find(r=>r.id===active.id);if(fresh)applyMatch(fresh)}
  render();if(currentView()==="socialView")window.FooteraFriendsHub?.render()
 }
 function clearOnlineGoalMoment(){
  goalMomentUntil=0;
  if(goalMomentTimer){clearTimeout(goalMomentTimer);goalMomentTimer=null}
 }
 function resetOnlineMatchUi(){
  onlineManagerOpen=false;draftSubOut="";draftSubIn="";seenGoal="";clearOnlineGoalMoment()
 }
 function applyMatch(row){
  if(!active||active.id!==row.id)return;
  const old=active,oldGoalCount=(old.events||[]).filter(e=>e.kind==="goal").length;
  active=row;
  const goals=(row.events||[]).filter(e=>e.kind==="goal"),goal=goals.at(-1);
  if(goals.length>oldGoalCount&&goal){
   const mark=`${row.id}-${goal.minute}-${goals.length}`;
   if(mark!==seenGoal){
    seenGoal=mark;goalMomentUntil=Date.now()+3000;
    clearTimeout(goalMomentTimer);
    goalMomentTimer=setTimeout(()=>{goalMomentTimer=null;goalMomentUntil=0;if(active?.id===row.id)renderMatch()},3050)
   }
  }
  if(old.status!=="halftime"&&row.status==="halftime")onlineManagerOpen=true;
  if(old.status==="halftime"&&row.status==="live")onlineManagerOpen=false;
  renderMatch()
 }
 async function invite(friend){
  if(!online.ready){toast("Online-Verbindung noch nicht bereit.");return}
  if(!validUid(friend?.onlineUid)){toast("Bitte den aktuellen Freundescode deines Freundes hinzufügen.");return}
  try{
   if(!await syncProfile())return toast("Für ein Live-Duell brauchst du 11 Starter und 7 Bankspieler.");const {data,error}=await client.rpc("footera_invite",{p_away:friend.onlineUid});if(error)throw error;
   active=data;resetOnlineMatchUi();showUiLayer("onlineDuelModal","online-duel");renderMatch();await refresh()
  }catch(e){toast(`Einladung: ${errorText(e)}`)}
 }
 async function respond(id,accept){
  try{
   hideIncomingInvite();
   if(accept&&!await syncProfile())return toast("Für ein Live-Duell brauchst du 11 Starter und 7 Bankspieler.");const {data,error}=await client.rpc("footera_respond",{p_id:id,p_accept:accept});if(error)throw error;
   if(accept){active=data;resetOnlineMatchUi();showUiLayer("onlineDuelModal","online-duel");renderMatch()}
   await refresh()
  }catch(e){toast(`Duell: ${errorText(e)}`)}
 }
 function openMatch(id){const row=rows.find(r=>r.id===id);if(!row)return;active=row;resetOnlineMatchUi();showUiLayer("onlineDuelModal","online-duel");renderMatch()}
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
  status.textContent=online.registered?"Online · Nachrichten, Spieleinladungen und Ergebnisse werden synchronisiert.":"Online verbunden · Für Live-Duelle und deinen Freundescode fehlen noch 11 Starter und 7 Bankspieler.";
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
 function gameResultFor(game,userId){
  if(game.status!=="finished")return"";
  const home=game.home_user===userId,own=home?Number(game.home_score):Number(game.away_score),opp=home?Number(game.away_score):Number(game.home_score);
  return own>opp?"S":own<opp?"N":"U"
 }
 function formFor(games,userId,count=5){return games.slice(0,count).map(g=>gameResultFor(g,userId)).filter(Boolean)}
 function currentSeries(games,userId){
  const results=games.map(g=>gameResultFor(g,userId)).filter(Boolean);if(!results.length)return"–";
  const first=results[0];let count=0;for(const r of results){if(r!==first)break;count++}
  return `${count}× ${first==="S"?"Sieg":first==="N"?"Niederlage":"Remis"}`
 }
 function directSummary(games,self,opp){
  let selfWins=0,oppWins=0,draws=0,selfGoals=0,oppGoals=0;
  for(const g of games){
   const selfHome=g.home_user===self,sg=selfHome?Number(g.home_score):Number(g.away_score),og=selfHome?Number(g.away_score):Number(g.home_score);
   selfGoals+=sg;oppGoals+=og;if(sg>og)selfWins++;else if(sg<og)oppWins++;else draws++
  }
  return{selfWins,oppWins,draws,selfGoals,oppGoals}
 }
 async function showComparison(friend){
  if(!online.ready||!validUid(friend?.onlineUid))return toast("Für diesen Freund fehlt noch ein aktueller Online-Freundescode.");
  if(currentView()==="socialView")window.FooteraFriendsHub?.open("duels");
  comparing=friend.onlineUid;comparison={friend,rows:[],loading:true};renderComparison();
  try{
   const all=[];let from=0;while(from<5000){
    const {data,error}=await client.from("footera_duels").select("id,home_user,away_user,home_score,away_score,status,finished_at,created_at,home_profile,away_profile")
     .eq("status","finished").in("home_user",[online.userId,friend.onlineUid]).in("away_user",[online.userId,friend.onlineUid]).order("finished_at",{ascending:false}).range(from,from+499);
    if(error)throw error;all.push(...(data||[]));if(!data||data.length<500)break;from+=500
   }
   comparison={friend,rows:all,loading:false};renderComparison()
  }catch(e){comparison={friend,rows:[],loading:false,error:errorText(e)};renderComparison()}
 }
 function renderComparison(){
  const el=$("onlineComparison");if(!el||!comparison)return;
  if(comparison.loading){el.innerHTML='<div class="online-ranking"><h4>Online-Rangliste</h4><p>Rangliste wird geladen …</p></div>';return}
  if(comparison.error){el.innerHTML='<div class="online-ranking"><h4>Online-Rangliste</h4><p>'+escape(comparison.error)+'</p></div>';return}
  const {friend,rows:games}=comparison,self=online.userId,opp=friend.onlineUid;
  const selfName=state.profile.clubName||"Mein Team",friendName=friend.clubName||"Freund",ranks=rankRows(games,self,opp,selfName,friendName);
  const summary=directSummary(games,self,opp),selfForm=formFor(games,self),oppForm=formFor(games,opp);
  const badge=r=>'<span class="online-form-badge '+(r==="S"?"win":r==="N"?"loss":"draw")+'">'+r+'</span>';
  const dateText=g=>{try{return new Date(g.finished_at||g.created_at).toLocaleString("de-DE",{day:"2-digit",month:"2-digit",year:"2-digit",hour:"2-digit",minute:"2-digit"})}catch(e){return""}};
  el.innerHTML=`<div class="online-ranking">
   <div class="online-ranking-head"><div><small>GEGEN ${escape(friendName)}</small><h4>Online-Rangliste</h4></div><span class="online-ranking-count">${games.length} Spiele</span></div>
   <div class="online-h2h">
    <div><strong>${summary.selfWins}</strong><span>Deine Siege</span></div>
    <div><strong>${summary.draws}</strong><span>Remis</span></div>
    <div><strong>${summary.oppWins}</strong><span>Siege ${escape(friendName)}</span></div>
    <div><strong>${summary.selfGoals}:${summary.oppGoals}</strong><span>Gesamttore</span></div>
   </div>
   <div class="online-table-wrap"><table class="online-table"><thead><tr><th>Team</th><th>Sp</th><th>S</th><th>U</th><th>N</th><th>Tore</th><th>Diff</th><th>Pkt</th></tr></thead><tbody>${ranks.map((r,i)=>`<tr class="${r.id===self?"is-me":""}"><th>${i+1}. ${escape(r.name)}</th><td>${r.sp}</td><td>${r.s}</td><td>${r.u}</td><td>${r.n}</td><td>${r.tore}:${r.gt}</td><td>${r.tore-r.gt>0?"+":""}${r.tore-r.gt}</td><td><strong>${r.pkt}</strong></td></tr>`).join("")}</tbody></table></div>
   <div class="online-form-grid">
    <div><span>Deine Form</span><div class="online-form">${selfForm.length?selfForm.map(badge).join(""):"Noch kein Spiel"}</div><small>Serie: ${escape(currentSeries(games,self))}</small></div>
    <div><span>${escape(friendName)}</span><div class="online-form">${oppForm.length?oppForm.map(badge).join(""):"Noch kein Spiel"}</div><small>Serie: ${escape(currentSeries(games,opp))}</small></div>
   </div>
   <div class="online-ranking-rules">Sieg 3 Punkte · Remis 1 Punkt · Niederlage 0 Punkte · Abgebrochene Duelle zählen nicht.</div>
   <div class="online-history"><h4>Ergebnis-Historie</h4>${games.length?games.map(g=>`<div class="online-history-row"><span><strong>${escape(team(g,"home"))} ${g.home_score}:${g.away_score} ${escape(team(g,"away"))}</strong><small>${escape(dateText(g))}</small></span><span class="online-history-result ${gameResultFor(g,self)==="S"?"win":gameResultFor(g,self)==="N"?"loss":"draw"}">${gameResultFor(g,self)}</span></div>`).join(""):'<p>Noch keine beendeten Live-Duelle. Das erste Ergebnis erscheint hier automatisch.</p>'}</div>
  </div>`
 }
 function onlineEventIcon(kind){return kind==="goal"?"⚽":kind==="sub"?"↔":kind==="break"?"Ⅱ":kind==="chance"?"●":"•"}
 function onlineScene(d){
  const events=d.events||[],last=events.at(-1)||{kind:"kickoff",text:"Anpfiff",minute:0};
  if(last.kind==="goal")return{scene:`${last.side||"home"}-goal`,type:"TOR",text:`${last.text||"Spieler"} trifft für ${team(d,last.side||"home")}!`,minute:last.minute};
  if(last.kind==="chance")return{scene:`${last.side||"home"}-chance`,type:"TORSCHUSS",text:last.text||"Abschluss aufs Tor.",minute:last.minute};
  if(last.kind==="sub")return{scene:"idle",type:"WECHSEL",text:last.text||"Wechsel",minute:last.minute};
  if(last.kind==="break")return{scene:"idle",type:last.minute>=90?"ABPFIFF":"HALBZEIT",text:last.text||"Spielunterbrechung",minute:last.minute};
  return{scene:"idle",type:"SPIEL LÄUFT",text:last.text||"Das Spiel läuft.",minute:d.minute||0}
 }
 function onlineManagerPitchHTML(lineup,formation){
  const form=(typeof FORMATIONS!=="undefined"&&(FORMATIONS[formation]||FORMATIONS["4-3-3"]))||[];
  return `<div class="online-manager-pitch">${(lineup||[]).slice(0,11).map((p,i)=>{const slot=form[i]||{p:p?.position||"CM",x:50,y:50};return `<div class="online-manager-slot" style="left:${slot.x}%;top:${slot.y}%">${p?friendCard(p,slot.p,true):'<div class="emptyslot">LEER</div>'}</div>`}).join("")}</div>`
 }
 function onlineManagerBenchHTML(lineup,used){
  return `<div class="online-manager-bench">${(lineup||[]).slice(11,18).map((p,k)=>`<div class="${used.includes(k+11)?"used":""}">${p?friendCard(p,p.position||"CM",true):'<div class="emptyslot">FREI</div>'}${used.includes(k+11)?'<span>Eingesetzt</span>':""}</div>`).join("")}</div>`
 }
 function closeOnlineMatchView(){
  stopTick();clearOnlineGoalMoment();onlineManagerOpen=false;active=null;closeUiLayer("onlineDuelModal","online-duel")
 }
 function renderMatch(){
  const d=active,el=$("onlineDuelBody");if(!d||!el)return;maybeTick();
  if(["onlineSubOut","onlineSubIn","onlineTactic"].includes(document.activeElement?.id))return;
  $("onlineDuelModalTitle").textContent="Freundesduell · Matchday";

  const side=sideOf(d),other=side==="home"?"away":"home",own=d[`${side}_lineup`]||[],subs=Number(d[`${side}_subs`]||0),used=d[`${side}_used_bench`]||[],ownReady=!!d[`${side}_ready`];
  const tactic=d[`${side}_tactic`]||"balanced",formation=d?.[`${side}_profile`]?.formation||"4-3-3";
  const enabled=d.status==="live"||d.status==="halftime";
  const phase=d.status==="invited"?"Einladung ausstehend":d.status==="halftime"?"Halbzeit":d.status==="finished"?"Abpfiff":d.status==="declined"?"Abgelehnt":d.status==="abandoned"?"Abgebrochen":"Simulation läuft";
  const scene=onlineScene(d),events=(d.events||[]);
  const timeline=events.filter(e=>["goal","sub","break"].includes(e.kind)).slice(-18);
  const homePoss=Math.max(0,Math.min(100,Math.round(Number(d.home_possession??50)))),awayPoss=100-homePoss;
  const homeShots=Number(d.home_shots||0),awayShots=Number(d.away_shots||0),homeXg=Number(d.home_xg||0),awayXg=Number(d.away_xg||0);
  const goal=events.filter(e=>e.kind==="goal").at(-1),showGoal=Date.now()<goalMomentUntil&&goal?.player;
  const goalCard=showGoal?friendCard(goal.player,goal.player.position||"ST",false):"";
  const result=d.status==="finished"?(Number(d[`${side}_score`])>Number(d[`${other}_score`])?"Sieg":Number(d[`${side}_score`])<Number(d[`${other}_score`])?"Niederlage":"Unentschieden"):"";
  const manager=onlineManagerOpen&&enabled?`
   <section class="online-standard-manager">
    <div class="online-manager-head"><div><span>TEAM-MANAGEMENT</span><h3>Aktuelle Aufstellung</h3></div><strong>${subs}/5 Wechsel</strong></div>
    ${onlineManagerPitchHTML(own,formation)}
    <div class="online-manager-bench-title"><strong>Ersatzbank</strong><span>7 Spieler</span></div>
    ${onlineManagerBenchHTML(own,used)}
    <div class="online-manager-settings">
     <label>Taktik<select id="onlineTactic" ${enabled?"":"disabled"}><option value="balanced" ${tactic==="balanced"?"selected":""}>Ausgeglichen</option><option value="attacking" ${tactic==="attacking"?"selected":""}>Offensiv</option><option value="defensive" ${tactic==="defensive"?"selected":""}>Defensiv</option></select></label>
     <label>Auswechseln<select id="onlineSubOut" ${enabled&&subs<5?"":"disabled"}><option value="">Spieler wählen …</option>${own.slice(0,11).map((p,i)=>`<option value="${i}" ${draftSubOut===String(i)?"selected":""}>${escape(p?.name||"Position "+(i+1))}</option>`).join("")}</select></label>
     <label>Einwechseln<select id="onlineSubIn" ${enabled&&subs<5?"":"disabled"}><option value="">Bankspieler wählen …</option>${own.slice(11,18).map((p,i)=>used.includes(i+11)?"":`<option value="${i+11}" ${draftSubIn===String(i+11)?"selected":""}>${escape(p?.name||"Bank "+(i+1))}</option>`).join("")}</select></label>
    </div>
    <div class="online-manager-actions">
     <button id="onlineSubBtn" class="primary" ${enabled&&subs<5?"":"disabled"}>Wechsel bestätigen</button>
     ${d.status==="halftime"?`<button id="onlineReadyBtn" class="primary" ${ownReady?"disabled":""}>${ownReady?"Warte auf deinen Freund …":"Bereit für die 2. Halbzeit"}</button>`:""}
     <button id="onlineBackToMatchBtn" class="secondary">Zurück zum Spiel</button>
     <button id="onlineAbandonBtn" class="secondary">Duell abbrechen</button>
    </div>
   </section>`:"";

  el.innerHTML=`<div class="online-standard-match" data-state="${escape(d.status)}">
   <header class="online-match-sticky-header">
    <div class="match-broadcast-head"><span>FOOTERA <b>MATCHDAY</b></span><span>Online-Freundschaftsspiel</span></div>
    <div class="scoreboard">
     <div class="match-score-meta"><div class="match-running-pill"><i></i><span>${escape(phase)}</span></div><div class="minute">${Number(d.minute||0)}'</div></div>
     <div class="match-score-line"><div class="match-team-name">${escape(team(d,"home"))}</div><div class="score">${d.home_score} : ${d.away_score}</div><div class="match-team-name away">${escape(team(d,"away"))}</div></div>
    </div>
    <div class="match-progress-track"><span style="width:${Math.min(100,Number(d.minute||0)/90*100)}%"></span></div>
   </header>

   <section class="match-overview">
    <div class="matchstats">
     <div class="mstat"><strong>${homePoss} : ${awayPoss}</strong><span>Ballbesitz</span></div>
     <div class="mstat"><strong>${homeShots} : ${awayShots}</strong><span>Schüsse</span></div>
     <div class="mstat"><strong>${homeXg.toFixed(1)} : ${awayXg.toFixed(1)}</strong><span>xG</span></div>
    </div>
    <div class="match-tactical-summary">${escape(formation)} · ${escape({balanced:"Ausgeglichen",attacking:"Offensiv",defensive:"Defensiv"}[tactic]||"Ausgeglichen")} · Live über Supabase</div>
   </section>

   <div class="match-timeline-wrap"><div class="match-timeline"><span class="match-timeline-start">Anpfiff</span>${timeline.map(e=>`<span class="match-timeline-event ${escape(e.kind)}">${onlineEventIcon(e.kind)} ${Number(e.minute||0)}' · ${escape(e.text||"")}</span>`).join("")}</div></div>

   <section class="match-live-stage" data-scene="${escape(scene.scene)}">
    <div class="match-stage-head"><span>LIVE-SPIELFELD</span><span class="scene-minute">${Number(scene.minute||d.minute||0)}'</span></div>
    <div class="match-scene-pitch"><div class="match-pitch-lines"><i class="match-pitch-center"></i><i class="match-pitch-box home"></i><i class="match-pitch-box away"></i><i class="match-pitch-goal home"></i><i class="match-pitch-goal away"></i><div class="match-players home"><i></i><i></i><i></i><i></i><i></i></div><div class="match-players away"><i></i><i></i><i></i><i></i><i></i></div><i class="match-lane"></i><i class="match-ball"></i></div></div>
    <div class="match-scene-caption"><span class="scene-type">${escape(scene.type)}</span><strong>${escape(scene.text)}</strong></div>
    <div class="online-match-goal-moment ${showGoal?"active":""}">${showGoal?`<div class="online-match-goal-card">${goalCard}</div><div class="online-match-goal-copy"><span>TOR · ${goal.minute}'</span><strong>${escape(goal.text||"Torschütze")}</strong><small>${escape(team(d,goal.side||"home"))}</small><b>${d.home_score} : ${d.away_score}</b></div>`:""}</div>
   </section>

   ${manager}

   ${!onlineManagerOpen?`<div class="online-standard-controls">${enabled?'<button id="onlineManageTeamBtn" class="secondary">Team-Management</button>':""}<button id="onlineMatchCloseBtn" class="secondary">${d.status==="finished"?"Weiter":"Schließen"}</button></div>`:""}

   ${d.status==="finished"?`<div class="online-standard-result"><strong>${escape(result)}</strong><span>${escape(team(d,"home"))} ${d.home_score}:${d.away_score} ${escape(team(d,"away"))}</span><small>Das Ergebnis zählt für eure Online-Rangliste. Keine Coins oder Rivals-Punkte.</small></div>`:""}
  </div>`;

  requestAnimationFrame(()=>{const tl=el.querySelector(".match-timeline");if(tl)tl.scrollLeft=tl.scrollWidth})
 }
 $("onlineDuelModalClose")?.addEventListener("click",closeOnlineMatchView);
 $("onlineDuelList")?.addEventListener("click",e=>{
  const accept=e.target.closest("[data-online-accept]"),decline=e.target.closest("[data-online-decline]"),open=e.target.closest("[data-online-open]");
  if(accept)respond(accept.dataset.onlineAccept,true);else if(decline)respond(decline.dataset.onlineDecline,false);else if(open)openMatch(open.dataset.onlineOpen)
 });
 $("onlineDuelBody")?.addEventListener("change",e=>{if(e.target.id==="onlineTactic")command("tactic",{value:e.target.value});if(e.target.id==="onlineSubOut")draftSubOut=e.target.value;if(e.target.id==="onlineSubIn")draftSubIn=e.target.value});
 $("onlineDuelBody")?.addEventListener("click",e=>{
  if(e.target.closest("#onlineManageTeamBtn")){onlineManagerOpen=true;renderMatch();return}
  if(e.target.closest("#onlineBackToMatchBtn")){onlineManagerOpen=false;renderMatch();return}
  if(e.target.closest("#onlineMatchCloseBtn")){closeOnlineMatchView();return}
  if(e.target.closest("#onlineReadyBtn")){command("ready");return}
  if(e.target.closest("#onlineAbandonBtn")&&confirm("Duell wirklich abbrechen? Es zählt dann nicht für den direkten Vergleich.")){command("abandon");return}
  if(e.target.closest("#onlineSubBtn")){
   const out=Number($("onlineSubOut")?.value),sub=Number($("onlineSubIn")?.value);
   if(!$("onlineSubOut")?.value||!$("onlineSubIn")?.value)return toast("Zwei Spieler auswählen.");
   command("sub",{out,in:sub})
  }
 });
 window.addEventListener("pagehide",stopTick);
 if(typeof module!=="undefined")module.exports={rankRows};
})();
