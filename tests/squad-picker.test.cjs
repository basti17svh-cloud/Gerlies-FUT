const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
const code=html.slice(html.indexOf('let pickerFilterPosition='),html.indexOf('function playerPositions('))
 +html.slice(html.indexOf('function playerPositions('),html.indexOf('function detailChemHTML('));

function setup(){
 const players=[
  {uid:'a',pid:'a',tradeable:false,name:'Álvaro',position:'ST',ovr:84},
  {uid:'b',pid:'b',tradeable:true,name:'Béla',position:'CM',ovr:90},
  {uid:'c',pid:'c',tradeable:false,name:'César',position:'ST',ovr:79},
  {uid:'d',pid:'d',tradeable:true,name:'Dario',position:'ST',ovr:86}
 ];
 const state={club:players,squad:['a','b',...Array(21).fill(null)],roles:{0:'Striker',1:'Playmaker'},focus:{0:'Attack',1:'Balanced'}};
 const ctx={state,ensureSquadSlots:()=>{},currentFormation:()=>Array.from({length:11},(_,i)=>({p:i===0?'ST':'CM'})),
  displayBase:item=>item,itemRating:item=>item.ovr,posFit:(item,slot)=>item?.position===slot?1:0,
  positionLabel:x=>x,normalizeKey:x=>String(x||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase(),
  esc:x=>x};
 vm.createContext(ctx);vm.runInContext(code,ctx);
 return{ctx,state}
}

test('Vereinssuche sorts by position, filters name and rating, and can limit untradeable cards',()=>{
 const {ctx}=setup();vm.runInContext('pickerIndex=0',ctx);
 assert.deepEqual(Array.from(ctx.pickerCandidates().list,x=>x.uid),['d','c']);
 vm.runInContext('pickerSearchTerm="alvaro";pickerMinRating=80;pickerMaxRating=85',ctx);
 assert.deepEqual(Array.from(ctx.pickerCandidates().list,x=>x.uid),[]);
 vm.runInContext('pickerSearchTerm="";pickerMinRating=0;pickerMaxRating=99;pickerFilterPosition="ST";pickerOnlyUntradeable=true',ctx);
 assert.deepEqual(Array.from(ctx.pickerCandidates().list,x=>x.uid),['c']);
 vm.runInContext('pickerOnlyUntradeable=false;pickerFilterPosition="";pickerSortMode="rating-asc"',ctx);
 assert.deepEqual(Array.from(ctx.pickerCandidates().list,x=>x.uid),['c','d']);
});

test('cards from XI, bench and reserve are unavailable until moved out of the squad',()=>{
 const {ctx,state}=setup();state.squad[11]='c';state.squad[18]='d';
 vm.runInContext('pickerIndex=0',ctx);
 assert.deepEqual(Array.from(ctx.pickerCandidates().list,x=>x.uid),[]);
 assert.equal(ctx.removeSquadPlayer('c',11),true);
 assert.deepEqual(Array.from(ctx.pickerCandidates().list,x=>x.uid),['c']);
 assert.equal(ctx.removeSquadPlayer('d',18),true);
 assert.deepEqual(Array.from(ctx.pickerCandidates().list,x=>x.uid),['d','c']);
});

test('removing a starter keeps the club card and frees only its squad place',()=>{
 const {ctx,state}=setup();
 assert.equal(ctx.removeSquadPlayer('wrong',0),false);
 assert.equal(ctx.removeSquadPlayer('a',0),true);
 assert.equal(state.squad[0],null);
 assert.ok(state.club.some(item=>item.uid==='a'));
 vm.runInContext('pickerIndex=0',ctx);
 assert.ok(ctx.pickerCandidates().list.some(item=>item.uid==='a'));
 assert.equal(state.roles[0],undefined);assert.equal(state.focus[0],undefined);
 assert.equal(state.squad[1],'b');
 assert.equal(ctx.putItemIntoSlot('c',0),true);
 assert.equal(state.squad[0],'c');
 assert.equal(state.club.length,4);
});

test('choosing a card already in the squad swaps places without duplication',()=>{
 const {ctx,state}=setup();
 assert.equal(ctx.putItemIntoSlot('b',0),true);
 assert.deepEqual(state.squad.slice(0,2),['b','a']);
 assert.equal(new Set(state.squad.filter(Boolean)).size,2);
 assert.equal(ctx.putItemIntoSlot('missing',0),false);
 assert.equal(ctx.putItemIntoSlot('a',23),false);
 assert.equal(ctx.putItemIntoSlot('b',0),false);
});
