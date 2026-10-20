const test=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');

const html=require('./helpers/app-html.cjs')();
const section=(a,b)=>html.slice(html.indexOf(a),html.indexOf(b,html.indexOf(a)));

function daily(){
 const ctx={rarityOf:b=>b.quality,hashNum:s=>{let h=0;for(const c of String(s))h=(h*31+c.charCodeAt(0))>>>0;return h},
  promoWindowKey:now=>new Date(new Date(now).getTime()-19*3600000).toISOString().slice(0,10),
  nextPromoReset:now=>new Date(new Date(now).getTime()+3600000)};
 vm.createContext(ctx);
 vm.runInContext(section('const DAILY_SBC_TEMPLATES=','function marqueeClubMatch('),ctx);
 return ctx;
}

test('every day brings three fresh SBCs: easy, medium and a highlight, each with a known reward pack',()=>{
 const ctx=daily(),packs=new Set([...html.matchAll(/\{"?id"?:"([^"]+)"/g)].map(m=>m[1]));
 const today=vm.runInContext('activeDailySBCs(new Date("2026-10-20T12:00:00Z"))',ctx);
 assert.deepEqual(Array.from(today.map(s=>s.dailyTier)),['easy','medium','highlight']);
 for(const s of today){
  assert.equal(s.group,'Täglich');assert.equal(s.count,11);assert.ok(s.once);assert.match(s.id,/^daily_/);
  assert.ok(packs.has(s.reward.pack)||['silver','gold','82'].includes(s.reward.pack),s.reward.pack);
 }
 const ids=new Set();
 for(let d=0;d<10;d++)for(const s of vm.runInContext(`activeDailySBCs(new Date(Date.UTC(2026,9,${10+d},12)))`,ctx))ids.add(s.name);
 assert.ok(ids.size>=6,'die Auswahl wechselt über die Tage');
});
