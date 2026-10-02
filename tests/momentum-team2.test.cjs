const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.join(__dirname,'..'),html=fs.readFileSync(path.join(root,'index.html'),'utf8');
function section(from,to){const a=html.indexOf(from),b=html.indexOf(to,a);assert.ok(a>=0&&b>a,from);return html.slice(a,b)}
function app(at='2026-10-02T18:59:00+02:00'){
 let now=Date.parse(at),nextUid=0;
 class Clock extends Date{constructor(...args){super(...(args.length?args:[now]))}static now(){return now}}
 const c={Date:Clock,Intl,Map,Set,Math,Array,normalizeKey:s=>String(s).toLowerCase(),P_BY_ID:new Map(),isFounderItem:()=>false,isBaseRare:()=>false,uid:()=>`test-${++nextUid}`,leagueFromClub:team=>team==='FC Porto'?'Liga Portugal':'Test League',sofifaFace:id=>`portrait-${id}.png`};
 vm.createContext(c);
 vm.runInContext(fs.readFileSync(path.join(root,'footera-time.js'),'utf8')+section('const MOMENTUM_EVENT=','let eventSelectedId=')+section('function eventPackIsActive(','function makeLivePackItem('),c);
 vm.runInContext(section('function itemRating(','function storyBase('),c);
 c.itemBase=item=>c.P_BY_ID.get(String(item.pid));
 vm.runInContext('for(const info of MOMENTUM_BY_ID.values())P_BY_ID.set(info.pid,momentumFallbackBase(info))',c);
 return{c,run:s=>vm.runInContext(s,c),setTime:at=>now=Date.parse(at)}
}

test('all four Berlin boundaries select the correct release and exact pack pool',()=>{
 const {c,run,setTime}=app(),one=run('MOMENTUM_EVENT'),two=run('MOMENTUM_TEAM_2');
 for(const [time,id] of [['2026-10-02T18:59:00+02:00',one.id],['2026-10-02T18:59:59.999+02:00',one.id],['2026-10-02T19:00:00+02:00',two.id],['2026-10-09T18:59:00+02:00',two.id],['2026-10-09T18:59:59.999+02:00',two.id],['2026-10-09T19:00:00+02:00',null]]){
  setTime(time);assert.equal(c.activeMomentumEvent()?.id||null,id);assert.equal(c.activePromoEvent()?.id||null,id);
  for(const event of [one,two])for(const info of event.players){const entry=c.activePromoPackEntry(c.P_BY_ID.get(info.pid));assert.equal(entry?.event?.id||null,event.id===id?id:null)}
 }
});

test('regular Team 2 is 18 unique identities/clubs, two keepers and no Team 1 repeats',()=>{
 const {c,run}=app(),one=run('MOMENTUM_EVENT'),two=run('MOMENTUM_TEAM_2');
 assert.equal(two.players.length,18);assert.equal(two.players.filter(p=>p.position==='GK').length,2);
 assert.equal(new Set(two.players.map(p=>p.pid)).size,18);assert.equal(new Set(two.players.map(p=>p.team)).size,18);
 const old=new Set(one.players.map(p=>p.pid));assert.ok(two.players.every(p=>!old.has(p.pid)));assert.ok(c.completeEventRoster(two));
 assert.equal(c.completeEventRoster({...two,players:two.players.map((p,i)=>i===1?{...p,team:two.players[0].team}:p)}),false);
 assert.equal(two.players.find(p=>p.pid==='270964').name,'Jobe Bellingham');
 assert.deepEqual(Array.from(two.players,p=>[p.ovr,p.position]),[[89,'CAM'],[89,'LW'],[88,'ST'],[88,'ST'],[88,'CM'],[88,'GK'],[87,'CDM'],[87,'CB'],[87,'CAM'],[87,'LW'],[87,'CAM'],[87,'GK'],[86,'CM'],[86,'ST'],[86,'CB'],[85,'LW'],[85,'CM'],[85,'CAM']]);
 assert.deepEqual(Array.from(two.players,p=>Array.from(p.stats)),[[92,86,87,92,66,78],[94,83,86,92,63,78],[90,92,78,88,42,83],[87,89,84,90,54,80],[84,81,88,87,82,82],[88,85,87,91,62,88],[83,74,81,84,87,82],[81,55,78,80,87,83],[88,82,86,91,53,75],[90,82,85,90,54,74],[88,84,85,89,59,76],[88,84,82,89,60,86],[82,78,84,85,81,82],[88,87,73,84,48,86],[82,54,72,76,87,85],[88,80,82,87,51,72],[81,76,82,84,83,85],[82,84,83,86,62,78]]);
});

test('real gold pack generation rotates all eighteen Team 2 items and preserves owned Team 1 items',()=>{
 const {c,run,setTime}=app(),one=run('MOMENTUM_EVENT'),two=run('MOMENTUM_TEAM_2'),players=[...one.players,...two.players].map(p=>c.P_BY_ID.get(p.pid));let index=0;
 Object.assign(c,{PLAYERS:players,PACKS:[{id:'test-gold',type:'gold',count:players.length,min:0,max:99}],founderRuleForPack:()=>null,weightedPlayer:()=>players[index++%players.length],isActiveEventSbcBase:()=>false,activeTotwWeek:()=>null,totwInfo:()=>null,isCardRare:()=>false,rarityOf:()=> 'gold'});
 vm.runInContext(section('function makeLivePackItem(','let promoEventClockId=')+section('function generatePack(id,tradeable=true){','function generateMarcoSurprisePack('),c);
 const historical=c.makeMomentumItem(c.P_BY_ID.get('233419'),true,one);
 for(const [time,id,count] of [['2026-10-02T18:59:00+02:00',one.id,14],['2026-10-02T19:00:00+02:00',two.id,18],['2026-10-09T18:59:00+02:00',two.id,18],['2026-10-09T19:00:00+02:00',null,0]]){
  setTime(time);index=0;const items=c.generatePack('test-gold'),specials=items.filter(i=>c.isMomentumItem(i));assert.equal(specials.length,count);assert.ok(specials.every(i=>i.eventReleaseId===id));
  assert.equal(c.displayBase(historical).ovr,88);assert.equal(historical.eventReleaseId,one.id);
 }
});

test('all Team 2 action shots are small local alpha WebPs and included in the new offline shell',()=>{
 const {run}=app(),event=run('MOMENTUM_TEAM_2'),sw=fs.readFileSync(path.join(root,'service-worker.js'),'utf8'),manifest=JSON.parse(fs.readFileSync(path.join(root,'assets/footera/events/momentum/team2/sources.json'),'utf8'));let total=0;
 assert.equal(manifest.images.length,18);
 for(const p of event.players){
  assert.match(p.dynamicFace,/^assets\/footera\/events\/momentum\/team2\/[a-z-]+\.webp$/);const data=fs.readFileSync(path.join(root,p.dynamicFace));total+=data.length;
  assert.equal(data.toString('ascii',0,4),'RIFF');assert.equal(data.toString('ascii',8,12),'WEBP');assert.equal(data.toString('ascii',12,16),'VP8X');assert.ok(data[20]&16,'alpha transparency');
  assert.ok(data.length<100000);assert.ok(data.readUIntLE(24,3)+1<=480);assert.ok(data.readUIntLE(27,3)+1<=600);assert.ok(sw.includes('./'+p.dynamicFace));
  const source=manifest.images.find(x=>x.pid===p.pid);assert.ok(source);assert.equal(source.club,p.team);assert.equal(source.asset,path.basename(p.dynamicFace));
 }
 assert.ok(total<900000);
});

test('event stats, ratings, club identity and alternate positions survive acquisition without changing bases',()=>{
 const {c,run}=app(),event=run('MOMENTUM_TEAM_2');
 for(const info of event.players){
  const base=c.P_BY_ID.get(info.pid),before=JSON.stringify(base),item=c.makePromoPackItem(base,{event,info}),shown=c.displayBase(JSON.parse(JSON.stringify(item)));
  assert.equal(shown.ovr,info.ovr);assert.equal(shown.position,info.position);assert.equal(shown.team,info.team);
  assert.deepEqual(Array.from(['pac','sho','pas','dri','def','phy'],key=>shown[key]),Array.from(info.stats));
  assert.equal(JSON.stringify(base),before);assert.equal(item.eventReleaseId,event.id);
  for(const alt of info.alt.split(',').filter(Boolean))assert.ok(shown.alt.split(',').includes(alt));
 }
 const old=c.makeMomentumItem(c.P_BY_ID.get('233419')),oldShown=c.displayBase(old);
 assert.equal(oldShown.ovr,88);assert.equal(oldShown.name,'Raphinha');assert.equal(c.isMomentumItem(old),true);
});

test('an open app schedules the exact deadline and refreshes home/hub/opponent without granting another rated SB slot',()=>{
 const {c,run,setTime}=app(),calls=[],timers=[];
 Object.assign(c,{setTimeout:(fn,ms)=>{timers.push({fn,ms});return timers.length},clearTimeout(){},homeHeroSlide:2,squadBattleOpponentCache:{key:'old',list:[1]},eventSelectedId:'momentum-team-1',state:{squadBattle:{week:'week'}},$:()=>({classList:{contains:()=>false},querySelector:()=>null}),renderHome:()=>calls.push('home'),renderEvents:()=>calls.push('events'),currentViewId:()=> 'eventsView'});
 vm.runInContext(section('let promoEventClockId=','const TASKS='),c);c.startPromoEventClock();assert.equal(timers.at(-1).ms,60000);
 setTime('2026-10-02T18:59:59.500+02:00');c.schedulePromoEventClock();assert.equal(timers.at(-1).ms,500);
 setTime('2026-10-02T19:00:00+02:00');timers.at(-1).fn();
 assert.deepEqual(calls,['home','events']);assert.equal(run('eventSelectedId'),'momentum-team-2');assert.equal(run('homeHeroSlide'),0);assert.equal(run('squadBattleOpponentCache.key'),'');
 assert.match(html,/special\|\$\{battleEventTeam\(\)\?\.id/);
 const competition=fs.readFileSync(path.join(root,'competition-system.js'),'utf8');assert.match(competition,/battleId:`\$\{key\}:\$\{kind\}`/);
});

test('dynamic imagery wins over cached heads only on event items, then fails safely to the normal portrait',()=>{
 const {c}=app();const cache=new Map(),failures=new Map();
 Object.assign(c,{esc:s=>String(s).replaceAll('"','&quot;'),imageCacheKey:(kind,p)=>`${kind}:${p.id}`,imageFailedRecently:url=>failures.has(url),prioritizeCached:(arr,key)=>cache.has(key)?[cache.get(key),...arr.filter(x=>x!==cache.get(key))]:arr,portraitCandidates:p=>[p.face],imgCandidatesAttr:JSON.stringify,IMAGE_FAILURE_CACHE:failures,persistImageCaches(){}});
 vm.runInContext(section('function eventDynamicFace(','function badgeAsset(')+section('function advanceImg(','function eventDynamicFace('),c);
 const p={id:'256790',name:'Musiala',face:'normal.png'},item={pid:p.id,variant:'special',eventName:'MOMENTUM',dynamicFace:'action.webp'};
 cache.set('portrait:'+p.id,'normal.png');assert.match(c.portraitHTML(p,false,item),/src="action.webp"/);
 for(const ordinary of [null,{...item,variant:''},{...item,eventName:'Team of the Week 3'},{...item,variant:'story'}])assert.match(c.portraitHTML(p,false,ordinary),/src="normal.png"/);
 const img={src:'https://footera.test/action.webp',dataset:{idx:'0',candidates:JSON.stringify(['action.webp','normal.png'])},style:{}};c.advanceImg(img);assert.equal(img.src,'normal.png');assert.ok(failures.has('action.webp'));
 assert.match(c.portraitHTML(p,false,item),/src="normal.png"/);img.parentElement={querySelector:()=>({style:{},classList:{contains:()=>true}})};c.advanceImg(img);assert.equal(img.style.display,'none');
});

test('Team 2 builds an eleven plus seven, keeps the second keeper on the bench and uses no bronze fillers',()=>{
 const {c,run}=app('2026-10-02T19:00:00+02:00');c.posFit=(p,pos)=>p.position===pos||p.alt.split(',').includes(pos)?1:0;
 vm.runInContext(section('const MOMENTUM_TEAM_SLOTS=','function momentumTeamCard('),c);
 const event=run('MOMENTUM_TEAM_2'),entries=event.players.map((p,index)=>({index,player:c.displayBase(c.makeMomentumItem(c.P_BY_ID.get(p.pid),true,event)),item:c.makeMomentumItem(c.P_BY_ID.get(p.pid),true,event)}));
 const slots=run('MOMENTUM_TEAM_2_SLOTS'),lineup=c.momentumTeamLineup(entries,slots);
 assert.equal(lineup.xi.length,11);assert.equal(lineup.bench.length,7);assert.equal(new Set([...lineup.xi,...lineup.bench].map(e=>e.index)).size,18);
 assert.equal(lineup.xi.filter(e=>e.player.position==='GK').length,1);assert.equal(lineup.bench.filter(e=>e.player.position==='GK').length,1);
 slots.forEach((slot,i)=>assert.ok(c.posFit(lineup.xi[i].player,slot.p)>0));
 Object.assign(c,{FORMATIONS:{'4-2-3-1':[{p:'GK'},{p:'LB'},{p:'CB'},{p:'CB'},{p:'RB'},{p:'CDM'},{p:'CDM'},{p:'CAM'},{p:'LM'},{p:'RM'},{p:'ST'}]},promoEventEntries:()=>entries,opponentChemistryTotal:()=>0});
 vm.runInContext(fs.readFileSync(path.join(root,'competition-system.js'),'utf8').split('function rewardLabel(')[0].slice(fs.readFileSync(path.join(root,'competition-system.js'),'utf8').indexOf('function battleEventTeam(')),c);
 const opponent=c.battleSpecialOpponent('event','week');assert.equal(opponent.name,'MOMENTUM TEAM 2');assert.equal(opponent.squad.length,18);assert.ok(opponent.items.every(i=>i.eventReleaseId===event.id));
 assert.equal(opponent.squad.slice(0,11).filter(p=>p.position==='GK').length,1);assert.equal(opponent.squad.slice(11).filter(p=>p.position==='GK').length,1);
 assert.equal(opponent.formation,'4-2-3-1');assert.equal(opponent.squad[7].name,'Jamal Musiala');
 assert.ok(opponent.squad[1].def>=80&&opponent.squad[4].def>=80);
});
