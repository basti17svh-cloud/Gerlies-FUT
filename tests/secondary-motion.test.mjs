import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three/three.module.min.js';
import {stepSecondarySpring,createSecondaryMotion,SECONDARY_MOTION_VERSION} from '../3d-secondary-motion.mjs';

const fresh=()=>({s:[0,0,0],v:[0,0,0]});

test('hair trails behind a steady run and settles again at rest',()=>{
 assert.match(SECONDARY_MOTION_VERSION,/^21\.370/);
 const st=fresh();
 for(let i=0;i<120;i++)stepSecondarySpring(st,[0,0,0],[0,0,6],1/60);
 assert.ok(st.s[2]<-.08,'hangs back against the run: '+st.s[2]);
 assert.ok(Math.abs(st.s[0])<1e-6&&Math.abs(st.s[1])<1e-6);
 for(let i=0;i<240;i++)stepSecondarySpring(st,[0,0,0],[0,0,0],1/60);
 assert.ok(Math.hypot(...st.s)<.005,'settles when standing: '+st.s);
});

test('a sudden stop swings the hair forward, never further than the cap',()=>{
 const st=fresh();let max=0;
 for(let i=0;i<60;i++)stepSecondarySpring(st,[0,0,0],[0,0,6],1/60);
 stepSecondarySpring(st,[0,0,-60],[0,0,0],1/60);
 for(let i=0;i<30;i++){stepSecondarySpring(st,[0,0,0],[0,0,0],1/60);max=Math.max(max,st.s[2])}
 assert.ok(max>.02,'swings forward past rest: '+max);
 for(let i=0;i<200;i++){stepSecondarySpring(st,[60,-60,60],[30,30,30],1/20);assert.ok(Math.hypot(...st.s)<=.1401)}
});

test('only players with hair or a shirt get the effect; update is safe',()=>{
 const head=new THREE.Bone();head.position.set(0,1.7,0);
 assert.equal(createSecondaryMotion(THREE,[],head).state,null);
 const geo=new THREE.BoxGeometry(.2,.5,.2);geo.translate(0,1.5,0);
 const hair=new THREE.Mesh(geo,new THREE.MeshStandardMaterial());hair.name='FooteraHair-ponytail01';
 const sway=createSecondaryMotion(THREE,[hair],head);
 sway.update(0,0);head.position.z+=.1;head.updateMatrixWorld(true);sway.update(1/60,1);
 assert.ok(Number.isFinite(sway.state.s[2]));
 assert.equal(typeof hair.material.onBeforeCompile,'function');
 // An upgraded copy (broadcast look keeps userData) is patched again.
 const copy=hair.material.clone();copy.userData={...hair.material.userData};hair.material=copy;
 sway.update(2/60,1);assert.match(hair.material.customProgramCacheKey(),/footera-sway-hair/);
});
