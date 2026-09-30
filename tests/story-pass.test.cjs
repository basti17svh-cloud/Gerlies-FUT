const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
const source=html.slice(html.indexOf('function storyBase('),html.indexOf('function portraitFallback('));

test('Story entitlement waits for player data, grants once and migrates already claimed tiers',()=>{
 const state={club:[],storyPassPending:[],storyPassGranted:{},seasonPass:{key:'s1',freeClaims:{30:true}}};
 const ctx={state,PLAYERS:[],DATA_ROUTE:'GitHub FC27 CSV',STORY_PASS_PLAYERS:{
  's1-15':{season:'s1',level:15,name:'Ermedin Demirović',rating:84,position:'ST',stats:[78,84,75,81,44,82]},
  's1-30':{season:'s1',level:30,name:'Kobbie Mainoo',rating:85,position:'CM',stats:[75,72,82,86,78,78]}
 },normalizeKey:s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase(),
  makeItem:(base,tradeable,opts)=>({uid:`story-${state.club.length}`,pid:base.id,tradeable,...opts}),save(){},esc:s=>s};
 vm.createContext(ctx);vm.runInContext(source,ctx);
 vm.runInContext('grantStoryPassPlayer("s1-15")',ctx);
 assert.equal(state.club.length,0);assert.deepEqual(Array.from(state.storyPassPending),['s1-15']);
 ctx.PLAYERS=[{id:'one',name:'E. Demirović',fullName:'Ermedin Demirovic'},{id:'two',name:'Kobbie Mainoo',fullName:'Kobbie Mainoo'}];
 vm.runInContext('deliverStoryPassRewards();reconcileStoryPassPlayers();grantStoryPassPlayer("s1-15");reconcileStoryPassPlayers()',ctx);
 assert.equal(state.club.length,2);
 assert.deepEqual(state.club.map(i=>i.storyRewardKey),['s1-15','s1-30']);
 assert.ok(state.club.every(i=>i.variant==='story'&&i.tradeable===false));
 assert.deepEqual(Array.from(state.storyPassPending),[]);
});
