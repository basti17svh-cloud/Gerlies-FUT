const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const {pricingCode}=require('./helpers/item-pricing.cjs');
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
const code=html.slice(html.indexOf('const MARKET_MAX_PRICE='),html.indexOf('// Futbin FC 27 snapshot'))+'\n'+
 html.slice(html.indexOf('function bidIncrement('),html.indexOf('function listingToClubItem('))+'\n'+
 html.slice(html.indexOf('function settleAuctions('),html.indexOf('function renderTransferWatch('))+'\n'+
 html.slice(html.indexOf('function buyMarketObject('),html.indexOf('function resetMarketFilters('));

function setup(){
 const math=Object.create(Math);math.random=()=>1;
 const base={id:'17',name:'Testspieler'},listing={base,price:850,bid:500,myBid:0,ends:Date.now()+60000};
 const ctx={isFounderItem:()=>false,Math:math,Date,PLAYERS:[base],P_BY_ID:new Map([['17',base]]),marketListings:[listing],
  state:{coins:1000,club:[],stats:{market:0},auctions:[]},
  ensureObjectiveWindows(){},listingToClubItem:x=>({pid:String(x.base.id)}),
  toast(){},save(){},updateObjectiveIndicators(){},renderWallet(){},renderAll(){},renderMarket(){},
  bidIncrement:()=>50,fmt:String,esc:String,auctionTime:()=>60,$:()=>({innerHTML:''})};
 vm.createContext(ctx);vm.runInContext(pricingCode+'\n'+code,ctx);
 return{ctx,listing}
}

test('an overbid is refunded even after filters change or the page reloads',()=>{
 const{ctx,listing}=setup();
 assert.equal(ctx.bidMarketListing(0),true);
 assert.equal(ctx.state.coins,450);
 assert.equal(ctx.state.auctions.length,1);
 ctx.marketListings=[];
 ctx.state=JSON.parse(JSON.stringify(ctx.state));
 ctx.state.auctions[0].bid=650;
 ctx.state.auctions[0].ends=Date.now()-1;
 assert.equal(ctx.settleAuctions(),true);
 assert.equal(ctx.state.coins,1000);
 assert.equal(ctx.state.club.length,0);
 assert.equal(ctx.state.auctions[0].refunded,true);
 assert.equal(ctx.settleAuctions(),false);
 assert.equal(ctx.state.coins,1000);
 assert.equal(listing.myBid,550);
});

test('the last valid bid is capped at 15 million and cannot be raised again by player or bot',()=>{
 const{ctx,listing}=setup();ctx.state.coins=50000000;listing.price=15000000;listing.bid=14999950;
 assert.equal(ctx.bidMarketObject(listing),true);
 assert.equal(listing.bid,15000000);assert.equal(ctx.state.coins,35000000);
 assert.equal(ctx.bidMarketObject(listing),false);assert.equal(ctx.state.coins,35000000);
 listing.botOutbidAt=Date.now()-1;
 assert.equal(ctx.processBotOutbids(),true);
 assert.equal(listing.refunded,false);assert.equal(ctx.state.coins,35000000);assert.equal(listing.bid,15000000);
 listing.ends=Date.now()-1;ctx.settleAuctions();assert.equal(ctx.state.club.length,1);
});

test('invalid or over-limit purchases never debit coins or award a player',()=>{
 for(const price of [15000001,NaN,Infinity,-1]){
  const{ctx,listing}=setup();ctx.state.coins=50000000;listing.price=price;
  assert.equal(ctx.buyMarketObject(listing),false);assert.equal(ctx.bidMarketObject(listing),false);
  assert.equal(ctx.state.coins,50000000);assert.equal(ctx.state.club.length,0);assert.equal(ctx.state.auctions.length,0);
 }
});

test('an existing over-limit bid is refunded once while active legacy prices are capped',()=>{
 const{ctx,listing}=setup();Object.assign(listing,{price:25000000,startPrice:20000000,bid:21000000,myBid:20000000});
 ctx.state.auctions=[listing];
 assert.equal(ctx.settleAuctions(),true);assert.equal(ctx.state.coins,20001000);assert.equal(listing.myBid,0);
 assert.equal(listing.price,15000000);assert.equal(listing.startPrice,15000000);assert.equal(listing.bid,15000000);
 assert.equal(ctx.settleAuctions(),false);assert.equal(ctx.state.coins,20001000);assert.equal(ctx.state.club.length,0);
});

test('active legacy sales cannot credit more than 15 million when they settle',()=>{
 const{ctx}=setup();ctx.displayBase=()=>({name:'Testspieler'});
 ctx.state.transferSales=[{uid:'old',status:'active',item:{uid:'old'},startPrice:18000000,buyNow:22000000,plannedPrice:21000000,currentBid:18000000,saleAt:Date.now()-1}];
 assert.equal(ctx.settleTransferSales(),true);
 assert.equal(ctx.state.transferSales[0].soldPrice,15000000);assert.equal(ctx.state.coins,15001000);
 assert.equal(ctx.settleTransferSales(),false);assert.equal(ctx.state.coins,15001000);
});

test('winning a persistent auction grants one card and charges the reserved bid once',()=>{
 const{ctx}=setup();ctx.bidMarketListing(0);
 ctx.marketListings=[];
 ctx.state.auctions[0].ends=Date.now()-1;
 assert.equal(ctx.settleAuctions(),true);
 assert.equal(ctx.state.club.length,1);
 assert.equal(ctx.state.coins,450);
 assert.equal(ctx.state.stats.market,1);
 assert.equal(ctx.settleAuctions(),false);
 assert.equal(ctx.state.club.length,1);
});

test('instant purchase credits the existing deposit before charging the full price',()=>{
 const{ctx}=setup();ctx.bidMarketListing(0);
 assert.equal(ctx.buyMarketListing(0),true);
 assert.equal(ctx.state.coins,150);
 assert.equal(ctx.state.club.length,1);
 assert.equal(ctx.state.stats.market,1);
 assert.equal(ctx.state.auctions[0].settled,true);
 assert.equal(ctx.buyMarketListing(0),false);
});
