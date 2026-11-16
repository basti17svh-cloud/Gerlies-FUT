/* V21.444 Pokalübergabe (surprise 2026-11-16): the props of the cup
 * presentation after a won tournament final. Pure presentation: the winners'
 * stage with its backdrop, the pedestal, the cup itself (bronze, silver or
 * gold by the cup that was won), confetti cannons and stage fountains.
 * Field-local metres as in 3d-ceremony.mjs (ceremonies always run with
 * attack direction 1, so field space = world space; main stand = +x). */
import * as THREE from './vendor/three/three.module.min.js';
import {RoomEnvironment} from './vendor/three/RoomEnvironment.mjs';
import {TROPHY_TIMES,TROPHY_PEDESTAL,TROPHY_BACKDROP,TROPHY_LANE,trophyGrip} from './3d-ceremony.mjs?v=21444';

export const TROPHY_STAGE_VERSION='21.444-trophy-stage';
export const TROPHY_TONES=Object.freeze({
 bronze:{metal:'#c9814a',trim:'#7a4424',glow:'#ffb37a',label:'BRONZE'},
 silver:{metal:'#e3e8ee',trim:'#8d97a3',glow:'#e8f3ff',label:'SILBER'},
 gold:{metal:'#f0c44c',trim:'#a4741c',glow:'#ffe39a',label:'GOLD'}});
export function trophyTone(tone){return TROPHY_TONES[tone]?tone:'gold'}
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const smooth=v=>{const x=clamp(v);return x*x*(3-2*x)};
const mix=(a,b,t)=>a+(b-a)*t;
const PEDESTAL_TOP=1.02;

// The cup: a lathed bowl on a stem, two big ears, a band with the Footera
// "F", on a dark plinth. About 0.72 m tall, like a real league trophy.
export function createTrophyMesh(toneKey='gold',track=x=>x,envMap=null){
 const tone=TROPHY_TONES[trophyTone(toneKey)];
 const g=new THREE.Group();g.name='FooteraTrophy';
 const metal=track(new THREE.MeshStandardMaterial({color:tone.metal,metalness:1,roughness:.17,envMap,envMapIntensity:1.6}));
 const trim=track(new THREE.MeshStandardMaterial({color:tone.trim,metalness:1,roughness:.3,envMap}));
 const plinth=track(new THREE.MeshStandardMaterial({color:'#15171c',metalness:.2,roughness:.38}));
 const profile=[[0,.13],[.07,.13],[.075,.15],[.05,.17],[.032,.24],[.028,.33],[.05,.36],[.12,.42],[.175,.52],[.19,.62],[.182,.69],[.196,.705],[.19,.72],[.0,.72]].map(([x,y])=>new THREE.Vector2(x,y));
 const cup=new THREE.Mesh(track(new THREE.LatheGeometry(profile,40)),metal);g.add(cup);
 const band=new THREE.Mesh(track(new THREE.CylinderGeometry(.178,.164,.05,40,1,true)),trim);band.position.y=.55;g.add(band);
 const knob=new THREE.Mesh(track(new THREE.SphereGeometry(.045,16,12)),metal);knob.position.y=.3;knob.scale.set(1,.7,1);g.add(knob);
 const base=new THREE.Mesh(track(new THREE.CylinderGeometry(.1,.12,.13,28)),plinth);base.position.y=.065;g.add(base);
 const ring=new THREE.Mesh(track(new THREE.TorusGeometry(.105,.008,8,28)),metal);ring.rotation.x=Math.PI/2;ring.position.y=.128;g.add(ring);
 // The ears: big loops from the rim to the bowl's waist, where the captain grips.
 const earGeo=track(new THREE.TorusGeometry(.105,.016,10,26,Math.PI*1.25));
 for(const side of [-1,1]){const ear=new THREE.Mesh(earGeo,metal);ear.position.set(side*.2,.56,0);ear.rotation.z=side>0?-Math.PI*.62:Math.PI*1.62;g.add(ear)}
 g.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=false}});
 return g;
}

function canvasTexture(w,h,draw,track){
 const c=document.createElement('canvas');c.width=w;c.height=h;const ctx=c.getContext('2d');draw(ctx,w,h);
 const tex=track(new THREE.CanvasTexture(c));tex.colorSpace=THREE.SRGBColorSpace;tex.anisotropy=4;tex.userData.redraw=()=>{draw(ctx,w,h);tex.needsUpdate=true};return tex;
}
// The backdrop: dark panel, gold rule, FOOTERA wordmark pattern, the cup's
// name and "SIEGER", the winners' name. The Footera emblem joins when loaded.
function drawBackdrop(ctx,w,h,{title,winner,tone,emblem}){
 const g=ctx.createLinearGradient(0,0,0,h);g.addColorStop(0,'#0c1020');g.addColorStop(.55,'#141a33');g.addColorStop(1,'#07090f');
 ctx.fillStyle=g;ctx.fillRect(0,0,w,h);
 ctx.save();ctx.globalAlpha=.07;ctx.fillStyle='#ffffff';ctx.font=`900 ${h*.07}px Arial, sans-serif`;ctx.textAlign='center';ctx.textBaseline='middle';
 for(let row=0;row<9;row++)for(let col=-1;col<8;col++)ctx.fillText('FOOTERA',(col+(row%2)*.5)*w/6.5,row*h/8.2+h*.04);
 ctx.restore();
 const glow=ctx.createRadialGradient(w/2,h*.42,0,w/2,h*.42,w*.42);glow.addColorStop(0,'rgba(255,214,120,.32)');glow.addColorStop(1,'rgba(255,214,120,0)');
 ctx.fillStyle=glow;ctx.fillRect(0,0,w,h);
 const goldBar=(y,t)=>{const lg=ctx.createLinearGradient(0,0,w,0);lg.addColorStop(0,'rgba(0,0,0,0)');lg.addColorStop(.2,tone.metal);lg.addColorStop(.5,'#fff4cf');lg.addColorStop(.8,tone.metal);lg.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=lg;ctx.fillRect(0,y,w,t)};
 goldBar(h*.06,h*.012);goldBar(h*.86,h*.012);
 if(emblem){const s=h*.24;ctx.drawImage(emblem,w/2-s/2,h*.1,s,s)}
 ctx.textAlign='center';ctx.textBaseline='alphabetic';
 const metalText=(text,size,y,weight=900)=>{ctx.font=`${weight} ${size}px Arial Black, Arial, sans-serif`;const lg=ctx.createLinearGradient(0,y-size,0,y);lg.addColorStop(0,'#fff6d6');lg.addColorStop(.5,tone.metal);lg.addColorStop(1,tone.trim);
  ctx.shadowColor='rgba(0,0,0,.55)';ctx.shadowBlur=size*.12;ctx.fillStyle=lg;ctx.fillText(text,w/2,y,w*.9);ctx.shadowBlur=0};
 metalText('SIEGER',h*.2,h*.55);
 metalText(String(title||'FOOTERA CUP').toUpperCase(),h*.085,h*.68,800);
 ctx.font=`700 ${h*.05}px Arial, sans-serif`;ctx.fillStyle='rgba(255,255,255,.82)';ctx.fillText(String(winner||'').toUpperCase(),w/2,h*.79,w*.86);
 // stars either side of SIEGER
 ctx.fillStyle=tone.metal;
 for(const sx of [.14,.86]){ctx.save();ctx.translate(w*sx,h*.48);ctx.beginPath();for(let i=0;i<10;i++){const r=i%2?h*.028:h*.07,a=-Math.PI/2+i*Math.PI/5;ctx.lineTo(Math.cos(a)*r,Math.sin(a)*r)}ctx.closePath();ctx.fill();ctx.restore()}
}

const CONFETTI_COLOURS=['#ffd45a','#fff3c4','#ffffff','#e6b23a','#f7f7f7'];
export function createTrophyStage({scene,parent=scene,renderer=null,event={},weak=false,track=x=>x,hash=Math.random}){
 const toneKey=trophyTone(event.trophyTone),tone=TROPHY_TONES[toneKey];
 const owned=[];const own=x=>{track(x);owned.push(x);return x};
 // Real metal needs something to reflect: a small studio environment for the cup and the gold trim only.
 let envMap=null;
 if(renderer){try{const pmrem=new THREE.PMREMGenerator(renderer);envMap=own(pmrem.fromScene(new RoomEnvironment(),.04).texture);pmrem.dispose()}catch(_){envMap=null}}
 const group=new THREE.Group();group.name='FooteraTrophyStage';parent.add(group);
 // ---- stage floor: dark carpet with a gold edge (a few mm high: the players stand on the grass level)
 const carpet=new THREE.Mesh(own(new THREE.PlaneGeometry(5.6,13.6)),own(new THREE.MeshStandardMaterial({color:'#121522',roughness:.86,metalness:0})));
 carpet.rotation.x=-Math.PI/2;carpet.position.set(TROPHY_BACKDROP+2.85,.006,.55);carpet.receiveShadow=true;group.add(carpet);
 const edgeMat=own(new THREE.MeshStandardMaterial({color:tone.metal,metalness:.9,roughness:.3}));
 for(const [w,d,x,z] of [[5.6,.08,TROPHY_BACKDROP+2.85,7.35],[5.6,.08,TROPHY_BACKDROP+2.85,-6.25],[.08,13.6,TROPHY_BACKDROP+5.65,.55]]){
  const e=new THREE.Mesh(own(new THREE.PlaneGeometry(w,d)),edgeMat);e.rotation.x=-Math.PI/2;e.position.set(x,.008,z);group.add(e)}
 // ---- backdrop wall + gold frame + side towers
 let emblem=null;
 const backdropTex=canvasTexture(1536,640,(ctx,w,h)=>drawBackdrop(ctx,w,h,{title:event.trophyName||event.competition,winner:event.homeName,tone,emblem}),own);
 const wall=new THREE.Mesh(own(new THREE.PlaneGeometry(13.2,5.5)),own(new THREE.MeshStandardMaterial({map:backdropTex,roughness:.62,metalness:.05,emissive:'#ffffff',emissiveMap:backdropTex,emissiveIntensity:.32})));
 wall.position.set(TROPHY_BACKDROP,2.75,.55);wall.rotation.y=Math.PI/2;group.add(wall);
 const back=new THREE.Mesh(own(new THREE.BoxGeometry(.18,5.7,13.5)),own(new THREE.MeshStandardMaterial({color:'#0a0c13',roughness:.7})));back.position.set(TROPHY_BACKDROP-.1,2.8,.55);group.add(back);
 const frameMat=own(new THREE.MeshStandardMaterial({color:tone.metal,metalness:1,roughness:.24,envMap}));
 for(const [h,d,y,z] of [[.14,13.5,5.56,.55],[5.7,.14,2.8,7.3],[5.7,.14,2.8,-6.2]]){const f=new THREE.Mesh(own(new THREE.BoxGeometry(.12,h,d)),frameMat);f.position.set(TROPHY_BACKDROP+.03,y,z);group.add(f)}
 try{const img=new Image();img.decoding='async';img.onload=()=>{emblem=img;backdropTex.userData.redraw?.()};img.src='./assets/footera/emblem.png'}catch(_){}
 // ---- pedestal with the cup on it
 const [px,pz]=TROPHY_PEDESTAL;
 const column=new THREE.Mesh(own(new THREE.CylinderGeometry(.24,.3,PEDESTAL_TOP-.04,28)),own(new THREE.MeshStandardMaterial({color:'#24325c',roughness:.3,metalness:.45,envMap})));
 column.position.set(px,(PEDESTAL_TOP-.04)/2,pz);column.castShadow=true;
 const cap=new THREE.Mesh(own(new THREE.CylinderGeometry(.28,.28,.04,28)),frameMat);cap.position.set(px,PEDESTAL_TOP-.02,pz);
 const foot=new THREE.Mesh(own(new THREE.CylinderGeometry(.33,.33,.05,28)),frameMat);foot.position.set(px,.025,pz);
 const trophy=createTrophyMesh(toneKey,own,envMap);scene.add(trophy);
 const pedestal=new THREE.Group();pedestal.add(column,cap,foot);group.add(pedestal);
 const rest=new THREE.Vector3(px,PEDESTAL_TOP,pz),held=new THREE.Vector3(),tmp=new THREE.Vector3();
 trophy.position.copy(rest);
 // A warm spot on the stage so the cup and the line-up shine at night.
 const spot=new THREE.SpotLight('#ffe9c2',weak?28:46,32,.5,.6,1.6);spot.position.set(TROPHY_LANE+9,9,1.5);spot.target.position.set(TROPHY_LANE-.6,1.4,0);spot.castShadow=false;
 scene.add(spot,spot.target);
 const sparkle=new THREE.PointLight(tone.glow,0,6,2);scene.add(sparkle);
 // ---- confetti: two cannons at the stage ends plus a fall from above
 const count=weak?520:1500,pos=new Float32Array(count*3),col=new Float32Array(count*3),seed=[];
 const c=new THREE.Color();
 for(let i=0;i<count;i++){
  const fromLeft=i%3===0,fromRight=i%3===1,side=fromLeft?-1:1;
  c.set(i%7===0?(event.homeColor||'#ffffff'):CONFETTI_COLOURS[i%CONFETTI_COLOURS.length]);col[i*3]=c.r;col[i*3+1]=c.g;col[i*3+2]=c.b;
  const top=!fromLeft&&!fromRight;
  seed.push({top,x:top?TROPHY_BACKDROP+.6+hash(i*3+1)*7:TROPHY_BACKDROP+1.1,z:top?-6+hash(i*5+2)*13:side*6.4+.55,
   vx:top?0:(hash(i*7+3)-.25)*3.2,vy:top?0:9+hash(i*11+5)*8,vz:top?0:-side*(1.5+hash(i*13+7)*4.2),
   delay:(top?.15:0)+hash(i*17+9)*(top?1.6:.35),spin:hash(i*19+11)*6.3,drift:.4+hash(i*23+13)*.8,h0:top?4.6+hash(i*29+3)*2.6:1.2});
 }
 const geom=own(new THREE.BufferGeometry());geom.setAttribute('position',new THREE.BufferAttribute(pos,3));geom.setAttribute('color',new THREE.BufferAttribute(col,3));
 const confettiMat=own(new THREE.PointsMaterial({size:weak?.14:.11,vertexColors:true,sizeAttenuation:true,transparent:true,opacity:1,depthWrite:false}));
 const confetti=new THREE.Points(geom,confettiMat);confetti.frustumCulled=false;confetti.renderOrder=14;scene.add(confetti);
 // ---- stage fountains: four gold spark jets on the front edge
 const sparkTex=canvasTexture(32,32,(ctx,w,h)=>{const g=ctx.createRadialGradient(w/2,h/2,0,w/2,h/2,w/2);g.addColorStop(0,'rgba(255,255,255,1)');g.addColorStop(.35,'rgba(255,224,150,.8)');g.addColorStop(1,'rgba(255,170,60,0)');ctx.fillStyle=g;ctx.fillRect(0,0,w,h)},own);
 const jets=[[TROPHY_BACKDROP+5.4,6.9],[TROPHY_BACKDROP+5.4,-5.8],[TROPHY_BACKDROP+.5,7],[TROPHY_BACKDROP+.5,-5.9]];
 const perJet=weak?40:90,jetPos=new Float32Array(jets.length*perJet*3);
 const jetGeom=own(new THREE.BufferGeometry());jetGeom.setAttribute('position',new THREE.BufferAttribute(jetPos,3));
 const jetMat=own(new THREE.PointsMaterial({map:sparkTex,color:'#ffd88a',size:.22,sizeAttenuation:true,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,toneMapped:false}));
 const jetPoints=new THREE.Points(jetGeom,jetMat);jetPoints.frustumCulled=false;jetPoints.renderOrder=15;scene.add(jetPoints);
 const GRAVITY=9.8,LIFT=TROPHY_TIMES.lift;
 function update(time,{handL=null,handR=null,captainRoot=null}={}){
  // The cup: on the pedestal, then between the captain's hands.
  const grip=trophyGrip(time);
  if(grip>0){
   if(handL&&handR){handL.getWorldPosition(held);handR.getWorldPosition(tmp);held.add(tmp).multiplyScalar(.5);held.y-=mix(.5,.3,smooth((time-LIFT)/.5));}
   else if(captainRoot){captainRoot.getWorldPosition(held);const up=smooth((time-LIFT)/.6);held.x+=mix(.42,.12,up);held.y=mix(1.05,1.62,up);}
   else held.copy(rest);
   trophy.position.lerpVectors(rest,held,grip);
  }else trophy.position.copy(rest);
  // Once the cup is taken the pedestal sinks into the stage like a stage lift.
  const sink=smooth((time-TROPHY_TIMES.turn)/1.1);pedestal.position.y=-PEDESTAL_TOP*sink;pedestal.visible=sink<.999;
  // It turns to face the cameras as he turns, a slight tilt while it is held high.
  trophy.rotation.set(0,mix(0,-Math.PI/2,grip),Math.sin(time*2.1)*.04*smooth((time-LIFT)/.6));
  trophy.updateMatrixWorld(true);
  const blast=time-LIFT;
  sparkle.position.copy(trophy.position).add(tmp.set(.7,.5,0));sparkle.intensity=blast>0?(weak?3:6)*(.6+.4*Math.sin(time*9)):0;
  // Confetti flies once the cup is up.
  for(let i=0;i<count;i++){
   const s=seed[i],t=blast-s.delay;let x,y,z;
   if(t<0){x=0;y=-50;z=0}
   else if(s.top){x=s.x+Math.sin(t*1.7+s.spin)*s.drift;z=s.z+Math.cos(t*1.3+s.spin)*s.drift*.6;y=Math.max(.02,s.h0-t*.75)}
   else{
    // Fired up and out, the air brakes it within a second, then it flutters
    // down at paper speed (about 0.9 m/s) for the rest of the scene.
    const k=2.2,e=(1-Math.exp(-k*t))/k,flutter=smooth((t-.8)/1);
    x=s.x+s.vx*e+Math.sin(t*2+s.spin)*s.drift*flutter;z=s.z+s.vz*e+Math.cos(t*1.6+s.spin)*s.drift*.6*flutter;
    y=Math.max(.02,s.h0+s.vy*e-.9*t);
   }
   pos[i*3]=x;pos[i*3+1]=y;pos[i*3+2]=z;
  }
  geom.attributes.position.needsUpdate=true;
  // Fountains: 3.2 s of sparks from the lift, a second burst later.
  let n=0;
  for(let j=0;j<jets.length;j++)for(let i=0;i<perJet;i++,n++){
   const life=.9,offset=i/perJet*life,on=(blast>0&&blast<3.4)||(blast>4.8&&blast<7),age=((blast-offset)%life+life)%life;
   if(!on||blast-offset<0){jetPos[n*3+1]=-50;continue}
   const a=hash(n*31+Math.floor((blast-offset)/life)*7)*Math.PI*2,r=.25+hash(n*37+3)*.45;
   jetPos[n*3]=jets[j][0]+Math.cos(a)*r*age;jetPos[n*3+2]=jets[j][1]+Math.sin(a)*r*age;
   jetPos[n*3+1]=Math.max(.02,(5.6+hash(n*41)*1.2)*age-GRAVITY*.5*age*age);
  }
  jetGeom.attributes.position.needsUpdate=true;
  jetMat.opacity=blast>0?1:0;
 }
 update(-1);
 return{update,trophy,group,dispose(){for(const o of [trophy,confetti,jetPoints,spot,spot.target,sparkle,group])o.parent?.remove(o);for(const o of owned)o.dispose?.()}};
}
