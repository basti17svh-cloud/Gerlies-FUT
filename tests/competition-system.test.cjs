const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const time=fs.readFileSync(path.join(__dirname,'../footera-time.js'),'utf8');
const competitions=fs.readFileSync(path.join(__dirname,'../competition-system.js'),'utf8');
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');

function setup({initial={},now='2026-09-27T12:00:00Z',eventPlayers=[]}={}){
 const fixed=new Date(now).getTime();
 class ClockDate extends Date{constructor(...args){super(...(args.length?args:[fixed]))}static now(){return fixed}}
 const state={coins:0,packs:{},rivals:{division:10,points:0},...initial};
 const players=[{id:'bronze-gk',ovr:60,position:'GK'},...Array.from({length:8},(_,i)=>({id:`bronze-${i}`,ovr:60,position:'ST'}))];
 const event={id:'momentum-team-1',name:'MOMENTUM',subtitle:'TEAM 1',activeFrom:'2026-09-27T00:00:00+02:00',activeUntilAt:'2026-10-02T19:00:00+02:00',players:eventPlayers};
 const ctx={Date:ClockDate,Intl,Math,Map,Set,state,PLAYERS:players,PACKS:[{id:'gold',name:'Gold-Pack'},{id:'82',name:'82+'}],MOMENTUM_EVENT:event,EVENT_PROMO_RELEASES:[event],LIVE_TOTW:{name:'TOTW',players:[]},
  FORMATIONS:{'4-3-3':[{p:'GK'},...Array.from({length:10},()=>({p:'ST'}))]},
  eventPackIsActive:(e,at)=>at>=Date.parse(e.activeFrom)&&at<Date.parse(e.activeUntilAt),
  promoEventEntries:e=>e.players.map((p,i)=>({player:{id:p.pid,position:p.position,ovr:p.ovr},item:{pid:p.pid,variant:'special'},index:i})),
  liveTotwTeamEntries:()=>[],completeEventRoster:e=>e.players.length===18&&e.players.filter(x=>x.position==='GK').length===2,
  deterministicPick:a=>a[0],posFit:(p,slot)=>p.position===slot,playerGender:()=>"male",totwDisplayName:x=>x,
  $:()=>({textContent:'',innerHTML:''}),save(){},renderAll(){},currentViewId:()=>'',toast(){},updateObjectiveIndicators(){},setInterval(){},
  document:{addEventListener(){}},fmt:String,esc:String,seasonCountdown:()=>'',seasonInfo:()=>({number:1,name:'THE BEGINNING'}),passDate:()=>''};
 vm.createContext(ctx);vm.runInContext(time,ctx);vm.runInContext(competitions,ctx);
 const api=vm.runInContext('({competitionWindow,sbBattlePoints,sbRank,recordSquadBattleResult,recordRivalsResult,syncCompetitionWeeks,competitionPending,claimCompetitionReward,battleSpecialOpponent})',ctx);
 return{ctx,state,api}
}

test('Monday and Thursday reset at 09:00 Berlin on both sides of DST',()=>{
 const {api}=setup();
 assert.equal(api.competitionWindow('squad',new Date('2026-10-26T07:59:59Z')).start.toISOString(),'2026-10-19T07:00:00.000Z');
 assert.equal(api.competitionWindow('squad',new Date('2026-10-26T08:00:00Z')).start.toISOString(),'2026-10-26T08:00:00.000Z');
 assert.equal(api.competitionWindow('rivals',new Date('2026-10-29T07:59:59Z')).start.toISOString(),'2026-10-22T07:00:00.000Z');
 assert.equal(api.competitionWindow('rivals',new Date('2026-10-29T08:00:00Z')).start.toISOString(),'2026-10-29T08:00:00.000Z');
});

test('battle points apply result, goals, clean sheet, six difficulties and opponent strength',()=>{
 const {api}=setup();
 for(const [difficulty,factor] of Object.entries({amateur:.60,semi:.80,pro:1,world:1.25,legend:1.50,ultimate:1.70})){
  assert.equal(api.sbBattlePoints('win',7,0,difficulty,'medium'),Math.round(1000*factor));
  assert.equal(api.sbBattlePoints('loss',0,2,difficulty,'easy'),Math.round(200*factor*.90));
 }
 assert.equal(api.sbBattlePoints('win',1,0,'pro','elite'),Math.round(840*1.15));
 assert.equal(api.sbRank(15999).name,'Gold 1');assert.equal(api.sbRank(16000).name,'Elite 3');
});

test('14 unique games give BP and the 15th still has a match without BP',()=>{
 const {state,api}=setup();
 for(let i=0;i<14;i++)assert.equal(api.recordSquadBattleResult('win',2,0,{battleId:`b${i}`,strengthId:'medium'}).eligible,true);
 const points=state.squadBattle.points;
 assert.equal(api.recordSquadBattleResult('win',5,0,{battleId:'b14',strengthId:'medium'}).earned,0);
 assert.equal(state.squadBattle.played,14);assert.equal(state.squadBattle.points,points);
});

test('Rivals checkpoints, third-win bonus, promotion and weekly points coexist',()=>{
 const {state,api}=setup();
 api.recordRivalsResult('win');assert.equal(state.rivals.step,2);assert.equal(state.rivals.checkpoint,2);
 api.recordRivalsResult('win');assert.equal(state.rivals.step,3);
 const promotion=api.recordRivalsResult('win');assert.equal(state.rivals.division,9);assert.equal(state.rivals.step,2);assert.equal(promotion.earned,3);
 api.recordRivalsResult('loss');assert.equal(state.rivals.step,2);assert.equal(state.rivals.streak,0);
 api.recordRivalsResult('draw');assert.equal(state.rivals.weeklyPoints,10);
 state.rivals.division=1;state.rivals.step=7;state.rivals.streak=0;
 api.recordRivalsResult('win');assert.equal(state.rivals.division,0);assert.equal(state.rivals.skill,500);
});

test('week change freezes rewards once, keeps division and survives a simulated reload',()=>{
 const app=setup({now:'2026-10-01T12:00:00Z'}),{state,api}=app;
 state.squadBattle.week=api.competitionWindow('squad',new Date('2026-09-29T12:00:00Z')).key;
 state.squadBattle.played=14;state.squadBattle.points=16000;
 state.rivals.division=7;state.rivals.step=3;state.rivals.weeklyPoints=35;
 state.rivals.week=api.competitionWindow('rivals',new Date('2026-10-01T12:00:00Z')).key;
 api.syncCompetitionWeeks(new Date('2026-10-05T06:59:59Z'));
 assert.equal(state.squadBattle.played,14);
 api.syncCompetitionWeeks(new Date('2026-10-05T07:00:00Z'));
 assert.equal(state.squadBattle.played,0);assert.equal(app.api.competitionPending('squad').length,1);
 api.syncCompetitionWeeks(new Date('2026-10-08T06:59:59Z'));assert.equal(state.rivals.weeklyPoints,35);
 api.syncCompetitionWeeks(new Date('2026-10-08T07:00:00Z'));
 assert.equal(state.rivals.division,7);assert.equal(state.rivals.step,3);assert.equal(state.rivals.weeklyPoints,0);
 assert.equal(api.competitionPending().length,2);
 const reload=setup({initial:structuredClone(state),now:'2026-10-08T12:00:00Z'});
 assert.equal(reload.api.competitionPending().length,2);
 assert.equal(reload.api.claimCompetitionReward('rivals',reload.api.competitionPending('rivals')[0].week),true);
 assert.equal(reload.state.coins,9000);
 assert.equal(reload.api.claimCompetitionReward('rivals',state.weeklyRewards.find(x=>x.mode==='rivals').week),false);
 assert.equal(reload.api.competitionPending().length,1);
});

test('MOMENTUM opponent has 14 special players plus four bronze fillers and two keepers',()=>{
 const roster=Array.from({length:14},(_,i)=>({pid:String(i),position:i===0?'GK':'ST',ovr:85}));
 const {api}=setup({eventPlayers:roster});
 const o=api.battleSpecialOpponent('event','week1');
 assert.equal(o.squad.length,18);assert.equal(o.squad.filter(p=>p.position==='GK').length,2);
 assert.equal(o.items.filter(Boolean).length,14);assert.equal(o.squad.slice(14).length,4);
 assert.ok(o.squad.slice(14).every(p=>p.ovr<65));assert.ok(o.items.slice(14).every(x=>x===null));
});

test('event windows end at Friday 19:00 Berlin, including after the clock change',()=>{
 const eventSource=html.slice(html.indexOf('const MOMENTUM_EVENT='),html.indexOf('function momentumIsActive('));
 const checkSource=html.slice(html.indexOf('function eventPackIsActive('),html.indexOf('function activePromoPackEntry('));
 const ctx={Date,Intl,Map};vm.createContext(ctx);
 vm.runInContext([time,eventSource,checkSource].join('\n'),ctx);
 const api=vm.runInContext('({MOMENTUM_EVENT,HALLOWEEN_EVENT,eventPackIsActive})',ctx);
 assert.equal(api.MOMENTUM_EVENT.activeUntilAt,'2026-10-02T19:00:00+02:00');
 assert.equal(api.HALLOWEEN_EVENT.activeFrom,'2026-10-30T19:00:00+01:00');
 assert.equal(api.eventPackIsActive(api.MOMENTUM_EVENT,Date.parse('2026-10-02T18:59:59+02:00')),true);
 assert.equal(api.eventPackIsActive(api.MOMENTUM_EVENT,Date.parse('2026-10-02T19:00:00+02:00')),false);
 assert.equal(api.eventPackIsActive(api.HALLOWEEN_EVENT,Date.parse('2026-10-30T19:00:00+01:00')),true);
 assert.equal(api.eventPackIsActive({...api.MOMENTUM_EVENT,activeUntilAt:'2026-10-04T19:00:00+02:00'},Date.parse('2026-09-28T12:00:00Z')),false);
});

test('reward-only rating packs retain tradeability and TOTW pack needs a live team',()=>{
 const {ctx}=setup();let next=1;
 Object.assign(ctx,{weightedPlayer:min=>({id:String(next++),ovr:min,position:'ST'}),makeLivePackItem:(p,tradeable)=>({pid:p.id,tradeable}),
  isCardRare:()=>false,displayBase:()=>({ovr:77}),rarityOf:()=>"gold",uid:()=>String(next++),activeTotwWeek:()=>null,
  liveTotwTeamEntries:()=>[{item:{pid:'totw-1',variant:'special',eventName:'Team of the Week 2'}}]});
 const code=html.slice(html.indexOf('function generatePack(id,tradeable=true){'),html.indexOf('function renderStore(){'));
 vm.runInContext(code,ctx);
 const packs=vm.runInContext('({generatePack})',ctx);
 const tradeable=packs.generatePack('reward-77-15',true);
 assert.equal(tradeable.length,15);assert.ok(tradeable.every(x=>x.tradeable));
 const locked=packs.generatePack('reward-84-3',false);
 assert.equal(locked.length,3);assert.ok(locked.every(x=>!x.tradeable));
 assert.equal(packs.generatePack('totw-reward').length,0);
 ctx.activeTotwWeek=()=>({id:2});
 const totw=packs.generatePack('totw-reward');
 assert.equal(totw.length,1);assert.equal(totw[0].variant,'special');assert.equal(totw[0].tradeable,true);
});
