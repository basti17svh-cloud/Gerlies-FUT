const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.join(__dirname,'..'),html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const section=(a,b)=>html.slice(html.indexOf(a),html.indexOf(b,html.indexOf(a)));
const IDS=['ultimate','jumbo-rare','rare-mixed'];
function app(at){
 let now=Date.parse(at),sequence=0,seed=17;
 class Clock extends Date{constructor(...args){super(...(args.length?args:[now]))}static now(){return now}}
 const math=Object.create(Math);math.random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296};
 const players=JSON.parse(fs.readFileSync(path.join(root,'players-fallback.json'),'utf8'));
 for(const [quality,min] of [['silver',65],['bronze',45]])for(let i=0;i<20;i++)players.push({id:`fixture-${quality}-${i}`,ovr:min+i%10});
 const byId=new Map(players.map(p=>[String(p.id),p])),elements=new Map(),tabs=[{dataset:{storeTab:'classic'}},{dataset:{storeTab:'promo'}}];
 for(const tab of tabs){tab.classList={toggle(){}};tab.setAttribute=()=>{}}
 const get=id=>{if(!elements.has(id))elements.set(id,{innerHTML:'',textContent:'',addEventListener(_event,fn){if(id==='storeView')ctx.click=fn}});return elements.get(id)};
 const ctx={Date:Clock,Intl,Math:math,FOUNDER_PACK_ID:'founder',MARCO_FOUNDER_PACK_ID:'marco',PLAYERS:players,
  state:{coins:3000000,points:100000,packs:{},club:[]},pendingPack:[],founderRuleForPack:()=>null,
  makeLivePackItem:(b,tradeable)=>({uid:`test-${++sequence}`,pid:String(b.id),tradeable,rare:false}),
  displayBase:i=>byId.get(i.pid),isCardRare:(_b,i)=>i.rare,rarityOf:b=>b.ovr>=75?'gold':b.ovr>=65?'silver':'bronze',randomMidIconBase:()=>null,
  $:get,fmt:String,esc:String,currencyAmountHTML:(_c,n)=>String(n),document:{querySelectorAll:()=>tabs},
  updateStoreCountdown(){},save(){},renderWallet(){},toast:message=>ctx.message=message,openPack:(id,items)=>ctx.opened={id,items}
 };
 vm.createContext(ctx);vm.runInContext([
  fs.readFileSync(path.join(root,'footera-time.js'),'utf8'),
  html.match(/^function sbcDateKey\(d\).*$/m)[0],html.match(/^function hashNum\(v\).*$/m)[0],
  section('const PACKS=[','const TOTW_WEEK_1='),section('function weightedPlayer(','let storeTab='),
  'let storeTab="promo",storePromoKey="";',section('function generatePack(','let pendingResolved=')
 ].join('\n'),ctx);
 return{ctx,get,run:code=>vm.runInContext(code,ctx),clock:at=>now=Date.parse(at),buy:(id,currency='coins')=>ctx.click({target:{closest:s=>s==='[data-buy]'?{dataset:{buy:id,cur:currency}}:null}})};
}

test('exact Berlin release and expiry replace only the scheduled daily rotation',()=>{
 const a=app('2026-10-05T16:59:59Z'),ids=()=>Array.from(a.ctx.activePromoPacks(),p=>p.id);
 assert.ok(ids().every(id=>!IDS.includes(id)));
 a.clock('2026-10-05T17:00:00Z');assert.deepEqual(ids(),IDS);
 a.clock('2026-10-06T16:59:59Z');assert.deepEqual(ids(),IDS);
 a.clock('2026-10-06T17:00:00Z');assert.ok(ids().every(id=>!IDS.includes(id)));
 a.clock('2026-10-05T17:00:00Z');assert.deepEqual(Array.from(a.ctx.activeStorePacks(),p=>p.id),['bronze','silver','gold',...IDS]);
});

test('scheduled packs cannot be purchased early or after the shop window',()=>{
 const a=app('2026-10-05T16:59:59Z');
 for(const at of ['2026-10-05T16:59:59Z','2026-10-06T17:00:00Z']){
  a.clock(at);for(const id of IDS){a.buy(id);a.buy(id,'points')}
  assert.equal(a.ctx.state.coins,3000000);assert.equal(a.ctx.state.points,100000);assert.equal(a.ctx.opened,undefined);assert.equal(a.ctx.state.packLimits,undefined);
 }
});

test('all advertised players are generated, rare, unique and within their quality tiers',()=>{
 const a=app('2026-10-05T17:00:00Z');
 for(const [id,count,guarantee] of [['ultimate',30,84],['jumbo-rare',24,83],['rare-mixed',12,81]]){
  for(let n=0;n<12;n++){
   const items=a.ctx.generatePack(id,false);assert.equal(items.length,count);assert.equal(new Set(items.map(i=>i.pid)).size,count);assert.equal(new Set(items.map(i=>i.uid)).size,count);
   assert.ok(items.every(i=>i.rare&&i.tradeable===false));
   const bases=items.map(i=>a.ctx.PLAYERS.find(p=>String(p.id)===i.pid));assert.ok(bases.some(b=>b.ovr>=guarantee));
   if(id==='rare-mixed')assert.deepEqual([bases.filter(b=>b.ovr>=75).length,bases.filter(b=>b.ovr>=65&&b.ovr<=74).length,bases.filter(b=>b.ovr<=64).length],[4,4,4]);
   else assert.ok(bases.every(b=>b.ovr>=75));
  }
 }
});

test('Coins and Points share the ten-purchase limit; rejected purchases charge nothing',()=>{
 const a=app('2026-10-05T17:00:00Z');
 for(const [id,coins,points] of [['ultimate',125000,2500],['jumbo-rare',100000,2000],['rare-mixed',20000,300]]){
  const before={...a.ctx.state};
  for(let n=0;n<10;n++)a.buy(id,n%2?'points':'coins');
  assert.equal(a.ctx.state.coins,before.coins-5*coins);assert.equal(a.ctx.state.points,before.points-5*points);
  assert.equal(a.ctx.promoUsage(a.run(`PACKS.find(p=>p.id==='${id}')`)).remaining,0);
  const after={...a.ctx.state};a.buy(id);a.buy(id,'points');assert.equal(a.ctx.state.coins,after.coins);assert.equal(a.ctx.state.points,after.points);
 }
 a.clock('2026-10-06T17:00:00Z');assert.equal(a.ctx.promoUsage(a.run('PACKS.find(p=>p.id==="ultimate")')).remaining,10);
});

test('the shop announces the release before 19:00 and displays all three packs afterwards',()=>{
 const a=app('2026-10-05T16:59:59Z');a.ctx.renderStore();assert.match(a.get('storeContext').textContent,/Heute ab 19:00 Uhr: Ultimatives Pack/);assert.doesNotMatch(a.get('packGrid').innerHTML,/data-buy="ultimate"/);
 a.clock('2026-10-05T17:00:00Z');a.ctx.renderStore();assert.doesNotMatch(a.get('storeContext').textContent,/Heute ab/);
 const markup=a.get('packGrid').innerHTML;assert.equal((markup.match(/class="store-pack /g)||[]).length,3);
 for(const id of IDS){assert.match(markup,new RegExp(`data-buy="${id}" data-cur="coins"`));assert.match(markup,new RegExp(`data-buy="${id}" data-cur="points"`))}
 assert.match(markup,/30 selten/);assert.match(markup,/24 selten/);assert.match(markup,/12 selten/);
});

// The reduced fallback database has no silver/bronze cards: never charge for a partial pack.
test('an incomplete player pool cannot charge for fewer players than advertised',()=>{
 const a=app('2026-10-05T17:00:00Z');a.ctx.PLAYERS=a.ctx.PLAYERS.filter(p=>p.ovr>=75);
 const before={...a.ctx.state};a.buy('rare-mixed');a.buy('rare-mixed','points');
 assert.equal(a.ctx.state.coins,before.coins);assert.equal(a.ctx.state.points,before.points);assert.equal(a.ctx.opened,undefined);assert.equal(a.ctx.state.packLimits['rare-mixed'].count,0);
});
