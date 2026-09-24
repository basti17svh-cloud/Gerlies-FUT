const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
const stateCode=html.slice(html.indexOf('function baseState(){'),html.indexOf('function toast(t){'));
const club=Array.from({length:21},(_,i)=>({uid:`p${i}`,pid:`p${i}`}));
function app(saved=new Map()){
 const ctx={localStorage:{getItem:key=>saved.get(key)||null,setItem:(key,val)=>saved.set(key,val)},queueMicrotask};
 vm.createContext(ctx);vm.runInContext(`${stateCode}\nlet state=loadState()`,ctx);
 return{saved,ctx,state:vm.runInContext('state',ctx),read:code=>vm.runInContext(code,ctx)}
}

test('existing one-team saves migrate with their XI, bench, reserve, formation and roles',()=>{
 const old={version:120,club,squad:[...club.slice(0,19).map(x=>x.uid),...Array(4).fill(null)],formation:'4-4-2',roles:{0:'Keeper'},focus:{0:'Defend'}};
 const saved=new Map([['gerliesFutV9',JSON.stringify(old)]]),{state}=app(saved);
 assert.equal(state.activeSquadPreset,0);
 assert.equal(state.squadPresets.length,3);
 assert.equal(state.squadPresets[0].name,'Mein Team');
 assert.deepEqual(Array.from(state.squadPresets[0].squad),old.squad);
 assert.equal(state.squadPresets[0].formation,'4-4-2');
 assert.equal(state.squadPresets[0].roles[0],'Keeper');
 assert.equal(state.squadPresets[1],null);
 assert.equal(state.squadPresets[2],null);
});

test('new teams copy the active team once and later changes remain independent across reloads',async()=>{
 const old={club,squad:[...club.slice(0,18).map(x=>x.uid),...Array(5).fill(null)],formation:'4-3-3',roles:{0:'Sweeper Keeper'},focus:{0:'Balanced'}};
 const saved=new Map([['gerliesFutV9',JSON.stringify(old)]]),first=app(saved),s=first.state;
 assert.equal(first.read('activateSquadPreset(state,1)').created,true);
 assert.deepEqual(Array.from(s.squad.slice(0,18)),old.squad.slice(0,18));
 s.squad[0]='p18';s.squad[18]='p0';s.formation='4-2-3-1';s.roles[0]='Goalkeeper';s.focus[0]='Defend';
 s.squadPresets[1].name='Ziele';
 assert.equal(first.read('activateSquadPreset(state,0)').created,false);
 assert.equal(s.squad[0],'p0');assert.equal(s.squad[18],null);
 assert.equal(s.formation,'4-3-3');assert.equal(s.roles[0],'Sweeper Keeper');
 assert.equal(first.read('activateSquadPreset(state,1)').name,'Ziele');
 assert.equal(s.squad[0],'p18');assert.equal(s.squad[18],'p0');
 assert.equal(s.formation,'4-2-3-1');assert.equal(s.roles[0],'Goalkeeper');assert.equal(s.focus[0],'Defend');
 assert.equal(first.read('activateSquadPreset(state,2)').created,true);
 s.squad[2]=null;first.read('save()');await Promise.resolve();
 const recovered=app(saved).state;
 assert.equal(recovered.activeSquadPreset,2);
 assert.equal(recovered.squad[2],null);
 assert.equal(recovered.squadPresets[1].name,'Ziele');
 assert.equal(recovered.squadPresets[1].squad[2],'p2');
 assert.equal(recovered.squadPresets[0].squad[0],'p0');
 assert.equal(recovered.squadPresets[0].squad[18],null);
});

test('consumed cards are removed from every saved lineup and duplicate cards are never activated',()=>{
 const old={club,squad:['p0','p0','missing',...club.slice(1,17).map(x=>x.uid),...Array(4).fill(null)]};
 const instance=app(new Map([['gerliesFutV9',JSON.stringify(old)]])),s=instance.state;
 assert.equal(s.squad.length,23);
 assert.equal(s.squad[1],null);
 assert.equal(s.squad[2],null);
 instance.read('activateSquadPreset(state,1)');s.squad[0]='p18';s.squadPresets[1].name='Ziele';
 s.club=s.club.filter(x=>x.uid!=='p1'&&x.uid!=='p18');
 instance.read('persistActiveSquadPreset(state)');
 assert.equal(s.squad[0],null);
 assert.ok(s.squadPresets.every(p=>!p||!p.squad.includes('p1')&&!p.squad.includes('p18')));
 instance.read('activateSquadPreset(state,0)');
 assert.equal(s.squad[0],'p0');
 assert.ok(!s.squad.includes('p1'));
});
