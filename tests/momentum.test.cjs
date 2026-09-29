const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
const css=fs.readFileSync(path.join(__dirname,'../momentum-card.css'),'utf8');
function section(from,to){const a=html.indexOf(from),b=html.indexOf(to,a);assert.ok(a>=0&&b>a,from);return html.slice(a,b)}
function context(extra={}){
 const c={Date,Math,Map,Set,FOUNDER_PACK_ID:'founder-bastian',founderRuleForPack:()=>undefined,isFounderItem:()=>false,...extra};vm.createContext(c);
 vm.runInContext(section('const MOMENTUM_EVENT=','let eventSelectedId='),c);
 return c
}

test('Team 1: 14 distinct male FC27 IDs, exact ratings/positions and a keeper layout',()=>{
 const c=context();const players=vm.runInContext('MOMENTUM_EVENT.players',c);
 assert.equal(players.length,14);assert.equal(new Set(players.map(p=>p.pid)).size,14);
 assert.deepEqual(Array.from(players,p=>[p.ovr,p.position]),[[89,'ST'],[89,'RM'],[88,'RW'],[88,'CAM'],[88,'CB'],[88,'GK'],[87,'ST'],[87,'ST'],[87,'LW'],[86,'CM'],[86,'CAM'],[85,'CAM'],[85,'LB'],[84,'RW']]);
 assert.ok(players.every(p=>/^\d{6}$/.test(p.pid)&&p.ovr<=89&&p.stats.length===6&&p.stats.every(v=>v<95)));
 const keeper=players.find(p=>p.pid==='192119');assert.equal(keeper.position,'GK');
 vm.runInContext(section('function cardStatPairs(p){','function cardStatLongLabel('),c);
 assert.deepEqual(Array.from(c.cardStatPairs({position:'GK',pac:85,sho:87,pas:76,dri:89,def:46,phy:88}),p=>p[0]),['HEC','BSI','ABS','REF','TMP','POS']);
});

test('MOMENTUM owns its rating/stats without mutating the base item; window closes exactly',()=>{
 const db=new Map([['247827',{id:'247827',name:'M. Olise',ovr:90,position:'RM',alt:'RW,CAM',pac:83,sho:82,pas:89,dri:91,def:47,phy:69}],['230142',{id:'230142',name:'M. Oyarzabal',ovr:84,position:'ST',alt:'',pac:71,sho:86,pas:81,dri:84,def:45,phy:74}]]);
 const c=context({P_BY_ID:db,itemBase:i=>db.get(String(i.pid)),isBaseRare:()=>false,uid:()=> 'unique',rarityOf:()=> 'gold'});
 vm.runInContext(section('function itemRating(item){','function makeItem(')+section('function makeItem(','function portraitFallback('),c);
 const original={...db.get('247827')},item=c.makeMomentumItem(original,true),shown=c.displayBase(item);
 assert.equal(item.variant,'special');assert.equal(item.eventType,'momentum');assert.equal(item.eventName,'MOMENTUM');
 assert.equal(shown.name,'Michael Olise');assert.equal(shown.ovr,89);assert.equal(shown.dri,90);assert.equal(original.name,'M. Olise');assert.equal(original.ovr,90);assert.equal(original.dri,91);
 const winger=c.makeMomentumItem(db.get('230142'),true);assert.equal(c.displayBase(winger).position,'LW');assert.equal(c.displayBase(winger).alt,'ST');
 assert.equal(c.momentumIsActive(Date.parse('2026-09-27T00:00:00+02:00')),true);
 assert.equal(c.momentumIsActive(Date.parse('2026-10-11T19:00:00+02:00')),false);
 assert.ok(c.isMomentumItem(JSON.parse(JSON.stringify(item))));
});

test('board and walkout reveal choose the real lead item; regular modes stay regular',()=>{
 const c=context({pendingPack:[],itemRating:item=>item.rating,totwDisplayName:s=>s});
 vm.runInContext(section('function packIsSpecial(item){','function finishPack(){'),c);
 const board={pid:'204970',variant:'special',eventType:'momentum',eventName:'MOMENTUM',rating:84};
 const walkout={pid:'247827',variant:'special',eventName:'MOMENTUM',rating:89};
 const ordinary={pid:'ordinary',variant:'',rating:86};
 for(const [pack,expected] of [[[board],'board'],[[walkout],'walkout'],[[ordinary],'walkout']]){c.pendingPack=pack;assert.equal(c.packRevealPlan().mode,expected)}
 c.pendingPack=[ordinary,board];assert.equal(c.isMomentumItem(c.packRevealPlan().cards[0]),true);
 const code=section('async function runPackReveal(plan){','$("openPackBtn").addEventListener("click"');
 assert.match(code,/isMomentumItem\(plan\.cards\[0\]\)\?" theme-momentum"/);
 const source=fs.readFileSync(path.join(__dirname,'../service-worker.js'),'utf8');
 assert.match(source,/footera-v19-60-root-shell/);assert.match(source,/momentum-card\.css/);
 assert.match(css,/\.momentum-shell \.custom-card\.momentum/);
 assert.doesNotMatch(css,/momentum-master\.jpg/);
});

test('MOMENTUM changes the light theme only; board and walkout timings match ordinary pulls',async()=>{
 const script=section('async function runPackReveal(plan){','$("openPackBtn").addEventListener("click"');
 async function play(mode,momentum){
  const nodes=new Map();for(const id of ['opening','reveal','flash','openPackBtn','openStage','bigPack','boardIntro','walkoutTunnel']){
   const classes=new Set();nodes.set(id,{className:'',style:{},offsetWidth:1,querySelector:()=>null,classList:{add:x=>classes.add(x),remove:x=>classes.delete(x),contains:x=>classes.has(x)}});
  }
  const c=context({$:id=>nodes.get(id),sleep:ms=>{times.push(ms);return Promise.resolve()},displayBase:()=>({name:'Test',position:'ST'}),addPackFloorLights:()=>{},resetBoardIntro:()=>{},resetWalkoutTunnel:()=>{},showBoardCue:()=>{},showWalkoutClue:()=>{},showPackRevealCard:()=>true,spawnPackSparks:()=>{},spawnPackConfetti:()=>{},finishPack:()=>{}});
  const times=[];vm.runInContext(script,c);
  await c.runPackReveal({mode,cards:[{pid:momentum?mode==='board'?'204970':'241461':'none',variant:momentum?'special':'',eventName:momentum?'MOMENTUM':''}],label:mode==='walkout'?'WALKOUT':'',duration:mode==='board'?2350:5200});
  return {times,theme:nodes.get('opening').className.includes('theme-momentum')};
 }
 for(const mode of ['board','walkout']){
  const ordinary=await play(mode,false),special=await play(mode,true);
  assert.deepEqual(special.times,ordinary.times);
  assert.equal(ordinary.theme,false);assert.equal(special.theme,true);
  assert.equal(ordinary.times.length,mode==='board'?6:7);
 }
});

test('market offers use 14 fixed identities, target ratings and preserve event type on purchase',()=>{
 const c=context({totwInfo:()=>null,marketPriceForRating:r=>r*100,marketRoundPrice:n=>Math.round(n),activeTotwWeek:()=>null,MARKET_PRICE_CURVE:{},rarityOf:()=> 'gold',uid:()=> 'purchase',isBaseRare:()=>false,promoWindowKey:()=> 'test-window'});
 const players=vm.runInContext('MOMENTUM_EVENT.players',c);
 const bases=players.map(p=>({id:p.pid,name:p.name,fullName:p.name,ovr:p.baseOvr,position:p.position,team:p.team,league:'Test Liga',nation:p.nation}));
 c.P_BY_ID=new Map(bases.map(p=>[p.id,p]));
 vm.runInContext(section('function createMarketListing(base,filters,offerIndex=0){','const PLAYER_SEARCH_TEXT_CACHE=')+section('function marketSnapshotHash(v){','function marketSnapshotBases('),c);
 vm.runInContext(section('function listingRating(x){','function auctionTime('),c);
 vm.runInContext(section('function listingToClubItem(x,paidPrice=0){','function settleAuctions(){'),c);
 vm.runInContext(section('function makeItem(','function portraitFallback('),c);
 const offers=bases.map(base=>c.createMarketListing(base,{specialType:'momentum',quality:'special'}));
 assert.equal(new Set(offers.map(x=>x.base.id)).size,14);
 assert.ok(offers.every(x=>x.variant==='special'&&x.eventType==='momentum'&&x.eventName==='MOMENTUM'));
 const olise=offers.find(x=>x.base.id==='247827');assert.equal(c.listingRating(olise),89);assert.equal(olise.base.ovr,90);
 const bought=c.listingToClubItem(olise,olise.price);assert.equal(bought.pid,'247827');assert.equal(bought.eventType,'momentum');assert.equal(bought.purchasePrice,olise.price);
});

test('gold packs can hit MOMENTUM during the window; no new hits after expiry',()=>{
 const script=section('function makePromoPackItem(','const TASKS=')+section('function generatePack(id,tradeable=true){','function renderStore(){');
 function roll(at,type='gold'){
  class Clock extends Date{static now(){return at}}
  const fixedMath=Object.create(Math);fixedMath.random=()=>0;
  const base={id:'247827',ovr:89,position:'RM',name:'M. Olise'},bronze={id:'bronze',ovr:64,position:'ST',name:'Bronze'};
  const c=context({Date:Clock,Math:fixedMath,PACKS:[{id:'test',type,count:1,min:type==='gold'?75:0,max:type==='gold'?99:64}],PLAYERS:[base,bronze],weightedPlayer:()=>type==='bronze'?bronze:base,rarityOf:()=>type,isCardRare:()=>false,displayBase:()=>base,isActiveEventSbcBase:()=>false,activeTotwWeek:()=>null,totwInfo:()=>null,makeItem:(p,tradeable,opts={})=>({pid:p.id,tradeable,...opts})});
  c.activePromoPackEntry=p=>p.id===base.id&&at<Date.parse(vm.runInContext('MOMENTUM_EVENT.activeUntilAt',c))?{event:vm.runInContext('MOMENTUM_EVENT',c),info:{pid:p.id}}:null;
  vm.runInContext(script,c);return c.generatePack('test')[0];
 }
 const start=Date.parse('2026-09-27T12:00:00+02:00'),end=Date.parse('2026-10-02T19:00:00+02:00');
 assert.equal(roll(start).eventType,'momentum');
 assert.equal(roll(start,'bronze').eventType,undefined);
 assert.equal(roll(end).eventType,undefined);
});
