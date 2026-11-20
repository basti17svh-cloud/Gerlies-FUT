// Shared page setup: Best of TOTW (home, user) vs Icons (CPU). Runs inside the page.
window.__reelSetup=function(opts={}){
 cancelMatch3D();stopMatchTimer();dismissMatchGoalMoment(false);
 for(const id of ['bootIntro','dbGate','onboarding','usernameRequiredModal'])document.getElementById(id)?.remove();
 if(!document.getElementById('reelGuard')){const g=document.createElement('style');g.id='reelGuard';g.textContent='#footeraAccountDialog,#footeraAnalyticsConsent{display:none!important;pointer-events:none!important}';document.head.append(g)}
 const W=TOTW_WEEK_10,find=n=>W.players.findIndex(p=>p.names.some(x=>x.includes(n)));
 const ORDER=['Kobel','Brugts','Bastoni','Gabriel','Hakimi','Giugliano','Bellingham','Dumornay','Wilson','Haaland','Yamal','Baena','Wirtz','McTominay','Carpenter','Kane','Nkunku','Tullis-Joyce'];
 const items=ORDER.map(n=>{const i=find(n),info=W.players[i];const base=resolveTotwWeekBase(W,info,i);P_BY_ID.set(String(base.id),base);
  return makeItem(base,false,{variant:"special",eventName:W.name,boost:Math.max(0,info.ovr-base.ovr),overridePosition:info.position,rare:true,displayRating:info.ovr,eventStats:info.stats,eventType:"totw",eventReleaseId:"totw-10"})});
 const IC=['Gianluigi Buffon','Roberto Carlos','Paolo Maldini','Franz Beckenbauer','Cafu','Xavi','Zinedine Zidane','Iniesta','Ronaldinho','Ronaldo','Garrincha','Pelé','Diego Armando Maradona','Johan Cruyff','Thierry Henry','Andrea Pirlo','Franco Baresi','Oliver Kahn'];
 const icons=IC.map(n=>MID_ICON_BASES.find(b=>b.name===n));icons.forEach(b=>P_BY_ID.set(String(b.id),b));
 const homeIdentity=defaultClubIdentity(),awayIdentity=defaultClubIdentity();
 homeIdentity.crest={...homeIdentity.crest,initials:'TOTW',symbol:'star',primary:'#e3202b',secondary:'#120406',accent:'#ffffff',borderColor:'#e3202b'};
 homeIdentity.stadium={name:'Footera Arena',style:'kessel',seatPrimary:'#e3202b',seatSecondary:'#141418'};
 awayIdentity.crest={...awayIdentity.crest,initials:'ICON',symbol:'crown',primary:'#d9b45a',secondary:'#14110a',accent:'#ffffff',borderColor:'#d9b45a'};
 awayIdentity.colors={primary:'#d9b45a',secondary:'#14110a',accent:'#efe6c8'};awayIdentity.kits={...awayIdentity.kits,home:{pattern:'solid',shirtPrimary:'#efe6c8',shirtSecondary:'#b8902f',shorts:'#efe6c8',socks:'#efe6c8'}};
 homeIdentity.colors={primary:'#e3202b',secondary:'#16161a',accent:'#ffffff'};homeIdentity.kits={...homeIdentity.kits,home:{pattern:'solid',shirtPrimary:'#16161a',shirtSecondary:'#e3202b',shorts:'#16161a',socks:'#16161a'}};
 const iconItems=icons.map(b=>makeItem(b,false));
 state.club=iconItems;state.squad=iconItems.map(i=>i.uid);state.formation='4-3-3';state.tactic='balanced';
 awayIdentity.stadium=homeIdentity.stadium;
 state.profile.clubName='Icons';state.profile.clubShortName='ICONS';state.profile.clubIdentity=awayIdentity;state.stats=state.stats||{};state.stats.matches=0;
 state.profile.manager={name:'Paolo Ferrante',gender:'male',skin:'#c88f69',hair:'short04',hairColor:'#e9e6df',beard:'none',glasses:'gold',age:'veteran',build:'normal',outfit:'suit',top:'#0d2a5c',trousers:'#0d2a5c',accent:'#f2f2f2',tie:'#f4c20d'};
 try{localStorage.setItem('footera-choreo-v1',JSON.stringify({on:true,rotate:false,motif:'crown',a:'#d9b45a',b:'#120406',ink:'#ffffff',text:'LEGENDEN STERBEN NIE',top:'BUILD YOUR ERA',crest:true,stars:3}))}catch(e){}
 FooteraHighlights.setMode('important');document.querySelectorAll('[data-highlight-mode]').forEach(s=>s.value='important');
 const xi=items.slice(0,11),rating=Math.round(xi.reduce((n,i)=>n+itemRating(i),0)/11),chem=opponentChemistryTotal(items.map(i=>displayBase(i)),'4-3-3');
 const opp={kind:'generated',name:'Best of TOTW',seed:'totw-reel',formation:'4-3-3',tactic:'balanced',rating,chem,squad:items,items,tier:'Jubiläumsspiel',power:rating+chem*.12,clubIdentity:homeIdentity};
 const m=squadMetrics();
 return {opp,home:{rating:m.rating,chem:m.chem,power:m.rating+m.chem*.12,filled:m.filled}};
};
