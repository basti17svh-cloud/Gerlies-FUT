// V21.391: the athletic body layer must stay small, smooth and deterministic.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {athleticBody,athleticSeed,ATHLETIC_BODY_VERSION} from '../3d-athletic-body.mjs';

const KEYS=['pelvisYaw','pelvisRoll','spinePitch','spineYaw','spineRoll','headPitch','headYaw','headRoll','shrug'];
const flat=b=>[...KEYS.map(k=>b[k]),...b.armPitch,...b.elbow];

test('athletic body is deterministic and finite',()=>{
 assert.match(ATHLETIC_BODY_VERSION,/^21\.391/);
 for(const speed of [-1,0,.1,.5,1,4,NaN])for(const stride of [0,1.3,7.7,-4]){
  const a=flat(athleticBody(3.2,speed,stride,.4)),b=flat(athleticBody(3.2,speed,stride,.4));
  assert.deepEqual(a,b);
  if(Number.isFinite(speed))for(const v of a)assert.ok(Number.isFinite(v)&&Math.abs(v)<.6,`speed ${speed}: ${v}`);
 }
 assert.equal(athleticSeed('Musiala'),athleticSeed('Musiala'));
 assert.notEqual(athleticSeed('Musiala'),athleticSeed('Wirtz'));
 for(const n of ['','A','Müller','Vinícius Jr.']){const s=athleticSeed(n);assert.ok(s>=0&&s<=1)}
});

test('a runner leans forward and swings arms against the legs',()=>{
 // stride 0 = left boot furthest forward: right arm forward, left arm back,
 // right shoulder forward (yaw > 0), head stays on the running line.
 const b=athleticBody(1,.9,0,.2);
 assert.ok(b.spinePitch<-.12,'forward lean');
 assert.ok(b.armPitch[1]>.25&&b.armPitch[0]<-.25,'contralateral arms');
 assert.ok(b.spineYaw>.1&&b.pelvisYaw<0,'shoulders against hips');
 assert.ok(Math.abs(b.spineYaw+b.headYaw+b.pelvisYaw)<.08,'head keeps looking ahead');
 const jog=athleticBody(1,.35,0,.2);
 assert.ok(Math.abs(jog.spinePitch)<Math.abs(b.spinePitch)&&jog.armPitch[1]<b.armPitch[1],'sprint is bigger than jog');
});

test('a standing player only breathes and shifts weight a little',()=>{
 let moved=0;
 for(let t=0;t<12;t+=.1){
  const b=athleticBody(t,0,t*3,.7);
  for(const v of flat(b))assert.ok(Math.abs(v)<.2,`idle stays subtle: ${v}`);
  moved=Math.max(moved,Math.abs(b.spineRoll),Math.abs(b.headYaw));
 }
 assert.ok(moved>.02,'idle is not frozen');
 const a=athleticBody(5,0,0,.1),c=athleticBody(5,0,0,.9);
 assert.notEqual(a.headYaw,c.headYaw,'players do not idle in sync');
});

test('motion is continuous over time, stride and speed',()=>{
 let prev=null;
 for(let i=0;i<=600;i++){
  const t=i/60,speed=.5+.5*Math.sin(t*.7),cur=flat(athleticBody(t,speed,t*9,.3));
  if(prev)cur.forEach((v,k)=>assert.ok(Math.abs(v-prev[k])<.09,`jump ${k} at ${t}`));
  prev=cur;
 }
});

test('wiring: prototype uses the layer, can be switched off and ships offline',()=>{
 const proto=fs.readFileSync(new URL('../3d-player-prototype.mjs',import.meta.url),'utf8');
 const sw=fs.readFileSync(new URL('../service-worker.js',import.meta.url),'utf8');
 const scene=fs.readFileSync(new URL('../3d-highlights-scene.mjs',import.meta.url),'utf8');
 assert.match(proto,/from '\.\/3d-athletic-body\.mjs\?v=21391'/);
 assert.match(proto,/footera-3d-lively/);
 assert.match(proto,/!keeperRole&&!acro/);
 assert.ok(sw.includes('"./3d-athletic-body.mjs?v=21391"'));
 const pv=scene.match(/3d-player-prototype\.mjs\?v=(\d+)/)[1];
 assert.ok(sw.includes(`"./3d-player-prototype.mjs?v=${pv}"`));
});
