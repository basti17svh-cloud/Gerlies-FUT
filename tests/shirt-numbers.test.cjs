const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'..');
function sandbox(){
 const players=[{uid:'gk',position:'GK',name:'Torwart'},{uid:'st',position:'ST',name:'Stürmer'},{uid:'cm',position:'CM',name:'Mittelfeld'},{uid:'cb',position:'CB',name:'Verteidiger'}];
 const state={club:players,squad:['gk','st','cm','cb',...Array(19).fill(null)],shirtNumbers:{}};
 let saves=0;
 const context={state,window:{},document:{getElementById:()=>null},renderSquad(){},startMatch(){context.match={lineup:[...state.squad]};},match:null,save(){saves++},displayBase:item=>item,squadItems:()=>state.squad.map(id=>players.find(p=>p.uid===id)||null),currentFormation:()=>[{p:'GK'},{p:'ST'},{p:'CM'},{p:'CB'}],console};
 vm.createContext(context);
 vm.runInContext(fs.readFileSync(path.join(root,'squad-numbers.js'),'utf8'),context);
 return {context,state,api:context.window.FooteraShirtNumbers,saves:()=>saves};
}
test('V21.85: default club numbers are valid and unique in the active squad',()=>{
 const {state,api}=sandbox();assert.ok(api);
 api.ensure();const nums=state.squad.filter(Boolean).map(uid=>api.get(uid));
 assert.equal(nums.length,new Set(nums).size);assert.ok(nums.every(n=>n>=1&&n<=99));assert.equal(api.get('gk'),1);
});
test('V21.85: requested occupied number swaps with prior owner, without duplicates',()=>{
 const {api,state,saves}=sandbox();api.ensure();
 const keeper=api.get('gk'),striker=api.get('st');
 assert.equal(api.assign('st',keeper).ok,true);
 assert.equal(api.get('st'),keeper);assert.equal(api.get('gk'),striker);
 assert.equal(api.assign('st',100).ok,false);assert.ok(saves()>0);
 assert.equal(new Set(state.squad.filter(Boolean).map(id=>api.get(id))).size,4);
});
test('V21.85: shirt numbers follow UIDs when team slots or presets change',()=>{
 const {api,state}=sandbox();api.ensure();
 const original=api.get('st');state.squad[1]='cm';state.squad[2]='st';api.ensure();
 assert.equal(api.get('st'),original);
 state.squad=['st','gk','cm','cb',...Array(19).fill(null)];api.ensure();
 assert.equal(api.get('st'),original);
});
test('V21.85: kickoff freezes the jersey-number map for the match',()=>{
 const {api,context}=sandbox();api.ensure();context.startMatch();
 const before=context.match.shirtNumbers.st;api.assign('st',38);
 assert.equal(context.match.shirtNumbers.st,before);assert.equal(api.get('st'),38);
});
test('V21.85: renderer receives immutable presentation numbers without simulation edits',()=>{
 const H=require('../3d-highlights.js');
 const shirtNumbers=Array.from({length:16},(_,i)=>i+2);
 const queue=new H.Queue({play:()=>Promise.resolve('played')});
 assert.equal(queue.enqueue({id:'numbers',type:'goal',team:'home',minute:32,shirtNumbers,keeperShirtNumber:1}),true);
 shirtNumbers[0]=90;
 assert.equal(queue.items[0].shirtNumbers[0],2);
 assert.equal(Object.isFrozen(queue.items[0].shirtNumbers),true);
 assert.equal(queue.items[0].keeperShirtNumber,1);
 const scene=fs.readFileSync(path.join(root,'3d-highlights-scene.mjs'),'utf8');
 assert.match(scene,/event\.shirtNumbers/);
 assert.match(scene,/lowKitAtlas\(kit,shirtNumber\)/);
});
