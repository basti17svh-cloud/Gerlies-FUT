const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
const main=html.match(/<script>\s*(const DB_SOURCES=[\s\S]*?)<\/script>/)[1];
const stateDeclaration=main.match(/^let PLAYERS=.*;$/m)[0];
// Keep the real script order and hoisted functions. Stop only after the first
// state initialization so declarations below it still have their real TDZ.
const startup=main.replace(stateDeclaration,stateDeclaration+'\nstartupLoaded(state);throw startupStop;');

function start(saved={}){
 const stored=new Map(Object.entries(saved)),stop={},ctx={
  crypto:{randomUUID:()=> '01234567-89ab-cdef-0123-456789abcdef'},
  localStorage:{getItem:key=>stored.get(key)||null,setItem(){assert.fail('startup must not overwrite the save')}},
  startupStop:stop,startupLoaded(value){ctx.loaded=value}
 };
 vm.createContext(ctx);
 try{vm.runInContext(startup,ctx,{timeout:1000})}catch(error){if(error!==stop)throw error}
 assert.ok(ctx.loaded,'startup reached initialized game state');
 return ctx.loaded;
}

const club=Array.from({length:23},(_,i)=>({uid:`card-${i}`,pid:`player-${i}`,tradeable:true}));
const fixture={onboarded:true,coins:123456,points:720,sp:450,club,squad:club.map(x=>x.uid),formation:'4-4-2',tactic:'attacking',roles:{0:'Keeper'},focus:{0:'Defend'},profile:{saveId:'GF-EXISTING',username:'Existing',clubName:'Existing FC'},packs:{gold:4},stats:{matches:17,wins:9},pendingPack:[{uid:'pending-1',pid:'player-24'}],pendingResolved:[]};

test('fresh install initializes state in the actual page script order',()=>{
 const state=start();
 assert.equal(state.coins,5000);assert.equal(state.onboarded,false);
 assert.equal(state.squad.length,23);assert.equal(state.squadPresets[0].formation,'4-3-3');
});

for(const key of ['gerliesFutV9','uc27v7'])test(`existing ${key} save starts with club, currency and lineup intact`,()=>{
 const state=start({[key]:JSON.stringify(fixture)});
 for(const field of ['coins','points','sp','formation','tactic'])assert.equal(state[field],fixture[field]);
 for(const field of ['club','squad','packs','pendingPack','roles','focus'])assert.deepEqual(JSON.parse(JSON.stringify(state[field])),fixture[field]);
 assert.equal(state.profile.saveId,fixture.profile.saveId);assert.equal(state.stats.matches,17);
 assert.equal(state.squadPresets[0].formation,'4-4-2');
});

test('a saved alternate team remains active when the page initializes',()=>{
 const saved={...fixture,activeSquadPreset:1,squadPresets:[{name:'First team',formation:'4-3-3',squad:club.map(x=>x.uid)},{name:'Second team',formation:'4-4-2',squad:club.map(x=>x.uid)}]};
 const state=start({gerliesFutV9:JSON.stringify(saved)});
 assert.equal(state.activeSquadPreset,1);assert.equal(state.squadPresets[1].name,'Second team');
 assert.equal(state.squadPresets[0].formation,'4-3-3');assert.equal(state.formation,'4-4-2');
});

test('unreadable save fallback can initialize without another startup exception',()=>{
 const state=start({gerliesFutV9:'{broken json'});
 assert.equal(state.coins,5000);assert.equal(state.squad.length,23);
});

test('an update preserves partial POTM submissions, claimed rewards and frozen weekly rewards',()=>{
 const saved={...fixture,potmProgress:{'potm-2026-09-olise':{score:310000,submittedCount:18,claimedAt:null},'potm-2026-09-gross':{score:13125,submittedCount:12,claimedAt:12345}},sbcCompletions:{'potm-2026-09-gross':true},weeklyRewards:[{mode:'squad',week:'old-week',rank:'Elite 3',claimed:false,reward:{coins:15000,packs:[]}}],squadBattle:{week:'new-week',points:0,played:0,playedIds:[]}};
 const loaded=start({gerliesFutV9:JSON.stringify(saved)});
 for(const field of ['club','coins','points','potmProgress','sbcCompletions','weeklyRewards','squadBattle'])assert.deepEqual(JSON.parse(JSON.stringify(loaded[field])),saved[field]);
});
