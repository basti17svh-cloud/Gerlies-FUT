const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
const code=html.slice(html.indexOf('function settleAuctions('),html.indexOf('function renderTransferWatch('))+'\n'+
 html.slice(html.indexOf('function buyMarketListing('),html.indexOf('function resetMarketFilters('));

function setup(){
 const math=Object.create(Math);math.random=()=>1;
 const base={id:'17',name:'Testspieler'},listing={base,price:850,bid:500,myBid:0,ends:Date.now()+60000};
 const ctx={Math:math,Date,PLAYERS:[base],P_BY_ID:new Map([['17',base]]),marketListings:[listing],
  state:{coins:1000,club:[],stats:{market:0},auctions:[]},
  ensureObjectiveWindows(){},listingToClubItem:x=>({pid:String(x.base.id)}),
  toast(){},save(){},updateObjectiveIndicators(){},renderWallet(){},renderAll(){},renderMarket(){},
  bidIncrement:()=>50,fmt:String,esc:String,auctionTime:()=>60,$:()=>({innerHTML:''})};
 vm.createContext(ctx);vm.runInContext(code,ctx);
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
