const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.join(__dirname,'..');
const source=fs.readFileSync(path.join(root,'footera-app.js'),'utf8');
const start=source.indexOf('const PROMO_CODES={');
const end=source.indexOf('function renderActiveView(',start);
assert.ok(start>=0&&end>start,'Promo code source must be present');
const promo=source.slice(start,end);
function fixture(){
 const elements=new Map(),history={saves:0,render:0,toasts:[]};
 function get(id){
  if(!elements.has(id))elements.set(id,{value:'',className:'',textContent:'',addEventListener(){}});
  return elements.get(id);
 }
 const context={state:{points:10,promoClaims:{}},Date,Number,String,Intl,
  $:get,fmt:n=>Number(n).toLocaleString('de-DE'),save:()=>history.saves++,
  renderWallet:()=>history.render++,toast:msg=>history.toasts.push(msg)};
 vm.createContext(context);
 vm.runInContext(promo,context);
 return{context,get,history,run:script=>vm.runInContext(script,context)};
}
test('Max grants 200000 points only once per save, ignoring case and whitespace',()=>{
 const f=fixture();
 f.get('promoCodeInput').value='  mAx  ';
 f.run('redeemPromo()');
 assert.equal(f.context.state.points,200010);
 assert.equal(f.history.saves,1);
 assert.equal(f.history.render,1);
 assert.equal(f.context.state.promoClaims.max_200k.reward.points,200000);
 assert.equal(f.get('promoCodeInput').value,'');
 f.get('promoCodeInput').value='MAX';
 f.run('redeemPromo()');
 assert.equal(f.context.state.points,200010);
 assert.equal(f.history.saves,1);
 assert.match(f.get('promoStatus').textContent,/bereits eingelöst/);
});
test('existing promo rewards remain unchanged',()=>{
 const f=fixture();
 for(const [code,points] of [['Ranger',50000],['Säulen1415',100000],['Basti',500000]]){
  f.get('promoCodeInput').value=code;
  f.run('redeemPromo()');
  assert.equal(f.context.state.points,10+[50000,150000,650000][['Ranger','Säulen1415','Basti'].indexOf(code)]);
 }
 assert.equal(f.context.state.points,660010);
 assert.equal(Object.keys(f.context.state.promoClaims).length,3);
});
test('build, script and service worker versions are synchronized',()=>{
 const index=fs.readFileSync(path.join(root,'index.html'),'utf8');
 const sw=fs.readFileSync(path.join(root,'service-worker.js'),'utf8');
 const build=source.match(/const GFUT_BUILD="V(\d+)\.(\d+)";/);
 assert.ok(build);
 const asset=build[1]+build[2].padStart(3,'0');
 assert.ok(index.includes('footera-app.js?v='+asset));
 assert.ok(source.includes('service-worker.js?v='+asset));
 assert.ok(sw.includes('footera-app.js?v='+asset));
});

test('Footera promo grants exactly 75k points once per save even on repeated or mixed-case input',()=>{
 const f=fixture();
 f.get('promoCodeInput').value=' fOoTeRa ';
 f.run('redeemPromo()');
 assert.equal(f.context.state.points,75010);
 assert.equal(f.context.state.promoClaims.footera_75k.reward.points,75000);
 assert.equal(f.context.state.promoClaims.footera_75k.code,'Footera');
 assert.equal(f.history.saves,1);
 assert.equal(f.history.render,1);
 assert.equal(f.get('promoCodeInput').value,'');
 f.get('promoCodeInput').value='FOOTERA';
 f.run('redeemPromo()');
 assert.equal(f.context.state.points,75010);
 assert.equal(f.history.saves,1,'repeated redemption must not save or credit again');
 assert.match(f.get('promoStatus').textContent,/bereits eingelöst/);
 const otherSave=fixture();
 otherSave.get('promoCodeInput').value='Footera';
 otherSave.run('redeemPromo()');
 assert.equal(otherSave.context.state.points,75010,'a separate save can redeem independently');
});
