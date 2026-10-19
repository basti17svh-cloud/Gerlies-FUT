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
 assert.match(scene,/const modelVariant=!weak&&footeraHumanPlayersWanted\(\)&&isFooteraHumanModelReady\(\)\?'human':'quaternius'/);
 assert.doesNotMatch(scene,/const modelVariant=[^;]*'makehuman'/);
 assert.match(scene,/makeScene\(renderer,event,weak,high,mobileStandard,false,fluidMotion,!forceLegacyModel,modelVariant\)/);
});
test('V21.81: diagnostics remain honest and cannot re-enable failed model',()=>{
 assert.match(diagnostics,/NICHT FREIGEGEBEN/);
 assert.doesNotMatch(diagnostics,/id="activateModel"/);
 assert.doesNotMatch(diagnostics,/setItem\('footera-3d-player-model','makehuman'\)/);
 assert.match(diagnostics,/makeScene\(renderer,event,false,false,true,false,true,true,'makehuman'\)/);
 assert.doesNotMatch(worker,/\.\/assets\/footera\/models\/makehuman-male\.glb/);
});
