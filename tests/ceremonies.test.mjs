import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {ceremonyActor,ceremonyCamera,kickoffArrival,replayWindow,replayCamera,benchRunner,BENCH_RUNNERS,FACE_CAMERA} from '../3d-ceremony.mjs';
import {applyCelebrationPose} from '../3d-goal-celebration.mjs';
import {createHighlightPlayback} from '../3d-playback-clock.mjs';
const H=createRequire(import.meta.url)('../3d-highlights.js');

const actors=[...Array(16).keys(),16];
const joint=()=>({rotation:{x:0,y:0,z:0},position:{x:0,y:0,z:0}});
const driver=()=>({rig:joint(),upper:joint(),arms:[joint(),joint()],elbows:[joint(),joint()],legs:[joint(),joint()],knees:[joint(),joint()],ankles:[joint(),joint()]});

test('walk-out: everyone reaches the line before the end and faces the main stand', ()=>{
 for(const i of actors)assert.ok(kickoffArrival(i)<9,`actor ${i} arrives at ${kickoffArrival(i)}`);
 const end=actors.map(i=>ceremonyActor('kickoff',i,10.4));
 for(const a of end){assert.ok(Math.abs(a.x-9)<.01);assert.ok(Math.abs(Math.atan2(Math.sin(a.heading-FACE_CAMERA),Math.cos(a.heading-FACE_CAMERA)))<.02);assert.equal(a.pose,'lineup')}
 assert.ok(end.slice(0,8).every(a=>a.z<0)&&end.slice(8).every(a=>a.z>0),'home and away each line up on their own side');
});

test('ceremonies never put two players inside each other (handshake partners apart)', ()=>{
 for(const [kind,draw] of [['kickoff',false],['fulltime',false],['fulltime',true]]){
  for(let t=0;t<=10.4;t+=.1){
   const ps=actors.map(i=>ceremonyActor(kind,i,t,{draw}));
   for(let a=0;a<ps.length;a++)for(let b=a+1;b<ps.length;b++){
    const d=Math.hypot(ps[a].x-ps[b].x,ps[a].z-ps[b].z);
    assert.ok(d>.8,`${kind} ${draw} t=${t.toFixed(1)} ${a}/${b} ${d.toFixed(2)}`);
   }
  }
 }
});

test('final whistle: winners celebrate, losers go down, then every pair shakes hands', ()=>{
 assert.equal(ceremonyActor('fulltime',0,3).pose,'cheer');
 assert.deepEqual([8,9,10].map(i=>ceremonyActor('fulltime',i,3).pose),['kneel_down','hands_on_knees','hands_on_head']);
 for(let j=0;j<8;j++){
  const w=ceremonyActor('fulltime',j,7.6),l=ceremonyActor('fulltime',j+8,7.6);
  assert.equal(w.pose,'handshake');assert.equal(l.pose,'handshake');
  assert.ok(Math.abs(Math.hypot(w.x-l.x,w.z-l.z)-.84)<.02);
 }
 assert.equal(ceremonyActor('fulltime',3,3,{draw:true}).pose,'hands_on_hips');
});

test('new poses move the driver joints and fade out with their weight', ()=>{
 for(const kind of ['lineup','cheer','kneel_down','hands_on_knees','hands_on_head','hands_on_hips','handshake','applause']){
  const p=driver();applyCelebrationPose(p,kind,1.2,{});
  assert.ok(Math.abs(p.arms[1].rotation.x)+Math.abs(p.arms[1].rotation.z)>.05,kind);
  const off=driver();applyCelebrationPose(off,kind,1.2,{},0);
  assert.equal(JSON.stringify(off),JSON.stringify(driver()),kind+' weight 0');
 }
 const kneel=driver(),state={};applyCelebrationPose(kneel,'kneel_down',2,state);
 assert.ok(state.rootY<-.4,'kneeling lowers the hips');
});

test('cameras stay on the broadcast side and cut once', ()=>{
 for(const kind of ['kickoff','fulltime'])for(let t=0;t<=10.4;t+=.2){
  const c=ceremonyCamera(kind,t);assert.ok(c.position[0]>1&&c.position[1]>1.5,kind+t);assert.ok(c.fov>=27&&c.fov<=38);
 }
 assert.notEqual(ceremonyCamera('kickoff',4).phase,ceremonyCamera('kickoff',5).phase);
});

test('replay covers strike to net and films from behind the goal of either end', ()=>{
 const w=replayWindow(5.4,6.9);assert.ok(w.from<5.4&&w.to>6.9);
 for(const d of [1,-1]){const c=replayCamera(d,[-2,-37],[1,1,-52]);assert.ok(c.position[2]*d<-58&&c.target[2]*d>-52&&c.position[1]>4)}
});

test('substitutes start off the scorer and end beside him', ()=>{
 for(let k=0;k<BENCH_RUNNERS;k++){
  const from=benchRunner(k,7,7,[5,-35],1),to=benchRunner(k,9,7,[5,-35],1);
  assert.ok(Math.hypot(from[0]-5,from[1]+35)>12);assert.ok(Math.hypot(to[0]-5,to[1]+35)<3.2);
 }
});

test('ceremonies run on a plain clock and only in the important/all modes', ()=>{
 const clock=createHighlightPlayback({type:'ceremony',sequence:'central'});clock.presented(0);
 let r;for(let t=50;t<=5000;t+=50)r=clock.tick(t);assert.ok(Math.abs(r.time-5)<1e-9);assert.equal(clock.totalSeconds,10.4);
 assert.equal(H.accepts('ceremony','goals'),false);assert.equal(H.accepts('ceremony','important'),true);assert.equal(H.accepts('ceremony','off'),false);
 const s=H.snapshot({id:'ceremony:fulltime',type:'ceremony',ceremony:'fulltime',team:'away',minute:90,result:'win',homeName:'A',awayName:'B',homeScore:1,awayScore:2,squadNames:['X'],bigMatch:true});
 assert.equal(s.ceremony,'fulltime');assert.equal(s.attackDirection,1);assert.equal(s.awayScore,2);assert.equal(s.squadNames[0],'X');assert.equal(s.bigMatch,true);
});
