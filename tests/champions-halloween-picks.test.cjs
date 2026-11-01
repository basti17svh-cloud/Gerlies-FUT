const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.join(__dirname,'..'),app=fs.readFileSync(path.join(root,'footera-app.js'),'utf8');
const ev={};for(const n of ['HALLOWEEN_EVENT','HALLOWEEN_TEAM2_EVENT']){const a=app.indexOf('const '+n+'='),b=app.indexOf('\n]};',a)+4;vm.runInNewContext(app.slice(a,b)+';this.'+n+'='+n,ev)}
const sql=fs.readFileSync(path.join(root,'online/footera-pick-catalog-halloween.sql'),'utf8');
const rows=[...sql.matchAll(/^\('(halloween:(\d):(\d+))','(\w+)',(\d+),'([^']+)'::timestamptz,'([^']+)'::timestamptz,'(.*)'::jsonb\),?$/gm)].map(m=>({id:m[1],team:Number(m[2]),pid:m[3],kind:m[4],rating:Number(m[5]),start:Date.parse(m[6]),end:Date.parse(m[7]),item:JSON.parse(m[8].replace(/''/g,"'"))}));
const t1=ev.HALLOWEEN_EVENT,t2=ev.HALLOWEEN_TEAM2_EVENT,up=t1.upgrade;
test('Champions red picks get every Halloween card that is 85+ while its team is in packs',()=>{
 assert.equal(rows.length,sql.split('\n').filter(l=>l.startsWith("('halloween:")).length,'every SQL row parsed');
 for(const [team,n,start,end] of [[t1,1,t1.activeFrom,t2.activeFrom],[t2,2,t2.activeFrom,t2.activeUntilAt]]){
  for(const p of team.players){
   const row=rows.find(r=>r.team===n&&r.pid===p.pid),upgraded=p.ovr+up.ovr;
   if(upgraded<85){assert.equal(row,undefined,p.name+' stays out below 85');continue}
   assert.ok(row,p.name+' is pickable');assert.equal(row.kind,'special');assert.equal(row.end,Date.parse(end));
   const before=Date.parse(start)<Date.parse(up.at);
   assert.equal(row.start,before&&p.ovr<85?Date.parse(up.at):Date.parse(start),p.name+' starts when it is 85+');
   assert.equal(row.rating,before&&p.ovr>=85?p.ovr:upgraded);
   assert.equal(row.item.eventType,'halloween');assert.equal(row.item.eventReleaseId,team.id);
   assert.equal(row.item.displayRating,p.ovr,'stored before the Blutmond upgrade, which is added at render time');
   assert.deepEqual(row.item.eventStats,[...p.stats]);assert.equal(row.item.dynamicFace,p.dynamicFace);assert.equal(row.item.tradeable,false);
  }
 }
 assert.ok(rows.every(r=>r.rating>=85&&r.start<r.end));
});
test('SBC and objective players never enter the Champions pick pool',()=>{
 const excluded=[t1.sbcPlayer,t2.sbcPlayer].map(p=>p.pid).concat(['241721','200104']);
 assert.ok(rows.every(r=>!excluded.includes(r.pid)));
});
test('a red Champions pick of a Halloween card renders in the red design',()=>{
 const start=app.indexOf('function cardClass('),body=app.slice(start,app.indexOf('\n',start));
 assert.ok(body.indexOf('cosmeticDesign==="red"')<body.indexOf('"halloween"'),'red design wins over the Halloween frame');
});
