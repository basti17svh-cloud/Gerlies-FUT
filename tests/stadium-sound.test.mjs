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

test('real crowd reacts after contact: goal, miss, post, save; away supporters are quieter',()=>{
 const goalAt=shotArrival('goal','central');
 const goal=outcomeCues({type:'goal',team:'home'},{goalArrival:goalAt});
 assert.deepEqual(goal.map(c=>c.cue),['net','roar']);
 assert.equal(goal[0].time,goalAt);
 const away=outcomeCues({type:'goal',team:'away'},{goalArrival:goalAt});
 assert.ok(away.find(c=>c.cue==='roar').size<.5,'away goal: only the away block cheers');
 const post=outcomeCues({type:'shot_post',team:'home'},{impactTime:6.8});
 assert.deepEqual(post.map(c=>c.cue),['post','groan']);assert.ok(post[1].time>6.8);
 for(const type of ['big_chance_saved','big_chance_missed']){
  const cues=outcomeCues({type,team:'home'},{impactTime:6.6});
  assert.equal(cues[0].cue,'groan');assert.ok(cues.every(c=>c.time>6.6));
  assert.equal(cues.filter(c=>c.cue==='applause').length,type==='big_chance_saved'?1:0);
 }
 assert.deepEqual(outcomeCues({type:'ball_won'}),[]);
 assert.deepEqual(outcomeCues({type:'ceremony',ceremony:'kickoff'}),[]);
});

function fakeSound(){
 const calls=[],bed={levels:[],muffled:[],stopped:0,level(v){this.levels.push(v)},muffle(v){this.muffled.push(v)},stop(){this.stopped++}};
 const api={enabled:()=>true,crowd:o=>{calls.push(['crowd',o]);return bed}};
 for(const n of ['kick','net','post','whistle','roar','groan','applause','chant'])api[n]=(...a)=>calls.push([n,...a]);
 return{api,calls,bed};
}

test('scene director: one bed, ball touches, single goal reaction; replay and disposal',()=>{
 const {api,calls,bed}=fakeSound(),goalArrival=shotArrival('goal','triangle_left');
 const s=createSceneSound({type:'goal',team:'home'},{sound:api,goalArrival});
 for(let t=0;t<=10.4;t+=1/60)s.update(t,{ball:ballPosition('goal',t,'triangle_left'),goal:[0,0,-52.5]});
 const names=calls.map(c=>c[0]);
 assert.equal(names.filter(n=>n==='crowd').length,1,'one recorded stadium bed');
 assert.ok(names.every(n=>['crowd','kick','net','roar'].includes(n)),names.join(','));
 assert.equal(names.filter(n=>n==='net').length,1);assert.equal(names.filter(n=>n==='roar').length,1);
 assert.ok(names.filter(n=>n==='kick').length>=5);
 s.replay(true);
 const before=calls.length;
 for(let t=5;t<=7;t+=1/60)s.update(t,{ball:ballPosition('goal',t,'triangle_left'),goal:[0,0,-52.5]});
 const replayCalls=calls.slice(before);
 assert.ok(replayCalls.every(c=>c[0]==='kick'),'replay repeats only touches, no second roar');
 assert.ok(replayCalls.length>=1,'shot touch in the replay');
 assert.deepEqual(bed.muffled,[true]);
 s.dispose();s.dispose();assert.equal(bed.stopped,1);
 const after=calls.length;s.update(11,{ball:[0,0,0]});assert.equal(calls.length,after);
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
 assert.ok(html.indexOf('footera-sound.js?v=21412')>0&&html.indexOf('footera-sound.js?v=21412')<html.indexOf('3d-highlights.js?v='));
 assert.match(html,/<select data-sound-mode[^>]*><option value="on">An<\/option><option value="off">Aus<\/option>/);
 assert.match(scene,/from '\.\/3d-stadium-sound\.mjs\?v=21406'/);
 for(const f of ['./3d-stadium-sound.mjs?v=21406','./footera-sound.js?v=21412'])assert.ok(sw.includes(`"${f}"`),f);
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

test('crowds use real recordings without synthesized voices, noise or drums',()=>{
 const src=read('footera-sound.js');
 assert.doesNotMatch(src,/function voices\(|VOWELS|function drum\(/);
 const crowd=src.slice(src.indexOf(' function roar('),src.indexOf(' // ---------------------------------------------------------------- packs'));
 assert.doesNotMatch(crowd,/noise\(|createOscillator\(/);
 const credits=read('assets/sounds/stadium/CREDITS.md');
 let bytes=0;
 for(const n of ['bed','groan','applause','goal']){
  const size=fs.statSync(new URL('../assets/sounds/stadium/'+n+'.mp3',import.meta.url)).size;
  bytes+=size;assert.ok(size>10000);assert.ok(credits.includes('`'+n+'.mp3`'));
  assert.ok(read('service-worker.js').includes('./assets/sounds/stadium/'+n+'.mp3?v=21412'));
 }
 assert.ok(bytes<600000,'new match audio under 600 KB');
});

test('scene disposal stops goal reactions, including sound off / skip',()=>{
 const {api}=fakeSound();let stopped=0;
 api.roar=()=>({stop(){stopped++}});
 const scene=createSceneSound({type:'goal'},{sound:api,goalArrival:1});
 scene.update(1.2);scene.dispose();scene.dispose();assert.equal(stopped,1);
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

// Exercise the sample lifecycle without relying on an audio device or network.
function sampleAudio(){
 const sources=[],oscillators=[],params=[];
 const param=()=>{const p={value:1,setValueAtTime(){},setTargetAtTime(v,t){params.push([v,t])},cancelScheduledValues(){},exponentialRampToValueAtTime(){},linearRampToValueAtTime(){}};return p};
 const node=()=>({connect(){},disconnect(){},gain:param(),frequency:param(),Q:param()});
 const buffer=(channels,length,rate,name)=>{const data=Array.from({length:channels},()=>Float32Array.from({length},(_,i)=>Math.sin(i*.1)*.1));return{numberOfChannels:channels,length,sampleRate:rate,duration:length/rate,name,getChannelData:ch=>data[ch]}};
 const c={currentTime:0,state:'running',sampleRate:100,destination:{},createGain:node,createBiquadFilter:node,
  createBuffer:(ch,n,sr)=>buffer(ch,n,sr,'loop'),
  createStereoPanner:()=>({...node(),pan:param()}),
  createOscillator(){oscillators.push(1);throw Error('synthetic crowd')},
  createBufferSource(){const s={...node(),playbackRate:param(),start(...a){s.startArgs=a},stop(...a){s.stopArgs=a}};sources.push(s);return s},
  decodeAudioData:data=>Promise.resolve(buffer(2,data.name==='bed'?3200:700,100,data.name))};
 return{c,sources,oscillators,params,bus:{context:c,connect(){}}};
}

async function isolatedSound(fetch){
 const {runInNewContext}=await import('node:vm');
 const sandbox={fetch,localStorage:{getItem:()=>null},setTimeout:()=>0,clearTimeout(){}};
 runInNewContext(read('footera-sound.js'),sandbox);return sandbox.FooteraSound;
}
const sampleResponse=url=>({ok:true,arrayBuffer:async()=>({name:url.split('/').pop().split('.')[0]})});

test('recorded crowd loader deduplicates requests, retries failures; no delayed goal or synthetic fallback',async()=>{
 let fail=true;const requests=[];
 const S=await isolatedSound(async url=>{requests.push(url);return url.includes('/groan.')&&fail?{ok:false,status:503}:sampleResponse(url)});
 const {c,bus,sources,oscillators}=sampleAudio();
 assert.equal(S.roar(1,0,bus),null,'unloaded reaction stays silent');
 await Promise.all([S.preloadStadium(c),S.preloadStadium(c)]);
 assert.equal(requests.length,4,'one request per recording even with parallel preload');
 assert.equal(sources.length,0,'loading must not play a delayed goal');
 fail=false;assert.equal(await S.preloadStadium(c),true);assert.equal(requests.length,5,'retry only the failed file');
 const home=S.roar(1,0,bus),away=S.roar(.42,0,bus);assert.ok(home&&away);
 assert.equal(sources[0].buffer.name,'goal','match uses Millerntor goal instead of pack arena cheer');
 assert.ok(sources[0].stopArgs[0]<=5.82,'goal reaction capped at 5.8 seconds');
 assert.notEqual(sources[0].startArgs[1],sources[1].startArgs[1],'vary entry points at original pitch');
 assert.equal(sources[0].playbackRate.value,1);assert.equal(sources[1].playbackRate.value,1);
 home.stop(.1);assert.ok(sources[0].stopArgs[0]<.2);
 assert.ok(S.groan(.8,0,bus));assert.ok(sources.at(-1).stopArgs[0]<=2.72,'miss reaction capped at 2.7 seconds');assert.ok(S.applause(3,.5,0,bus));
 assert.equal(oscillators.length,0);
});

test('skip before download prevents a late bed; a loaded bed loops and stops exactly once',async()=>{
 let release;const pending=new Promise(r=>release=r);
 const S=await isolatedSound(async url=>{await pending;return sampleResponse(url)});
 const {c,bus,sources,params}=sampleAudio();
 const skipped=S.crowd({dest:bus});skipped.stop(.1);release();await S.preloadStadium(c);await Promise.resolve();
 assert.equal(sources.length,0,'disposed scene cannot start after decoding');
 const bed=S.crowd({dest:bus});assert.equal(sources.length,1);assert.equal(sources[0].loop,true);
 assert.equal(sources[0].buffer.numberOfChannels,2);assert.ok(sources[0].buffer.duration>30);
 const before=params.length;for(let i=0;i<60;i++)bed.level(.4);
 assert.ok(params.length-before<=1,'stable level does not queue automation every frame');
 bed.muffle(true);bed.stop(.1);const stop=sources[0].stopArgs;bed.stop(.1);
 assert.equal(sources[0].stopArgs,stop,'idempotent stop');
});
