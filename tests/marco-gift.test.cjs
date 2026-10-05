const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
const section=(from,to)=>{
 const a=html.indexOf(from),b=html.indexOf(to,a);
 assert.ok(a>=0&&b>a,from);return html.slice(a,b)
};
const OWNER='GF-7D87D08A06104571',PACK='marco-premium-goldplayers-20260930',CLAIM='marco_premium_goldplayers_20260930';
function app({owner=OWNER,seed=1,saved=null,at='2026-09-30T14:00:00Z'}={}){
 let nextUid=0,randomSeed=seed;
 const randomMath=Object.create(Math);randomMath.random=()=>{randomSeed=(Math.imul(randomSeed,1664525)+1013904223)>>>0;return randomSeed/4294967296};
 const now=Date.parse(at);class Clock extends Date{constructor(...args){super(...(args.length?args:[now]))}static now(){return now}}
 const elements=new Map(),storage=new Map(),tabs=[{dataset:{storeTab:'classic'}},{dataset:{storeTab:'promo'}}];
 for(const tab of tabs){tab.classList={toggle(){}};tab.setAttribute=()=>{}}
 const get=id=>{
  if(!elements.has(id))elements.set(id,{innerHTML:'',textContent:'',style:{},classList:{add(){},remove(){}},addEventListener(_event,fn){if(id==='storeView')ctx.click=fn}});
  return elements.get(id)
 };
 const players=Array.from({length:48},(_,i)=>({id:String(100000+i),name:`Spieler ${i}`,ovr:75+i%13,position:'ST',alt:'',nation:'Germany',team:'FC Test',league:'Bundesliga',pac:70,sho:70,pas:70,dri:70,def:70,phy:70}));
 players.push({id:'247827',name:'M. Olise',ovr:90,position:'RM',alt:'RW,CAM',nation:'France',team:'Bayern München',league:'Bundesliga',pac:83,sho:82,pas:89,dri:91,def:47,phy:69});
 const state=saved?JSON.parse(saved):{profile:{saveId:owner},packs:{goldplayers:2},directClaims:{basti_86plus_20260925:{claimedAt:1}},club:[],rewardPackQueue:[],pendingPack:[],pendingResolved:[],stats:{packs:0},coins:500000,points:500};
 const ctx={Date:Clock,Math:randomMath,Map,Set,state,pendingPack:state.pendingPack,PLAYERS:players,P_BY_ID:new Map(players.map(p=>[p.id,p])),
  eventPackIsActive:(e,at)=>at>=Date.parse(e.activeFrom)&&at<Date.parse(e.activeUntilAt),uid:()=>`item-${++nextUid}`,rarityOf:()=> 'gold',isActiveEventSbcBase:()=>false,activePromoPackEntry:()=>null,activeTotwWeek:()=>null,totwInfo:()=>null,
  $:get,window:{addEventListener(){}},document:{querySelectorAll:()=>tabs,addEventListener(){}},esc:String,fmt:String,currencyAmountHTML:(_currency,value)=>String(value),packCompositionText:p=>`${p.count} Goldspieler`,
  nextPromoReset:()=>new Clock(now+3600000),promoWindowKey:()=>'',promoUsage:()=>({remaining:10}),updateStoreCountdown:()=>{},
  activePromoPacks:()=>vm.runInContext('PACKS.filter(p=>p.rotation).slice(0,3)',ctx),activeStorePacks:()=>vm.runInContext('PACKS.filter(p=>p.store)',ctx),
  consumePromoPurchase:()=>true,renderWallet(){},toast:message=>ctx.lastToast=message,
  ensureObjectiveWindows(){},updateObjectiveIndicators(){},resetBoardIntro(){},resetWalkoutTunnel(){},persistActiveSquadPreset(){},
  setTimeout:()=>1,clearTimeout(){},localStorage:{setItem:(key,value)=>storage.set(key,value)},console
 };
 vm.createContext(ctx);
 vm.runInContext([
  section('const FOUNDER_SAVE_ID=','let PLAYERS='),
  section('const PACKS=[','const TOTW_WEEK_1='),
  html.match(/^function normalizeKey\(v\).*$/m)[0],
  section('const MID_ICON_DATA=','function totwSearchKeys('),
  section('function totwSearchKeys(','function totwAliases('),
  section('const MOMENTUM_EVENT=','let eventSelectedId='),
  section('function parseRareValue(','function isStoryItem('),
  section('function itemBase(','function storyBase('),
  section('function makeLivePackItem(','const TASKS='),
  section('function weightedPlayer(','function promoWindowKey('),
  section('const STORE_PACK_ART=','let storeTab='),
  'let storeTab="classic",storePromoKey="";',
  section('function generatePack(','let pendingResolved='),
  'let pendingResolved=new Set(state.pendingResolved);',
  section('function openPack(','function finishPack(){'),
  section('let saveQueued=false','function toast(t){'),
  section('const DIRECT_REWARDS=','const PROMO_CODES='),
  'for(const icon of MID_ICON_BASES)P_BY_ID.set(icon.id,icon);'
 ].join('\n'),ctx);
 return{ctx,get,storage,run:expr=>vm.runInContext(expr,ctx),open:id=>ctx.click({target:{closest:selector=>selector==='[data-owned]'?{dataset:{owned:id}}:null}})}
}

test('only Marcos fixed profile gets this gift once, including after reload',()=>{
 for(const owner of ['GF-OTHER','GF-9AE6CDDEFE8A458D']){
  const foreign=app({owner});assert.equal(foreign.run(`grantDirectRewards().some(reward=>reward.id==='${CLAIM}')`),false);assert.equal(foreign.ctx.state.packs[PACK],undefined)
 }
 const first=app();assert.equal(first.run('grantDirectRewards().length'),1);assert.equal(first.ctx.state.packs[PACK],1);
 assert.equal(first.run('grantDirectRewards().length'),0);
 const saved=first.storage.get('gerliesFutV9');assert.ok(saved);
 const recovered=app({saved});assert.equal(recovered.run('grantDirectRewards().length'),0);assert.equal(recovered.ctx.state.packs[PACK],1);
 assert.equal(recovered.ctx.state.packs.goldplayers,2);assert.equal(recovered.ctx.state.coins,500000);assert.equal(recovered.ctx.state.points,500)
});

test('gift contains Henry and Matthäus Icons, Momentum Olise and nine random, tradeable cards',()=>{
 const draws=new Set();
 for(let seed=1;seed<=25;seed++){
  const a=app({seed});a.run('grantDirectRewards()');
  const items=a.run(`generatePack('${PACK}',false)`);assert.equal(items.length,12);assert.ok(items.every(item=>item.tradeable===true));
  assert.equal(new Set(items.map(item=>item.uid)).size,12);assert.equal(new Set(items.map(item=>item.pid)).size,12);
  assert.deepEqual(Array.from(items.slice(0,3),item=>a.ctx.P_BY_ID.get(item.pid).name),['Thierry Henry','Lothar Matthäus','M. Olise']);
  assert.deepEqual(Array.from(items.slice(0,3),item=>item.variant),['icon-mid','icon-mid','special']);
  const olise=items[2];assert.equal(olise.pid,'247827');assert.equal(olise.eventType,'momentum');assert.equal(olise.eventName,'MOMENTUM');assert.equal(olise.displayRating,89);
  assert.deepEqual(Array.from(olise.eventStats),[83,81,89,90,47,69]);
  assert.ok(items.slice(3).every(item=>a.ctx.PLAYERS.some(p=>p.id===item.pid&&p.ovr>=75)&&!['247827',items[0].pid,items[1].pid].includes(item.pid)));
  draws.add(items.slice(3).map(item=>item.pid).join(','));
  assert.equal(a.ctx.P_BY_ID.get('247827').ovr,90);assert.equal(a.ctx.P_BY_ID.get('247827').dri,91)
 }
 assert.ok(draws.size>20,'the other nine cards must vary between draws')
});

test('normal Premium Goldspieler packs use their regular generator on both accounts',()=>{
 for(const owner of [OWNER,'GF-OTHER']){
  const a=app({owner});a.run('grantDirectRewards()');const items=a.run('generatePack("goldplayers")');
  assert.equal(items.length,12);assert.ok(items.every(item=>a.ctx.PLAYERS.some(p=>p.id===item.pid)));
  assert.ok(items.some(item=>a.ctx.P_BY_ID.get(item.pid).ovr>=82));assert.ok(items.filter(item=>item.rare).length>=3);
  assert.equal(a.ctx.state.packs.goldplayers,2)
 }
});

test('the account-only pack has normal labels and art, without any spoiler or public purchase',()=>{
 const a=app();a.run('grantDirectRewards();renderStore()');
 const owned=a.get('ownedPacks').innerHTML;assert.match(owned,/Premium Goldspieler-Pack/);assert.match(owned,/12 Goldspieler · 3 selten · mind. 1× 82\+/);
 assert.doesNotMatch(owned,/Henry|Matth|Olise|Überraschung|garantierte Icon/i);
 assert.equal(a.run(`packArtSrc('${PACK}')`),a.run('packArtSrc("goldplayers")'));
 assert.doesNotMatch(a.get('packGrid').innerHTML,new RegExp(PACK));
 a.ctx.state.profile.saveId='GF-OTHER';a.run('renderStore()');assert.doesNotMatch(a.get('ownedPacks').innerHTML,new RegExp(PACK));
 assert.equal(a.run(`generatePack('${PACK}').length`),0)
});

test('opening persists all twelve cards and the consumed pack atomically; reload cannot grant it again',()=>{
 const a=app();a.run('grantDirectRewards()');a.open(PACK);
 assert.equal(a.ctx.state.packs[PACK],0);assert.equal(a.ctx.state.pendingPack.length,12);assert.equal(a.ctx.state.stats.packs,1);
 const persisted=a.storage.get('gerliesFutV9'),snapshot=JSON.parse(persisted);
 assert.equal(snapshot.packs[PACK],0);assert.equal(snapshot.pendingPack.length,12);assert.ok(snapshot.directClaims[CLAIM]);
 assert.ok(snapshot.pendingPack.every(item=>item.tradeable));
 const recovered=app({saved:persisted});assert.equal(recovered.run('grantDirectRewards().length'),0);assert.equal(recovered.run(`generatePack('${PACK}').length`),0);
 assert.equal(recovered.ctx.pendingPack.length,12);assert.equal(recovered.ctx.state.packs.goldplayers,2);
 a.open(PACK);assert.equal(a.ctx.state.stats.packs,1)
});

test('missing fixed players or too few random cards leave the pack unopened',()=>{
 for(const missing of ['olise','henry','random']){
  const a=app();a.run('grantDirectRewards()');
  if(missing==='olise')a.ctx.P_BY_ID.delete('247827');
  if(missing==='henry')a.run('MID_ICON_BASES.splice(MID_ICON_BASES.findIndex(p=>p.futwizId==="1625"),1)');
  if(missing==='random')a.ctx.PLAYERS=a.ctx.PLAYERS.slice(0,8);
  a.open(PACK);assert.equal(a.ctx.state.packs[PACK],1);assert.equal(a.ctx.state.pendingPack.length,0);assert.equal(a.ctx.state.stats.packs,0)
 }
});

test('the promised Momentum card remains guaranteed after the event window has closed',()=>{
 const a=app({at:'2026-10-10T12:00:00Z'});assert.equal(a.run('momentumIsActive()'),false);a.run('grantDirectRewards()');
 const items=a.run(`generatePack('${PACK}')`);assert.equal(items.length,12);assert.equal(items[2].eventType,'momentum');assert.equal(items[2].displayRating,89)
});

test('the gift uses the existing double-walkout and ordinary distribution flow',()=>{
 const a=app();a.run('grantDirectRewards()');a.open(PACK);
 const plan=a.run('packRevealPlan()');assert.equal(plan.mode,'double');
 assert.deepEqual(Array.from(plan.cards,item=>a.ctx.P_BY_ID.get(item.pid).name),['Thierry Henry','Lothar Matthäus']);
 assert.equal(a.get('bigPackName').textContent,'Premium Goldspieler-Pack');assert.equal(a.ctx.state.pendingPack.length,12)
});
