'use strict';
// V21.406 Adventskalender: one door per Berlin day 1.–24.12., missed doors stay closed, no double claim,
// 24.12. grants the Weihnachtsspieler exactly once.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'..');
const timeSrc=fs.readFileSync(path.join(root,'footera-time.js'),'utf8');
const src=fs.readFileSync(path.join(root,'footera-advent.js'),'utf8');
function load(advent){
 const ctx={granted:[],saves:0,made:[]};
 vm.createContext(ctx);
 vm.runInContext(timeSrc,ctx);
 vm.runInContext(`var state=${JSON.stringify({onboarded:true,club:[],advent})};
  function grant(r){granted.push(r)}function save(){saves++}function flushSave(){}
  function ratingRewardPack(min,count){return "reward-"+min+"-"+count}
  function makeEventObjectiveItem(task){made.push(task.id);return{uid:"x"+made.length,pid:task.player.pid,eventType:task.eventType,displayRating:task.player.ovr}}`,ctx);
 vm.runInContext(src,ctx);
 return ctx;
}
// 12:00 Berlin on the given December day (UTC+1)
const dec=d=>new Date(Date.UTC(2026,11,d,11,0));

test('doors follow Berlin midnight and only exist 1.–24.12.2026',()=>{
 const {FooteraAdvent:api}=load();
 assert.equal(api.doorOn(new Date('2026-11-30T22:59:00Z')),0);
 assert.equal(api.doorOn(new Date('2026-11-30T23:01:00Z')),1);
 assert.equal(api.doorOn(new Date('2026-12-24T22:59:00Z')),24);
 assert.equal(api.doorOn(new Date('2026-12-24T23:01:00Z')),0);
 assert.equal(api.doorOn(new Date('2027-12-05T11:00:00Z')),0);
});

test('24 doors, each number once in the layout, Sundays and Christmas Eve are big',()=>{
 const {FooteraAdvent:api}=load();
 assert.equal(api.DOORS.length,25);
 assert.deepEqual([...api.LAYOUT].sort((a,b)=>a-b),Array.from({length:24},(_,i)=>i+1));
 for(const n of [6,13,20,24])assert.equal(api.DOORS[n].big,true,`door ${n}`);
 // 6., 13., 20.12.2026 are Sundays.
 for(const n of [6,13,20])assert.equal(new Date(Date.UTC(2026,11,n)).getUTCDay(),0);
});

test('every day opens its own door once and pays the listed reward',()=>{
 const ctx=load(),api=ctx.FooteraAdvent;
 for(let d=1;d<=24;d++){
  const res=api.claim(dec(d));
  assert.equal(res.door,d);
  assert.equal(api.claim(dec(d)),null,'second tap the same day pays nothing');
 }
 assert.equal(ctx.granted.length,24);
 assert.equal(ctx.granted[12].pack,'reward-84-1','3. Advent builds the 84+ reward pack');
 assert.equal(ctx.granted[19].pack,'85');
 assert.equal(ctx.granted[23].coins,10000);
 for(const g of ctx.granted)for(const k of ['label','big','note','xmas','ratingPack'])assert.equal(k in g,false,`no ${k} in grant`);
 assert.deepEqual([...ctx.made],['advent-2026-lautaro']);
 assert.equal(ctx.state.club.length,1);
 assert.equal(ctx.state.advent[2026].xmasGranted,true);
});

test('a missed door stays closed; nothing opens before or after the calendar',()=>{
 const ctx=load(),api=ctx.FooteraAdvent;
 api.claim(dec(1));
 assert.equal(api.doorState(2,dec(3)),'missed');
 assert.equal(api.doorState(3,dec(3)),'today');
 assert.equal(api.doorState(4,dec(3)),'locked');
 assert.equal(api.claim(dec(3)).door,3);
 assert.equal(api.doorState(2,dec(3)),'missed');
 assert.equal(api.claim(new Date('2026-11-20T11:00:00Z')),null);
 assert.equal(api.claim(new Date('2026-12-26T11:00:00Z')),null);
 assert.equal(api.doorState(5,new Date('2026-11-20T11:00:00Z')),'locked');
 assert.equal(api.doorState(5,new Date('2026-12-26T11:00:00Z')),'missed');
});

test('a reload with the saved progress cannot claim twice, also not the Christmas player',()=>{
 const first=load();first.FooteraAdvent.claim(dec(24));
 const saved=JSON.parse(JSON.stringify(first.state.advent));
 const again=load(saved);
 assert.equal(again.FooteraAdvent.status(dec(24)).openedToday,true);
 assert.equal(again.FooteraAdvent.claim(dec(24)),null);
 assert.equal(again.made.length,0);
 assert.equal(again.granted.length,0);
});

test('broken saves are cleaned instead of blocking',()=>{
 const api=load({2026:{opened:['x',99,3,3,-1]}}).FooteraAdvent;
 assert.deepEqual([...api.status(dec(4)).opened],[3]);
 assert.equal(api.claim(dec(4)).door,4);
});

test('Christmas player is a real FC27 player in the winter design, not used in any other promo',()=>{
 const {FooteraAdvent:api}=load();
 const csv=fs.readFileSync(path.join(root,'assets/players-db.csv'),'utf8');
 const row=csv.split('\n').find(l=>l.startsWith(api.XMAS_PLAYER.pid+','));
 assert.ok(row,'player exists in the database');
 assert.match(row,/Lautaro Martínez/);
 assert.match(api.XMAS_TASK.eventType,/^winter/);
 const app=fs.readFileSync(path.join(root,'footera-app.js'),'utf8');
 assert.equal(app.includes(`pid:"${api.XMAS_PLAYER.pid}"`),false,'no other promo uses this player');
 assert.match(app,/startsWith\("winter"\)\)return"winter"/);
});

test('app wires the banner and the files ship with the build',()=>{
 const app=fs.readFileSync(path.join(root,'footera-app.js'),'utf8'),html=fs.readFileSync(path.join(root,'index.html'),'utf8'),sw=fs.readFileSync(path.join(root,'service-worker.js'),'utf8');
 assert.match(app,/globalThis\.FooteraAdvent\?\.renderHome\(\)/);
 assert.match(html,/id="adventHome"/);
 for(const f of ['footera-advent.js?v=21406','footera-advent.css?v=21406','winter-card.css?v=21406']){
  assert.ok(html.includes(f),`index.html ${f}`);
  assert.ok(sw.includes(`"./${f}"`),`service worker ${f}`);
 }
 assert.ok(fs.existsSync(path.join(root,'assets/footera/events/advent/card-winter-v1.webp')));
 assert.ok(sw.includes('"./assets/footera/events/advent/card-winter-v1.webp"'));
});

test('Winternächte: Silvester-SBC one week from midnight, free winter evolution, both wired',()=>{
 const app=fs.readFileSync(path.join(root,'footera-app.js'),'utf8');
 const i=app.indexOf('const WINTER_SBCS='),j=app.indexOf('function allActiveSBCs(');
 const ctx={};vm.createContext(ctx);vm.runInContext(app.slice(i,j)+';this.WINTER_SBCS=WINTER_SBCS;this.activeWinterSBCs=activeWinterSBCs;',ctx);
 const ids=t=>ctx.activeWinterSBCs(new Date(t)).map(s=>s.id).join(',');
 assert.equal(ids('2026-12-31T23:59:00+01:00'),'');
 assert.equal(ids('2027-01-01T00:00:00+01:00'),'silvester_20270101');
 assert.equal(ids('2027-01-08T00:00:00+01:00'),'');
 assert.equal(Date.parse(ctx.WINTER_SBCS[0].activeUntilAt)-Date.parse(ctx.WINTER_SBCS[0].releaseAt),7*864e5,'one full week');
 assert.match(app,/function allActiveSBCs\(now=new Date\(\)\)\{return \[[^\n]*activeWinterSBCs\(now\)/);
 assert.match(app,/"id":"winter_nights"[^\n]*"design":"winter"[^\n]*"activeFrom":"2026-12-11T19:00:00\+01:00"/);
});
