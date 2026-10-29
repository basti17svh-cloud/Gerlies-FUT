const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const app=fs.readFileSync(require('node:path').join(__dirname,'../footera-app.js'),'utf8');
const section=(a,b)=>app.slice(app.indexOf(a),app.indexOf(b,app.indexOf(a)));
function setup(){
 const ctx={nationLabel:x=>x};vm.createContext(ctx);
 vm.runInContext(fs.readFileSync(require('node:path').join(__dirname,'../footera-time.js'),'utf8'),ctx);
 vm.runInContext(app.match(/^function hashNum\(.*$/m)[0],ctx);
 vm.runInContext(section('const MARQUEE_ROTATIONS=','// Tägliche SBCs:'),ctx);
 vm.runInContext(section('function activeMarqueeSBCs(','function activeEventPlayerSBCs('),ctx);
 vm.runInContext(app.match(/^function sbcContentWindowKey\(.*$/m)[0],ctx);
 return ctx;
}
function rows(c,at){return vm.runInContext(`activeMarqueeSBCs(new Date(${JSON.stringify(at)}))`,c)}
test('current Top-Partien are immediately available until Thursday November 5 at 19 Berlin',()=>{
 const c=setup(),r=rows(c,'2026-10-29T21:00:00Z');
 assert.equal(r.length,4);
 for(const s of r){assert.equal(s.releaseKey,'2026-10-29');assert.equal(s.expiresAt,Date.parse('2026-11-05T18:00:00Z'));assert.equal(s.once,true);}
 assert.deepEqual(Array.from(rows(c,'2026-11-01T23:00:00Z'),s=>s.id),Array.from(r,s=>s.id),'no midnight or four-day rollover');
});
test('Thursday changes IDs and expiry exactly at 19 Berlin, also across DST',()=>{
 const c=setup();
 for(const [before,after,expiry] of [
  ['2026-10-29T17:59:59Z','2026-10-29T18:00:00Z','2026-11-05T18:00:00Z'],
  ['2026-07-09T16:59:59Z','2026-07-09T17:00:00Z','2026-07-16T17:00:00Z'],
  ['2026-03-26T17:59:59Z','2026-03-26T18:00:00Z','2026-04-02T17:00:00Z'],
  ['2026-10-22T16:59:59Z','2026-10-22T17:00:00Z','2026-10-29T18:00:00Z']
 ]){
  const old=rows(c,before),fresh=rows(c,after);
  assert.equal(old[0].expiresAt,Date.parse(after));assert.equal(fresh[0].expiresAt,Date.parse(expiry));
  assert.ok(fresh.every(s=>!old.some(o=>o.id===s.id)));
  assert.equal(new Set(fresh.map(s=>s.groupSet)).size,1);
 }
});
test('weekly boundary refreshes an open SBC view independently of daily and grind keys',()=>{
 const c=setup();c.promoWindowKey=()=> 'same-daily-key';c.sbcRotationWindow=()=>({key:'same-grind-key'});
 const key=at=>vm.runInContext(`sbcContentWindowKey(new Date(${JSON.stringify(at)}))`,c);
 assert.notEqual(key('2026-10-29T17:59:59Z'),key('2026-10-29T18:00:00Z'));
 assert.equal(key('2026-10-29T18:00:00Z'),key('2026-10-30T00:00:00Z'));
});
