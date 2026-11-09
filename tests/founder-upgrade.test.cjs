// V21.381 Founder upgrade: owners claim once from the home screen, the 88 Founder card becomes 94.
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const html=require('./helpers/app-html.cjs')();
const between=(from,to)=>{const a=html.indexOf(from),b=html.indexOf(to,a);assert.ok(a>=0&&b>a,from);return html.slice(a,b)};
const founderCode=between('const FOUNDER_SAVE_ID=','let PLAYERS=');
const RULES=[['GF-9AE6CDDEFE8A458D','footera-founder-bastian-gerlach','footera-founder-bastian',['Finesse Shot','Quick Step']],['GF-7D87D08A06104571','footera-founder-marco-gerlach','footera-founder-marco',['Power Header','Low Driven Shot']],['GF-35FADCCBA5AD4E15','footera-founder-max-wittenberg','footera-founder-max',['Low Driven Shot','Incisive Pass']]];
function saveState(id){return{profile:{saveId:id},packs:{},club:[],sbcStorage:[],transferList:[],transferSales:[],auctions:[],pendingPack:[],pendingResolved:[],squad:Array(23).fill(null),squadPresets:[]}}
function setup(){const ctx={Date,Map,Set};vm.createContext(ctx);vm.runInContext(founderCode,ctx);return ctx}
const call=(ctx,expr)=>vm.runInContext(expr,ctx);

test('every founder owner gets one claimable 94 upgrade with the agreed stats and two PlayStyles+',()=>{
 for(const [saveId,pid,uid,plus] of RULES){
  const ctx=setup();let s=saveState(saveId);s[{'footera-founder-bastian':'founderClaimed','footera-founder-marco':'marcoFounderClaimed','footera-founder-max':'maxFounderClaimed'}[uid]]=true;
  s=call(ctx,'reconcileFounderState')(s);ctx.state=s;
  const card=s.club.find(i=>i.pid===pid);assert.equal(card.displayRating,88);assert.equal(card.eventStats,null);
  const pending=call(ctx,'pendingFounderUpgrades')(s);assert.deepEqual([...pending.map(r=>r.uid)],[uid]);
  const rule=pending[0];assert.ok(call(ctx,'claimFounderUpgrade')(rule,s));
  assert.equal(card.displayRating,94);assert.deepEqual([...card.eventStats],[95,95,88,94,50,89]);assert.deepEqual([...card.playstylePlusAdds],plus);
  assert.equal(card.tradeable,false);assert.equal(call(ctx,'pendingFounderUpgrades')(s).length,0);
  assert.equal(call(ctx,'claimFounderUpgrade')(rule,s),null,'claim only once');
  // A reload keeps the upgrade (reconcile used to force 88).
  s=call(ctx,'reconcileFounderState')(JSON.parse(JSON.stringify(s)));const again=s.club.find(i=>i.pid===pid);
  assert.equal(again.displayRating,94);assert.deepEqual([...again.eventStats],[95,95,88,94,50,89]);assert.deepEqual([...again.playstylePlusAdds],plus);
 }
});

test('Niklas (online owner) gets Aerial+ and Power Shot+; foreign clubs and unopened packs see no upgrade',()=>{
 const ctx=setup();let s=saveState('GF-X');s.profile.founderOnlineUserId='4af57ea2-9b89-44f7-b7ca-ffdbb7400317';s.niklasFounderClaimed=true;
 s=call(ctx,'reconcileFounderState')(s);const [rule]=call(ctx,'pendingFounderUpgrades')(s);
 assert.equal(rule.uid,'footera-founder-niklas');const card=call(ctx,'claimFounderUpgrade')(rule,s);assert.deepEqual([...card.playstylePlusAdds],['Aerial','Power Shot']);
 const unopened=call(ctx,'reconcileFounderState')(saveState('GF-9AE6CDDEFE8A458D'));assert.equal(unopened.packs['founder-bastian'],1);
 assert.equal(call(ctx,'pendingFounderUpgrades')(unopened).length,0);
 const foreign=call(ctx,'reconcileFounderState')(saveState('GF-SOMEBODY'));assert.equal(call(ctx,'pendingFounderUpgrades')(foreign).length,0);
});

test('Bastian static card has a 94 artwork that is cached offline, and the home notice exists',()=>{
 const root=path.join(__dirname,'..');
 assert.ok(fs.existsSync(path.join(root,'assets/footera/founder-bastian-card-94.webp')));
 assert.ok(fs.readFileSync(path.join(root,'service-worker.js'),'utf8').includes('"./assets/footera/founder-bastian-card-94.webp"'));
 assert.ok(html.includes('id="homeFounderUpgradeNotice"'));assert.ok(html.includes('Number(r)>=94?"./assets/footera/founder-bastian-card-94.webp"'));
});
