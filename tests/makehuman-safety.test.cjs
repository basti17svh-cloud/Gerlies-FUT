'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const bridge=fs.readFileSync(path.join(root,'3d-highlights.js'),'utf8');
const scene=fs.readFileSync(path.join(root,'3d-highlights-scene.mjs'),'utf8');
const diagnostics=fs.readFileSync(path.join(root,'makehuman-vergleich.html'),'utf8');
const worker=fs.readFileSync(path.join(root,'service-worker.js'),'utf8');
test('V21.81: broken MakeHuman variant is not enabled by localStorage in live Matchday',()=>{
 assert.match(bridge,/if\(model==='makehuman'\)root\.localStorage\?\.removeItem\('footera-3d-player-model'\)/);
 assert.doesNotMatch(bridge,/module\.prepareFooteraMakeHumanModel\(/);
 // V21.192: the live Matchday picks the new human squad or Quaternius, never the old lab model.
 assert.match(scene,/const modelVariant=footeraHumanPlayersWanted\(\)&&isFooteraHumanModelReady\(\)\?'human':'quaternius'/);
 assert.doesNotMatch(scene,/const modelVariant=[^;]*'makehuman'/);
 // V21.482: sceneEvent is the same event (a VAR-disallowed goal is built as a goal).
 assert.match(scene,/makeScene\(renderer,sceneEvent,weak,high,mobileStandard,false,fluidMotion,!forceLegacyModel,modelVariant\)/);
});
test('V21.81: diagnostics remain honest and cannot re-enable failed model',()=>{
 assert.match(diagnostics,/NICHT FREIGEGEBEN/);
 assert.doesNotMatch(diagnostics,/id="activateModel"/);
 assert.doesNotMatch(diagnostics,/setItem\('footera-3d-player-model','makehuman'\)/);
 assert.match(diagnostics,/makeScene\(renderer,event,false,false,true,false,true,true,'makehuman'\)/);
 assert.doesNotMatch(worker,/\.\/assets\/footera\/models\/makehuman-male\.glb/);
});

// Model readiness and explicit preferences apply equally to LOW and HIGH.
test('human model selection works on LOW hardware and preserves loading/manual fallbacks',async()=>{
 const {footeraHumanPlayersWanted}=await import('../3d-highlights-scene.mjs');
 const vm=require('node:vm'),savedNavigator=Object.getOwnPropertyDescriptor(globalThis,'navigator'),savedStorage=Object.getOwnPropertyDescriptor(globalThis,'localStorage');
 const expression=scene.match(/const modelVariant=([^;]+);/)[1];
 try{
  for(const [memory,cores] of [[2,2],[4,4],[4,8],[8,12]])for(const preference of [null,'human','quaternius','legacy'])for(const ready of [false,true]){
   Object.defineProperty(globalThis,'navigator',{configurable:true,value:{deviceMemory:memory,hardwareConcurrency:cores}});
   Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{getItem:()=>preference}});
   const wanted=!['quaternius','legacy'].includes(preference);
   assert.equal(footeraHumanPlayersWanted(),wanted,`prewarm ${memory} GB / ${cores} cores`);
   assert.equal(vm.runInNewContext(expression,{weak:memory<4||cores<=4,footeraHumanPlayersWanted,isFooteraHumanModelReady:()=>ready}),wanted&&ready?'human':'quaternius');
  }
 }finally{
  for(const [key,descriptor] of [['navigator',savedNavigator],['localStorage',savedStorage]]){
   if(descriptor)Object.defineProperty(globalThis,key,descriptor);else delete globalThis[key];
  }
 }
});
