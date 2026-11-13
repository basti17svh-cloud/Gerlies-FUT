'use strict';
// V21.378 Login-Serie: one reward per Berlin day, day 7 bigger, missing a day restarts, no double claim.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'..');
const timeSrc=fs.readFileSync(path.join(root,'footera-time.js'),'utf8');
const src=fs.readFileSync(path.join(root,'footera-daily-login.js'),'utf8');
function load(saved){
 const ctx={granted:[],saves:0};
 vm.createContext(ctx);
 vm.runInContext(timeSrc,ctx);
 vm.runInContext(`var state=${JSON.stringify({onboarded:true,dailyLogin:saved})};function grant(r){granted.push(r)}function save(){saves++}function flushSave(){}`,ctx);
 vm.runInContext(src,ctx);
 return ctx;
}
// 12:00 Berlin on 2026-11-10 (UTC+1)
const day=n=>new Date(Date.UTC(2026,10,10+n,11,0));

test('day key follows Berlin midnight, not UTC',()=>{
 const {FooteraDailyLogin:api}=load();
 assert.equal(api.dayKey(new Date('2026-11-09T22:59:00Z')),'2026-11-09');
 assert.equal(api.dayKey(new Date('2026-11-09T23:01:00Z')),'2026-11-10');
 assert.equal(api.shiftKey('2026-03-01',-1),'2026-02-28');
 assert.equal(api.shiftKey('2026-12-31',1),'2027-01-01');
});

test('seven days in a row pay every reward once, day 7 is the big one, then day 1 again',()=>{
 const ctx=load(),api=ctx.FooteraDailyLogin;
 for(let i=0;i<7;i++){
  const res=api.claim(day(i));
  assert.equal(res.step,i+1);
  assert.equal(api.claim(day(i)),null,'second tap the same day pays nothing');
 }
 assert.equal(ctx.granted.length,7);
 assert.deepEqual({...ctx.granted[6]},{...api.REWARDS[6]});
 assert.equal(ctx.granted[6].pack,'82');
 assert.equal(ctx.granted[6].coins,5000);
 assert.equal(api.claim(day(7)).step,1);
 assert.equal(ctx.state.dailyLogin.total,8);
});

test('missing a day restarts at day 1',()=>{
 const ctx=load(),api=ctx.FooteraDailyLogin;
 api.claim(day(0));api.claim(day(1));api.claim(day(2));
 assert.equal(api.status(day(4)).step,1);
 assert.equal(api.claim(day(4)).step,1);
});

test('a reload with the saved progress cannot claim twice',()=>{
 const first=load();first.FooteraDailyLogin.claim(day(0));
 const saved=JSON.parse(JSON.stringify(first.state.dailyLogin));
 const again=load(saved);
 assert.equal(again.FooteraDailyLogin.status(day(0)).claimedToday,true);
 assert.equal(again.FooteraDailyLogin.claim(day(0)),null);
 assert.equal(again.granted.length,0);
 assert.equal(again.FooteraDailyLogin.claim(day(1)).step,2);
});

test('broken or future saves start a fresh series instead of blocking',()=>{
 const api=load({day:99,lastKey:42}).FooteraDailyLogin;
 assert.equal(api.status(day(0)).step,1);
 const future=load({day:3,lastKey:'2030-01-01',total:3}).FooteraDailyLogin;
 assert.equal(future.status(day(0)).step,1);
 assert.equal(future.status(day(0)).claimedToday,false);
});

test('app wires the banner and the files ship with the build',()=>{
 const app=fs.readFileSync(path.join(root,'footera-app.js'),'utf8'),html=fs.readFileSync(path.join(root,'index.html'),'utf8'),sw=fs.readFileSync(path.join(root,'service-worker.js'),'utf8');
 assert.match(app,/globalThis\.FooteraDailyLogin\?\.renderHome\(\)/);
 assert.match(html,/id="dailyLoginHome"/);
 assert.match(html,/footera-daily-login\.js\?v=21378/);
 assert.match(sw,/footera-daily-login\.js\?v=21378/);
 assert.match(sw,/footera-daily-login\.css\?v=21378/);
});
