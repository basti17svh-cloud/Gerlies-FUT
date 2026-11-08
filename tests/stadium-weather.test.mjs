// V21.340 Stadionwetter: choice per match, overrides, snapshot whitelist,
// deterministic particles and release wiring.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRequire} from 'node:module';
import * as THREE from '../vendor/three/three.module.min.js';
import {createStadiumWeather,normalizeSceneWeather,precipitationCount,weatherLook} from '../3d-weather.mjs';

const require=createRequire(import.meta.url);
const W=require('../footera-weather.js');
const H=require('../3d-highlights.js');
const read=f=>fs.readFileSync(new URL('../'+f,import.meta.url),'utf8');
const NOV=Date.parse('2026-11-02T18:00:00Z'),JUL=Date.parse('2026-07-10T18:00:00Z'),DEC=Date.parse('2026-12-12T18:00:00Z');

function clearOverrides(){delete globalThis.__FOOTERA_WEATHER;delete globalThis.localStorage}

test('one weather per match: same match id gives the same weather',()=>{
 clearOverrides();
 for(let i=0;i<50;i++)assert.deepEqual(W.forMatch('match-'+i,NOV),W.forMatch('match-'+i,NOV));
});

test('season decides: November and December bring snow and rain, summer never snows',()=>{
 clearOverrides();
 const count=at=>{const c={clear:0,rain:0,snow:0};for(let i=0;i<3000;i++)c[W.forMatch('m'+i,at).kind]++;return c};
 const nov=count(NOV),dec=count(DEC),jul=count(JUL);
 assert.ok(nov.snow>450&&nov.snow<1100,JSON.stringify(nov));
 assert.ok(nov.rain>700&&nov.clear>700,JSON.stringify(nov));
 assert.ok(dec.snow>nov.snow,JSON.stringify(dec));
 assert.equal(jul.snow,0);assert.ok(jul.rain>300,JSON.stringify(jul));
});

test('temperatures fit the weather: snow at or below freezing range, summer rain is mild',()=>{
 clearOverrides();
 for(let i=0;i<400;i++){
  const w=W.forMatch('t'+i,NOV);
  if(w.kind==='snow')assert.ok(w.temperature<=1&&w.temperature>=-6,JSON.stringify(w));
  if(w.kind==='rain')assert.ok(w.temperature>=2&&w.temperature<=10,JSON.stringify(w));
  assert.ok(w.intensity>=.5&&w.intensity<=1);
  const s=W.forMatch('t'+i,JUL);if(s.kind==='rain')assert.ok(s.temperature>=14);
 }
});

test('preview override and the off switch',()=>{
 clearOverrides();
 globalThis.__FOOTERA_WEATHER='schnee';assert.equal(W.forMatch('x',JUL).kind,'snow');
 globalThis.__FOOTERA_WEATHER='regen';assert.equal(W.forMatch('x',NOV).kind,'rain');
 delete globalThis.__FOOTERA_WEATHER;
 globalThis.localStorage={getItem:k=>k==='footera-3d-weather'?'0':null};
 for(let i=0;i<200;i++)assert.equal(W.forMatch('o'+i,DEC).kind,'clear');
 clearOverrides();
});

test('labels for the match head and the 3D scene',()=>{
 assert.equal(W.chipText({kind:'snow',intensity:.6,temperature:-3}),'❄ Schneefall · −3°');
 assert.equal(W.chipText({kind:'snow',intensity:.9,temperature:0}),'❄ Dichter Schneefall · 0°');
 assert.equal(W.chipText({kind:'rain',intensity:.95,temperature:7}),'☂ Starkregen · 7°');
 assert.equal(W.chipText(null),'');
});

test('the 3D snapshot keeps only clean weather display data',()=>{
 const base={id:'w',type:'goal',minute:12,team:'home',playerName:'Musiala'};
 const s=H.snapshot({...base,weather:{kind:'snow',intensity:3,temperature:-2.4,extra:'x'}});
 assert.deepEqual({...s.weather},{kind:'snow',intensity:1,temperature:-2});assert.ok(Object.isFrozen(s.weather));
 assert.equal(H.snapshot({...base,weather:{kind:'tornado'}}).weather,null);
 assert.equal(H.snapshot(base).weather,null);
});

test('scene weather normalizes and scales particles by device tier',()=>{
 assert.equal(normalizeSceneWeather(null).kind,'clear');
 assert.equal(normalizeSceneWeather({kind:'hail'}).kind,'clear');
 assert.equal(precipitationCount('clear'),0);
 assert.ok(precipitationCount('rain',{weak:true},1)<precipitationCount('rain',{},1));
 assert.ok(precipitationCount('snow',{high:true},1)>precipitationCount('snow',{},1));
 assert.ok(precipitationCount('rain',{},.4)<precipitationCount('rain',{},1));
 assert.equal(weatherLook('clear'),null);
});

function rig(kind){
 const scene=new THREE.Scene(),field=new THREE.Group();scene.add(field);
 const camera=new THREE.PerspectiveCamera(28,.9,.5,350);camera.position.set(-30,18,-20);camera.lookAt(0,0,-35);camera.updateMatrixWorld();
 const renderer={toneMappingExposure:1,capabilities:{getMaxAnisotropy:()=>4},getDrawingBufferSize(v){return v.set(780,700)}};
 const pitch=new THREE.Mesh(new THREE.PlaneGeometry(78,119),new THREE.MeshStandardMaterial({roughness:1}));
 const hemi=new THREE.HemisphereLight('#fff','#000',1.3),sun=new THREE.DirectionalLight('#fff',2.75);
 const players=Array.from({length:4},(_,i)=>{const root=new THREE.Group();root.position.set(i*2,0,-30-i);scene.add(root);return {root}});
 // Ball rolls fast along the turf between 2 s and 4 s.
 const ballAt=t=>[0,.11,-20-Math.max(0,Math.min(2,t-2))*9];
 const weather=createStadiumWeather(THREE,{scene,field,renderer,camera,weather:{kind,intensity:.8,temperature:kind==='snow'?-2:4},pitch,hemi,sun,ballAt,actors:()=>players});
 return {scene,weather,pitch,hemi};
}

test('rain: wet darker turf, splashes, spray behind the rolling ball, all deterministic',()=>{
 const random=Math.random;let calls=0;Math.random=()=>{calls++;return random()};
 try{
  const {scene,weather,pitch,hemi}=rig('rain');
  assert.equal(weather.info.kind,'rain');assert.ok(weather.info.particles>1000);assert.ok(weather.info.splashes>0);
  assert.ok(pitch.material.roughness<.7);assert.ok(hemi.intensity<1.3);assert.ok(scene.fog.far<286);
  weather.update(3);const first=weather.info.inspect();
  assert.ok(first.sprayVisible>0,'spray behind the ball');
  weather.update(7);weather.update(3);assert.deepEqual(weather.info.inspect(),first,'seeking back shows the same frame');
  weather.update(.5);assert.equal(weather.info.inspect().sprayVisible,0,'no spray while the ball is still');
  assert.equal(weather.info.breath,true,'4 °C: breath clouds');
  weather.reduce();assert.equal(weather.info.reduced,true);
  assert.equal(calls,0,'no Math.random');
 }finally{Math.random=random}
});

test('clear evenings change nothing',()=>{
 const scene=new THREE.Scene(),before=scene.children.length;
 const w=createStadiumWeather(THREE,{scene,renderer:{},camera:new THREE.PerspectiveCamera(),weather:{kind:'clear'}});
 assert.equal(w.info.kind,'clear');assert.equal(scene.children.length,before);w.update(3);
});

test('release wiring: scripts, scene import, cache and versions',()=>{
 const html=read('index.html'),sw=read('service-worker.js'),scene=read('3d-highlights-scene.mjs'),hl=read('3d-highlights.js'),match=read('3d-highlights-match.js'),app=read('footera-app.js');
 assert.ok(html.indexOf('footera-weather.js?v=21340')>0&&html.indexOf('footera-weather.js?v=21340')<html.indexOf('3d-highlights.js?v=21371'));
 assert.match(html,/id="matchWeather"/);
 assert.match(scene,/from '\.\/3d-weather\.mjs\?v=21340'/);
 assert.match(hl,/3d-highlights-scene\.mjs\?v=21371/);
 for(const f of ['./3d-weather.mjs?v=21340','./footera-weather.js?v=21340','./3d-highlights-scene.mjs?v=21371','./3d-highlights.js?v=21371'])assert.ok(sw.includes(`"${f}"`),f);
 assert.match(match,/weather:match3DWeather\(current\)/);
 assert.match(app,/match\.weather=window\.FooteraWeather\?\.forMatch\(match\.resultId\)/);
});
