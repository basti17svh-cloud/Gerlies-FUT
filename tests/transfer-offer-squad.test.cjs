const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const {pricingCode}=require('./helpers/item-pricing.cjs');
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
const offerCode=html.slice(html.indexOf('function openTransferOfferModal('),html.indexOf('function movePackItemToTransferList('));
const saleCode=html.slice(html.indexOf('function transferSalePlayerInSquad('),html.indexOf('function settleTransferSales('));
const priceCode=html.slice(html.indexOf('const MARKET_MAX_PRICE='),html.indexOf('// Futbin FC 27 snapshot'));

function setup(){
 const item={uid:'konate',tradeable:true};
 const main=Array(23).fill(null),second=Array(23).fill(null);
 main[0]='konate';main[1]='other';second[13]='konate';
 const state={club:[item,{uid:'other',tradeable:true}],squad:[...main],roles:{0:'Abwehr',1:'Spielmacher'},focus:{0:'Defensiv',1:'Frei'},
  squadPresets:[{name:'Main Team',squad:main,roles:{0:'Abwehr',1:'Spielmacher'},focus:{0:'Defensiv',1:'Frei'}},{name:'Zweites Team',squad:second,roles:{},focus:{}}],transferSales:[],transferList:[]};
 const elements={},prompts=[];let accept=false,renders=0;
 const math=Object.create(Math);math.random=()=>1;
 const ctx={state,Math:math,Date,confirm:msg=>{prompts.push(msg);return accept},$:(id)=>elements[id]??=( {innerHTML:'',textContent:''} ),
  displayBase:()=>({name:'I. Konaté'}),playerClubLabel:()=> 'Real Madrid',cardHTML:()=>'<card>',esc:String,transferSuggestedPrices:()=>({start:20000,buy:24500}),
  isFounderItem:()=>false,activeTransferSaleForUid:uid=>state.transferSales.find(s=>s.uid===uid&&s.status==='active'),
  fmt:String,renderAll:()=>{renders++},toast(){},showUiLayer(){}};
 vm.createContext(ctx);vm.runInContext(pricingCode+'\n'+priceCode+'\n'+offerCode+'\n'+saleCode,ctx);
 return{ctx,item,state,elements,prompts,approve:()=>{accept=true},renderCount:()=>renders}
}

test('a player in an active squad can open the market offer with a clear warning',()=>{
 const{ctx,item,elements}=setup();ctx.openTransferOfferModal(item);
 const body=elements.transferOfferBody.innerHTML;
 assert.match(body,/Beim Anbieten wird der Spieler aus allen gespeicherten Mannschaften entfernt/);
 assert.match(body,/<button id="directSellConfirm" class="primary" >Jetzt aktiv anbieten<\/button>/);
 assert.match(body,/id="directSellStart"[^>]*max="14999950"/);
 assert.match(body,/id="directSellBuy"[^>]*max="15000000"/);
});

test('invalid and over-limit sale prices leave every squad untouched without confirmation',()=>{
 for(const [start,buy] of [[20000,15000001],[15000000,15000000],[NaN,25000],[20000,Infinity],[-1,25000]]){
  const{ctx,state,prompts,approve,renderCount}=setup();approve();
  assert.equal(ctx.createTransferSale('konate',start,buy,3600),false);
  assert.equal(state.squad[0],'konate');assert.equal(state.squadPresets[1].squad[13],'konate');
  assert.equal(state.transferSales.length,0);assert.equal(prompts.length,0);assert.equal(renderCount(),0);
 }
});

test('the largest legal own sale keeps start below buy-now after price rounding',()=>{
 const{ctx,state,approve}=setup();approve();
 assert.equal(ctx.createTransferSale('konate',14999950,15000000,3600),true);
 assert.equal(state.transferSales[0].startPrice,14999950);assert.equal(state.transferSales[0].buyNow,15000000);
 assert.ok(state.transferSales[0].plannedPrice<=15000000);
});

test('cancel keeps all squads; confirmed listing clears every team and refreshes the view',()=>{
 const{ctx,state,prompts,approve,renderCount}=setup();
 assert.equal(ctx.createTransferSale('konate',20000,24500,3600),false);
 assert.equal(state.squad[0],'konate');assert.equal(state.squadPresets[1].squad[13],'konate');
 assert.equal(state.transferSales.length,0);assert.equal(renderCount(),0);
 approve();assert.equal(ctx.createTransferSale('konate',20000,24500,3600),true);
 assert.equal(prompts.at(-1).includes('Main Team, Zweites Team'),true);
 assert.equal(state.squad[0],null);assert.equal(state.squadPresets[0].squad[0],null);
 assert.equal(state.squadPresets[1].squad[13],null);assert.equal(state.squad[1],'other');
 assert.equal(state.roles[0],undefined);assert.equal(state.focus[0],undefined);
 assert.equal(state.roles[1],'Spielmacher');assert.equal(state.focus[1],'Frei');
 assert.equal(state.club[0].uid,'konate');assert.equal(state.transferSales[0].status,'active');
 assert.equal(renderCount(),1);assert.equal(ctx.createTransferSale('konate',20000,24500,3600),false);
 assert.equal(state.transferSales.length,1);
});
