import test from 'node:test';
import assert from 'node:assert/strict';
import {CELEBRATIONS,pickCelebration,celebrationDistance,applyCelebrationPose} from '../3d-goal-celebration.mjs';

const joint=()=>({rotation:{x:0,y:0,z:0},position:{x:0,y:0,z:0}});
const driver=()=>({rig:joint(),upper:joint(),arms:[joint(),joint()],elbows:[joint(),joint()],legs:[joint(),joint()],knees:[joint(),joint()],ankles:[joint(),joint()]});
const flat=p=>JSON.stringify(p);

test('each goal picks a stable celebration and every kind can occur', ()=>{
 const event={id:'g1',playerName:'Musiala',minute:41};
 assert.equal(pickCelebration(event),pickCelebration({...event}));
 const seen=new Set();
 for(let i=0;i<200;i++)seen.add(pickCelebration({id:'goal-'+i,playerName:'A',minute:i%90}));
 assert.deepEqual([...seen].sort(),[...CELEBRATIONS].sort());
 assert.equal(pickCelebration({...event,celebration:'knee_slide'}),'knee_slide');
});

test('celebration runs never move backwards and stay inside the pitch', ()=>{
 for(const kind of CELEBRATIONS){
  let last=0;
  for(let s=0;s<=3.5;s+=.05){const d=celebrationDistance(kind,s);assert.ok(d>=last-1e-9,kind);assert.ok(d<11,kind);last=d}
 }
});

test('poses are a pure function of time and the knee slide reaches the ground', ()=>{
 for(const kind of CELEBRATIONS){
  // The scene re-poses the driver every frame before the celebration runs.
  const a=driver(),b=driver();
  applyCelebrationPose(a,kind,2.2);applyCelebrationPose(b,kind,2.2);
  assert.equal(flat(a),flat(b),kind);
 }
 const slide=applyCelebrationPose(driver(),'knee_slide',2);
 assert.ok(slide.rootY<-.4);
 const jump=applyCelebrationPose(driver(),'jump_spin',1.75);
 assert.ok(jump.rootY>.3);
});
