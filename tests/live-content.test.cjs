const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const html=require('./helpers/app-html.cjs')();
const time=fs.readFileSync(path.join(__dirname,'../footera-time.js'),'utf8');
const weeks=html.slice(html.indexOf('const TOTW_WEEK_1='),html.indexOf('const MID_ICON_DATA='));
const active=html.slice(html.indexOf('function totwIsActive('),html.indexOf('function updateTotwMarketOption('));
const ctx={Intl,Date};
vm.createContext(ctx);vm.runInContext([time,weeks,active].join('\n'),ctx);

test('Team der Woche wechselt mittwochs um 19 Uhr Berliner Zeit und läuft eine Woche',()=>{
 const current=iso=>ctx.activeTotwWeek(new Date(iso))?.id||null;
 assert.equal(current('2026-09-23T16:59:59Z'),1);
 assert.equal(current('2026-09-23T17:00:00Z'),2);
 assert.equal(current('2026-09-30T16:59:59Z'),2);
 assert.equal(current('2026-09-30T17:00:00Z'),3);
 assert.equal(current('2026-10-07T16:59:59Z'),3);
 assert.equal(current('2026-10-07T17:00:00Z'),4);
 assert.equal(ctx.totwIsActive(new Date('2026-09-30T17:00:00Z')),true);
 assert.equal(ctx.totwDisplayName('Team of the Week 2'),'Team der Woche 2');
 assert.equal(ctx.totwDisplayName('Team of the Week 3'),'Team der Woche 3');
});

test('a prepared next team remains gated until Wednesday 19:00 and replaces the previous team exactly then',()=>{
 const status=vm.runInContext('TOTW_WEEK_5.sourceStatus',ctx);
 vm.runInContext("TOTW_WEEK_5.sourceStatus='admin-approved'",ctx);
 try{
  assert.equal(ctx.activeTotwWeek(new Date('2026-10-14T16:59:59Z')).id,4);
  assert.equal(ctx.latestPublishedTotw(new Date('2026-10-14T16:59:59Z')).id,4);
  assert.equal(ctx.activeTotwWeek(new Date('2026-10-14T17:00:00Z')).id,5);
  assert.equal(ctx.latestPublishedTotw(new Date('2026-10-14T17:00:00Z')).id,5);
 }finally{ctx.savedStatus=status;vm.runInContext('TOTW_WEEK_5.sourceStatus=savedStatus',ctx)}
});

test('the weekly 19:00 gate uses Berlin wall time across the October clock change',()=>{
 // Fresh names per week: from TOTW 6 on nobody may appear in two consecutive weeks.
 vm.runInContext("TOTW_WEEKS.push(...[6,7].map((id,i)=>({...TOTW_WEEK_5,id,releaseDate:['2026-10-21','2026-10-28'][i],sourceStatus:'admin-approved',players:TOTW_WEEK_5.players.map(p=>({...p,eaId:id+p.eaId,names:[p.names[0]+' '+id]}))})))",ctx);
 try{
  assert.equal(ctx.activeTotwWeek(new Date('2026-10-21T16:59:59Z')).id,5);
  assert.equal(ctx.activeTotwWeek(new Date('2026-10-21T17:00:00Z')).id,6);
  assert.equal(ctx.activeTotwWeek(new Date('2026-10-28T17:59:59Z')).id,6);
  assert.equal(ctx.activeTotwWeek(new Date('2026-10-28T18:00:00Z')).id,7);
 }finally{vm.runInContext('TOTW_WEEKS.splice(-2)',ctx)}
});
