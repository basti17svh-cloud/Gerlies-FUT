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
 vm.runInContext(section('const MARQUEE_RELEASES=','// Tägliche SBCs:'),ctx);
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
test('weekly scheduling stays at 19 Berlin across summer and winter time',()=>{
 const c=setup();
 for(const [before,after,expiry] of [
  ['2026-10-29T17:59:59Z','2026-10-29T18:00:00Z','2026-11-05T18:00:00Z'],
  ['2026-07-09T16:59:59Z','2026-07-09T17:00:00Z','2026-07-16T17:00:00Z'],
  ['2026-03-26T17:59:59Z','2026-03-26T18:00:00Z','2026-04-02T17:00:00Z'],
  ['2026-10-22T16:59:59Z','2026-10-22T17:00:00Z','2026-10-29T18:00:00Z']
 ]){
  assert.equal(vm.runInContext(`nextSbcWeeklyReset(new Date("${before}")).toISOString()`,c),new Date(after).toISOString());
  assert.equal(vm.runInContext(`nextSbcWeeklyReset(new Date("${after}")).toISOString()`,c),new Date(expiry).toISOString());
 }
});
test('release uses four verified upcoming fixtures and fresh completion IDs',()=>{
 const c=setup(),r=rows(c,'2026-10-29T18:00:00Z');
 assert.deepEqual(Array.from(r,s=>s.name),['LOSC Lille – RC Lens','Chelsea – Manchester United','Bayern München – Borussia Dortmund','AC Milan – Inter']);
 for(const s of r){
  assert.match(s.id,/^top_partien_2026-10-29_fixtures_([124]|bayern-dortmund)$/);
  assert.ok(Date.parse(s.kickoffAt)>Date.parse('2026-10-29T18:00:00Z')&&Date.parse(s.kickoffAt)<s.expiresAt);
  assert.match(s.sourceUrl,/^https:/);assert.equal(s.matchClubs.length,2);
 }
 assert.equal(r[2].minEitherMatchClub,1);assert.equal(r[3].requireBothMatchClubs,true);
 assert.equal(new Set(r.map(s=>s.groupSet)).size,1);
 assert.equal(rows(c,'2026-10-29T17:59:59Z').length,0,'never launch before Thursday 19');
 assert.equal(rows(c,'2026-11-05T18:00:00Z').length,0,'never relabel old fixtures as a fresh week');
});
test('weekly boundary refreshes an open SBC view independently of daily and grind keys',()=>{
 const c=setup();c.promoWindowKey=()=> 'same-daily-key';c.sbcRotationWindow=()=>({key:'same-grind-key'});
 const key=at=>vm.runInContext(`sbcContentWindowKey(new Date(${JSON.stringify(at)}))`,c);
 assert.notEqual(key('2026-10-29T17:59:59Z'),key('2026-10-29T18:00:00Z'));
 assert.equal(key('2026-10-29T18:00:00Z'),key('2026-10-30T00:00:00Z'));
});

test('correcting Bundesliga fixture preserves other completions and group claim while retiring the old draft',()=>{
 const c=setup(),r=rows(c,'2026-10-29T18:00:00Z');
 const oldIds=[1,2,3,4].map(i=>'top_partien_2026-10-29_fixtures_'+i);
 const state={sbcCompletions:Object.fromEntries(oldIds.map(id=>[id,true])),sbcGroupClaims:{top_partien_2026_ignored:false}};
 const group=r[0].groupSet;state.sbcGroupClaims[group]=true;
 assert.deepEqual(Array.from(r.filter(s=>state.sbcCompletions[s.id]),s=>s.order),[0,1,3]);
 assert.equal(r[2].id,'top_partien_2026-10-29_fixtures_bayern-dortmund');
 assert.ok(!r.some(s=>s.id===oldIds[2]),'old Leverkusen draft cannot be submitted as Bayern');
 assert.equal(state.sbcGroupClaims[r[2].groupSet],true,'already claimed group bonus remains claimed');
 assert.match(r[2].matchClubs[0].join('|'),/Bayern/);assert.match(r[2].matchClubs[1].join('|'),/Dortmund/);
});
