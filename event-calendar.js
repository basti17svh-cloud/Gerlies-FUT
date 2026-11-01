"use strict";
/* Footera event calendar for the Zentrale (V21.334, Basti 2026-11-01).
   Shows what comes next: TOTW, event teams, event SBCs, objectives, evolutions, Champions and the Season Pass end.
   Built only from the data the game already has, so a new EVENT_PROMO_RELEASES / EVENT_OBJECTIVES / EVOLUTION_POOL
   entry appears here automatically.
   No spoilers: an upcoming SBC, objective or team never shows a player name. Names only appear once the content is live. */
const EVENT_CALENDAR_DAYS=14,EVENT_CALENDAR_LIMIT=12,EVENT_CALENDAR_VISIBLE=5;
function eventCalendarMs(value){const t=value instanceof Date?value.getTime():typeof value==="number"?value:Date.parse(value||"");return Number.isFinite(t)?t:NaN}
function eventCalendarDayKey(ms){const p=berlinParts(new Date(ms));return Date.UTC(p.year,p.month-1,p.day)}
const EVENT_CALENDAR_WEEKDAY=new Intl.DateTimeFormat("de-DE",{timeZone:FOOTERA_TIME_ZONE,weekday:"short"});
function eventCalendarWhen(ms,now){
 const p=berlinParts(new Date(ms)),pad=n=>String(n).padStart(2,"0"),time=`${pad(p.hour)}:${pad(p.minute)}`;
 const days=Math.round((eventCalendarDayKey(ms)-eventCalendarDayKey(now))/86400000);
 const weekday=EVENT_CALENDAR_WEEKDAY.format(new Date(ms)).replace(".","").toUpperCase();
 const relative=days<=0?`Heute · ${time}`:days===1?`Morgen · ${time}`:`In ${days} Tagen · ${time}`;
 return{weekday,date:`${pad(p.day)}.${pad(p.month)}.`,time,relative,days}
}
// Every row: {at, kind, title, sub, go, key}. kind picks the colour; go is the view a tap opens.
function footeraEventCalendar(at=Date.now(),{days=EVENT_CALENDAR_DAYS,limit=EVENT_CALENDAR_LIMIT}={}){
 const now=eventCalendarMs(at),until=now+days*86400000,rows=[],seen=new Set();
 const add=(row)=>{if(!(row.at>now&&row.at<=until)||seen.has(row.key))return;seen.add(row.key);rows.push(row)};
 // Team der Woche: every Wednesday 19:00. The number follows the latest released week.
 try{
  const latest=typeof latestPublishedTotw==="function"?latestPublishedTotw(new Date(now)):null;
  let next=berlinShiftDays(berlinWeekStart(new Date(now),3,19),7,19).getTime(),number=Number(latest?.id||0)+1;
  for(;next<=until;next=berlinShiftDays(new Date(next),7,19).getTime(),number++)add({at:next,kind:"totw",title:number>1?`Team der Woche ${number}`:"Team der Woche",sub:"Neue TOTW-Karten in den Packs",go:"storeView",key:"totw:"+next});
 }catch(e){console.warn("Event-Kalender: TOTW-Termine fehlen",e)}
 const releases=typeof EVENT_PROMO_RELEASES!=="undefined"?EVENT_PROMO_RELEASES:[];
 const themeOf=v=>String(v||"").trim().toLowerCase();
 for(const event of releases){
  const start=eventCalendarMs(event.activeFrom),end=eventCalendarMs(event.activeUntilAt),name=String(event.name||"Event"),cards=(event.players||[]).length,theme=themeOf(event.theme||name);
  if(cards){
   const team=String(event.subtitle||"").split("·").map(s=>s.trim()).filter(Boolean).pop()||"";
   add({at:start,kind:"event",theme,rank:0,title:team?`${name} · ${team}`:name,sub:`${cards} neue Spezialkarten in den Packs`,short:`${cards} neue Karten`,go:"storeView",key:"event-start:"+event.id});
   // One end row per event theme (Team 1 and Team 2 of HALLOWEEN end together).
   add({at:end,kind:"event",theme,rank:5,title:`${name} endet`,sub:"Letzte Chance auf die Event-Karten in Packs",short:"Letzte Event-Packs",go:"storeView",key:"event-end:"+theme+":"+end});
  }
  const sbc=event.sbcPlayer;if(!sbc||typeof eventSbcTotwConflictAtRelease==="function"&&eventSbcTotwConflictAtRelease(event,sbc))continue;
  const sbcStart=eventCalendarMs(sbc.releaseAt),sbcEnd=eventCalendarMs(sbc.activeUntilAt||event.activeUntilAt);
  add({at:sbcStart,kind:"sbc",theme,rank:1,title:"Geheime Spieler-SBC",sub:`${name} · Name erst zum Start`,short:"geheime Spieler-SBC",go:"sbcView",key:"sbc-start:"+sbc.id});
  if(now>=sbcStart)add({at:sbcEnd,kind:"sbc",theme,rank:6,title:`SBC ${sbc.name} endet`,sub:`${name} · ${(sbc.segments||[]).length||1} Teile`,short:`SBC ${sbc.name} endet`,go:"sbcView",key:"sbc-end:"+sbc.id});
 }
 if(typeof HALLOWEEN_TEAM1_SBC!=="undefined"){
  const def=HALLOWEEN_TEAM1_SBC,start=eventCalendarMs(def.releaseAt),end=eventCalendarMs(def.activeUntilAt);
  add({at:start,kind:"sbc",theme:"halloween",rank:1,title:def.name,sub:"Sonntags-SBC · garantierter HALLOWEEN-Spieler",short:def.name,go:"sbcView",key:"sbc-start:"+def.id});
  if(now>=start)add({at:end,kind:"sbc",theme:"halloween",rank:6,title:`${def.name} endet`,sub:"Sonntags-SBC",short:`${def.name} endet`,go:"sbcView",key:"sbc-end:"+def.id});
 }
 for(const task of typeof EVENT_OBJECTIVES!=="undefined"?EVENT_OBJECTIVES:[]){
  const start=eventCalendarMs(task.activeFrom),end=eventCalendarMs(task.activeUntilAt),ovr=Number(task.player?.ovr||0),theme=themeOf(task.eventName);
  add({at:start,kind:"objective",theme,rank:2,title:"Neues Event-Objective",sub:`${task.eventName||"Event"} · geheimer ${ovr?ovr+"er-":""}Spieler`,short:`Objective mit geheimem ${ovr?ovr+"er":"Spieler"}`,go:"objectivesView",key:"obj-start:"+task.id});
  if(now>=start)add({at:end,kind:"objective",theme,rank:7,title:`Objective ${task.player?.name||task.title} endet`,sub:String(task.desc||""),short:`Objective ${task.player?.name||task.title} endet`,go:"objectivesView",key:"obj-end:"+task.id});
 }
 for(const evo of typeof EVOLUTION_POOL!=="undefined"?EVOLUTION_POOL:[]){
  if(!evo?.activeFrom)continue;
  add({at:eventCalendarMs(evo.activeFrom),kind:"evo",theme:themeOf(evo.design||evo.band),rank:3,title:`Neue Evolution: ${evo.name}`,sub:String(evo.band||evo.subtitle||"Evolution"),short:String(evo.name),go:"evolutionView",key:"evo-start:"+evo.id});
 }
 try{
  if(typeof championsWindow==="function"){
   const w=championsWindow(new Date(now));
   if(w.open)add({at:w.end.getTime(),kind:"champions",title:"Footera Champions schließt",sub:"Letzte Spiele für deinen Wochenend-Rang",go:"playView",key:"champions-end:"+w.key});
   else add({at:w.start.getTime(),kind:"champions",title:"Footera Champions öffnet",sub:"15 Spiele · ein Wochenende · dein Rang",go:"playView",key:"champions-start:"+w.key});
  }
 }catch(e){console.warn("Event-Kalender: Champions-Termin fehlt",e)}
 // Same event, same minute (e.g. HALLOWEEN Team 2 + Evo II + objective on 06.11. 19:00): one row instead of four.
 const merged=new Map();
 for(const row of rows){
  const id=row.theme?row.at+"|"+row.theme:row.key,group=merged.get(id);
  if(!group){merged.set(id,[row]);continue}
  group.push(row)
 }
 rows.length=0;
 for(const group of merged.values()){
  if(group.length===1){rows.push(group[0]);continue}
  group.sort((a,b)=>(a.rank??9)-(b.rank??9));
  const main=group[0];
  rows.push({...main,sub:group.map(r=>r.short||r.title).join(" · "),key:group.map(r=>r.key).join("+"),merged:group.length})
 }
 rows.sort((a,b)=>a.at-b.at||String(a.key).localeCompare(String(b.key)));
 const out=rows.slice(0,limit);
 // The Season Pass end always stays visible, even when it is further away than the 14 days.
 try{
  if(typeof seasonInfo==="function"){
   const season=seasonInfo(new Date(now)),end=season.end?season.end.getTime():NaN;
   if(Number.isFinite(end)&&end>now){
    const daysLeft=Math.max(1,Math.floor((end-now)/86400000)),final=daysLeft<=EVENT_CALENDAR_DAYS;
    out.push({at:end,kind:"season",title:final?"Season-Pass-Endspurt":"Season Pass endet",sub:final?`Saison ${season.number} ${season.name} · jetzt die letzten Stufen holen`:`Saison ${season.number} ${season.name} · noch ${daysLeft} Tage für deine Stufen`,go:"seasonPassView",key:"season-end:"+season.key,pinned:!final});
   }
  }
 }catch(e){console.warn("Event-Kalender: Season-Ende fehlt",e)}
 return out.sort((a,b)=>a.at-b.at)
}
function renderHomeCalendar(at=Date.now()){
 const box=typeof document!=="undefined"?document.getElementById("homeCalendarList"):null;if(!box)return;
 let rows=[];try{rows=footeraEventCalendar(at)}catch(e){console.warn("Event-Kalender konnte nicht berechnet werden",e)}
 const panel=document.getElementById("homeCalendarPanel");if(panel)panel.hidden=!rows.length;
 const escape=typeof esc==="function"?esc:s=>String(s);
 // Five rows stay visible; the rest opens with one tap so the Zentrale stays short.
 const hidden=Math.max(0,rows.length-EVENT_CALENDAR_VISIBLE),more=document.getElementById("homeCalendarMore"),open=!!panel?.classList.contains("expanded");
 if(more){more.hidden=!hidden;more.textContent=open?"Weniger anzeigen":`Alle ${rows.length} Termine anzeigen`;more.setAttribute("aria-expanded",open?"true":"false")}
 box.innerHTML=rows.map((row,i)=>{const w=eventCalendarWhen(row.at,at);return`<li${i>=EVENT_CALENDAR_VISIBLE?' class="home-calendar-extra"':""}><button type="button" class="home-calendar-item ${escape(row.kind)}${row.theme?" theme-"+escape(row.theme):""}" data-go="${escape(row.go)}" data-calendar-key="${escape(row.key)}"><span class="home-calendar-date" aria-hidden="true"><b>${escape(w.days<=0?"HEUTE":w.days===1?"MORGEN":w.weekday)}</b><span>${escape(w.date)}</span></span><span class="home-calendar-copy"><strong>${escape(row.title)}</strong><small>${escape(row.sub)}</small></span><span class="home-calendar-when" aria-label="${escape(w.relative)}"><b>${escape(w.time)}</b>${w.days>=2?`<small>in ${w.days} Tagen</small>`:""}</span></button></li>`}).join("")
}
if(typeof document!=="undefined")document.addEventListener("click",e=>{if(!e.target.closest("#homeCalendarMore"))return;document.getElementById("homeCalendarPanel")?.classList.toggle("expanded");renderHomeCalendar()});
// Relative labels ("Heute · 19:00", "In 3 Tagen") stay right while the Zentrale is open.
if(typeof window!=="undefined"&&typeof document!=="undefined")setInterval(()=>{if(document.visibilityState==="visible"&&document.getElementById("homeView")?.classList.contains("active"))renderHomeCalendar()},60000);
