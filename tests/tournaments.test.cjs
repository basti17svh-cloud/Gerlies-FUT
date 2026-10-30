const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..');
function setup(){
 const state={profile:{saveId:'club'},club:Array.from({length:18},(_,i)=>({uid:'p'+i,pid:''+i,rating:60})),squad:Array.from({length:18},(_,i)=>'p'+i),coins:100,packs:{}};
 const ctx={state,window:{},document:{addEventListener(){},getElementById(){return null}},itemRating:i=>i?.rating,save(){},flushSave(){},renderAll(){},Date,fmt:String,esc:String};vm.createContext(ctx);vm.runInContext(fs.readFileSync(path.join(root,'footera-time.js'),'utf8'),ctx);vm.runInContext(fs.readFileSync(path.join(root,'tournaments.js'),'utf8'),ctx);return {state,ctx,api:ctx.window.FooteraTournaments};
}
const at=Date.parse('2026-10-30T10:00:00+01:00');
function play(t,stage,result='win',id='m'+stage,extra={}){
 const w=t.api.week(at),p=t.api.progress('bronze',w.key),kickoffAt=at+stage*10000;
 const ctx={id:'bronze',saveId:'club',week:w.key,attempt:p.attempt,stage,kickoffAt,roster:t.state.club.map(i=>({uid:i.uid,rating:i.rating})),...extra};
 return t.api.record({mode:'tournament',finished:true,resultId:id,tournament:ctx},result,kickoffAt+1000);
}
test('Bronze and silver rules cover all eighteen places, duplicates and current ratings',()=>{
 const t=setup();assert.equal(t.api.rosterReason('bronze'),'');assert.match(t.api.rosterReason('silver'),/Silber/);
 t.state.club[17].rating=75;assert.match(t.api.rosterReason('bronze'),/Bronze/);
 t.state.club[17].rating=64;assert.equal(t.api.rosterReason('bronze'),'');
 t.state.squad[17]='p0';assert.match(t.api.rosterReason('bronze'),/einmal/);
 t.state.squad.pop();assert.match(t.api.rosterReason('bronze'),/18/);
});
test('loss restarts quarterfinal, cannot reuse old preview or result, and never removes a previously earned prize',()=>{
 const t=setup();assert.equal(play(t,1),true);assert.equal(play(t,1),false);assert.equal(play(t,3),false);assert.equal(play(t,2,'loss'),true);
 assert.equal(t.api.progress('bronze',t.api.week(at).key).wins.length,0);
 assert.equal(play(t,1,'win','stale',{attempt:0}),false);
 for(let i=1;i<=3;i++)assert.equal(play(t,i,'win','new'+i),true);
 const p=t.api.progress('bronze',t.api.week(at).key);assert.equal(p.titles,1);assert.equal(p.earned.length,3);
});
test('foreign club, unfinished, future and invalid roster results do not qualify',()=>{
 for(const extra of [{saveId:'other'},{week:'2026-11-05'},{roster:[]},{roster:Array(18).fill({uid:'x',rating:60})}]){const t=setup();assert.equal(play(t,1,'win','x',extra),false)}
 const t=setup();assert.equal(play(t,1,'draw'),false);
});
test('weekly rewards double packs and picks, leave coins unchanged, and replay does not deliver twice',()=>{
 const t=setup();for(const [id,coins,pack]of [['bronze',7500,'goldplayers'],['silver',15000,'83x3-sbc'],['open',20000,null]]){
 const d={cup_id:id,week:'2026-10-29',save_id:'club',claim_key:t.api.key(id,'2026-10-29')};const before=t.state.coins;
 t.api.applyDeliveryToSave(t.state,d);t.api.applyDeliveryToSave(t.state,d);assert.equal(t.state.coins,before+coins);if(pack)assert.equal(t.state.packs[pack],2);
 }
 assert.equal(t.state.rewardPackQueue.length,4);assert.ok(t.state.rewardPackQueue.every(x=>x.tradeable===false));assert.equal(t.api.CUPS.find(c=>c.id==='open').picks,2);
 assert.throws(()=>t.api.applyDeliveryToSave(t.state,{cup_id:'bronze',save_id:'other'}),/Verein/);
});
test('weeks reset Thursday 19 Berlin and keep saved historical rewards through reload',()=>{
 const t=setup();assert.equal(t.api.week(Date.parse('2026-11-05T18:59:59+01:00')).key,'2026-10-29');assert.equal(t.api.week(Date.parse('2026-11-05T19:00:00+01:00')).key,'2026-11-05');
 for(let i=1;i<=3;i++)play(t,i);
 const saved=JSON.parse(JSON.stringify(t.state));t.ctx.state=saved;assert.equal(t.api.progress('bronze','2026-10-29').earned.length,3);assert.equal(t.api.progress('bronze','2026-11-05').wins.length,0);
});
module.exports={setup};
