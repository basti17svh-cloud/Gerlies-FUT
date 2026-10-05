const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const {evolutionCode}=require('./helpers/item-pricing.cjs');
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
const stateCode=html.match(/^const SQUAD_FORMATION_NAMES=.*;$/m)[0]+'\n'+html.slice(html.indexOf('function defaultClubIdentity(){'),html.indexOf('function toast(t){'));
const duplicateCode=html.slice(html.indexOf('function packItemKey('),html.indexOf('function openPackPlayerDetails('));
const resultCode=html.slice(html.indexOf('function closeResolvedPackResults('),html.indexOf('function clubFilterItems('));
const specialCode=html.slice(html.indexOf('function packIsSpecial('),html.indexOf('function packIsWalkout('));
const card=(uid,pid,rating=60,tradeable=true,extra={})=>({uid,pid,rating,tradeable,...extra});

function app(initial={},saved=new Map()){
 if(!saved.has('gerliesFutV9'))saved.set('gerliesFutV9',JSON.stringify({coins:1000,club:[],pendingPack:[],pendingResolved:[],...initial}));
 const elements=new Map(),prompts=[],el=id=>{
  if(!elements.has(id))elements.set(id,{style:{},handlers:{},classList:{classes:new Set(['active']),add(c){this.classes.add(c)},remove(c){this.classes.delete(c)}},addEventListener(type,fn){this.handlers[type]=fn}});
  return elements.get(id)
 };
 const ctx={
  localStorage:{getItem:key=>saved.get(key)||null,setItem:(key,value)=>saved.set(key,value)},
  setTimeout:()=>1,clearTimeout(){},window:{addEventListener(){}},document:{addEventListener(){}},
  migrateLegacyEventState:x=>x,newFooteraSaveId:()=> 'GF-TEST',
  $:el,isFounderItem:item=>!!item?.founder,isCardRare:()=>false,
  displayBase:item=>({name:item.pid,ovr:item.rating}),itemRating:item=>item.rating,
  cardHTML:player=>`<div>${player.name}</div>`,fmt:String,esc:String,
  tradeableClubTwinForPackItem:()=>null,renderAll(){},toast(){},approve:true,
  confirm(message){prompts.push(message);return ctx.approve}
 };
 vm.createContext(ctx);
 vm.runInContext(`${stateCode}\nlet state=loadState(),pendingPack=state.pendingPack,pendingResolved=new Set(state.pendingResolved);\n${evolutionCode}\n${duplicateCode}\n${specialCode}\n${resultCode}`,ctx);
 const read=expression=>vm.runInContext(expression,ctx);
 el('results');read('renderPackResults();flushSave()');
 return{ctx,elements,prompts,saved,read,json:expression=>JSON.parse(read(`JSON.stringify(${expression})`)),click:id=>elements.get(id).handlers.click(),persist:()=>read('flushSave()')}
}

test('all remaining new cards can be sold together, with exact quick-sell values',()=>{
 const pack=[card('bronze','A'),card('gold','B',80),card('totw','C',86,true,{variant:'special',eventName:'Team of the Week 1'})];
 const game=app({pendingPack:pack});
 assert.equal(game.elements.get('resultQuickSellDuplicates').style.display,'none');
 assert.equal(game.elements.get('resultQuickSellAll').disabled,false);
 assert.match(game.elements.get('resultQuickSellAll').textContent,/Alles schnellverkaufen.*9575 Coins/);
 assert.equal(game.click('resultQuickSellAll'),true);
 assert.equal(game.read('state.coins'),10575);
 assert.match(game.prompts[0],/alle 3 verbleibenden Pack-Karten.*9575 Coins/);
 assert.deepEqual(game.json('state.club'),[]);
 assert.deepEqual(game.json('state.pendingPack'),[]);
 assert.deepEqual(game.json('state.pendingResolved'),[]);
 assert.equal(game.elements.get('results').classList.classes.has('active'),false);
});

test('bulk sale skips distributed cards and preserves club, squad and SBC storage',()=>{
 const kept=card('kept','A',90),owned=card('owned','B',80),stored=card('stored','E',85,false);
 const game=app({club:[kept,owned],squad:['kept'],sbcStorage:[stored],pendingPack:[kept,card('dup','B',80),card('new','C',75),card('untradeable','D',90,false)],pendingResolved:[0]});
 assert.equal(game.click('resultQuickSellAll'),true);
 assert.equal(game.read('state.coins'),1750);
 assert.deepEqual(game.json('state.club'),[kept,owned]);
 assert.equal(game.read('state.squad[0]'),'kept');
 assert.deepEqual(game.json('state.sbcStorage'),[stored]);
 assert.match(game.prompts[0],/alle 3 verbleibenden Pack-Karten/);
 assert.match(game.prompts[0],/1 untauschbare Karten werden für 0 Coins/);
});

test('duplicate-only sale detects club, SBC and repeated pack cards while retaining new cards',()=>{
 const game=app({club:[card('owned','B',75)],sbcStorage:[card('stored','C',65,false)],pendingPack:[card('new-a','A'),card('dup-b','B',75),card('dup-c','C',65,false),card('new-d','D',65),card('dup-d','D',65)]});
 assert.match(game.elements.get('resultQuickSellDuplicates').textContent,/400 Coins/);
 assert.match(game.elements.get('resultQuickSellAll').textContent,/625 Coins/);
 assert.equal(game.click('resultQuickSellDuplicates'),true);
 assert.equal(game.read('state.coins'),1400);
 assert.deepEqual(game.json('[...pendingResolved]'),[1,2,4]);
 assert.match(game.elements.get('resultGrid').innerHTML,/data-result-item="0"/);
 assert.match(game.elements.get('resultGrid').innerHTML,/data-result-item="3"/);
 assert.doesNotMatch(game.elements.get('resultGrid').innerHTML,/data-result-item="1"/);
 assert.equal(game.elements.get('resultQuickSellDuplicates').style.display,'none');
 assert.match(game.elements.get('resultQuickSellAll').textContent,/225 Coins/);
 assert.equal(game.click('resultQuickSellAll'),true);
 assert.equal(game.read('state.coins'),1625);
});

test('canceling bulk confirmation leaves coins and every pack card unchanged',()=>{
 const game=app({pendingPack:[card('new','A',85),card('untradeable','B',90,false)]});
 const before=game.json('state');game.ctx.approve=false;
 assert.equal(game.click('resultQuickSellAll'),false);
 assert.deepEqual(game.json('state'),before);
 assert.deepEqual(game.json('[...pendingResolved]'),[]);
 assert.equal(game.elements.get('results').classList.classes.has('active'),true);
});

test('an entirely untradeable pack is discarded for zero coins',()=>{
 const game=app({pendingPack:[card('icon','A',95,false),card('totw','B',86,false,{variant:'special',eventName:'Team of the Week 1'})]});
 assert.equal(game.elements.get('resultQuickSellAll').textContent,'Alles abstoßen');
 assert.equal(game.click('resultQuickSellAll'),true);
 assert.equal(game.read('state.coins'),1000);
 assert.match(game.prompts[0],/2 untauschbare Karten werden für 0 Coins/);
 assert.deepEqual(game.json('state.pendingPack'),[]);
});

test('bulk quick sell never resolves or sells a protected Founder card',()=>{
 const founder=card('founder','Founder',99,false,{founder:true});
 const game=app({pendingPack:[founder,card('normal','A',75)]});
 assert.equal(game.click('resultQuickSellAll'),true);
 assert.equal(game.read('state.coins'),1250);
 assert.equal(game.read('pendingResolved.has(0)'),false);
 assert.equal(game.read('pendingResolved.has(1)'),true);
 assert.equal(game.elements.get('resultQuickSellAll').style.display,'none');
 assert.equal(game.click('resultQuickSellAll'),false);
 assert.equal(game.read('state.coins'),1250);
});

test('bulk sale persists once and cannot credit coins again after double click or reload',()=>{
 const saved=new Map(),game=app({pendingPack:[card('a','A',90),card('b','B',85)]},saved);
 assert.equal(game.click('resultQuickSellAll'),true);
 assert.equal(game.click('resultQuickSellAll'),false);
 assert.equal(game.prompts.length,1);
 game.persist();
 const reloaded=app({},saved);
 assert.equal(reloaded.read('state.coins'),8000);
 assert.deepEqual(reloaded.json('pendingPack'),[]);
 assert.equal(reloaded.click('resultQuickSellAll'),false);
 assert.equal(reloaded.read('state.coins'),8000);
});

test('a partially sold pack restores its remaining batch and correct total after reload',()=>{
 const saved=new Map(),game=app({club:[card('owned','B',75)],pendingPack:[card('new','A',80),card('dup','B',75)]},saved);
 game.click('resultQuickSellDuplicates');game.persist();
 const reloaded=app({},saved);
 assert.equal(reloaded.read('state.coins'),1250);
 assert.deepEqual(reloaded.json('[...pendingResolved]'),[1]);
 assert.match(reloaded.elements.get('resultQuickSellAll').textContent,/500 Coins/);
 assert.equal(reloaded.click('resultQuickSellAll'),true);
 reloaded.persist();
 const complete=app({},saved);
 assert.equal(complete.read('state.coins'),1750);
 assert.deepEqual(complete.json('pendingPack'),[]);
});
