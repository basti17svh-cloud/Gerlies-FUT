const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm');
const html=require('./helpers/app-html.cjs')();
const between=(a,b)=>html.slice(html.indexOf(a),html.indexOf(b));
function setup(at='2026-10-31T18:59:59+01:00'){
 let now=Date.parse(at);
 const ctx={Date:class extends Date{static now(){return now}},console,PLAYERS:[],
  normalizeKey:x=>String(x||'').toLowerCase(),iconSlug:x=>String(x||'').toLowerCase(),
  SPECIAL_MARKET_MIN:10000,SPECIAL_START_MIN:10000,totwInfo:()=>null,
  MOMENTUM_BY_ID:new Map(),promoWindowKey:()=> 'window',marketSnapshotHash:()=>12345,
  isSpecialPricedItem:i=>i.variant==='special',isLegacyEventName:()=>false,
  activeTotwWeek:()=>null,activeMomentumEvent:()=>null,marketPromoReleases:()=>[],
  state:{auctions:[]},marketInventory:[],marketFilters:()=>({})};
 vm.createContext(ctx);
 vm.runInContext([
  between('const HALLOWEEN_EVENT=','// SBC-only card;'),
  between('const MARKET_PRICE_CURVE=','function marketPreviewItem('),
  between('function halloweenUpgradeFor(','function displayBase('),
  between('function createMarketListing(','const PLAYER_SEARCH_TEXT_CACHE='),
  between('function transferSuggestedPrices(','function transferSaleItem('),
  between('function marketSnapshotCoreKey(','function marketBaseMatchesCore('),
  between('function marketListingCardKey(','let priceCompareListings='),
  between('function buildPriceComparison(','function renderPriceComparison('),
  'globalThis.event=HALLOWEEN_EVENT;'
 ].join('\n'),ctx);
 ctx.marketPromoEntry=(release,base)=>({event:ctx.event,info:ctx.event.players.find(p=>p.pid===base.id)});
 ctx.displayBase=i=>({...i.base,id:i.pid||i.base?.id});
 ctx.itemRating=i=>i.displayRating+Number(ctx.halloweenUpgradeFor(i)?.ovr||0);
 const base=p=>({id:p.pid,name:p.name,ovr:p.baseOvr,position:p.position,pac:p.stats[0],sho:p.stats[1],pas:p.stats[2],dri:p.stats[3],def:p.stats[4],phy:p.stats[5]});
 return{ctx,base,setTime:t=>now=Date.parse(t)};
}
test('all 18 Team 1 cards have elevated prices; offers and sale suggestions agree before and after upgrade',()=>{
 const {ctx,base,setTime}=setup();
 const expected=[350000,35000,350000,25000,28000,80000,40000,60000,250000,75000,35000,55000,2500000,650000,450000,220000,45000,180000];
 for(const upgraded of [false,true]){
  if(upgraded)setTime('2026-10-31T19:00:00+01:00');
  ctx.event.players.forEach((p,index)=>{
   const b=base(p),row=ctx.createMarketListing(b,{specialType:'event',eventReleaseId:ctx.event.id},0);
   const item={...row,pid:p.pid};
   const guide=ctx.transferSuggestedPrices(item).buy;
   assert.equal(guide,ctx.marketRoundPrice(expected[index]*(upgraded?1.15:1)),p.name);
   assert.ok(row.price>=guide*.958&&row.price<=guide*1.042,p.name+' offer spread');
   assert.ok(ctx.transferSuggestedPrices(item).start<guide);
   ctx.marketInventory=[row];const offers=ctx.buildPriceComparison(item);
   assert.equal(offers.length,1);assert.equal(offers[0].price,row.price);
  });
 }
});
test('same player gold, TOTW, legacy, cosmetic and Team 2 cards do not receive the Team 1 anchor',()=>{
 const {ctx,base}=setup(),b=base(ctx.event.players.find(p=>p.pid==='158023'));
 for(const item of [{variant:'',cosmeticDesign:'halloween'},{variant:'special',eventType:'totw'},
  {variant:'special',eventType:'halloween',eventReleaseId:'halloween-2026-team2'},
  {variant:'special',eventType:'legacy',eventReleaseId:'halloween-2026'}]){
  const special=item.variant==='special',kind=item.eventType==='totw'?'totw':'special';
  assert.equal(ctx.marketPriceForRating(91,special,b,kind,item),ctx.marketPriceForRating(91,special,b,kind));
 }
});
test('open market snapshot changes at the upgrade boundary without changing active bids',()=>{
 const {ctx,setTime}=setup(),f={};const bid={price:308000,myBid:250000};ctx.state.auctions=[bid];
 const before=ctx.marketSnapshotCoreKey(f);setTime('2026-10-31T19:00:00+01:00');
 assert.notEqual(ctx.marketSnapshotCoreKey(f),before);assert.deepEqual(bid,{price:308000,myBid:250000});
});
