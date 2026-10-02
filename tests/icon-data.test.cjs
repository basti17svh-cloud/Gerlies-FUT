const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
const between=(start,end)=>html.slice(html.indexOf(start),html.indexOf(end));
function setup(){
 const ctx={MOMENTUM_BY_ID:new Map(),P_BY_ID:new Map(),FOUNDER_PLAYER_ID:'founder-a',FOUNDER_BASE:{},MARCO_FOUNDER_PLAYER_ID:'founder-b',MARCO_FOUNDER_BASE:{},LIVE_TOTW_BASE_CACHE:new Map(),
  ICON_PORTRAIT_CACHE:{},isWholeCardAsset:()=>false,futwizFaceCandidates:id=>[`https://cdn.futwiz.com/assets/img/fc27/faces/${id}.png`],
  sofifaFaceCandidates:()=>[],fifaRostersFaceCandidates:()=>[],marketSnapshotHash:()=>100,promoWindowKey:()=>'',totwInfo:()=>null};
 vm.createContext(ctx);
 vm.runInContext([
  html.match(/^function normalizeKey\(v\).*$/m)[0],
  html.match(/^const MARKET_PRICE_CURVE=.*$/m)[0],
  between('const MID_ICON_DATA=','function randomMidIconBase()'),
  between('function restoreSyntheticPlayerIds()','function bestEaTotwAsset('),
  between('function marketPlayStyleCount(','function marketPreviewItem('),
  between('function portraitCandidates(','const API_SPORTS_LEAGUE_IDS='),
  html.match(/^function iconPortraitUrl\(p\).*$/m)[0],
  html.match(/^function iconPortraitKey\(name\).*$/m)[0],
  between('function createMarketListing(','const PLAYER_SEARCH_TEXT_CACHE='),
  between('function transferSuggestedPrices(','function transferSaleItem(')
 ].join('\n'),ctx);
 ctx.displayBase=item=>ctx.P_BY_ID.get(item.pid);
 ctx.itemRating=item=>ctx.P_BY_ID.get(item.pid)?.ovr||0;
 return{ctx,api:vm.runInContext('({MID_ICON_BASES,ICON_LEGACY_ALIASES,ICON_PRICE_ANCHORS,MARKET_MAX_PRICE,restoreSyntheticPlayerIds,marketPriceForRating,marketRoundPrice,portraitCandidates,createMarketListing,transferSuggestedPrices})',ctx)};
}
const stats=p=>[p.pac,p.sho,p.pas,p.dri,p.def,p.phy];

test('FC 27 Icons have distinct real face stats and usable portrait candidates',()=>{
 const{api}=setup(),rows=api.MID_ICON_BASES,byName=name=>rows.find(p=>p.name===name);
 assert.equal(rows.length,136);
 assert.equal(new Set(rows.map(p=>p.id)).size,rows.length);
 assert.deepEqual(Array.from(stats(byName('Patrick Vieira'))),[82,78,80,83,88,90]);
 assert.deepEqual(Array.from(stats(byName('Gennaro Gattuso'))),[76,62,69,72,88,88]);
 assert.deepEqual(Array.from(stats(byName('Gianluigi Buffon'))),[95,88,79,94,51,90]);
 for(const p of rows){
  assert.ok(stats(p).every(v=>Number.isInteger(v)&&v>=0&&v<=99),p.name);
  assert.match(p.face,new RegExp(`/27-${p.futwizId}\\.`),p.name);
  assert.equal(api.portraitCandidates(p)[0],p.face,p.name);
  assert.ok(api.portraitCandidates(p).length>=2,p.name);
 }
});

test('old acquired Icons keep working through changed names and the retired Kluivert card',()=>{
 const{ctx,api}=setup();api.restoreSyntheticPlayerIds();
 for(const [id,name] of Object.entries(api.ICON_LEGACY_ALIASES)){
  assert.equal(ctx.P_BY_ID.get(id)?.name,name,id);
  assert.equal(ctx.P_BY_ID.get(id)?.id,id);
 }
 assert.equal(ctx.P_BY_ID.get('midicon-patrick-kluivert')?.source,'retired-icon-save');
 assert.ok(!api.MID_ICON_BASES.some(p=>p.name==='Patrick Kluivert'));
});

test('all 136 Icons have individual stable Futbin guides, including expensive 88-rated cards',()=>{
 const{api}=setup();api.restoreSyntheticPlayerIds();
 const byName=name=>api.MID_ICON_BASES.find(p=>p.name===name),guide=p=>api.marketPriceForRating(p.ovr,true,p);
 const vieira=byName('Patrick Vieira'),gattuso=byName('Gennaro Gattuso');
 assert.equal(Object.keys(api.ICON_PRICE_ANCHORS).length,136);
 for(const p of api.MID_ICON_BASES){
  const key=p.name.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim().replace(/\s+/g,'-');
  assert.ok(Object.hasOwn(api.ICON_PRICE_ANCHORS,key),p.name);
  assert.ok(guide(p)>0&&guide(p)<=api.MARKET_MAX_PRICE,p.name);
  assert.equal(guide(p),guide(p),p.name);
 }
 assert.equal(guide(vieira),2040000);
 assert.equal(guide(gattuso),259000);
 assert.equal(guide(byName('Franck Ribéry')),1110000);
 assert.equal(guide(byName('Ronaldo')),13400000);
 assert.ok(guide(byName('Gareth Bale'))>10*guide(gattuso));
 const listing=api.createMarketListing(vieira,{specialType:'icon'});
 assert.equal(listing.variant,'icon-mid');
 assert.equal(listing.eventName,'Icon');
 assert.ok(listing.price>=guide(vieira)*.88&&listing.price<=guide(vieira)*1.14);
 assert.ok(api.createMarketListing(gattuso,{specialType:'icon'}).price<300000);
 assert.equal(api.transferSuggestedPrices({pid:vieira.id,variant:'icon-mid'}).buy,guide(vieira));
 assert.equal(api.transferSuggestedPrices({pid:gattuso.id,variant:'icon-mid'}).buy,guide(gattuso));
});

test('meta and special multipliers and offer spreads cannot exceed 15 million',()=>{
 const{ctx,api}=setup();
 ctx.marketMetaFactor=()=>10.5;ctx.marketMetaPercentile=()=>1;
 assert.equal(api.marketPriceForRating(99,true,{ovr:99}),15000000);
 assert.equal(api.marketRoundPrice(15000999),15000000);
 assert.equal(api.marketRoundPrice(Infinity),15000000);
 assert.equal(api.marketRoundPrice(NaN),150);
 const ronaldo=api.MID_ICON_BASES.find(p=>p.name==='Ronaldo');
 ctx.marketSnapshotHash=()=>259;
 const offer=api.createMarketListing(ronaldo,{specialType:'icon'});
 assert.equal(offer.price,15000000);
 assert.ok(offer.startPrice<=15000000&&offer.bid<=15000000);
 assert.ok(api.transferSuggestedPrices({pid:ronaldo.id,variant:'icon-mid'}).buy<=15000000);
});
