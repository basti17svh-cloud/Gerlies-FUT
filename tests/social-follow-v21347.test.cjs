// V21.347: weekly video-only promo code (coins, 7-day window) and the invite hint after a win.
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.join(__dirname,'..');
const source=fs.readFileSync(path.join(root,'footera-app.js'),'utf8');
const start=source.indexOf('const PROMO_CODES={'),end=source.indexOf('function renderActiveView(',start);
const promo=source.slice(start,end);
function fixture(now){
 const elements=new Map(),history={saves:0,toasts:[]};
 const get=id=>{if(!elements.has(id))elements.set(id,{value:'',className:'',textContent:'',addEventListener(){}});return elements.get(id)};
 class FakeDate extends Date{static now(){return now}}
 const context={state:{points:10,coins:100,promoClaims:{}},Date:FakeDate,Number,String,Intl,
  $:get,fmt:n=>Number(n).toLocaleString('de-DE'),save:()=>history.saves++,renderWallet(){},toast:m=>history.toasts.push(m)};
 vm.createContext(context);vm.runInContext(promo,context);
 return{context,get,history,redeem(code){get('promoCodeInput').value=code;vm.runInContext('redeemPromo()',context)}};
}
test('ANPFIFF gives 5000 coins once, only from 09.11. to 15.11.2026 (Berlin)',()=>{
 const early=fixture(Date.parse('2026-11-08T23:59:00+01:00'));early.redeem('anpfiff');
 assert.equal(early.context.state.coins,100);assert.match(early.get('promoStatus').textContent,/gilt noch nicht/);
 const f=fixture(Date.parse('2026-11-09T12:30:00+01:00'));f.redeem(' AnPfiff ');
 assert.equal(f.context.state.coins,5100);assert.equal(f.context.state.points,10,'coins code must not grant points');
 assert.deepEqual({...f.context.state.promoClaims.social_kw46_anpfiff.reward},{coins:5000});
 assert.match(f.history.toasts[0],/5\.000 Coins/);
 f.redeem('ANPFIFF');assert.equal(f.context.state.coins,5100);assert.equal(f.history.saves,1);
 const late=fixture(Date.parse('2026-11-16T00:00:00+01:00'));late.redeem('anpfiff');
 assert.equal(late.context.state.coins,100);assert.match(late.get('promoStatus').textContent,/abgelaufen/);
});
test('point codes still grant points',()=>{
 const f=fixture(Date.parse('2026-11-10T10:00:00+01:00'));f.redeem('max');
 assert.equal(f.context.state.points,200010);assert.equal(f.context.state.coins,100);
});
test('a win shows the invite hint, wired from finishMatch',()=>{
 assert.match(source,/resultKey="win";state\.stats\.wins\+\+;globalThis\.FooteraShare\?\.afterWin\?\.\(\);/);
 const share=fs.readFileSync(path.join(root,'footera-share.js'),'utf8');
 assert.match(share,/function showWinInvite\(/);
 assert.match(share,/state\.referral\?\.sharedInvite\)return false/,'no hint once the player already shared an invite');
 assert.match(share,/afterWin,afterPack/);
 assert.match(share,/Insta @official_footera · TikTok @footera_official/);
});
