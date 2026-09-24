const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
const formCode=html.slice(html.indexOf('const FORMATIONS='),html.indexOf('const ROLE_OPTIONS='));
const starterCode=html.slice(html.indexOf('function buildStarter('),html.indexOf('function prepareOnboarding('));
const lineupCode=html.slice(html.indexOf('function posFit('),html.indexOf('$("formationSelect").addEventListener('));

function setup(){
 const ctx={leaguePool:()=>ctx.pool,displayBase:item=>ctx.byId.get(item.pid),itemRating:item=>ctx.byId.get(item.pid)?.ovr||0,pool:[]};
 vm.createContext(ctx);vm.runInContext([formCode,starterCode,lineupCode].join('\n'),ctx);
 return ctx
}

function makePool(){
 const positions={gold:['ST','CM','RW','LW','CAM','GK'],silver:['GK','GK','GK','CB','CM','LW','RB','ST'],
  bronze:['LB','CB','RB','CM','LW','RW','ST','CDM','CB','LM','RM','GK','CM','CB','ST','LW']};
 return Object.entries(positions).flatMap(([tier,list])=>list.map((pos,i)=>({id:`${tier}-${i}`,name:`${tier} ${pos} ${i}`,
  position:pos,alt:'',ovr:tier==='gold'?80-i:tier==='silver'?74-i:64-i})))
}

test('starter set uses three gold, four silver and eleven bronze with a playable XI',()=>{
 const ctx=setup();ctx.pool=makePool();
 const picked=ctx.buildStarter('bundesliga');
 assert.equal(picked.length,18);
 assert.deepEqual([picked.filter(p=>p.ovr>=75).length,picked.filter(p=>p.ovr>=65&&p.ovr<75).length,picked.filter(p=>p.ovr<65).length],[3,4,11]);
 const items=picked.map(p=>({uid:p.id,pid:p.id}));ctx.byId=new Map(picked.map(p=>[p.id,p]));
 const squad=ctx.arrangeSquad(items,'4-3-3');
 const slots=vm.runInContext('FORMATIONS["4-3-3"].map(x=>x.p)',ctx);
 assert.equal(squad.length,23);
 assert.equal(squad.slice(0,11).filter(Boolean).length,11);
 assert.equal(new Set(squad.filter(Boolean)).size,18);
 assert.ok(squad.slice(0,11).every((uid,i)=>ctx.posFit(ctx.byId.get(uid),slots[i])),JSON.stringify(squad.slice(0,11)));
 assert.equal(ctx.byId.get(squad[0]).position,'GK');
});

test('auto lineup adapts to formations and short clubs without losing cards',()=>{
 const ctx=setup();ctx.pool=makePool();const picked=ctx.buildStarter('bundesliga');
 ctx.byId=new Map(picked.map(p=>[p.id,p]));const items=picked.map(p=>({uid:p.id,pid:p.id}));
 for(const formation of ['4-3-3','4-4-2','4-2-3-1']){
  const squad=ctx.arrangeSquad(items,formation);
  assert.equal(squad.length,23);
  assert.equal(new Set(squad.filter(Boolean)).size,18);
  assert.equal(squad.slice(0,11).filter(Boolean).length,11)
 }
 const short=ctx.arrangeSquad(items.slice(0,5),'4-3-3');
 assert.equal(short.length,23);
 assert.equal(new Set(short.filter(Boolean)).size,5);
 assert.equal(short.slice(0,11).filter(Boolean).length,5);
});
