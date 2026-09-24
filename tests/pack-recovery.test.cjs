const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
const stateCode=html.slice(html.indexOf('function baseState(){'),html.indexOf('function toast(t){'));
const packCode=html.slice(html.indexOf('let pendingResolved='),html.indexOf('function packIsSpecial('));
const resultCode=html.match(/^function renderPackResults\(\)\{.*$/m)?.[0];
const finishCode=html.slice(html.indexOf('function finishPack(){'),html.indexOf('function packFxLayer('));

function app(saved=new Map()){
 const elements=new Map(),el=id=>{
  if(!elements.has(id))elements.set(id,{style:{},classList:{classes:new Set(),add(c){this.classes.add(c)},remove(c){this.classes.delete(c)}},querySelector:()=>null});
  return elements.get(id)
 };
 const ctx={
  localStorage:{getItem:key=>saved.get(key)||null,setItem:(key,val)=>saved.set(key,val)},queueMicrotask,
  generatePack:()=>[{uid:'pack-1',pid:'1',tradeable:true},{uid:'pack-2',pid:'2',tradeable:true}],
  ensureObjectiveWindows:()=>{},updateObjectiveIndicators:()=>{},PACKS:[{id:'gold',name:'Gold Pack'}],
  $:el,packDuplicateMap:()=>new Map([[0,false],[1,false]]),displayBase:item=>({name:`Spieler ${item.pid}`,ovr:75}),
  cardHTML:()=>'<div>Karte</div>',quickSell:()=>100,fmt:String,esc:String,saveCalled:0,
 };
 vm.createContext(ctx);
 vm.runInContext(`${stateCode}\nlet state=loadState(),pendingPack=state.pendingPack;\n${packCode}\n${resultCode}\n${finishCode}`,ctx);
 return{ctx,elements,saved,read:expr=>vm.runInContext(expr,ctx)}
}

test('an unopened pack survives reload and returns as distributable cards',async()=>{
 const saved=new Map(),first=app(saved);
 first.read('openPack("gold")');await Promise.resolve();
 assert.equal(JSON.parse(saved.get('gerliesFutV9')).pendingPack.length,2);
 const recovered=app(saved);
 assert.equal(recovered.read('pendingPack.length'),2);
 recovered.read('finishPack()');await Promise.resolve();
 assert.equal(recovered.elements.get('results').classList.classes.has('active'),true);
 assert.match(recovered.elements.get('resultGrid').innerHTML,/Spieler 1/);
 assert.match(recovered.elements.get('resultGrid').innerHTML,/Spieler 2/);
 assert.equal(recovered.elements.get('resultDone').disabled,true);
});

test('partially distributed pack restores only unresolved actions after reload',async()=>{
 const saved=new Map(),first=app(saved);
 first.read('openPack("gold");pendingResolved.add(0);renderPackResults()');await Promise.resolve();
 assert.deepEqual(JSON.parse(saved.get('gerliesFutV9')).pendingResolved,[0]);
 const recovered=app(saved);recovered.read('finishPack()');
 const markup=recovered.elements.get('resultGrid').innerHTML;
 assert.match(markup,/data-result-item="0"/);
 assert.match(markup,/data-result-item="1"/);
 assert.equal((markup.match(/In den Club schicken/g)||[]).length,1);
 assert.equal(recovered.read('pendingResolved.has(0)'),true);
 assert.equal(recovered.elements.get('resultDone').disabled,true);
});
