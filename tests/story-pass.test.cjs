const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const html=require('./helpers/app-html.cjs')();
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

test('Season 2 pass players are real DB players, rise in rating and stay out of running promos',()=>{
 const start=html.indexOf('const STORY_PASS_PLAYERS='),end=html.indexOf('});',start)+3;
 const ctx={};vm.createContext(ctx);vm.runInContext(html.slice(start,end).replace('const STORY_PASS_PLAYERS=','globalThis.STORY_PASS_PLAYERS='),ctx);
 const s2=Object.entries(ctx.STORY_PASS_PLAYERS).filter(([,spec])=>spec.season==='s2');
 assert.equal(s2.length,12);
 const csv=fs.readFileSync(path.join(__dirname,'../assets/players-db.csv'),'utf8');
 const ovr=new Set(csv.split("\n").map(line=>line.split(",")[0]));
 const promoPids=new Set([...(html.slice(0,start)+html.slice(end)).matchAll(/pid:"(\d+)"/g)].map(m=>m[1]));
 for(const track of ['free','premium']){
  const rows=s2.filter(([,spec])=>spec.track===track).sort((a,b)=>a[1].level-b[1].level);
  for(let i=1;i<rows.length;i++)assert.ok(rows[i][1].rating>rows[i-1][1].rating,`${track} ratings rise with the level`);
 }
 for(const [key,spec] of s2){
  assert.ok(ovr.has(spec.pid),`${key} pid ${spec.pid} exists in the player DB`);
  assert.ok(!promoPids.has(spec.pid),`${key} is not part of another promo`);
  assert.equal(key,`s2-${spec.track==='premium'?'premium-':''}${spec.level}`);
  assert.equal(spec.stats.length,6);assert.ok(spec.stats.every(v=>v>=20&&v<=99));
  assert.ok(spec.rating>=80&&spec.rating<=87);
 }
});

test('Pass players with a pid resolve by id before falling back to names',()=>{
 const state={club:[],storyPassPending:[],storyPassGranted:{},seasonPass:{key:'s2',freeClaims:{5:true},premiumClaims:{}}};
 const ctx={state,PLAYERS:[{id:'272505',name:'Endrick'}],P_BY_ID:new Map([['272505',{id:'272505',name:'Endrick'}]]),DATA_ROUTE:'GitHub FC27 CSV',
  STORY_PASS_PLAYERS:{'s2-5':{season:'s2',track:'free',level:5,pid:'272505',name:'Endrick Felipe',rating:81,position:'ST',stats:[89,83,68,82,32,75]}},
  normalizeKey:s=>String(s||'').toLowerCase(),makeItem:(base,tradeable,opts)=>({uid:'x',pid:base.id,tradeable,...opts}),save(){},esc:s=>s,cardHTML:()=>''};
 vm.createContext(ctx);vm.runInContext(source,ctx);
 vm.runInContext('reconcileStoryPassPlayers()',ctx);
 assert.equal(state.club.length,1);
 assert.equal(state.club[0].eventName,'SAISON 2');
 assert.equal(state.club[0].storyRewardKey,'s2-5');
});
