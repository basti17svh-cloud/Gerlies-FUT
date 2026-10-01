const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
const time=fs.readFileSync(path.join(__dirname,'../footera-time.js'),'utf8');
const definitions=html.slice(html.indexOf('const EVOLUTION_POOL='),html.indexOf('const CAMPAIGNS='));
const code=html.slice(html.indexOf('let activeEvoTab='),html.indexOf(' let activeSbcGroup='));

function setup(){
 let now=Date.parse('2026-10-01T10:00:00Z');
 class Clock extends Date{constructor(...args){super(...(args.length?args:[now]))}static now(){return now}}
 const ctx={Date:Clock,Intl,console,$:()=>({addEventListener(){}}),
  state:{club:[],coins:60000,points:1000,activeEvos:[],evoProgress:{},evoHistory:[],transferList:[]},
  save(){},renderAll(){},switchView(){},closeUiLayer(){},toast(){},
  isFounderItem:i=>!!i.founder,isStoryItem:i=>!!i.story,
  displayBase:i=>({...i.base,ovr:i.base.ovr+Number(i.evo||0),...Object.fromEntries(Object.entries(i.evoStats||{}).map(([k,v])=>[k,i.base[k]+v]))}),
  itemRating:i=>i.base.ovr+Number(i.evo||0),resolvedPlayer:p=>p,
  playerPositions:p=>[p.position,...(p.alt||'').split(',').filter(Boolean)],parsePlayStyles:()=>[]};
 vm.createContext(ctx);vm.runInContext([time,definitions,code].join('\n'),ctx);
 ctx.showEvoClaimReveal=()=>{};ctx.setNow=value=>now=Date.parse(value);
 ctx.item=(uid,position='CM')=>{const i={uid,tradeable:true,evo:0,evoStats:{},base:{name:uid,position,ovr:70,pac:60,sho:55,pas:59,dri:62,def:60,phy:65}};ctx.state.club.push(i);return i};
 ctx.definition=id=>vm.runInContext(`EVOLUTION_POOL.find(e=>e.id===${JSON.stringify(id)})`,ctx);
 return ctx
}

test('evolution rotation starts Monday at 19:00 Berlin, independently of device timezone',()=>{
 const c=setup();
 assert.equal(c.evoWeekStart(new Date('2026-09-28T16:59:59Z')).toISOString(),'2026-09-21T17:00:00.000Z');
 assert.equal(c.evoWeekStart(new Date('2026-09-28T17:00:00Z')).toISOString(),'2026-09-28T17:00:00.000Z');
 assert.equal(c.evoWeekIndex(new Date('2026-10-26T18:00:00Z')),5);
});

test('evolution deadlines stay at 19:00 Berlin across the winter time change',()=>{
 const c=setup(),schedule=c.evolutionSchedule(c.definition('breakthrough'),new Date('2026-10-22T12:00:00Z'));
 assert.equal(schedule.start.toISOString(),'2026-10-19T17:00:00.000Z');
 assert.equal(schedule.signupEnd.toISOString(),'2026-10-26T18:00:00.000Z');
 assert.equal(schedule.completionEnd.toISOString(),'2026-11-02T18:00:00.000Z');
 assert.match(c.evoDate(schedule.signupEnd),/19:00/);
});

test('three evolution slots reject duplicate players, duplicate offers and a fourth payment',()=>{
 const c=setup();for(const [uid,pos] of [['a','CM'],['b','CM'],['d','RW'],['e','LB']])c.item(uid,pos);
 c.startEvolution('breakthrough','a');
 c.startEvolution('engine_room','a','coins');assert.equal(c.activeEvolutionCount(),1);
 c.startEvolution('breakthrough','b');assert.equal(c.activeEvolutionCount(),1);
 c.startEvolution('engine_room','b','coins');c.startEvolution('wide_threat','d','points');
 assert.equal(c.activeEvolutionCount(),3);assert.equal(c.state.coins,45000);assert.equal(c.state.points,850);
 c.startEvolution('fullback_lab','e','coins');assert.equal(c.activeEvolutionCount(),3);assert.equal(c.state.coins,45000);
 assert.equal(c.state.club.find(i=>i.uid==='a').tradeable,false);
});

test('unaffordable and invalid payments never start an evolution or change currency',()=>{
 const c=setup();c.item('a');c.state.coins=100;c.state.points=1;
 for(const pay of ['coins','points','free'])c.startEvolution('engine_room','a',pay);
 assert.equal(c.activeEvolutionCount(),0);assert.equal(c.state.coins,100);assert.equal(c.state.points,1);
});

test('progress requires the kickoff XI, survives substitution and waits for each claimed stage',()=>{
 const c=setup(),item=c.item('a');c.startEvolution('breakthrough','a');const key=c.state.activeEvos[0].instanceKey;
 c.match={initialStarters:['other'],lineup:['a']};c.progressEvolution('win');assert.equal(c.state.evoProgress[key].matches,0);
 c.match={initialStarters:['a'],lineup:['other']};for(let i=0;i<4;i++)c.progressEvolution('win');
 assert.equal(c.state.evoProgress[key].matches,3);assert.equal(c.state.evoProgress[key].ready,true);
 c.claimEvolutionStage(key);assert.equal(item.evo,2);assert.equal(c.state.activeEvos[0].stage,1);
 assert.equal(c.state.evoProgress[key].matches,0);c.claimEvolutionStage(key);assert.equal(item.evo,2);
 c.progressEvolution('loss');assert.equal(c.state.evoProgress[key].matches,1);assert.equal(c.state.evoProgress[key].wins,0);
});

test('stale claim keys cannot upgrade a different active evolution',()=>{
 const c=setup(),item=c.item('a');c.startEvolution('breakthrough','a');const key=c.state.activeEvos[0].instanceKey;
 c.state.evoProgress[key]={matches:3,wins:0,ready:true};c.claimEvolutionStage('cancelled-instance');
 assert.equal(item.evo,0);assert.equal(c.state.activeEvos[0].stage,0);
});

test('expiry releases its slot at the deadline and preserves already earned upgrades',()=>{
 const c=setup(),item=c.item('a');c.startEvolution('breakthrough','a');const row=c.state.activeEvos[0],key=row.instanceKey;
 c.state.evoProgress[key]={matches:3,wins:0,ready:true};c.claimEvolutionStage(key);assert.equal(item.evo,2);
 c.setNow(new Date(row.completionEnd).toISOString());assert.equal(c.expireActiveEvolutionIfNeeded(),true);
 assert.equal(c.activeEvolutionCount(),0);assert.equal(c.state.evoProgress[key],undefined);assert.equal(item.evo,2);
});

test('loading a legacy save releases an evolution whose player has already been consumed',()=>{
 const c=setup();c.item('missing');c.item('remaining');
 c.startEvolution('breakthrough','missing');c.startEvolution('engine_room','remaining','coins');
 const lostKey=c.state.activeEvos.find(e=>e.uid==='missing').instanceKey;
 c.state.club=c.state.club.filter(i=>i.uid!=='missing');c.migrateLegacyEvo();
 assert.equal(c.activeEvolutionCount(),1);assert.equal(c.state.activeEvos[0].uid,'remaining');
 assert.equal(c.state.evoProgress[lostKey],undefined);assert.equal(c.state.coins,45000);
});
