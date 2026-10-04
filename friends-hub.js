/* Footera V20.55 — friends first, with separate areas for duels, comparison and codes. */
(()=>{
 let filter="all",query="";
 const metric=(value,label)=>`<div class="friends-metric"><strong>${esc(value)}</strong><span>${esc(label)}</span></div>`;
 function orderedFriends(friends,statusFor){
  return friends.map((friend,index)=>({friend,index,status:statusFor(friend.onlineUid)})).sort((a,b)=>(b.status==="online")-(a.status==="online")||a.index-b.index);
 }
 function friendHTML({friend:f,index:i,status}){
  const connected=!!window.FooteraOnline?.ready&&!!f.onlineUid,unread=window.FooteraOnline?.unreadCount?.(f.onlineUid)||0;
  const statusText={online:"Online",offline:"Offline",unknown:f.onlineUid?"Status unbekannt":"Profilcode"}[status];
  const crest=f.clubIdentity&&typeof crestHTML==="function"?crestHTML(f.clubIdentity,true):`<span class="friends-initials">${esc((f.clubShortName||f.clubName||"F").slice(0,3))}</span>`;
  return `<article class="friend friends-person"><div class="friends-person-head"><div class="friends-avatar" aria-hidden="true">${crest}</div><div class="friends-person-name"><h4>${esc(f.clubName||"Freund")}</h4>${f.username?`<span>${esc(f.username)}</span>`:""}</div><span class="friends-presence is-${status}"><i aria-hidden="true"></i>${statusText}</span></div>
   <div class="friends-team-meta"><span><b>${Number(f.rating)||0}</b> Rating</span><span><b>${Number(f.chem)||0}/33</b> Chemie</span><span>${esc(f.formation||"4-3-3")}</span></div>
   <div class="friend-actions">${connected?`<button type="button" class="secondary friend-message-btn" data-friend-chat="${i}">Nachricht${unread?` <span class="friend-unread-badge">${unread}</span>`:""}</button><button type="button" class="primary" data-friend-live="${i}">Live-Duell</button>`:`<button type="button" class="secondary" data-friend-squad="${i}">Aufstellung</button><button type="button" class="primary" data-friend-friendly="${i}">Friendly</button>`}</div>
   <details class="friends-more" data-friend-options="${i}"><summary>Weitere Aktionen</summary><div class="friend-actions">${connected?`<button type="button" class="secondary" data-friend-squad="${i}">Aufstellung</button><button type="button" class="secondary" data-friend-friendly="${i}">Friendly</button><button type="button" class="secondary" data-friend-compare="${i}">Rangliste</button>`:""}<button type="button" class="secondary friends-remove" data-friend-remove="${i}">Entfernen</button></div></details></article>`;
 }
 function render(){
  const online=window.FooteraOnline,items=orderedFriends(state.friends||[],uid=>online?.presence?.(uid)||"unknown"),onlineCount=items.filter(x=>x.status==="online").length;
  $("friendsHubCounts").innerHTML=metric(items.length,"Freunde")+metric(onlineCount,"Online")+metric(items.reduce((sum,x)=>sum+(online?.unreadCount?.(x.friend.onlineUid)||0),0),"Nachrichten");
  $("friendsOnlineNote").textContent=items.length?"Online = in den letzten 90 Sekunden in Footera aktiv. Ohne aktuellen Status bleibt die Anzeige unbekannt.":"Deine Freunde, ihre Teams und eure Duelle – alles an einem Ort.";
  const shown=items.filter(x=>(filter!=="online"||x.status==="online")&&`${x.friend.clubName||""} ${x.friend.username||""}`.toLocaleLowerCase("de").includes(query.toLocaleLowerCase("de")));
  const list=$("friendList"),opened=new Set([...list.querySelectorAll("details[open]")].map(el=>el.dataset.friendOptions)),focused=document.activeElement;
  const focusAction=focused&&list.contains(focused)?Object.entries(focused.dataset).find(([key])=>key.startsWith("friend")&&key!=="friendOptions"):null;
  list.innerHTML=shown.length?shown.map(friendHTML).join(""):`<div class="friends-empty"><span aria-hidden="true">＋</span><h3>${items.length?"Keine passenden Freunde":"Dein Freundeskreis beginnt hier"}</h3><p>${items.length?"Ändere die Suche oder zeige alle Freunde an.":"Teile deinen Code oder füge einen Freund hinzu. Danach könnt ihr chatten und gegeneinander spielen."}</p>${items.length?"":'<button type="button" class="primary" data-friends-open="add">Freund hinzufügen</button>'}</div>`;
  for(const el of list.querySelectorAll("details"))el.open=opened.has(el.dataset.friendOptions);
  if(focusAction){const [key,value]=focusAction;const attr="data-"+key.replace(/[A-Z]/g,c=>"-"+c.toLowerCase());list.querySelector(`[${attr}="${Number(value)}"]`)?.focus({preventScroll:true})}
  document.querySelectorAll("[data-friends-filter]").forEach(button=>button.setAttribute("aria-pressed",String(button.dataset.friendsFilter===filter)));
  const select=$("friendsRankingSelect"),previous=select.value,candidates=items.filter(x=>x.friend.onlineUid);
  select.innerHTML=candidates.length?candidates.map(x=>`<option value="${x.index}">${esc(x.friend.clubName||"Freund")}</option>`).join(""):'<option value="">Noch kein Online-Freund</option>';
  if(candidates.some(x=>String(x.index)===previous))select.value=previous;
  $("friendsRankingOpen").disabled=!candidates.length||!online?.ready;
  const stats=online?.duelStats?.();
  $("friendsLiveStats").innerHTML=stats?metric(stats.matches,"Spiele")+metric(stats.wins,"Siege")+metric(stats.draws,"Remis")+metric(stats.losses,"Niederlagen"):metric("–","Spiele")+metric("–","Siege")+metric("–","Remis")+metric("–","Niederlagen");
  $("friendsStatsNote").textContent=stats?`Beendete Spiele gegen deine gespeicherten Freunde aus den letzten 60 Live-Duellen. Tore ${stats.goals}:${stats.conceded}.`:"Deine Live-Bilanz wird geladen, sobald der Online-Dienst verbunden ist.";
  online?.refreshPresence?.();
 }
 function open(area){
  const panel=$("friendsPanel"+area[0].toUpperCase()+area.slice(1));if(!panel)return;
  panel.open=true;panel.scrollIntoView({behavior:"smooth",block:"start"});panel.querySelector("summary")?.focus({preventScroll:true});
 }
 const originalSocial=renderSocial;
 renderSocial=function(){originalSocial();render()};
 window.FooteraFriendsHub={render,open};
 $("friendsSearch").addEventListener("input",event=>{query=event.target.value;render()});
 $("socialView").addEventListener("click",event=>{
  const tile=event.target.closest("[data-friends-open]");if(tile){open(tile.dataset.friendsOpen);return}
  const tab=event.target.closest("[data-friends-filter]");if(tab){filter=tab.dataset.friendsFilter;render();return}
  if(event.target.closest("#friendsRankingOpen")){const selected=$("friendsRankingSelect").value,friend=selected!==""?state.friends[Number(selected)]:null;if(friend?.onlineUid){open("duels");window.FooteraOnline?.showComparison(friend)}}
 });
 if(typeof module!=="undefined")module.exports={orderedFriends};
})();
