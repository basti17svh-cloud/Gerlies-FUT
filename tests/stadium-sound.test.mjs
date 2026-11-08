// V21.371 Stadion-Sound: touch detection from the real scene ball paths,
// outcome cues, the per-scene director, the sound setting and release wiring.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRequire} from 'node:module';
import {createKickDetector,crowdExcitement,outcomeCues,createSceneSound} from '../3d-stadium-sound.mjs';
import {ballPosition,shotArrival,SHOT_TIME} from '../3d-highlights-scene.mjs';

const require=createRequire(import.meta.url);
const read=f=>fs.readFileSync(new URL('../'+f,import.meta.url),'utf8');

function kicksFor(type,seq,step=1/60){
 const d=createKickDetector(),out=[];
 for(let t=0;t<=10.4;t+=step){const k=d.sample(t,ballPosition(type,t,seq));if(k)out.push(k)}
 return out;
}

test('every pass of a playbook move and the shot get a touch, at 20/30/60 fps alike',()=>{
 for(const step of [1/20,1/30,1/60]){
  const kicks=kicksFor('goal','triangle_left',step),hard=kicks.filter(k=>k.kind!=='receive');
  // Four passes plus the shot.
  assert.ok(hard.length>=5&&hard.length<=6,`${step}: ${hard.map(k=>k.time.toFixed(2)+k.kind).join(' ')}`);
  const shot=hard.find(k=>Math.abs(k.time-SHOT_TIME)<.12);
  assert.ok(shot,'shot touch at SHOT_TIME');
  assert.ok(shot.strength>=.6,'a shot sounds harder than a pass');
  // Never two touches closer than the gap.
  for(let i=1;i<kicks.length;i++)assert.ok(kicks[i].time-kicks[i-1].time>=.19);
 }
});

test('a ball standing still or rolling out makes no sound',()=>{
 const d=createKickDetector();let hits=0;
 for(let t=0;t<3;t+=1/60)if(d.sample(t,[0,.11,-20]))hits++;
 // Rolling out after a pass: constant deceleration from 9 m/s.
 const roll=createKickDetector();roll.sample(-.05,[-.45,.11,0]);roll.sample(-.02,[-.18,.11,0]);
 for(let t=0;t<2;t+=1/60){const x=9*t-2.2*t*t;if(roll.sample(t,[x,.11,0]))hits++}
 assert.equal(hits,0);
});

test('slow motion steps do not create phantom touches',()=>{
 const d=createKickDetector();let hits=0;
 // The goal slow motion advances scene time by ~4 ms per frame.
 for(let t=6.72;t<7.32;t+=.004)if(d.sample(t,ballPosition('goal',t,'central'))?.kind==='launch')hits++;
 assert.equal(hits,0);
});

test('the crowd gets louder as the ball nears goal',()=>{
 assert.ok(crowdExcitement(55)<crowdExcitement(30));
 assert.ok(crowdExcitement(30)<crowdExcitement(12));
 assert.equal(crowdExcitement(5),crowdExcitement(12));
 assert.ok(crowdExcitement(5)<=.9);
});

test('outcome cues: net + roar on the goal, post clang, "Ohhh" on saves and misses, whistles at ceremonies',()=>{
 const goalAt=shotArrival('goal','central');
 const goal=outcomeCues({type:'goal',team:'home'},{goalArrival:goalAt});
 assert.deepEqual(goal.map(c=>c.cue),['net','roar','chant']);
 assert.equal(goal[0].time,goalAt);
 const away=outcomeCues({type:'goal',team:'away'},{goalArrival:goalAt});
 assert.ok(away.find(c=>c.cue==='roar').size<.5,'away goal: only the away block cheers');
 assert.ok(away.some(c=>c.cue==='groan'));
 assert.deepEqual(outcomeCues({type:'shot_post',team:'home'},{impactTime:6.8}).map(c=>c.cue),['post','groan']);
 assert.deepEqual(outcomeCues({type:'big_chance_saved',team:'home'},{impactTime:6.6}).map(c=>c.cue),['groan','applause']);
 assert.deepEqual(outcomeCues({type:'big_chance_missed',team:'home',keeperAction:'line_clear'},{impactTime:6.8}).map(c=>c.cue),['groan','applause']);
 const kickoff=outcomeCues({type:'ceremony',ceremony:'kickoff'},{ceremonyCut:4.4});
 assert.equal(kickoff.at(-1).cue,'whistle');assert.ok(kickoff.at(-1).time<10.4,'kick-off whistle inside the scene');
 const full=outcomeCues({type:'ceremony',ceremony:'fulltime',team:'home',result:'win'});
 assert.equal(full[0].cue,'whistle');assert.equal(full[0].pattern,'final');
});

function fakeSound(){
 const calls=[],bed={levels:[],muffled:[],stopped:0,level(v){this.levels.push(v)},muffle(v){this.muffled.push(v)},stop(){this.stopped++}};
 const api={enabled:()=>true,crowd:o=>{calls.push(['crowd',o]);return bed}};
 for(const n of ['kick','net','post','whistle','roar','groan','applause','chant'])api[n]=(...a)=>calls.push([n,...a]);
 return{api,calls,bed};
}

test('scene director: cues fire once at their time, kicks follow the ball, replay is muffled and silent of cues',()=>{
 const {api,calls,bed}=fakeSound(),goalArrival=shotArrival('goal','triangle_left');
 const s=createSceneSound({type:'goal',team:'home'},{sound:api,goalArrival});
 for(let t=0;t<=10.4;t+=1/60)s.update(t,{ball:ballPosition('goal',t,'triangle_left'),goal:[0,0,-52.5]});
 const names=calls.map(c=>c[0]);
 assert.equal(names.filter(n=>n==='net').length,1);assert.equal(names.filter(n=>n==='roar').length,1);
 assert.ok(names.filter(n=>n==='kick').length>=5);
 assert.ok(names.indexOf('net')>names.lastIndexOf('kick')-2,'net after the shot');
 assert.ok(Math.max(...bed.levels)>=.6,'stand peaks with the goal');
 s.replay(true);
 const before=calls.length;
 for(let t=5;t<=7;t+=1/60)s.update(t,{ball:ballPosition('goal',t,'triangle_left'),goal:[0,0,-52.5]});
 assert.ok(calls.slice(before).every(c=>c[0]==='kick'),'replay repeats only touches, no second roar');
 assert.deepEqual(bed.muffled,[true]);
 s.dispose();s.dispose();assert.equal(bed.stopped,1);
});

test('sound off: no crowd, no calls; switched on mid-scene: earlier cues stay silent',()=>{
 const {api,calls}=fakeSound();
 const off=createSceneSound({type:'goal'},{sound:{...api,enabled:()=>false},goalArrival:6.9});
 off.update(7,{ball:[0,0,0]});assert.equal(calls.length,0);
 const late=createSceneSound({type:'goal',team:'home'},{sound:api,goalArrival:6.9,startAt:8});
 late.update(8.1,{ball:[0,.1,-52]});
 assert.ok(!calls.some(c=>c[0]==='roar'||c[0]==='net'),'goal already over');
});

test('FooteraSound loads without Web Audio and every call is a safe no-op',()=>{
 const storage=new Map();
 globalThis.localStorage={getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,String(v))};
 delete require.cache[require.resolve('../footera-sound.js')];
 require('../footera-sound.js');
 const S=globalThis.FooteraSound;
 assert.equal(S.enabled(),true,'on by default');
 assert.equal(S.context(),null);
 for(const n of ['kick','net','post','whistle','roar','groan','applause','chant'])assert.doesNotThrow(()=>S[n]());
 assert.equal(S.crowd(),null);assert.equal(S.pack('tunnel'),undefined);
 assert.equal(S.setEnabled(false),false);assert.equal(storage.get('footera-sound-v1'),'off');
 assert.equal(S.setEnabled(true),true);assert.equal(storage.get('footera-sound-v1'),'on');
 delete globalThis.FooteraSound;delete globalThis.localStorage;
});

test('release wiring: script order, scene import, cache, settings and pack hooks',()=>{
 const html=read('index.html'),sw=read('service-worker.js'),scene=read('3d-highlights-scene.mjs'),app=read('footera-app.js'),css=read('3d-highlights.css');
 assert.ok(html.indexOf('footera-sound.js?v=21371')>0&&html.indexOf('footera-sound.js?v=21371')<html.indexOf('3d-highlights.js?v='));
 assert.match(html,/<select data-sound-mode[^>]*><option value="on">An<\/option><option value="off">Aus<\/option>/);
 assert.match(scene,/from '\.\/3d-stadium-sound\.mjs\?v=21371'/);
 for(const f of ['./3d-stadium-sound.mjs?v=21371','./footera-sound.js?v=21371'])assert.ok(sw.includes(`"${f}"`),f);
 assert.match(scene,/stadiumSound\.update\(displayTime,world\.soundProbe\?\.\(\)\)/);
 assert.match(scene,/stadiumSound\.replay\(true\)/);
 assert.match(scene,/done=true;try\{stadiumSound\.dispose\(\)\}/);
 assert.match(css,/\.fh3d-sound\{[^}]*min-height:44px/);
 for(const step of ['tunnel','clue','flash','board','plain','card'])assert.ok(app.includes(`packSound("${step}")`),step);
 assert.match(app,/tunnelSound\?\.stop\?\.\(\)/);
});
