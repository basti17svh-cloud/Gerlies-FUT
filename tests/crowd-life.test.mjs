// V21.460 Lebendige Ränge (Basti 2026-11-17: "Die Fans müssen lebendiger werden und die Ränge müssen echt leben. Choreo, Fahnen, etc.")
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {crowdLifeState,crowdLifeWanted,SCARF_SHARE,OLA_PERIOD,CROWD_LIFE_VERSION} from '../3d-crowd-life.mjs';
const root=new URL('..',import.meta.url),read=f=>fs.readFileSync(new URL(f,root),'utf8');
test('walk-out: scarves up all round, mosaic rises in the home end, ticker tape, flags flying',()=>{
 const early=crowdLifeState({kind:'ceremony_kickoff',time:0,mosaic:true}),up=crowdLifeState({kind:'ceremony_kickoff',time:3.5,mosaic:true});
 assert.equal(early.scarf[0],0);assert.ok(up.scarf[0]>.99&&up.scarf[1]>.85);
 assert.ok(up.mosaic>.99&&up.confetti>.99);assert.ok(up.flag[0]>1&&up.flag[1]>1);
 assert.equal(crowdLifeState({kind:'ceremony_kickoff',time:3.5,mosaic:false}).mosaic,0);
});
test('goal: the scorers\' block jumps and twirls scarves, the other end goes quiet',()=>{
 const before=crowdLifeState({kind:'goal',attackTeam:'away',time:5,netArrival:5.4,end:10});
 const after=crowdLifeState({kind:'goal',attackTeam:'away',time:7.2,netArrival:5.4,end:10});
 assert.equal(before.jump[1],0);assert.ok(after.jump[1]>.9&&after.twirl[1]>.9&&after.scarf[1]>.9);
 assert.equal(after.jump[0],0);assert.ok(after.flag[1]>after.flag[0]);
 assert.ok(before.chant[0]>0&&before.chant[1]>0,'ends chant during play');
});
test('saves cheer the defending end; full-time winners start La Ola round the ground',()=>{
 const save=crowdLifeState({kind:'big_chance_saved',attackTeam:'home',time:6.65+.8,impact:6.65});
 assert.ok(save.jump[1]>.4&&save.jump[0]===0);
 const ft=crowdLifeState({kind:'ceremony_fulltime',attackTeam:'home',time:4});
 assert.ok(ft.ola>.9&&ft.jump[0]>.8&&ft.scarf[0]>.9);
 assert.ok(Math.abs(ft.olaAngle-(4-.6)*Math.PI*2/OLA_PERIOD)<1e-9);
 assert.equal(crowdLifeState({kind:'ceremony_draw',time:4}).ola,0);
});
test('scene wiring: GPU layer on all four crowd parts, opt-out, reduce, cache versions',()=>{
 const scene=read('3d-highlights-scene.mjs'),sw=read('service-worker.js'),life=read('3d-crowd-life.mjs');
 assert.match(scene,/from '\.\/3d-crowd-life\.mjs\?v=21461'/);
 for(const part of ['torso','head','arm','leg'])assert.match(scene,new RegExp(`crowdLife\\.material\\('${part}'\\)`));
 assert.match(scene,/crowdLife\.attach\(crowdStatic\);crowdLife\.attach\(crowdDynamic\)/);
 assert.match(scene,/crowdLife\?\.reduce\(\)/);assert.match(scene,/updateCrowd\(time\);crowdLife\?\.update\(time\)/);
 assert.ok(sw.includes('"./3d-crowd-life.mjs?v=21461"'));
 assert.match(life,/footera-3d-crowd-life/);assert.equal(/Math\.random\s*\(/.test(life),false);
 assert.equal(crowdLifeWanted(),true);assert.ok(SCARF_SHARE.host>SCARF_SHARE.guest);assert.equal(CROWD_LIFE_VERSION,'21.461');
});
