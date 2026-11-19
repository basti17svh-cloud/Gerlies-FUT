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
 state.club=items;state.squad=items.map(i=>i.uid);state.formation='4-3-3';state.tactic='balanced';
 state.profile.clubName='Best of TOTW';state.profile.clubShortName='TOTW';state.profile.clubIdentity=homeIdentity;state.stats=state.stats||{};state.stats.matches=0;
 state.profile.manager={name:'Lennart Hofmann',gender:'male',skin:'#e6bf9c',hair:'short04',hairColor:'#3b2a1f',beard:'Full_beard',glasses:'none',age:'prime',build:'normal',outfit:'suit',top:'#111318',trousers:'#111318',accent:'#f2f2f2',tie:'#c4122f'};
 try{localStorage.setItem('footera-choreo-v1',JSON.stringify({on:true,rotate:false,motif:'crown',a:'#e3202b',b:'#120406',ink:'#ffffff',text:'BEST OF TOTW',top:'BUILD YOUR ERA',crest:true,stars:3}))}catch(e){}
 FooteraHighlights.setMode('important');document.querySelectorAll('[data-highlight-mode]').forEach(s=>s.value='important');
 const xi=icons.slice(0,11),rating=Math.round(xi.reduce((n,p)=>n+p.ovr,0)/11),chem=opponentChemistryTotal(icons,'4-3-3');
 const opp={kind:'generated',name:'Icons',seed:'icons-reel',formation:'4-3-3',tactic:'balanced',rating,chem,squad:icons,tier:'Jubiläumsspiel',power:rating+chem*.12,clubIdentity:awayIdentity};
 const m=squadMetrics();
 return {opp,home:{rating:m.rating,chem:m.chem,power:m.rating+m.chem*.12,filled:m.filled}};
};
