'use strict';
// V21.406 Comeback-Geschenk: 7+ days away -> Premium Gold Pack + 2.000 Coins, at most once per 30 days, never twice.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'..');
const src=fs.readFileSync(path.join(root,'footera-comeback.js'),'utf8');
const DAY=864e5,T0=Date.UTC(2026,11,1,12);
function load(comeback){
 const ctx={granted:[],saves:0};
 vm.createContext(ctx);
 vm.runInContext(`var state=${JSON.stringify({onboarded:true,comeback})};function grant(r){granted.push(r)}function save(){saves++}function flushSave(){}`,ctx);
 vm.runInContext(src,ctx);
 return ctx;
}

test('new players and players without a last visit get nothing',()=>{
 const ctx=load();
 assert.equal(ctx.FooteraComeback.claim(T0),null);
 ctx.FooteraComeback.touch(T0);
 assert.equal(ctx.state.comeback.seenAt,T0);
 assert.equal(ctx.FooteraComeback.claim(T0+DAY),null);
});

test('6 days away is not enough, 7 days pays once',()=>{
 assert.equal(load({seenAt:T0}).FooteraComeback.claim(T0+6*DAY+DAY/2),null);
 const ctx=load({seenAt:T0}),api=ctx.FooteraComeback;
 const res=api.claim(T0+7*DAY);
 assert.equal(res.days,7);
 assert.deepEqual({...ctx.granted[0]},{pack:'gold',qty:1,coins:2000});
 assert.equal(api.claim(T0+7*DAY),null,'no second gift right away');
 assert.equal(ctx.granted.length,1);
});

test('at most one gift per 30 days, even after another long break',()=>{
 const ctx=load({seenAt:T0}),api=ctx.FooteraComeback;
 api.claim(T0+8*DAY);
 api.touch(T0+9*DAY);
 assert.equal(api.claim(T0+9*DAY+20*DAY),null,'second break inside 30 days');
 api.touch(T0+30*DAY);
 assert.ok(api.claim(T0+8*DAY+31*DAY+7*DAY),'after 30 days and another 7-day break');
 assert.equal(ctx.granted.length,2);
});

test('a reload with the saved state cannot pay twice',()=>{
 const first=load({seenAt:T0});first.FooteraComeback.claim(T0+10*DAY);
 const again=load(JSON.parse(JSON.stringify(first.state.comeback)));
 assert.equal(again.FooteraComeback.claim(T0+10*DAY+1000),null);
 assert.equal(again.granted.length,0);
});

test('a clock from the future or broken values never pay',()=>{
 assert.equal(load({seenAt:T0+50*DAY}).FooteraComeback.claim(T0),null);
 assert.equal(load({seenAt:'x',giftAt:-5}).FooteraComeback.claim(T0),null);
});

test('files ship with the build',()=>{
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8'),sw=fs.readFileSync(path.join(root,'service-worker.js'),'utf8');
 for(const f of ['footera-comeback.js?v=21407','footera-comeback.css?v=21407']){
  assert.ok(html.includes(f),`index.html ${f}`);
  assert.ok(sw.includes(`"./${f}"`),`service worker ${f}`);
 }
});
