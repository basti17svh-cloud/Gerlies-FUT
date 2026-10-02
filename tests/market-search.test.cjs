const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
const searchCode=html.slice(html.indexOf('const MARKET_PAGE_SIZE='),html.indexOf('function marketSnapshotHash('))+'\n'+
 html.slice(html.indexOf('function marketListingMatchesFilters('),html.indexOf('function bidIncrement('))+'\n'+
 html.slice(html.indexOf('function renderMarket(){'),html.indexOf('function openMarketPlayerDetails('));
const now=Date.parse('2026-10-02T17:00:00Z');
const empty={name:'',league:'',club:'',nation:'',position:'',quality:'',specialType:'',ratingMin:0,ratingMax:99,priceMin:0,priceMax:0};

function setup(filters={}){
 const groups=[
  {ovr:63,quality:'bronze',position:'CB',nation:'England',league:'Premier League',team:'Club A'},
  {ovr:72,quality:'silver',position:'CM',nation:'Germany',league:'Bundesliga',team:'Club B'},
  {ovr:84,quality:'gold',position:'ST',nation:'France',league:'Ligue 1',team:'Club C'},
  {ovr:87,quality:'special',variant:'special',eventName:'Team of the Week 3',position:'ST',nation:'France',league:'Ligue 1',team:'Club C'},
  {ovr:90,quality:'special',variant:'icon-mid',name:'O. Kahn',fullName:'Oliver Kahn',position:'GK',nation:'Germany',league:'Icons',team:'Icons'},
  {ovr:87,quality:'special',variant:'special',eventType:'momentum',position:'CAM',nation:'France',league:'Ligue 1',team:'Club D'},
  {ovr:85,quality:'special',variant:'special',eventName:'Legacy Event',position:'LW',nation:'Spain',league:'LaLiga',team:'Club E'}
 ];
 const inventory=Array.from({length:350},(_,i)=>{const g=groups[Math.floor(i/50)];return{
  listingId:'offer-'+i,base:{...g,id:String(i),name:g.name||'Player '+i},variant:g.variant||'',eventName:g.eventName||'',eventType:g.eventType||'',
  price:(Math.floor(i/50)+1)*100000,ends:i%2?String(now+(350-i)*1000):now+(350-i)*1000
 }});
 inventory.push({...inventory[0],listingId:'expired',ends:now-1},{...inventory[0],listingId:'boundary',ends:now},
  {...inventory[0],listingId:'bought',ends:now+500,settled:true,bought:true});
 const elements={},clock=class extends Date{static now(){return now}};
 const ctx={Date:clock,inventory,marketListings:[],marketSection:'search',PLAYERS:[],
  filters:{...empty,...filters},marketFilters(){return this.filters},ensureMarketSnapshot(){},
  listingRating:x=>x.base.ovr,listingQuality:x=>x.base.quality,resolvedAffiliation:p=>p,
  playerSearchText:p=>(p.name+' '+(p.fullName||'')).toLowerCase(),
  positionPlusMatch:(p,pos,override)=>!pos||(override||p.position)===pos,
  isMomentumItem:x=>x.eventType==='momentum',isLegacyEventName:n=>n==='Legacy Event',
  $:id=>elements[id]??={innerHTML:'',hidden:false},fmt:String,
  processBotOutbids(){},settleAuctions(){},settleTransferSales(){},
  marketRowHTML:x=>x.listingId,queueMarketPortraitWarmup(){},renderMyAuctions(){},renderTransferWatch(){},renderTransferHubSummary(){},applyMarketSection(){}
 };
 vm.createContext(ctx);vm.runInContext(searchCode+'\nmarketInventory=inventory;',ctx);
 // Filter values are external UI state, so the stub must close over the context.
 ctx.marketFilters=()=>ctx.filters;
 const read=expr=>vm.runInContext(expr,ctx);
 return{ctx,inventory,elements,read,ids:()=>Array.from(read('marketAllListings'),x=>x.listingId),page:()=>Array.from(ctx.marketListings,x=>x.listingId)}
}
const expected=(...groups)=>groups.flatMap(g=>Array.from({length:50},(_,i)=>g*50+i)).sort((a,b)=>b-a).map(i=>'offer-'+i);

test('the globally earliest auction starts page one and page two continues the full 350-offer timeline',()=>{
 const{ctx,inventory,ids,page,read}=setup();const original=inventory.slice();ctx.refreshMarket();
 assert.deepEqual(ids(),expected(0,1,2,3,4,5,6));assert.deepEqual(page(),expected(0,1,2,3,4,5,6).slice(0,20));
 assert.equal(read('marketPageCount()'),18);ctx.applyMarketPage(2);
 assert.deepEqual(page(),expected(0,1,2,3,4,5,6).slice(20,40));assert.equal(read('marketPage'),2);
 assert.deepEqual(inventory,original,'search projection does not mutate auction inventory');
 assert.equal(inventory.find(x=>x.listingId==='boundary').settled,undefined,'expiry and settlement remain separate');
});

for(const [label,filter,groups] of [
 ['full name',{name:'oliver kahn'},[4]],['position',{position:'ST'},[2,3]],['nation',{nation:'France'},[2,3,5]],
 ['league',{league:'Ligue 1'},[2,3,5]],['club',{club:'Club C'},[2,3]],
 ['gold',{quality:'gold'},[2]],['silver',{quality:'silver'},[1]],['bronze',{quality:'bronze'},[0]],
 ['special',{quality:'special'},[3,4,5,6]],['TOTW',{specialType:'totw'},[3]],['Icons',{specialType:'icon'},[4]],
 ['MOMENTUM',{specialType:'momentum'},[5]],['Legacy',{specialType:'legacy'},[6]],['base',{specialType:'base'},[0,1,2]],
 ['price range',{priceMin:250000,priceMax:450000},[2,3]],['rating range',{ratingMin:84,ratingMax:87},[2,3,5,6]],
 ['combined',{position:'ST',nation:'France',league:'Ligue 1',club:'Club C',quality:'special',specialType:'totw',priceMax:400000},[3]]
])test(label+' preserves every matching active offer and sorts before pagination',()=>{
 const{ctx,ids,page}=setup(filter);ctx.refreshMarket();const all=expected(...groups);
 assert.deepEqual(ids(),all);assert.deepEqual(page(),all.slice(0,20));ctx.applyMarketPage(2);assert.deepEqual(page(),all.slice(20,40));
});

test('switching Special to All restores every active result in chronological order',()=>{
 const{ctx,ids}=setup({quality:'special'});ctx.refreshMarket();assert.deepEqual(ids(),expected(3,4,5,6));
 ctx.filters={...empty};ctx.refreshMarket();assert.deepEqual(ids(),expected(0,1,2,3,4,5,6));
});

test('expiry on an earlier page is removed from the whole result set and refills the current page',()=>{
 const{ctx,read,page}=setup();ctx.refreshMarket();ctx.applyMarketPage(2);
 const earliest=read('marketAllListings[0]');earliest.ends=now;ctx.renderMarket();
 assert.equal(read('marketAllListings.length'),349);assert.equal(read('marketPage'),2);
 assert.deepEqual(page(),expected(0,1,2,3,4,5,6).slice(21,41));
});

test('buying the last result clamps pagination without deleting auction history',()=>{
 const{ctx,inventory,read,page}=setup();ctx.refreshMarket();ctx.applyMarketPage(18);
 for(const x of inventory)if(Number(x.base.id)<10)x.settled=true;
 ctx.renderMarket();assert.equal(read('marketAllListings.length'),340);assert.equal(read('marketPage'),17);
 assert.deepEqual(page(),expected(0,1,2,3,4,5,6).slice(320,340));assert.equal(inventory.length,353);
});

test('price comparison still prioritises the cheapest buy-now rather than the earliest expiry',()=>{
 const offers=[{base:{id:'kahn'},price:1250000,ends:now+1000},{base:{id:'kahn'},price:950000,ends:now+90000},
  {base:{id:'kahn'},price:950000,ends:now+30000},{base:{id:'kahn'},price:100,settled:true}];
 const ctx={marketInventory:offers,state:{auctions:[offers[0]]},displayBase:x=>x.base,marketItemCardKey:x=>x.base.id,
  marketListingCardKey:x=>x.base.id};vm.createContext(ctx);
 vm.runInContext(html.slice(html.indexOf('function buildPriceComparison('),html.indexOf('function renderPriceComparison(')),ctx);
 assert.deepEqual(Array.from(ctx.buildPriceComparison({base:{id:'kahn'}}),x=>x.ends),[now+30000,now+90000,now+1000]);
});

test('remaining time ticks each second when price comparison is opened outside the market',()=>{
 let time=now,settlements=0;const label={dataset:{priceCompareTime:'0'},textContent:''};
 const ctx={Date:class extends Date{static now(){return time}},MARKET_BACKGROUND_TICK:now,marketAllListings:[],
  priceCompareListings:[{ends:now+3000}],document:{getElementById:id=>({classList:{contains:()=>id==='priceCompareModal'}}),querySelectorAll:()=>[label]},
  auctionTime:x=>Math.max(0,Math.ceil((x.ends-time)/1000)),processBotOutbids:()=>false,settleAuctions:()=>{settlements++;return false},settleTransferSales:()=>false};
 vm.createContext(ctx);vm.runInContext(html.slice(html.indexOf('function updateMarketCountdowns('),html.indexOf('setInterval(updateMarketCountdowns,')),ctx);
 ctx.updateMarketCountdowns();assert.equal(label.textContent,'3s');time+=1000;ctx.updateMarketCountdowns();assert.equal(label.textContent,'2s');
 time+=2000;ctx.updateMarketCountdowns();assert.equal(label.textContent,'Abgelaufen');
 assert.equal(settlements,0,'live labels keep the existing 15-second background settlement cadence');
 time=now+15000;ctx.updateMarketCountdowns();assert.equal(settlements,1);
 time+=1000;ctx.updateMarketCountdowns();assert.equal(settlements,1);
});
