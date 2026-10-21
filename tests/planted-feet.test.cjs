const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),read=f=>fs.readFileSync(path.join(root,f),'utf8');

test('V21.206: free-kick wall stands shoulder to shoulder in front of the ball',async()=>{
 const E=await import('../3d-extended-match.mjs');
 const wall=[8,9,10,11].map(i=>E.extendedPosition(i,2,'extended_free_kick'));
 for(let i=1;i<wall.length;i++){const gap=wall[i][0]-wall[i-1][0];assert.ok(gap>.45&&gap<.65,'shoulder gap '+gap);assert.equal(wall[i][1],wall[0][1])}
 const centre=(wall[0][0]+wall[3][0])/2;assert.ok(Math.abs(centre)<.3,'wall covers the ball line');
});

test('V21.206: support boot steps in beside the ball, holds through contact, then steps out',async()=>{
 const M=await import('../3d-highlights-scene.mjs');
 assert.equal(M.plantFootSample(4.9),null);assert.equal(M.plantFootSample(5.8),null);
 const hold=M.plantFootSample(M.SHOT_TIME);assert.ok(hold.weight>.99&&Math.abs(hold.lift)<1e-9,'planted at contact');
 assert.ok(M.plantFootSample(5.06).lift>.05,'steps in');assert.ok(M.plantFootSample(5.68).lift>.05,'steps out');
 const src=read('3d-highlights-scene.mjs');
 assert.match(src,/const plant=event\.type!=='ball_won'&&!\['header','volley','bicycle'\]\.includes\(finish\)\?plantFootSample\(time\):null/);
 assert.match(src,/actorPosition\(0,SHOT_TIME,event\.type,sequence\)/);
});

test('V21.206: walking pace takes steps and gait follows the path that is shown',async()=>{
 const M=await import('../3d-highlights-scene.mjs');
 assert.equal(M.locomotionEffort(0),0);assert.ok(M.locomotionEffort(.05)>.5,'1/3 m/s already steps');assert.equal(M.locomotionEffort(.2),1);
 const src=read('3d-highlights-scene.mjs');
 assert.match(src,/shown=actorPosition\(index,j\*dt\)/);
 assert.match(src,/runningStrideLength\(speed\)\*Math\.max\(\.12,locomotionEffort\(speed\)\)/);
 assert.match(src,/g\.hip\*motion\*mix\(1,d\.strideReach\*Math\.min\(1\.045,c\.reach\),g\.swingWeight\)/,'compact reach only in swing');
 assert.match(src,/applyFootballControl\(p,stride\+Math\.PI,/,'the swinging boot touches the ball');
});

test('V21.206: captured and transition layers leave a planted boot in place',async()=>{
 const {applyMotion23}=await import('../3d-motion-transition.mjs');
 const joint=()=>({rotation:{x:0,y:0,z:0},position:{x:0,y:0,z:0}});
 const p={upper:joint(),rig:joint(),legs:[joint(),joint()],knees:[joint(),joint()],ankles:[joint(),joint()],arms:[joint(),joint()],
  gait:[{support:true,swingWeight:0},{support:true,swingWeight:0}]};
 applyMotion23(p,3.3,.5,0,1,0,'dribble','carrier');
 assert.equal(p.legs[1].rotation.x,0,'no forward reach on a planted free leg');
 const flex=p.knees[0].rotation.x;assert.ok(Math.abs(p.legs[0].rotation.x+flex/2)<1e-9,'support hip follows its knee');
 assert.match(read('3d-mocap-runtime.mjs'),/const swing=p\.gait\?\.\[i\]\?\.swingWeight\?\?1;/);
});
