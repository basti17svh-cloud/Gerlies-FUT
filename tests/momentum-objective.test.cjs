const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'..'),html=fs.readFileSync(path.join(root,'index.html'),'utf8'),season=fs.readFileSync(path.join(root,'season-system.js'),'utf8'),competition=fs.readFileSync(path.join(root,'competition-system.js'),'utf8');
function section(source,from,to){const a=source.indexOf(from),b=source.indexOf(to,a);assert.ok(a>=0&&b>a,from);return source.slice(a,b)}
function app(at='2026-10-02T19:00:00+02:00'){
 let now=Date.parse(at),next=0;const storage=new Map(),elements=new Map();
 class Clock extends Date{constructor(...args){super(...(args.length?args:[now]))}static now(){return now}}
 const $=id=>{if(!elements.has(id))elements.set(id,{innerHTML:'',textContent:'',listeners:{},classList:{contains:()=>false},addEventListener(type,fn){this.listeners[type]=fn}});return elements.get(id)};
 const c={Date:Clock,Intl,Map,Set,Math,Array,$,uid:()=>`result-${++next}`,normalizeKey:s=>String(s).toLowerCase(),P_BY_ID:new Map(),PLAYERS:[],
  localStorage:{getItem:key=>storage.get(key)||null,setItem:(key,value)=>storage.set(key,value)},migrateLegacyEventState:s=>s,initializeSquadPresets:s=>s,
  leagueFromClub:()=> 'Ligue 1',sofifaFace:id=>`normal-${id}.png`,applyPlayerTraits:rows=>rows.forEach(p=>Object.assign(p,{skillMoves:3,weakFoot:4,preferredFoot:'Right'})),
  isBaseRare:()=>false,isFounderItem:()=>false,founderRuleForItem:()=>null,activeEvolutionForUid:()=>null,
  save(){},flushSave(){storage.set('gerliesFutV9',JSON.stringify(c.state))},STORY_PASS_PLAYERS:{},
  fmt:String,esc:String,renderAll(){},renderHome(){},toast(){},setInterval(){},confirm:()=>true,
  SEASON_REWARDS:[0,500,1000,1800,2800,4000,5500,7500,10000,13500].map((sp,i)=>({level:i+1,sp,reward:{coins:100}})),
  TASKS:[{id:'starter',title:'Foundations task',desc:'Start',stat:'starter',target:1,reward:{coins:100}}],
  grant(){},grantSeasonOnly(){},claimSeasonRewards(){},PACKS:[],cardHTML:(p,i)=>`<div class="card-shell momentum-shell"><div class="custom-card momentum"><b>${p.ovr}</b>${p.name}</div></div>`
 };
 vm.createContext(c);
 vm.runInContext(fs.readFileSync(path.join(root,'footera-time.js'),'utf8'),c);
 vm.runInContext(section(competition,'const SB_DIFFICULTIES=','const SB_STRENGTH='),c);
 vm.runInContext(section(html,'const MOMENTUM_EVENT=','let eventSelectedId='),c);
 vm.runInContext(section(html,'function eventPackIsActive(','function makeLivePackItem('),c);
 vm.runInContext(section(html,'function newFooteraSaveId(','function squadPresetName('),c);
 vm.runInContext(section(html,'function isStoryItem(','function storyBase('),c);
 vm.runInContext(section(html,'function rewardText(','function addCoinBoost('),c);
 c.state=c.baseState();
 const definition=vm.runInContext('EVENT_OBJECTIVES[0]',c);
 c.P_BY_ID.set('262088',{id:'262088',name:'H. Haraldsson',fullName:'Hákon Arnar Haraldsson',ovr:78,position:'CAM',alt:'LM,CM,LW',team:'Lille OSC',nation:'Iceland',league:'Ligue 1',face:'normal-262088.png',preferredFoot:'Right',skillMoves:3,weakFoot:4,pac:77,sho:67,pas:75,dri:81,def:57,phy:70});
 const finish=(id,difficulty='pro',mode='squad',result='win',finished=true)=>c.recordEventObjectiveMatch({resultId:id,battleDifficulty:difficulty,mode,finished},result);
 return{c,definition,finish,storage,elements,run:s=>vm.runInContext(s,c),setTime:at=>now=Date.parse(at)}
}

test('objective visibility and finished-match progress obey all four exact Berlin boundaries',()=>{
 const a=app();
 for(const [at,active] of [['2026-10-02T18:59:00+02:00',false],['2026-10-02T18:59:59.999+02:00',false],['2026-10-02T19:00:00+02:00',true],['2026-10-09T18:59:00+02:00',true],['2026-10-09T18:59:59.999+02:00',true],['2026-10-09T19:00:00+02:00',false]]){
  a.setTime(at);assert.equal(a.c.activeEventObjectives().length,active?1:0);assert.equal(a.finish(at),active);
 }
 assert.equal(a.c.eventObjectiveProgress(a.definition),3);
});

test('only finished Squad Battles wins on Profi or a higher known difficulty count',()=>{
 const a=app();
 for(const [id,diff,mode,result,finished,count] of [
  ['amateur','amateur','squad','win',true,false],['semi','semi','squad','win',true,false],
  ['pro','pro','squad','win',true,true],['world','world','squad','win',true,true],['legend','legend','squad','win',true,true],['ultimate','ultimate','squad','win',true,true],
  ['loss','pro','squad','loss',true,false],['draw','pro','squad','draw',true,false],['rivals','pro','rivals','win',true,false],['friendly','pro','friendly-random','win',true,false],['weekend','pro','weekend','win',true,false],
  ['unknown','invented','squad','win',true,false],['unfinished','pro','squad','win',false,false]
 ])assert.equal(a.finish(id,diff,mode,result,finished),count,id);
 assert.equal(a.c.eventObjectiveProgress(a.definition),4);assert.equal(a.c.state.club.length,0);
});

test('progress is flushed to the real save shape and a repeated completed match cannot count after reload',()=>{
 const a=app();assert.equal(a.finish('match-1'),true);
 const saved=JSON.parse(a.storage.get('gerliesFutV9'));assert.equal(saved.eventObjectives[a.definition.id].progress,1);
 a.c.state=a.c.loadState();assert.equal(a.c.eventObjectiveProgress(a.definition),1);assert.equal(a.finish('match-1'),false);
 assert.equal(a.finish('match-2'),true);assert.equal(a.c.eventObjectiveProgress(a.definition),2);
 assert.deepEqual(Array.from(a.c.state.eventObjectives[a.definition.id].matchIds),['match-1','match-2']);
});

test('7/8 is not claimable; 8/8 waits for manual claim and grants exactly one permanent untradeable reward',()=>{
 const a=app();for(let i=1;i<=7;i++)a.finish(`match-${i}`);
 assert.equal(a.c.claimEventObjective(a.definition),false);assert.equal(a.c.state.club.length,0);
 a.finish('match-8');a.finish('match-9');assert.equal(a.c.eventObjectiveProgress(a.definition),8);assert.equal(a.c.state.club.length,0);
 assert.equal(a.c.claimEventObjective(a.definition),true);
 const item=a.c.state.club[0];assert.equal(item.tradeable,false);assert.equal(item.objectiveRewardKey,a.definition.id);assert.equal(item.acquisitionSource,'Objective');
 assert.equal(a.c.claimEventObjective(a.definition),false);a.c.state=a.c.loadState();assert.equal(a.c.claimEventObjective(a.definition),false);assert.equal(a.c.state.club.length,1);
 // Consuming the card in an SBC does not reopen the entitlement.
 a.c.state.club=[];assert.equal(a.c.claimEventObjective(a.definition),false);
});

test('the existing claim deadline is strict, while an already acquired Haraldsson keeps his historical item data',()=>{
 const a=app();for(let i=0;i<8;i++)a.finish(`match-${i}`);a.c.claimEventObjective(a.definition);
 const item=JSON.parse(JSON.stringify(a.c.state.club[0]));a.setTime('2026-10-09T19:00:00+02:00');
 assert.equal(a.finish('expired'),false);assert.equal(a.c.claimEventObjective(a.definition),false);assert.equal(a.c.displayBase(item).ovr,84);assert.equal(a.c.isMomentumItem(item),true);
 const b=app();for(let i=0;i<8;i++)b.finish(`match-${i}`);b.setTime('2026-10-09T19:00:00+02:00');assert.equal(b.c.claimEventObjective(b.definition),false);assert.equal(b.c.state.club.length,0);
});

test('event acquisition uses the master MOMENTUM identity and true base traits without mutating the ordinary 78 card',()=>{
 const a=app(),base=a.c.P_BY_ID.get('262088'),before=JSON.stringify(base),item=a.c.makeEventObjectiveItem(a.definition),shown=a.c.displayBase(item);
 assert.equal(shown.ovr,84);assert.equal(shown.position,'CAM');assert.equal(shown.name,'Hákon Haraldsson');assert.equal(shown.team,'LOSC Lille');assert.equal(shown.league,'Ligue 1');assert.equal(shown.nation,'Iceland');
 assert.deepEqual(['pac','sho','pas','dri','def','phy'].map(k=>shown[k]),[86,80,84,87,63,76]);
 assert.deepEqual(new Set(shown.alt.split(',')),new Set(['LM','CM','LW']));assert.equal(shown.preferredFoot,base.preferredFoot);assert.equal(shown.skillMoves,base.skillMoves);assert.equal(shown.weakFoot,base.weakFoot);
 assert.equal(shown.face,base.face);assert.equal(shown.dynamicFace,a.definition.player.dynamicFace);assert.equal(a.c.cardClass(shown,item),'momentum');assert.equal(JSON.stringify(base),before);
});

test('Haraldsson remains outside every regular event team/pack/market catalogue and the SBC catalogue',()=>{
 const a=app(),base=a.c.P_BY_ID.get('262088');
 assert.equal(a.run('MOMENTUM_TEAM_2.players.length'),18);assert.equal(a.run('MOMENTUM_TEAM_2.players.filter(p=>p.position==="GK").length'),2);
 assert.equal(a.run('MOMENTUM_RELEASES.some(e=>e.players.some(p=>p.pid==="262088"))'),false);assert.equal(a.run('MOMENTUM_BY_ID.has("262088")'),false);assert.equal(a.c.activePromoPackEntry(base),null);assert.equal(a.run('EVENT_PROMO_RELEASES.some(e=>e.sbcPlayer?.pid==="262088")'),false);
 Object.assign(a.c,{isActiveEventSbcBase:()=>false,activeTotwWeek:()=>null,totwInfo:()=>null});
 vm.runInContext(section(html,'function makeLivePackItem(','let promoEventClockId='),a.c);
 const packed=a.c.makeLivePackItem(base);assert.equal(packed.variant,'');assert.equal(a.c.itemRating(packed),78);
});

test('an owned historical objective card restores its correct base when the database is temporarily unavailable',()=>{
 const a=app(),item=a.c.makeEventObjectiveItem(a.definition);a.c.P_BY_ID.delete('262088');a.setTime('2026-10-09T19:00:00+02:00');
 Object.assign(a.c,{MID_ICON_BASES:[],ICON_LEGACY_ALIASES:{},RETIRED_ICON_BASE:{id:'retired'},FOUNDER_PLAYER_ID:'founder-a',FOUNDER_BASE:{},MARCO_FOUNDER_PLAYER_ID:'founder-b',MARCO_FOUNDER_BASE:{},LIVE_TOTW_BASE_CACHE:new Map()});
 vm.runInContext(section(html,'function restoreSyntheticPlayerIds()','function bestEaTotwAsset('),a.c);a.c.restoreSyntheticPlayerIds();
 const base=a.c.P_BY_ID.get('262088'),shown=a.c.displayBase(item);
 assert.equal(base.ovr,78);assert.deepEqual(['pac','sho','pas','dri','def','phy'].map(k=>base[k]),[77,67,75,81,57,70]);
 assert.equal(shown.ovr,84);assert.equal(shown.dynamicFace,a.definition.player.dynamicFace);assert.equal(shown.skillMoves,3);assert.equal(shown.weakFoot,4);assert.equal(a.c.PLAYERS.length,0);
});

test('the existing objectives UI puts Haraldsson in the ready section and its existing click handler claims once',()=>{
 const a=app();vm.runInContext(season,a.c,{filename:'season-system.js'});
 assert.ok(a.run('activeObjectiveGroups().some(w=>w.tasks[0]?.id==="momentum-haraldsson")'));
 for(let i=0;i<7;i++)a.finish(`match-${i}`);a.c.renderTasks();let markup=a.elements.get('taskList').innerHTML;
 assert.match(markup,/7 \/ 8/);assert.doesNotMatch(markup,/ABHOLBEREIT/);assert.match(markup,/84 Hákon Haraldsson – MOMENTUM/);
 a.finish('match-8');a.c.renderTasks();markup=a.elements.get('taskList').innerHTML;
 assert.match(markup,/ABHOLBEREIT/);assert.equal((markup.match(/MOMENTUM: Haraldsson/g)||[]).length,1);assert.ok(markup.indexOf('MOMENTUM: Haraldsson')<markup.indexOf('Foundations task'));
 const click=()=>a.elements.get('taskList').listeners.click({target:{closest:selector=>selector==='[data-objective-claim]'?{dataset:{objectiveClaim:a.definition.key}}:null}});
 click();click();assert.equal(a.c.state.club.length,1);a.c.renderTasks();assert.match(a.elements.get('taskList').innerHTML,/ABGESCHLOSSEN/);assert.doesNotMatch(a.elements.get('taskList').innerHTML,/ABHOLBEREIT/);
});

test('the real dynamic action asset is local, transparent, compressed, pre-cached and linked to Haraldsson/Lille',()=>{
 const a=app(),file=path.join(root,a.definition.player.dynamicFace),data=fs.readFileSync(file),meta=JSON.parse(fs.readFileSync(path.join(root,'assets/footera/events/momentum/objectives/sources.json'),'utf8')).images[0];
 assert.equal(data.toString('ascii',0,4),'RIFF');assert.equal(data.toString('ascii',8,12),'WEBP');assert.ok(data[20]&16);assert.ok(data.length<100000);assert.ok(data.readUIntLE(24,3)+1<=480);assert.ok(data.readUIntLE(27,3)+1<=600);
 assert.equal(meta.pid,'262088');assert.equal(meta.club,'LOSC Lille');assert.ok(fs.readFileSync(path.join(root,'service-worker.js'),'utf8').includes('./'+a.definition.player.dynamicFace));
});
