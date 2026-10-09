const test=require('node:test'),assert=require('node:assert/strict');
const {readFileSync}=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const file=path.join(root,'3d-football-animation.mjs');
test('animation is original, deterministic and has physically separated action phases',async()=>{
 const M=await import('../3d-football-animation.mjs');
 assert.match(readFileSync(file,'utf8'),/independently authored/);
 assert.equal(M.FOOTBALL_ANIMATION_VERSION,'21.38-pilot');
 const pre=M.strikeMechanics(5.12,'power'),impact=M.strikeMechanics(5.4,'power'),post=M.strikeMechanics(5.63,'power');
 assert.ok(pre.backswing>.5&&post.follow>.6,'visibly different backswing and follow-through');
 assert.equal(impact.backswing,0);assert.equal(impact.follow,0);
 assert.equal(M.strikeMechanics(5.2,'finesse').curl,1);
 assert.equal(M.strikeMechanics(5.2,'power').curl,0);
 assert.equal(M.strikeMechanics(5.2,'header').header,1);
 const k=[5.73,6.4,6.98,8.55].map(t=>M.keeperDiveMechanics(t,'fingertip'));
 assert.ok(k[0].load>.5&&k[1].flight>.5&&k[2].landing>.5&&k[3].rise>.5,'load, flight, land, rise occur sequentially');
 assert.deepEqual(M.strikeMechanics(5.12,'finesse'),M.strikeMechanics(5.12,'finesse'));
});
test('kinematic posing is finite and preserves boot-contact joint angles at release',async()=>{
 const M=await import('../3d-football-animation.mjs');
 const limb=()=>({rotation:{x:0,y:0,z:0}});
 const pose=()=>({upper:limb(),rig:{...limb(),position:{y:0}},legs:[limb(),limb()],knees:[limb(),limb()],ankles:[limb(),limb()],arms:[limb(),limb()],elbows:[limb(),limb()],gait:[{support:true},{support:false}]});
 const p=pose();const before=[p.legs[1].rotation.x,p.knees[1].rotation.x,p.ankles[1].rotation.x];
 M.animateFootballFinish(p,5.4,'finesse','cut_inside_right');
 assert.deepEqual([p.legs[1].rotation.x,p.knees[1].rotation.x,p.ankles[1].rotation.x],before,'shot-contact joint positions unchanged');
 const p2=pose();M.animateFootballFinish(p2,5.12,'power');assert.ok(Math.abs(p2.legs[1].rotation.x)>.2);
 const p3=pose();M.animateAthleticRun(p3,.8,.1,2.5,.6,.5);assert.ok(Math.abs(p3.upper.rotation.x)>.02);
 const p4=pose();M.animateGoalkeeperDive(p4,6.4,'high_reach');assert.ok(Math.abs(p4.legs[0].rotation.x)>.02);
 for(const subject of [p,p2,p3,p4])for(const key of ['upper','rig',...'']){if(!subject[key])continue;for(const v of Object.values(subject[key].rotation))assert.ok(Number.isFinite(v))}
});
test('pilot wiring is isolated from simulation, no randomness and supports baseline comparison',()=>{
 const scene=readFileSync(path.join(root,'3d-highlights-scene.mjs'),'utf8');
 const sw=readFileSync(path.join(root,'service-worker.js'),'utf8');
 assert.match(scene,/animateAthleticRun/);assert.match(scene,/animateFootballFinish/);assert.match(scene,/animateGoalkeeperDive/);
 assert.match(scene,/__FOOTERA_V2137_BASELINE/);
 assert.ok(sw.includes('3d-football-animation.mjs?v=2174'));
 assert.ok(!readFileSync(file,'utf8').includes('Math.random'));
});
