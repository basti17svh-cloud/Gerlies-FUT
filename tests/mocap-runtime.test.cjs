const test=require('node:test');
const assert=require('node:assert/strict');
const path=require('node:path');
const url=require('node:url');
const load=()=>import(url.pathToFileURL(path.resolve(__dirname,'../3d-mocap-runtime.mjs')).href);
function bone(){return{rotation:{x:0,y:0,z:0}}}
function actor(){return{upper:bone(),legs:[bone(),bone()],knees:[bone(),bone()],ankles:[bone(),bone()],arms:[bone(),bone()],elbows:[bone(),bone()],mocapFrame:new Float32Array(33)}}
test('Footera CC0 captures are compressed with validated channel size and finite joint angles',async()=>{
 const m=await load(),data=await import('../3d-mocap-data.mjs');
 assert.equal(m.FOOTERA_MOCAP_CHANNEL_COUNT,33);
 assert.deepEqual(Object.keys(data.FOOTERA_MOCAP_CLIPS),['Idle_Loop','Walk_Loop','Jog_Fwd_Loop','Sprint_Loop','Jump_Start','Jump_Loop','Jump_Land','Roll']);
 for(const [name,c] of Object.entries(data.FOOTERA_MOCAP_CLIPS)){
  assert.ok(c.frames>=12&&c.duration>0,name);
  assert.equal(atob(c.bytes).length,c.frames*33,name);
  const pose=m.sampleMocap(name,.45);
  assert.equal(pose.length,33);assert.ok(Array.from(pose).every(Number.isFinite),name);
 }
});
test('Retargeted real sprint includes materially varying swing and bent knees',async()=>{
 const m=await load(),a=m.sampleMocap('Sprint_Loop',.1),b=m.sampleMocap('Sprint_Loop',.55);
 assert.ok(Math.abs(a[15]-b[15])>.22||Math.abs(a[24]-b[24])>.22);
 const p=actor(),early=m.applyRunningMocap(p,2,0.9,2.1);
 assert.equal(early.clip,'Sprint_Loop');assert.ok(early.blend>.75);
 assert.ok(Math.abs(p.legs[0].rotation.x)+Math.abs(p.legs[1].rotation.x)>.2);
});
test('Retarget fades entirely before foot-ball contact, never writes a ball or result',async()=>{
 const m=await load(),p=actor();
 assert.equal(m.applyRunningMocap(p,5.4,.9,4.2).blend,0);
 assert.equal(p.legs[0].rotation.x,0);
 assert.ok(m.applyRunningMocap(p,3.0,.8,4.2).blend>0);
});
test('Goalkeeper authentic jump/loading/landing clips do not alter world position',async()=>{
 const m=await load(),p=actor();
 const clips=[5.6,6.45,7.15].map(t=>m.applyKeeperMocap(p,t).clip);
 assert.deepEqual(clips,['Jump_Start','Jump_Loop','Jump_Land']);
 assert.ok(Array.from(p.mocapFrame).every(Number.isFinite));
 assert.equal(p.root,undefined);
});
