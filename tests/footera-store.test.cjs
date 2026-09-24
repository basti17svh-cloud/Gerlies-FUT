const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
const packDefinitions=html.slice(html.indexOf('const PACKS=['),html.indexOf('const TOTW_WEEK_1='));
const storeCode=html.slice(html.indexOf('function renderStore(){'),html.indexOf('let pendingResolved='));

function store(){
 const elements=new Map(),tabElements=[{dataset:{storeTab:'classic'}},{dataset:{storeTab:'promo'}}];
 for(const tab of tabElements){tab.classList={toggle(){}};tab.setAttribute=()=>{}}
 const get=id=>{
  if(!elements.has(id))elements.set(id,{innerHTML:'',textContent:'',addEventListener(_event,handler){ctx.click=handler}});
  return elements.get(id)
 };
 const ctx={
  state:{coins:3000,points:100,packs:{}},document:{querySelectorAll:()=>tabElements},
  $:get,fmt:String,esc:String,packCompositionText:p=>p.type,updateStoreCountdown:()=>{},
  nextPromoReset:()=>new Date(Date.now()+3600000),promoWindowKey:()=>'',promoUsage:()=>({remaining:10}),
  generatePack:()=>[{uid:'test'}],consumePromoPurchase:()=>true,
  renderWallet:()=>{},save:()=>{},toast:()=>{},
  openPack:(id,items)=>{ctx.opened={id,items}}
 };
 vm.createContext(ctx);
 vm.runInContext(`${packDefinitions}
  const STORE_PACK_ART={bronze:'bronze.webp',silver:'silber.webp',gold:'gold.webp'};
  let storeTab='classic';
  function activePromoPacks(){return PACKS.filter(p=>p.rotation).slice(0,3)}
  function activeStorePacks(){return [...PACKS.filter(p=>p.store&&!p.rotation),...activePromoPacks()]}
  ${storeCode}`,ctx);
 return{ctx,elements,get,run:code=>vm.runInContext(code,ctx)}
}

function buy(app,id,currency){
 app.ctx.click({target:{closest:selector=>selector==='[data-buy]'?{dataset:{buy:id,cur:currency}}:null}});
}

test('the two store tabs separate permanent packs from rotating promos',()=>{
 const app=store();
 app.run('renderStore()');
 const classic=app.get('packGrid').innerHTML;
 assert.equal((classic.match(/class="store-pack /g)||[]).length,3);
 assert.match(classic,/Bronze-Pack/);
 assert.match(classic,/Silber-Pack/);
 assert.match(classic,/Premium Gold Pack/);
 assert.match(classic,/data-buy="bronze" data-cur="coins"/);
 assert.doesNotMatch(classic,/data-buy="bronze" data-cur="points"/);
 assert.match(classic,/data-buy="silver" data-cur="points"/);
 assert.doesNotMatch(classic,/Vorschau|Pack anschauen/i);
 app.run('storeTab="promo";renderStore()');
 const promos=app.get('packGrid').innerHTML;
 assert.equal((promos.match(/class="store-pack /g)||[]).length,3);
 assert.doesNotMatch(promos,/data-buy="bronze"/);
 assert.match(promos,/Footera Points/);
});

test('bronze cannot be purchased with points; other currencies deduct their actual prices once',()=>{
 const app=store();
 app.run('renderStore()');
 buy(app,'bronze','points');
 assert.equal(app.ctx.state.points,100);
 assert.equal(app.ctx.opened,undefined);
 buy(app,'bronze','coins');
 assert.equal(app.ctx.state.coins,2250);
 assert.equal(app.ctx.opened.id,'bronze');
 assert.equal(app.ctx.opened.items.length,1);
 buy(app,'silver','points');
 assert.equal(app.ctx.state.points,50);
 assert.equal(app.ctx.opened.id,'silver');
});

test('a pack that cannot be generated leaves balances untouched',()=>{
 const app=store();
 app.run('renderStore()');
 app.ctx.generatePack=()=>[];
 buy(app,'bronze','coins');
 assert.equal(app.ctx.state.coins,3000);
 assert.equal(app.ctx.opened,undefined);
});
