// V21.461 Lebendige Ränge (Basti 2026-11-17: "Die Fans müssen lebendiger werden und die Ränge
// müssen echt leben. Choreo, Fahnen, etc.").
// Everything here runs on the GPU: one vertex-shader layer on the four crowd meshes moves every
// single fan (also the ones the CPU never touches) every frame, smoothly: jumping blocks after a
// goal, chanting arms in the ends, La Ola at the final whistle, scarves held up at the walk-out and
// twirled after goals. On top: a card mosaic in the home end at the walk-out, big swinging flags,
// fence banners with the club names and ticker tape. The CPU only writes a handful of uniforms per
// frame; the extra meshes cost at most five draw calls and hide themselves while unused.
// Opt-out: localStorage footera-3d-crowd-life=0.
export const CROWD_LIFE_VERSION='21.461';
export function crowdLifeWanted(){
 try{return globalThis.localStorage?.getItem('footera-3d-crowd-life')!=='0'}catch(_){return true}
}
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const smooth=v=>{const x=clamp(v);return x*x*(3-2*x)};
const pulse=(t,a,b,fadeIn=.3,fadeOut=.6)=>smooth((t-a)/fadeIn)*(1-smooth((t-b)/fadeOut));
const TEAM={home:0,away:1,neutral:2};
export const SCARF_SHARE=Object.freeze({host:.56,guest:.46});
export const OLA_PERIOD=6.2;
// Pure: what each block does at a moment. Arrays are [home, away, neutral].
export function crowdLifeState({kind='',attackTeam='home',hostTeam='home',time=0,impact=5.1,netArrival=5.4,end=10,mosaic=false}={}){
 const s={jump:[0,0,0],raise:[0,0,0],scarf:[0,0,0],twirl:[0,0,0],chant:[0,0,0],flag:[.45,.45],ola:0,olaAngle:0,mosaic:0,confetti:0};
 const team=t=>TEAM[t]??2,attack=team(attackTeam),defend=attack===0?1:0,host=team(hostTeam),guest=host===0?1:0;
 const fade=1-smooth((time-(end-.9))/.9)*.55;
 if(kind==='ceremony_kickoff'){
  // Walk-out: scarves up all round, the home end holds up its mosaic, ticker tape, flags flying.
  const up=smooth((time-.25)/.9);
  s.scarf[host]=up;s.scarf[guest]=up*.9;s.raise[2]=up*.25;
  s.flag=[1.15,1.15];s.mosaic=mosaic?smooth((time-.55)/2.2):0;s.confetti=smooth((time-.4)/.6);
  return s;
 }
 if(kind==='ceremony_fulltime'||kind==='ceremony_trophy'){
  const start=kind==='ceremony_trophy'?8.45:.6,on=smooth((time-start)/.7);
  s.jump[attack]=on*.85;s.scarf[attack]=on;s.twirl[attack]=on*smooth((time-start-1.4)/.6);s.raise[attack]=on*.6;
  s.flag[attack]=1.3;s.flag[defend]=.25;
  // Winners make the whole ground do the wave.
  s.ola=smooth((time-start-.4)/.8);s.olaAngle=Math.max(0,time-start)*Math.PI*2/OLA_PERIOD;
  return s;
 }
 if(kind==='ceremony_draw'){s.flag=[.4,.4];s.chant=[.35,.35,0];return s}
 // Regular highlights: the ends chant and pump their arms in rhythm all the time.
 s.chant[host]=.85;s.chant[guest]=.65;
 const after=time-impact;
 if(kind==='goal'){
  const on=smooth((time-netArrival-.12)/.35)*fade;
  s.jump[attack]=on;s.raise[attack]=on;s.scarf[attack]=on*smooth((time-netArrival-.9)/.5);s.twirl[attack]=s.scarf[attack];
  s.jump[2]=on*.22;s.chant[attack]*=1-on;s.chant[defend]*=1-on*.9;
  s.flag[attack]=.45+on*1.1;s.flag[defend]=.45*(1-on*.8);
 }else if(kind==='big_chance_saved'){
  const on=pulse(after,.08,2.4);
  s.jump[defend]=on*.55;s.raise[defend]=on*.7;s.flag[defend]=.45+on*.6;
 }else if(kind==='shot_post'||kind==='big_chance_missed'){
  const on=pulse(after,.1,1.8);
  s.raise[attack]=on*.55;s.raise[defend]=on*.35;s.chant[attack]*=1-on;
 }
 return s;
}

// ---- shared GLSL -------------------------------------------------------------------------------
// aLife = (seed 0..1, team 0/1/2 (+4 in the ends), mosaic row 0..1 or -1, angle around the bowl).
const LIFE_UNIFORMS=`
uniform float uLifeOn;uniform float uLifeTime;uniform vec3 uJump;uniform vec3 uRaise;uniform vec3 uScarf;uniform vec3 uTwirl;uniform vec3 uChant;
uniform float uOla;uniform float uOlaAngle;uniform float uMosaic;uniform vec2 uScarfShare;
attribute vec4 aLife;
float lifePick(vec3 v,float t){return t<.5?v.x:t<1.5?v.y:v.z;}
float lifeTeam(){return aLife.y>3.5?aLife.y-4.:aLife.y;}
float lifeEnd(){return step(3.5,aLife.y);}
float lifeOla(){
 float d=mod(aLife.w-uOlaAngle+3.14159265,6.2831853)-3.14159265;
 return uOla*exp(-d*d/.045);
}
float lifeMosaicOn(){return aLife.z<0.?0.:clamp((uMosaic*1.55-(1.-aLife.z)*.55)/.32,0.,1.);}
float lifeScarfOn(){
 float team=lifeTeam();if(team>1.5)return 0.;
 float share=team<.5?uScarfShare.x:uScarfShare.y;
 return lifePick(uScarf,team)*step(aLife.x,share)*(1.-step(.001,lifeMosaicOn()));
}
float lifeLift(){
 float team=lifeTeam(),seed=aLife.x;
 float beat=abs(sin(uLifeTime*6.6+seed*1.1));
 float jump=lifePick(uJump,team)*(.12+.24*pow(beat,.75))*(.75+.5*seed);
 float chant=lifePick(uChant,team)*lifeEnd()*step(seed,.72)*.05*pow(.5+.5*sin(uLifeTime*6.6+seed*.6),3.);
 float idle=.018*sin(uLifeTime*(1.1+seed*.9)+seed*40.);
 return uLifeOn*(jump+chant+idle+lifeOla()*.75);
}
float lifeArmRaise(){
 float team=lifeTeam(),seed=aLife.x;
 float chant=lifePick(uChant,team)*lifeEnd()*step(seed,.72)*pow(.5+.5*sin(uLifeTime*6.6+seed*.6),2.);
 float r=max(max(lifePick(uRaise,team)*step(seed,.85),chant),max(lifeOla(),max(lifeScarfOn(),lifeMosaicOn())));
 return uLifeOn*clamp(r,0.,1.);
}
`;
function lifeUniforms(THREE){
 return{uLifeOn:{value:1},uLifeTime:{value:0},uJump:{value:new THREE.Vector3()},uRaise:{value:new THREE.Vector3()},uScarf:{value:new THREE.Vector3()},uTwirl:{value:new THREE.Vector3()},uChant:{value:new THREE.Vector3()},
  uOla:{value:0},uOlaAngle:{value:0},uMosaic:{value:0},uScarfShare:{value:new THREE.Vector2(SCARF_SHARE.host,SCARF_SHARE.guest)},uFlagEnergy:{value:new THREE.Vector2(.45,.45)},uConfetti:{value:0}};
}
function patch(material,uniforms,key,vertexHead,vertexBody,fragment){
 material.onBeforeCompile=shader=>{
  Object.assign(shader.uniforms,uniforms);
  shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\n'+LIFE_UNIFORMS+vertexHead).replace('#include <begin_vertex>','#include <begin_vertex>\n'+vertexBody);
  if(fragment)fragment(shader);
 };
 material.customProgramCacheKey=()=>'footera-crowd-life-'+key;
 return material;
}
// Crowd part shaders: world-space offsets turned back into instance space, so lighting, fog and
// the instance matrices from the CPU stay exactly as they were.
const PART_BODY=`
#ifdef USE_INSTANCING
 vec3 lifeOffset=vec3(0.,lifeLift(),0.);
 transformed+=inverse(mat3(instanceMatrix))*lifeOffset;
#endif
`;
const PART_ARM=`
#ifdef USE_INSTANCING
 vec3 lifeAxis=instanceMatrix[1].xyz;float lifeLen=length(lifeAxis)*.48;vec3 lifeDir=lifeAxis/max(1e-4,length(lifeAxis));
 vec3 lifeLat=vec3(lifeDir.x,0.,lifeDir.z);lifeLat=length(lifeLat)>.04?normalize(lifeLat):vec3(0.);
 vec3 lifeUp=normalize(lifeLat*.34+vec3(0.,1.,0.));
 float lifeR=lifeArmRaise();
 vec3 lifeNew=normalize(mix(lifeDir,lifeUp,lifeR)+vec3(0.,1e-4,0.));
 float lifeT=clamp((position.y+.24)/.48,0.,1.);
 vec3 lifeOffset=(lifeNew-lifeDir)*lifeLen*lifeT+vec3(0.,lifeLift(),0.);
 transformed+=inverse(mat3(instanceMatrix))*lifeOffset;
#endif
`;

function canvas(w,h){const c=document.createElement('canvas');c.width=w;c.height=h;return c}
function tex(THREE,track,c,repeat=false){const t=track(new THREE.CanvasTexture(c));t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=4;if(repeat)t.wrapS=THREE.RepeatWrapping;return t}
function fitFont(ctx,text,max,size,weight='900',style='italic'){let s=size;ctx.font=`${style} ${weight} ${s}px system-ui`;while(s>14&&ctx.measureText(text).width>max){s-=2;ctx.font=`${style} ${weight} ${s}px system-ui`}return s}
function shortName(name,fallback){const n=String(name||'').trim().toUpperCase();return n?n.slice(0,24):fallback}

export function createCrowdLife(THREE,{scene,track=o=>o,weak=false,high=false,mobileStandard=false,hash,kits,hostTeam='home',hostEnd=-1,crowdType='',attackTeam='home',impact=5.1,netArrival=5.4,sceneEnd=10,
 homeName='',awayName='',crowdRows=12}){
 let choreo=null,drawChoreo=null,crestImage=null;
 const uniforms=lifeUniforms(THREE),guestTeam=hostTeam==='home'?'away':'home';
 const kitOf=t=>t==='away'?kits.away:kits.home;
 const materials=new Map(),extra=[];
 const mosaicWanted=crowdType==='ceremony_kickoff';
 // ---- the crowd itself ----
 function material(part){
  if(!materials.has(part)){
   const m=track(new THREE.MeshStandardMaterial({color:'#ffffff',roughness:.85,vertexColors:part==='head'}));
   materials.set(part,patch(m,uniforms,part,'',part==='arm'?PART_ARM:PART_BODY));
  }
  return materials.get(part);
 }
 function lifeOf(spec){
  const team=TEAM[spec.team]??2,end=spec.zone==='end'||spec.zone==='corner'?4:0;
  const inHostEnd=mosaicWanted&&spec.team===hostTeam&&(spec.zone==='end'||spec.zone==='corner')&&spec.z*hostEnd>0;
  return[hash(spec.index*131+7),team+end,inHostEnd?clamp(spec.row/Math.max(1,crowdRows-1)):-1,Math.atan2(spec.z,spec.x*1.5)];
 }
 // Each crowd group gets its own geometry copies (the attribute lives on the geometry).
 function attach(group){
  const per=group.specs.map(lifeOf);
  for(const [mesh,mult] of [[group.torso,1],[group.head,1],[group.arms,2],[group.legs,2]]){
   const g=track(mesh.geometry.clone()),data=new Float32Array(group.specs.length*mult*4);
   per.forEach((v,i)=>{for(let k=0;k<mult;k++)data.set(v,(i*mult+k)*4)});
   g.setAttribute('aLife',new THREE.InstancedBufferAttribute(data,4));mesh.geometry=g;
  }
 }
 // ---- fan wall behind: every column of drawn supporters bobs, the jumping blocks jump ----
 function patchFanWall(m){
  if(!m)return;
  m.onBeforeCompile=shader=>{
   Object.assign(shader.uniforms,uniforms);
   shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nuniform float uLifeOn;uniform float uLifeTime;uniform vec3 uJump;uniform vec3 uChant;')
    .replace('#include <map_fragment>',`#ifdef USE_MAP
 vec2 fwUv=vMapUv;float fwBand=floor(clamp(1.-fwUv.y,0.,.999)*3.);float fwCol=floor(fwUv.x*26.);
 float fwSeed=fract(sin(fwCol*12.9898+fwBand*78.233)*43758.5453);
 float fwTeam=fwBand<.5?0.:fwBand<1.5?1.:2.;float fwJump=fwTeam<.5?uJump.x:fwTeam<1.5?uJump.y:uJump.z;float fwChant=fwTeam<.5?uChant.x:fwTeam<1.5?uChant.y:0.;
 float fwLift=uLifeOn*(fwJump*.05*abs(sin(uLifeTime*6.6+fwSeed*1.1))+fwChant*.008*sin(uLifeTime*6.6+fwSeed*.6)+.004*sin(uLifeTime*(1.2+fwSeed)+fwSeed*30.));
 float fwLo=1.-(fwBand+1.)/3.+.004,fwHi=1.-fwBand/3.-.004;fwUv.y=clamp(fwUv.y-fwLift,fwLo,fwHi);
 vec4 sampledDiffuseColor=texture2D(map,fwUv);diffuseColor*=sampledDiffuseColor;
#endif`);
  };
  m.customProgramCacheKey=()=>'footera-crowd-life-fanwall';m.needsUpdate=true;
 }
 // ---- scarves: held up taut over the heads, twirled after goals ----
 let scarves=null;
 function addScarves(specs){
  const holders=specs.filter(s=>s.team===hostTeam||s.team===guestTeam);
  if(!holders.length)return;
  const c=canvas(256,64),ctx=c.getContext('2d');
  for(const [row,t] of [[0,hostTeam],[1,guestTeam]]){
   const kit=kitOf(t),y=row*32;ctx.fillStyle=kit.shirt;ctx.fillRect(0,y,256,32);
   ctx.fillStyle=kit.shirtSecondary;for(let x=0;x<256;x+=32)ctx.fillRect(x,y,12,32);
   ctx.fillStyle='#ffffff';ctx.globalAlpha=.85;ctx.fillRect(0,y+13,256,6);ctx.globalAlpha=1;
   ctx.fillStyle=kit.shirtSecondary;for(let x=0;x<256;x+=6){ctx.fillRect(x,y,3,3);ctx.fillRect(x,y+29,3,3)}
  }
  const geometry=track(new THREE.PlaneGeometry(1.18,.2,4,1)),data=new Float32Array(holders.length*4),teams=new Float32Array(holders.length);
  const m=track(new THREE.MeshStandardMaterial({map:tex(THREE,track,c),side:THREE.DoubleSide,roughness:.9}));
  patch(m,uniforms,'scarf','attribute float aScarfTeam;',`
 float sOn=lifeScarfOn();float sTw=lifePick(uTwirl,lifeTeam());
 vec3 p=transformed;
 p.z+=sin(p.x*5.+uLifeTime*7.+aLife.x*20.)*.035*(1.+sTw);
 // Twirl: one end in the hand, swung in circles over the head.
 float ang=uLifeTime*(9.+aLife.x*3.)+aLife.x*31.;
 vec3 tw=vec3(p.x+.5,p.y,p.z);tw=vec3(tw.x*cos(ang)-tw.z*sin(ang),tw.y+.1*sin(ang*2.),tw.x*sin(ang)+tw.z*cos(ang));
 p=mix(p,tw,sTw);
 transformed=p*step(.002,sOn)*mix(.25,1.,smoothstep(0.,1.,sOn));
 transformed.y+=(sOn-1.)*.5;
 #ifdef USE_INSTANCING
 transformed+=inverse(mat3(instanceMatrix))*vec3(0.,lifeLift(),0.);
 #endif
`,shader=>{shader.vertexShader=shader.vertexShader.replace('#include <uv_vertex>','#include <uv_vertex>\n#ifdef USE_MAP\n vMapUv.y=vMapUv.y*.5+(aScarfTeam>.5?0.:.5);\n#endif')});
  geometry.setAttribute('aLife',new THREE.InstancedBufferAttribute(data,4));geometry.setAttribute('aScarfTeam',new THREE.InstancedBufferAttribute(teams,1));
  const mesh=new THREE.InstancedMesh(geometry,m,holders.length),d=new THREE.Object3D();
  holders.forEach((s,i)=>{
   data.set(lifeOf(s),i*4);teams[i]=s.team===hostTeam?0:1;
   const yaw=Math.atan2(-s.x,-s.z);d.position.set(s.x,s.y-.25+1.2*s.height,s.z);d.rotation.set(0,yaw,0);d.scale.setScalar(1);d.updateMatrix();mesh.setMatrixAt(i,d.matrix);
  });
  mesh.frustumCulled=false;mesh.name='FooteraScarves';mesh.visible=false;scene.add(mesh);track(mesh);extra.push(mesh);scarves=mesh;
 }
 // ---- card mosaic in the home end at the walk-out ----
 let mosaic=null;
 function addMosaic(specs){
  if(!mosaicWanted)return;
  // V21.471 (Basti: "sehr unvollständig und unsauber"): the cards used to sit
  // over each fan, so the jittered, staggered crowd left holes, aisles and a
  // half-step gap between rows, and the motif only used the middle of the
  // picture. Now the whole end holds up one closed card grid: two cards per
  // terrace step, one every half metre across the full stand, aisles too.
  // Each card takes the average colour of its cell of the motif.
  if(!specs.some(s=>lifeOf(s)[2]>=0))return;
  const rows=Math.max(1,crowdRows),sub=2,lines=rows*sub,half=37.3,pitch=mobileStandard||weak?.62:.52;
  const cols=Math.max(24,Math.round(half*2/pitch)),cw=half*2/cols,cell=6;
  const W=cols*cell,H=lines*cell,c=canvas(W,H),ctx=c.getContext('2d'),kit=kitOf(hostTeam);
  let drawn=false;
  if(hostTeam==='home'&&choreo&&typeof drawChoreo==='function'){try{drawChoreo(ctx,W,H,choreo,crestImage);drawn=true}catch(_){}}
  if(!drawn){
   // Bold club-colour blocks read from far away: broad bands with a white sash.
   for(let i=0;i<4;i++){ctx.fillStyle=i%2?kit.shirtSecondary:kit.shirt;ctx.fillRect(0,i*H/4,W,H/4+1)}
   ctx.fillStyle='#ffffff';ctx.beginPath();ctx.moveTo(W*.30,H);ctx.lineTo(W*.46,0);ctx.lineTo(W*.58,0);ctx.lineTo(W*.42,H);ctx.closePath();ctx.fill();
   ctx.fillStyle=kit.shirt;ctx.beginPath();ctx.moveTo(W*.40,H);ctx.lineTo(W*.505,0);ctx.lineTo(W*.535,0);ctx.lineTo(W*.43,H);ctx.closePath();ctx.fill();
  }
  let pixels=null;try{pixels=ctx.getImageData(0,0,W,H).data}catch(_){}
  const count=cols*lines,slope=Math.atan(.72/1.42),along=Math.hypot(1.42,.72)/sub;
  const geometry=track(new THREE.PlaneGeometry(cw*.94,along*1.06)),data=new Float32Array(count*4);
  const m=track(new THREE.MeshLambertMaterial({color:'#ffffff',side:THREE.DoubleSide}));
  patch(m,uniforms,'mosaic','',`
 float mOn=lifeMosaicOn();
 transformed.y+=sin(uLifeTime*2.4+aLife.x*12.)*.02;
 transformed*=step(.002,mOn);transformed.y-=(1.-mOn)*.9;
`);
  geometry.setAttribute('aLife',new THREE.InstancedBufferAttribute(data,4));
  const mesh=new THREE.InstancedMesh(geometry,m,count),d=new THREE.Object3D(),col=new THREE.Color();
  let i=0;
  for(let r=0;r<rows;r++)for(let k=0;k<sub;k++){
   const f=(k+.5)/sub-.5,line=r*sub+k,y=1.13+r*.72+1.58+f*.72,z=hostEnd*(59.4+r*1.42+f*1.42),py=Math.floor((lines-1-line)*cell);
   for(let n=0;n<cols;n++,i++){
    const x=-half+(n+.5)*cw,seed=hash(line*977+n*31+5);
    data.set([seed,TEAM[hostTeam]+4,r/Math.max(1,rows-1),Math.atan2(z,x*1.5)],i*4);
    d.position.set(x,y,z);d.rotation.set(-slope+(seed-.5)*.06,hostEnd<0?0:Math.PI,(hash(i*13+1)-.5)*.05,'YXZ');d.updateMatrix();mesh.setMatrixAt(i,d.matrix);
    if(pixels){
     // u runs left to right as seen from the pitch.
     const px=Math.floor((hostEnd<0?n:cols-1-n)*cell);let R=0,G=0,B=0;
     for(let yy=1;yy<cell-1;yy++)for(let xx=1;xx<cell-1;xx++){const q=((py+yy)*W+px+xx)*4;R+=pixels[q];G+=pixels[q+1];B+=pixels[q+2]}
     const nn=(cell-2)*(cell-2)*255;col.setRGB(R/nn,G/nn,B/nn,THREE.SRGBColorSpace);
    }else col.set(n%2?kit.shirt:kit.shirtSecondary);
    mesh.setColorAt(i,col.multiplyScalar(.93+seed*.09));
   }
  }
  if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true;
  mesh.frustumCulled=false;mesh.name='FooteraMosaic';mesh.visible=false;scene.add(mesh);track(mesh);extra.push(mesh);mosaic=mesh;
 }
 // ---- big swinging flags (pole + cloth in one geometry) ----
 let flags=null;
 function addFlags(){
  const perEnd=weak?2:mobileStandard?4:high?7:5,spots=[];
  const endZ=(side,row)=>side*(59.4+row*1.42),stepY=row=>1.13+row*.72;
  // While the home end holds up its card mosaic, its flags stay down (they cut through the picture).
  for(const [t,side,count] of [[hostTeam,hostEnd,mosaicWanted?0:perEnd+1],[guestTeam,-hostEnd,Math.max(1,perEnd-1)]]){
   for(let k=0;k<count;k++){const row=k%3,x=-30+(k+.5)*60/count+(hash(k*13+(t==='home'?1:2))-.5)*4;spots.push({team:t,x,y:stepY(row),z:endZ(side,row),k})}
  }
  // A few on the long stands too, where the broadcast camera looks all match long.
  const sideCount=weak?1:mobileStandard?3:4;
  for(let k=0;k<sideCount;k++){const row=1+k%3,z=hostEnd*(18+k*9),x=-(39.3+row*1.42);spots.push({team:hostTeam,x,y:stepY(row),z,k:k+20})}
  const c=canvas(256,128),ctx=c.getContext('2d');
  [[hostTeam,0],[guestTeam,64]].forEach(([t,y],n)=>{
   const kit=kitOf(t);ctx.fillStyle=kit.shirt;ctx.fillRect(0,y,256,64);
   ctx.fillStyle=kit.shirtSecondary;ctx.beginPath();ctx.moveTo(0,y+64);ctx.lineTo(256,y);ctx.lineTo(256,y+22);ctx.lineTo(38,y+64);ctx.closePath();ctx.fill();
   ctx.fillStyle='#ffffff';ctx.globalAlpha=.9;ctx.fillRect(0,y+28,256,4);ctx.globalAlpha=1;
  });
  // Geometry: cloth (8x3 grid) + a thin pole; aFlag.x = 1 for cloth.
  const pos=[],uv=[],nrm=[],isCloth=[],idx=[];const L=2.1,Hc=1.35,top=3.25;
  const SX=8,SY=3;for(let j=0;j<=SY;j++)for(let i=0;i<=SX;i++){pos.push(i/SX*L,top-Hc+j/SY*Hc,0);uv.push(i/SX,j/SY);nrm.push(0,0,1);isCloth.push(1)}
  for(let j=0;j<SY;j++)for(let i=0;i<SX;i++){const a=j*(SX+1)+i,b=a+1,cc=a+SX+1,dd=cc+1;idx.push(a,b,dd,a,dd,cc)}
  const base=pos.length/3,r=.035;
  for(const [x,z] of [[-r,-r],[r,-r],[r,r],[-r,r]])for(const y of [-.35,top]){pos.push(x,y,z);uv.push(0,0);nrm.push(Math.sign(x),0,Math.sign(z));isCloth.push(0)}
  for(let f=0;f<4;f++){const a=base+f*2,b=base+((f+1)%4)*2;idx.push(a,b,b+1,a,b+1,a+1)}
  const geometry=track(new THREE.BufferGeometry());
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geometry.setAttribute('normal',new THREE.Float32BufferAttribute(nrm,3));geometry.setAttribute('aFlag',new THREE.Float32BufferAttribute(isCloth,1));geometry.setIndex(idx);
  const data=new Float32Array(spots.length*4),teams=new Float32Array(spots.length);
  geometry.setAttribute('aLife',new THREE.InstancedBufferAttribute(data,4));geometry.setAttribute('aFlagTeam',new THREE.InstancedBufferAttribute(teams,1));
  const m=track(new THREE.MeshStandardMaterial({map:tex(THREE,track,c),side:THREE.DoubleSide,roughness:.88}));
  m.onBeforeCompile=shader=>{
   Object.assign(shader.uniforms,uniforms);
   shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nuniform float uLifeOn;uniform float uLifeTime;uniform vec2 uFlagEnergy;attribute vec4 aLife;attribute float aFlag;attribute float aFlagTeam;varying float vFlag;')
    .replace('#include <uv_vertex>','#include <uv_vertex>\n#ifdef USE_MAP\n vMapUv.y=vMapUv.y*.5+(aFlagTeam>.5?0.:.5);\n#endif')
    .replace('#include <begin_vertex>',`#include <begin_vertex>
 vFlag=aFlag;
 float fe=uLifeOn*(aFlagTeam>.5?uFlagEnergy.y:uFlagEnergy.x);
 float ft=uLifeTime*(1.9+fe*1.3)+aLife.x*40.;
 // Cloth ripples away from the pole, more the faster it is swung.
 float along=transformed.x/2.1;
 transformed.z+=aFlag*sin(transformed.x*2.7-uLifeTime*(7.+fe*4.)+aLife.x*9.)*(.1+.22*fe)*along;
 transformed.y-=aFlag*along*along*(.45-.3*min(fe,1.));
 // The whole flag swings in an arc round the bearer's hands (local z faces the pitch).
 float sw=sin(ft)*(.35+.6*min(fe,1.3));float cs=cos(sw),sn=sin(sw);
 transformed=vec3(transformed.x*cs-transformed.y*sn,transformed.x*sn+transformed.y*cs,transformed.z);
`);
   shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nvarying float vFlag;').replace('#include <map_fragment>','#include <map_fragment>\n if(vFlag<.5)diffuseColor.rgb=vec3(.8,.82,.8);');
  };
  m.customProgramCacheKey=()=>'footera-crowd-life-flag';
  const mesh=new THREE.InstancedMesh(geometry,m,spots.length),d=new THREE.Object3D();
  spots.forEach((s,i)=>{data.set([hash(s.k*37+(s.team==='home'?5:9)),0,0,0],i*4);teams[i]=s.team===hostTeam?0:1;
   const yaw=Math.atan2(-s.x,-s.z);d.position.set(s.x,s.y+1.05,s.z);d.rotation.set(0,yaw,0);d.scale.setScalar(1);d.updateMatrix();mesh.setMatrixAt(i,d.matrix)});
  mesh.frustumCulled=false;mesh.name='FooteraSwingFlags';scene.add(mesh);track(mesh);extra.push(mesh);flags=mesh;
 }
 // ---- fence banners with the club names (one atlas, one draw call) ----
 let banners=null;
 function addBanners(){
  const host=shortName(hostTeam==='home'?homeName:awayName,'FOOTERA'),guest=shortName(hostTeam==='home'?awayName:homeName,'GÄSTE');
  const hk=kitOf(hostTeam),gk=kitOf(guestTeam);
  const rows=[
   {text:'ULTRAS '+host,kit:hk,at:'hostSide',z:hostEnd*-26,len:15},
   {text:'NUR DER '+host,kit:hk,at:'hostSide',z:hostEnd*-8,len:15},
   {text:host,kit:hk,at:'hostEnd',x:-21,len:14,small:'SEIT 2026'},
   {text:host,kit:hk,at:'hostEnd',x:21,len:14,small:'BUILD YOUR ERA'},
   {text:guest,kit:gk,at:'guestEnd',x:-20,len:13,small:'AUSWÄRTS'}
  ];
  const W=1024,RH=96,c=canvas(W,RH*rows.length),ctx=c.getContext('2d');
  rows.forEach((r,i)=>{const y=i*RH;ctx.fillStyle=r.kit.shirt;ctx.fillRect(0,y,W,RH);ctx.fillStyle=r.kit.shirtSecondary;ctx.fillRect(0,y,W,10);ctx.fillRect(0,y+RH-10,W,10);
   const light=new THREE.Color(r.kit.shirt);const ink=(light.r*.3+light.g*.59+light.b*.11)>.62?'#101418':'#ffffff';
   ctx.fillStyle=ink;ctx.textAlign='center';ctx.textBaseline='middle';fitFont(ctx,r.text,W*.9,r.small?52:58);ctx.fillText(r.text,W/2,y+(r.small?42:RH/2+2));
   if(r.small){ctx.font='800 20px system-ui';ctx.globalAlpha=.85;ctx.fillText(r.small,W/2,y+74);ctx.globalAlpha=1}});
  const pos=[],uv=[],idx=[],h=.74;
  rows.forEach((r,i)=>{
   let a,b,y=.66;
   if(r.at==='hostSide'){const x=-38.12;a=[x,r.z-r.len/2];b=[x,r.z+r.len/2];y=1.0}
   else{const z=(r.at==='hostEnd'?hostEnd:-hostEnd)*58.12;a=[r.x-r.len/2,z];b=[r.x+r.len/2,z];if(z>0)[a,b]=[b,a]}
   if(r.at==='hostSide')[a,b]=[b,a];
   const v0=1-(i+1)/rows.length,v1=1-i/rows.length,o=pos.length/3;
   pos.push(a[0],y-h/2,a[1],b[0],y-h/2,b[1],b[0],y+h/2,b[1],a[0],y+h/2,a[1]);uv.push(0,v0,1,v0,1,v1,0,v1);idx.push(o,o+1,o+2,o,o+2,o+3);
  });
  const g=track(new THREE.BufferGeometry());g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(idx);
  const mesh=new THREE.Mesh(g,track(new THREE.MeshBasicMaterial({map:tex(THREE,track,c),side:THREE.DoubleSide,color:'#dcdcdc'})));
  mesh.name='FooteraFenceBanners';mesh.frustumCulled=false;scene.add(mesh);track(mesh);extra.push(mesh);banners=mesh;
 }
 // ---- ticker tape over the home end and the main stand at the walk-out ----
 let confetti=null;
 function addConfetti(){
  if(crowdType!=='ceremony_kickoff'||weak)return;
  const n=high?900:mobileStandard?380:620,pos=new Float32Array(n*3),col=new Float32Array(n*3),seed=new Float32Array(n),c=new THREE.Color();
  const kit=kitOf(hostTeam),palette=[kit.shirt,kit.shirtSecondary,'#ffffff',kit.shirt];
  for(let i=0;i<n;i++){
   const main=i%3===0;
   if(main){pos[i*3]=40+hash(i*3+1)*16;pos[i*3+2]=(hash(i*3+2)-.5)*96}else{pos[i*3]=(hash(i*3+1)-.5)*84;pos[i*3+2]=hostEnd*(59+hash(i*3+2)*16)}
   pos[i*3+1]=4+hash(i*3+5)*6;seed[i]=hash(i*7+11);c.set(palette[i%palette.length]);col.set([c.r,c.g,c.b],i*3);
  }
  const g=track(new THREE.BufferGeometry());g.setAttribute('position',new THREE.BufferAttribute(pos,3));g.setAttribute('color',new THREE.BufferAttribute(col,3));g.setAttribute('aSeed',new THREE.BufferAttribute(seed,1));
  const m=track(new THREE.PointsMaterial({size:.32,vertexColors:true,sizeAttenuation:true}));
  m.onBeforeCompile=shader=>{
   Object.assign(shader.uniforms,uniforms);
   shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nuniform float uLifeTime;uniform float uConfetti;attribute float aSeed;')
    .replace('#include <begin_vertex>',`#include <begin_vertex>
 float fall=mod(uLifeTime*1.25+aSeed*11.,11.);
 transformed.y+=9.-fall;transformed.x+=sin(uLifeTime*2.1+aSeed*40.)*.55;transformed.z+=cos(uLifeTime*1.7+aSeed*33.)*.45;
 transformed*=step(.01,uConfetti);`);
  };
  m.customProgramCacheKey=()=>'footera-crowd-life-confetti';
  const points=new THREE.Points(g,m);points.frustumCulled=false;points.name='FooteraTickerTape';points.visible=false;scene.add(points);track(points);extra.push(points);confetti=points;
 }
 let reduced=false,lastScarf=-1;
 function update(time){
  if(reduced)return;
  const s=crowdLifeState({kind:crowdType,attackTeam,hostTeam,time,impact,netArrival,end:sceneEnd,mosaic:!!mosaic});
  uniforms.uLifeTime.value=time;
  uniforms.uJump.value.fromArray(s.jump);uniforms.uRaise.value.fromArray(s.raise);uniforms.uScarf.value.fromArray(s.scarf);uniforms.uTwirl.value.fromArray(s.twirl);uniforms.uChant.value.fromArray(s.chant);
  uniforms.uOla.value=s.ola;uniforms.uOlaAngle.value=s.olaAngle;uniforms.uMosaic.value=s.mosaic;uniforms.uFlagEnergy.value.set(s.flag[0],s.flag[1]);uniforms.uConfetti.value=s.confetti;
  // Flags are indexed host/guest in the shader; the state is home/away.
  if(hostTeam!=='home')uniforms.uFlagEnergy.value.set(s.flag[1],s.flag[0]);
  lastScarf=Math.max(s.scarf[0],s.scarf[1]);
  if(scarves)scarves.visible=lastScarf>.002;
  if(mosaic)mosaic.visible=s.mosaic>.002;
  if(confetti)confetti.visible=s.confetti>.01;
 }
 function reduce(){
  reduced=true;uniforms.uLifeOn.value=0;uniforms.uMosaic.value=0;uniforms.uScarf.value.set(0,0,0);uniforms.uConfetti.value=0;
  for(const m of extra)m.visible=false;
 }
function build(specs,opts={}){choreo=opts.choreo||null;drawChoreo=opts.drawChoreo||null;crestImage=opts.crestImage||null;addScarves(specs);addMosaic(specs);addFlags();addBanners();addConfetti();update(0)}
 return{uniforms,material,attach,patchFanWall,build,update,reduce,
  get info(){return{version:CROWD_LIFE_VERSION,scarves:scarves?.count||0,mosaicCards:mosaic?.count||0,swingFlags:flags?.count||0,banners:banners?5:0,tickerTape:confetti?confetti.geometry.attributes.position.count:0,
   scarvesVisible:!!scarves?.visible,mosaicVisible:!!mosaic?.visible,uniforms:{jump:uniforms.uJump.value.toArray(),scarf:uniforms.uScarf.value.toArray(),ola:uniforms.uOla.value,mosaic:uniforms.uMosaic.value,on:uniforms.uLifeOn.value}}}};
}
