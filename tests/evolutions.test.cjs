const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const html=require('./helpers/app-html.cjs')();
const time=fs.readFileSync(path.join(__dirname,'../footera-time.js'),'utf8');
const definitions=html.slice(html.indexOf('const EVOLUTION_POOL='),html.indexOf('const CAMPAIGNS='));
const code=html.slice(html.indexOf('let activeEvoTab='),html.indexOf(' let activeSbcGroup='));

function setup(){
 let now=Date.parse('2026-10-01T10:00:00Z');
 class Clock extends Date{constructor(...args){super(...(args.length?args:[now]))}static now(){return now}}
 const ctx={Date:Clock,Intl,console,$:()=>({addEventListener(){}}),
  state:{club:[],coins:60000,points:1000,activeEvos:[],evoProgress:{},evoHistory:[],transferList:[]},
  save(){},renderAll(){},switchView(){},closeUiLayer(){},toast(){},
  openFooteraPointsOverview(required,source,available){ctx.topup={required,source,available}},
  isFounderItem:i=>!!i.founder,isStoryItem:i=>!!i.story,
  displayBase:i=>({...i.base,ovr:i.base.ovr+Number(i.evo||0),...Object.fromEntries(Object.entries(i.evoStats||{}).map(([k,v])=>[k,i.base[k]+v]))}),
  itemRating:i=>i.base.ovr+Number(i.evo||0),resolvedPlayer:p=>p,
  playerPositions:p=>[p.position,...(p.alt||'').split(',').filter(Boolean)],parsePlayStyles:()=>[]};
 vm.createContext(ctx);vm.runInContext([time,html.match(/^function isFooteraLiveCard\(.*$/m)[0],definitions,code].join('\n'),ctx);
 ctx.showEvoClaimReveal=()=>{};ctx.setNow=value=>now=Date.parse(value);
 ctx.item=(uid,position='CM',rating=74)=>{const i={uid,tradeable:true,evo:0,evoStats:{},base:{name:uid,position,ovr:rating,pac:60,sho:55,pas:59,dri:62,def:60,phy:65}};ctx.state.club.push(i);return i};
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
 const c=setup(),schedule=c.evolutionSchedule(c.definition('s1_low_vereinsprojekt'),new Date('2026-10-22T12:00:00Z'));
 assert.equal(schedule.start.toISOString(),'2026-10-19T17:00:00.000Z');
 assert.equal(schedule.signupEnd.toISOString(),'2026-10-26T18:00:00.000Z');
 assert.equal(schedule.completionEnd.toISOString(),'2026-11-02T18:00:00.000Z');
 assert.match(c.evoDate(schedule.signupEnd),/19:00/);
});

test('three evolution slots reject duplicate players, duplicate offers and a fourth payment',()=>{
 const c=setup();for(const [uid,pos] of [['a','CM'],['b','CM'],['d','RW'],['e','LB']])c.item(uid,pos,['d','e'].includes(uid)?77:74);
 c.startEvolution('s1_low_vereinsprojekt','a');
 c.startEvolution('s1_low_athletik','a','coins');assert.equal(c.activeEvolutionCount(),1);
 c.startEvolution('s1_low_vereinsprojekt','b');assert.equal(c.activeEvolutionCount(),1);
 c.startEvolution('s1_low_athletik','b','coins');c.startEvolution('s1_mid_attack','d','points');
 assert.equal(c.activeEvolutionCount(),3);assert.equal(c.state.coins,40000);assert.equal(c.state.points,750);
 c.startEvolution('s1_mid_defense','e','coins');assert.equal(c.activeEvolutionCount(),3);assert.equal(c.state.coins,40000);
 assert.equal(c.state.club.find(i=>i.uid==='a').tradeable,false);
});

test('unaffordable and invalid payments never start an evolution or change currency',()=>{
 const c=setup();c.item('a');c.state.coins=100;c.state.points=1;
 for(const pay of ['coins','points','free'])c.startEvolution('s1_low_athletik','a',pay);
 assert.equal(c.activeEvolutionCount(),0);assert.equal(c.state.coins,100);assert.equal(c.state.points,1);
 assert.ok(c.topup,'insufficient Evo Points should open purchase overview');
 assert.ok(c.topup.required>c.topup.available);
 assert.match(c.topup.source,/Evolution/);
});

test('progress requires the kickoff XI, survives substitution and waits for each claimed stage',()=>{
 const c=setup(),item=c.item('a');c.startEvolution('s1_low_vereinsprojekt','a');const key=c.state.activeEvos[0].instanceKey;
 c.match={initialStarters:['other'],lineup:['a']};c.progressEvolution('win');assert.equal(c.state.evoProgress[key].matches,0);
 c.match={initialStarters:['a'],lineup:['other']};for(let i=0;i<4;i++)c.progressEvolution('win');
 assert.equal(c.state.evoProgress[key].matches,2);assert.equal(c.state.evoProgress[key].ready,true);
 c.claimEvolutionStage(key);assert.equal(item.evo,3);assert.equal(c.state.activeEvos[0].stage,1);
 assert.equal(c.state.evoProgress[key].matches,0);c.claimEvolutionStage(key);assert.equal(item.evo,3);
 c.progressEvolution('loss');assert.equal(c.state.evoProgress[key].matches,1);assert.equal(c.state.evoProgress[key].wins,0);
});

test('stale claim keys cannot upgrade a different active evolution',()=>{
 const c=setup(),item=c.item('a');c.startEvolution('s1_low_vereinsprojekt','a');const key=c.state.activeEvos[0].instanceKey;
 c.state.evoProgress[key]={matches:2,wins:0,ready:true};c.claimEvolutionStage('cancelled-instance');
 assert.equal(item.evo,0);assert.equal(c.state.activeEvos[0].stage,0);
});

test('expiry releases its slot at the deadline and preserves already earned upgrades',()=>{
 const c=setup(),item=c.item('a');c.startEvolution('s1_low_vereinsprojekt','a');const row=c.state.activeEvos[0],key=row.instanceKey;
 c.state.evoProgress[key]={matches:2,wins:0,ready:true};c.claimEvolutionStage(key);assert.equal(item.evo,3);
 c.setNow(new Date(row.completionEnd).toISOString());assert.equal(c.expireActiveEvolutionIfNeeded(),true);
 assert.equal(c.activeEvolutionCount(),0);assert.equal(c.state.evoProgress[key],undefined);assert.equal(item.evo,3);
});

test('loading a legacy save releases an evolution whose player has already been consumed',()=>{
 const c=setup();c.item('missing');c.item('remaining');
 c.startEvolution('s1_low_vereinsprojekt','missing');c.startEvolution('s1_low_athletik','remaining','coins');
 const lostKey=c.state.activeEvos.find(e=>e.uid==='missing').instanceKey;
 c.state.club=c.state.club.filter(i=>i.uid!=='missing');c.migrateLegacyEvo();
 assert.equal(c.activeEvolutionCount(),1);assert.equal(c.state.activeEvos[0].uid,'remaining');
 assert.equal(c.state.evoProgress[lostKey],undefined);assert.equal(c.state.coins,40000);
});

test('every Evolution preview and claimed stage keeps the common design through serialization',()=>{
 const c=setup();const definitions=vm.runInContext('EVOLUTION_POOL',c);
 for(const evo of definitions){
  const item=c.item(evo.id,evo.req.positions?.[0]||'CM'),original=JSON.stringify(item);
  for(let stage=0;stage<evo.stages.length;stage++){
   const preview=c.evoPreviewItem(item,evo,stage);
   assert.equal(preview.evoDesign,true,`${evo.id} stage ${stage}`);assert.equal(JSON.stringify(item),original);
  }
  for(const stage of evo.stages)c.applyEvoStage(item,stage,evo);
  assert.equal(JSON.parse(JSON.stringify(item)).evoDesign,true,evo.id);
 }
 const capped=c.item('capped');capped.base.ovr=99;
 c.applyEvoStage(capped,{ovr:1,stats:{}},{maxFinalOvr:99});
 assert.equal(capped.evo,0);assert.equal(capped.evoDesign,true);
});


test('elite evolutions start at 82 GES and keep the player profile instead of uniform target stats',()=>{
 const c=setup(),elite=vm.runInContext('EVOLUTION_POOL.filter(e=>e.lane==="elite")',c);
 assert.ok(elite.length>=5);
 for(const evo of elite){assert.equal(evo.req.minOvr,82,evo.id);assert.equal(evo.statTargets,undefined,evo.id);assert.match(evo.band,/^82–8[45]$/)}
 const sturm=c.definition('s1_elite_sturm');
 assert.equal(c.evoEligible(c.item('low','ST',74),sturm),false);
 const fast=c.item('fast','ST',82),slow=c.item('slow','ST',82);fast.base.pac=90;slow.base.pac=70;
 const a=c.displayBase(c.evoPreviewItem(fast,sturm,2)),b=c.displayBase(c.evoPreviewItem(slow,sturm,2));
 assert.equal(a.ovr,88);assert.equal(b.ovr,88);
 assert.ok(a.pac-b.pac>=15,'pace difference survives the evolution');
});

test('stage upgrades follow the position: key stats grow with the rating, useless stats are skipped',()=>{
 const c=setup(),evo=c.definition('s1_low_vereinsprojekt');
 const st=c.item('st','ST',74),cb=c.item('cb','CB',74);
 const stEnd=c.displayBase(c.evoPreviewItem(st,evo,2)),cbEnd=c.displayBase(c.evoPreviewItem(cb,evo,2));
 assert.equal(stEnd.ovr,81);assert.equal(cbEnd.ovr,81);
 for(const k of ['sho','dri','pac'])assert.ok(stEnd[k]-st.base[k]>=7,`ST ${k} grows at least like the rating`);
 for(const k of ['def','phy'])assert.ok(cbEnd[k]-cb.base[k]>=7,`CB ${k} grows at least like the rating`);
 assert.equal(cbEnd.sho,cb.base.sho,'no shooting upgrades for centre backs');
 assert.equal(stEnd.def,st.base.def,'no defending upgrades for strikers');
});

test('paid season evolutions end with a PlayStyle+, free ones with a normal PlayStyle',()=>{
 const c=setup(),pool=vm.runInContext('EVOLUTION_POOL.filter(e=>String(e.group).startsWith("s1-"))',c);
 for(const evo of pool){
  const paid=Number(evo.cost.coins||0)+Number(evo.cost.points||0)>0,last=evo.stages[evo.stages.length-1];
  if(paid){assert.ok(last.playstylePlus,evo.id);assert.equal(last.playstyle,undefined,evo.id)}else assert.ok(last.playstyle&&!last.playstylePlus,evo.id);
 }
 const item=c.item('ps','ST',74),end=c.evoPreviewItem(item,c.definition('s1_low_athletik'),2);
 assert.deepEqual([...end.evoPlaystylesPlus],['Quick Step']);
});
