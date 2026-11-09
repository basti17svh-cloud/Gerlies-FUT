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

test('V21.373 outcome cues: only ball and goal (net + cheer, post clang), nothing else',()=>{
 const goalAt=shotArrival('goal','central');
 const goal=outcomeCues({type:'goal',team:'home'},{goalArrival:goalAt});
 assert.deepEqual(goal.map(c=>c.cue),['net','roar']);
 assert.equal(goal[0].time,goalAt);
 const away=outcomeCues({type:'goal',team:'away'},{goalArrival:goalAt});
 assert.ok(away.find(c=>c.cue==='roar').size<.5,'away goal: only the away block cheers');
 assert.deepEqual(outcomeCues({type:'shot_post',team:'home'},{impactTime:6.8}).map(c=>c.cue),['post']);
 for(const ev of [{type:'big_chance_saved'},{type:'big_chance_missed',keeperAction:'line_clear'},{type:'ball_won'},{type:'ceremony',ceremony:'kickoff'},{type:'ceremony',ceremony:'fulltime',result:'win'}])
  assert.deepEqual(outcomeCues(ev,{impactTime:6.6}),[],ev.type+' '+(ev.ceremony||''));
});

function fakeSound(){
 const calls=[],bed={levels:[],muffled:[],stopped:0,level(v){this.levels.push(v)},muffle(v){this.muffled.push(v)},stop(){this.stopped++}};
 const api={enabled:()=>true,crowd:o=>{calls.push(['crowd',o]);return bed}};
 for(const n of ['kick','net','post','whistle','roar','groan','applause','chant'])api[n]=(...a)=>calls.push([n,...a]);
 return{api,calls,bed};
}

test('scene director: no crowd bed, kicks follow the ball, goal once, replay repeats only touches',()=>{
 const {api,calls}=fakeSound(),goalArrival=shotArrival('goal','triangle_left');
 const s=createSceneSound({type:'goal',team:'home'},{sound:api,goalArrival});
 for(let t=0;t<=10.4;t+=1/60)s.update(t,{ball:ballPosition('goal',t,'triangle_left'),goal:[0,0,-52.5]});
 const names=calls.map(c=>c[0]);
 assert.equal(names.filter(n=>n==='crowd').length,0,'no background sound');
 assert.ok(names.every(n=>['kick','net','roar'].includes(n)),names.join(','));
 assert.equal(names.filter(n=>n==='net').length,1);assert.equal(names.filter(n=>n==='roar').length,1);
 assert.ok(names.filter(n=>n==='kick').length>=5);
 s.replay(true);
 const before=calls.length;
 for(let t=5;t<=7;t+=1/60)s.update(t,{ball:ballPosition('goal',t,'triangle_left'),goal:[0,0,-52.5]});
 const replayCalls=calls.slice(before);
 assert.ok(replayCalls.every(c=>c[0]==='kick'),'replay repeats only touches, no second roar');
 assert.ok(replayCalls.length>=1,'shot touch in the replay');
 s.dispose();s.dispose();
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
 assert.equal(S.crowd(),null);assert.equal(S.pack('tunnel'),null);
 assert.equal(S.setEnabled(false),false);assert.equal(storage.get('footera-sound-v1'),'off');
 assert.equal(S.setEnabled(true),true);assert.equal(storage.get('footera-sound-v1'),'on');
 delete globalThis.FooteraSound;delete globalThis.localStorage;
});

test('release wiring: script order, scene import, cache, settings and pack hooks',()=>{
 const html=read('index.html'),sw=read('service-worker.js'),scene=read('3d-highlights-scene.mjs'),app=read('footera-app.js'),css=read('3d-highlights.css');
 assert.ok(html.indexOf('footera-sound.js?v=21374')>0&&html.indexOf('footera-sound.js?v=21374')<html.indexOf('3d-highlights.js?v='));
 assert.match(html,/<select data-sound-mode[^>]*><option value="on">An<\/option><option value="off">Aus<\/option>/);
 assert.match(scene,/from '\.\/3d-stadium-sound\.mjs\?v=21373'/);
 for(const f of ['./3d-stadium-sound.mjs?v=21373','./footera-sound.js?v=21374'])assert.ok(sw.includes(`"${f}"`),f);
 assert.match(scene,/stadiumSound\.update\(displayTime,world\.soundProbe\?\.\(\)\)/);
 assert.match(scene,/stadiumSound\.replay\(true\)/);
 assert.match(scene,/done=true;try\{stadiumSound\.dispose\(\)\}/);
 assert.match(css,/\.fh3d-sound\{[^}]*width:44px;height:44px/);
 for(const step of ['tunnel','clue','flash','board','plain','card'])assert.ok(app.includes(`packSound("${step}"`),step);
 assert.match(app,/tunnelSound\?\.stop\?\.\(\)/);
 // V21.374: pack openings play the recorded walkout again; the swell is timed to the flash.
 assert.match(app,/const PACK_SOUND_ENABLED=true;\nfunction packSound\(step,opts\)\{if\(!PACK_SOUND_ENABLED\)return null;/);
 assert.match(app,/packSound\("tunnel",\{flashIn:4\.25\*\(plan\.pace\|\|1\)\}\)/);
 assert.match(app,/window\.FooteraSound\?\.preload\?\.\(\)/);
});

test('V21.372 clear sound: no hiss layers (no clap/applause noise, no rain hiss, crowd noise only as low rumble)',()=>{
 const src=read('footera-sound.js');
 assert.doesNotMatch(src,/applauseBuffer|type:'applause'/,'no clapping noise buffer');
 const crowd=src.slice(src.indexOf(' function crowd('),src.indexOf(' // ---------------------------------------------------------------- packs'));
 assert.doesNotMatch(crowd,/'white'|highpass',3800/,'no hiss in the stadium bed');
 assert.match(crowd,/filter\(c,'lowpass',300\)/,'only a low rumble from noise');
 const packs=src.slice(src.indexOf(' function pack('),src.indexOf(' function setEnabled('));
 assert.doesNotMatch(packs,/noise\(/,'walkout is tonal: no noise riser');
 const whistle=src.slice(src.indexOf(' function whistle('),src.indexOf(' function roar('));
 assert.doesNotMatch(whistle,/noise\(/,'clean whistle tone');
});

test('V21.374 walkout: real CC0 recordings, credited, small, and every one is used',()=>{
 const dir=new URL('../assets/sounds/walkout/',import.meta.url),credits=read('assets/sounds/walkout/CREDITS.md'),src=read('footera-sound.js');
 const names=JSON.parse(src.match(/SAMPLE_NAMES=(\[[^\]]+\])/)[1].replace(/'/g,'"'));
 let total=0;
 for(const n of names){
  const f=new URL(n+'.mp3',dir),size=fs.statSync(f).size;total+=size;
  assert.ok(size>8000&&size<200000,n+' '+size);
  const row=credits.split('\n').find(l=>l.startsWith('| `'+n+'.mp3`'));
  assert.ok(row&&/\| CC0 1\.0 \|$/.test(row),n+' credited as CC0');
  assert.ok(src.includes(`'${n}'`),n);
 }
 assert.ok(total<700000,'walkout sounds stay under 700 KB: '+total);
 assert.deepEqual(fs.readdirSync(dir).filter(f=>f.endsWith('.mp3')).sort(),names.map(n=>n+'.mp3').sort(),'no unused files');
 assert.match(src,/SAMPLE_BASE='assets\/sounds\/walkout\/',SAMPLE_V='21374'/);
});

function fakeAudio(){
 const started=[];
 const param=()=>({value:1,setValueAtTime(){},setTargetAtTime(v,t){this.target=[v,t]},cancelScheduledValues(){},exponentialRampToValueAtTime(){},linearRampToValueAtTime(){}});
 const node=()=>({connect(){},gain:param(),frequency:param(),Q:param()});
 const c={currentTime:0,state:'running',sampleRate:44100,destination:{},
  createGain:()=>node(),createBiquadFilter:()=>({...node(),type:''}),createDynamicsCompressor:()=>({...node(),threshold:param(),knee:param(),ratio:param(),attack:param(),release:param()}),
  createBufferSource(){const s={...node(),playbackRate:param(),buffer:null,start(at){started.push({name:s.buffer.name,at,rate:s.playbackRate.value})}};return s},
  decodeAudioData:(data)=>Promise.resolve({name:data.name})};
 return{c,started};
}

test('V21.374 walkout timing: swell and riser peak on the card, a skip fades them, nothing loaded = silence',async()=>{
 const storage=new Map();
 globalThis.localStorage={getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,String(v))};
 const fetched=[];
 globalThis.fetch=async url=>{fetched.push(url);const name=url.split('/').pop().split('.')[0];return{ok:true,arrayBuffer:async()=>({name})}};
 delete require.cache[require.resolve('../footera-sound.js')];
 require('../footera-sound.js');
 const S=globalThis.FooteraSound;
 try{
  const {c,started}=fakeAudio(),bus={context:c,connect(){}};
  // Not loaded yet: no sound, no error.
  const empty=fakeAudio();assert.doesNotThrow(()=>S.pack('flash',0,{context:empty.c,connect(){}}));
  assert.equal(empty.started.length,0);fetched.length=0;
  assert.equal(await S.preload(c),true);
  assert.equal(fetched.filter(u=>u.includes('?v=21374')).length,9);
  const t=S.pack('tunnel',1,bus,{flashIn:4.25});
  const at=n=>started.find(s=>s.name===n)?.at;
  assert.equal(at('stadium'),1);
  assert.ok(Math.abs(at('swell')+2.25-5.25)<1e-9,'swell peaks on the flash');
  assert.ok(Math.abs(at('riser')+3.98-5.25)<1e-9,'riser ends on the flash');
  S.pack('clue',2.2,bus);S.pack('clue',3.2,bus);S.pack('clue',4.1,bus);
  assert.deepEqual(started.filter(s=>s.name==='hit').map(s=>+s.rate.toFixed(2)),[1,1.06,1.12],'clues climb');
  S.pack('flash',5.25,bus);
  for(const n of ['boom','cheer','fireworks','sparkle'])assert.ok(at(n)!==undefined,n);
  assert.ok(typeof t.stop==='function');assert.doesNotThrow(()=>t.stop(5.25));assert.doesNotThrow(()=>t.stop(2));
 }finally{delete globalThis.FooteraSound;delete globalThis.localStorage;delete globalThis.fetch}
});
