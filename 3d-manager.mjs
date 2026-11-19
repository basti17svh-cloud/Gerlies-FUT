/* Footera V21.462 Manager als Person (Basti 2026-11-17: "zur Trainerkarte
 * zusätzlich noch einen Manager bearbeiten als Person ... dass man ihn auch
 * sieht auf Mannschaftsbildern, vor dem Spiel einblenden mit seiner Karte";
 * "individuell gestalten mit Kleidungsstücken in verschiedenen Farben,
 * Frisuren, Hautfarben").
 * The manager is one of our own 3D humans (same bodies, faces, hair and skin
 * as the players), dressed in his own clothes instead of a kit:
 *  - suit (jacket, shirt and tie), tracksuit (zip jacket with stripes) or
 *    polo, each in the colours the user picks,
 *  - long trousers and long sleeves as real cloth tubes: built once per mount
 *    around the body's own legs and arms in the bind pose, skinned to the same
 *    bones (weights copied from the nearest body vertex), so they bend with
 *    knees and elbows like the rest of the body,
 *  - optional glasses fixed to the head bone.
 * Pure presentation. The settings come from FooteraManager (footera-manager.js).
 */
import * as THREE from './vendor/three/three.module.min.js';
import {RoomEnvironment} from './vendor/three/RoomEnvironment.mjs';
import {prepareFooteraHumanModel,footeraRealBodyLoaded,footeraHumanSource,footeraHumanLook,dressFooteraHuman,
 footeraKitLayout,loadFooteraCrestImage,footeraCrestImageNow} from './3d-player-human.mjs?v=21480';
import {createCaptureRetarget} from './3d-mocap-capture-core.mjs?v=21353';
import {FOOTERA_MIXAMO_CELEBRATE} from './3d-mocap-mixamo-celebrate-data.mjs?v=21439';

export const MANAGER_3D_VERSION='21.470-manager-bench';
const hexOr=(v,fb)=>/^#[0-9a-f]{6}$/i.test(String(v||''))?String(v).toLowerCase():fb;
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const luminance=hex=>{const c=new THREE.Color(hex);return .2126*c.r+.7152*c.g+.0722*c.b};
function shade(hex,f){const c=new THREE.Color(hex);if(f<1)c.multiplyScalar(f);else c.lerp(new THREE.Color('#ffffff'),f-1);return'#'+c.getHexString()}

/* ---------- look ---------- */
const AGE={young:-.1,prime:.25,veteran:.7};
const BUILD={slim:-.45,normal:0,strong:.55};
// What footeraHumanLook needs, from the saved manager (already cleaned by FooteraManager.clean).
export function managerLook(m={}){
 const female=m.gender==='female';
 const custom={hair:m.hair||'short02',hairColor:m.hairColor,beard:female?'none':(m.beard||'none'),female};
 const look=footeraHumanLook(String(m.name||'Trainer')+'|manager',hexOr(m.skin,'#c88f69'),undefined,custom);
 look.morphs={...look.morphs,face_age:AGE[m.age]??AGE.prime,build:BUILD[m.build]??0};
 // Managers stand at an everyday height, not a keeper's.
 look.height=female?1.68:1.8;
 return look;
}

/* ---------- clothes painted onto the kit canvas ---------- */
function garmentSpace(ctx,size,band,metres,half){
 const [across,top,bottom]=metres,[v0,v1]=band;
 const sx=size*.25/across,sy=size*(v1-v0)/(top-bottom);
 ctx.setTransform(sx,0,0,-sy,size*(half==='back'?.75:.25),size*v0+sy*top);
}
function poly(ctx,pts,fill){ctx.beginPath();pts.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();ctx.fillStyle=fill;ctx.fill()}
function word(ctx,text,x,y,h,color,weight=900){
 ctx.save();ctx.translate(x,y);ctx.scale(h/100*.86,-h/100);
 ctx.font=`${weight} 132px "Arial Narrow","Roboto Condensed",Arial,sans-serif`;ctx.textAlign='center';ctx.fillStyle=color;ctx.fillText(text,0,0);ctx.restore();
}
// outfit: {style:'suit'|'tracksuit'|'polo', top, trousers, accent (shirt for the suit), tie}
export function paintManagerOutfit(ctx,size,outfit,opts={},info){
 const {bands,metres}=footeraKitLayout(info);
 const top=hexOr(outfit.top,'#1d2330'),trousers=hexOr(outfit.trousers,'#1a1e26'),accent=hexOr(outfit.accent,'#f3f4f0'),tie=hexOr(outfit.tie,'#8a1c2b');
 const style=outfit.style||'suit';
 ctx.setTransform(1,0,0,1,0,0);
 ctx.fillStyle=top;ctx.fillRect(0,0,size,size*bands.shirt[1]+2);
 ctx.fillStyle=trousers;ctx.fillRect(0,size*bands.shorts[0]-2,size,size*(bands.socks[1]-bands.shorts[0])+4);
 const ink=luminance(top)>.55?'#141820':'#f6f4ee';
 for(const half of ['front','back']){
  ctx.save();garmentSpace(ctx,size,bands.shirt,metres.shirt,half);
  const hem=metres.shirt[2];
  if(style==='suit'){
   if(half==='front'){
    // shirt and tie in the V of the jacket
    poly(ctx,[[-.078,1.52],[.078,1.52],[.0,1.2]],accent);
    poly(ctx,[[-.016,1.485],[.016,1.485],[.012,1.46],[.026,1.27],[0,1.235],[-.026,1.27],[-.012,1.46]],tie);
    poly(ctx,[[-.017,1.49],[.017,1.49],[.013,1.462],[-.013,1.462]],shade(tie,.78));
    // lapels a shade off the cloth, with their notch
    const lap=shade(top,luminance(top)>.4?.86:1.12);
    for(const s of [-1,1])poly(ctx,[[s*.078,1.52],[s*.12,1.47],[s*.105,1.445],[s*.135,1.42],[s*.012,1.205],[0,1.2]],lap);
    ctx.strokeStyle=shade(top,.6);ctx.lineWidth=.004;
    for(const s of [-1,1]){ctx.beginPath();ctx.moveTo(s*.078,1.52);ctx.lineTo(s*.12,1.47);ctx.lineTo(s*.105,1.445);ctx.lineTo(s*.135,1.42);ctx.lineTo(s*.012,1.205);ctx.stroke()}
    // closing line, buttons, pockets, pocket square
    ctx.beginPath();ctx.moveTo(0,1.2);ctx.lineTo(0,hem);ctx.stroke();
    ctx.fillStyle=shade(top,.45);for(const y of [1.15,1.06]){ctx.beginPath();ctx.arc(.006,y,.009,0,Math.PI*2);ctx.fill()}
    for(const s of [-1,1]){ctx.fillStyle=shade(top,.7);ctx.fillRect(s>0?.06:-.16,hem+.11,.1,.006)}
    ctx.fillStyle=shade(top,.7);ctx.fillRect(.07,1.33,.085,.005);
    poly(ctx,[[.085,1.335],[.13,1.335],[.12,1.36],[.1,1.352]],accent);
    if(opts.crest)try{ctx.save();ctx.translate(-.11,1.39);ctx.scale(1,-1);ctx.drawImage(opts.crest,-.022,-.025,.044,.05);ctx.restore()}catch(_){}
   }else{
    ctx.strokeStyle=shade(top,.6);ctx.lineWidth=.004;ctx.beginPath();ctx.moveTo(0,hem+.2);ctx.lineTo(0,hem);ctx.stroke();
    poly(ctx,[[-.07,1.53],[.07,1.53],[.06,1.5],[-.06,1.5]],accent);
   }
  }else if(style==='tracksuit'){
   // stand-up collar, zip, chest crest, raglan stripes over the shoulders
   ctx.fillStyle=accent;ctx.fillRect(-.085,1.49,.17,.035);
   for(const s of [-1,1]){ctx.save();ctx.strokeStyle=accent;ctx.lineWidth=.012;ctx.beginPath();ctx.moveTo(s*.085,1.5);ctx.lineTo(s*.21,1.44);ctx.stroke();ctx.restore()}
   if(half==='front'){
    ctx.fillStyle=shade(top,.55);ctx.fillRect(-.004,hem,.008,1.53-hem);
    ctx.fillStyle='#c9ccd2';ctx.fillRect(-.007,1.45,.014,.03);
    if(opts.crest)try{ctx.save();ctx.translate(.098,1.37);ctx.scale(1,-1);ctx.drawImage(opts.crest,-.035,-.04,.07,.08);ctx.restore()}catch(_){}
    word(ctx,'FOOTERA',-.1,1.35,.026,ink,800);
   }else{
    word(ctx,'TRAINER',0,1.36,.05,ink);
    if(opts.name)word(ctx,String(opts.name).toUpperCase().slice(0,14),0,1.27,.03,ink,700);
   }
   ctx.fillStyle=accent;ctx.fillRect(-.4,hem,.8,.025);
  }else{
   // polo: collar, placket with two buttons, crest
   if(half==='front'){
    poly(ctx,[[-.085,1.53],[.085,1.53],[.05,1.47],[0,1.5],[-.05,1.47]],accent);
    ctx.fillStyle=shade(top,.7);ctx.fillRect(-.016,1.36,.032,.13);
    ctx.fillStyle=accent;for(const y of [1.45,1.4]){ctx.beginPath();ctx.arc(0,y,.006,0,Math.PI*2);ctx.fill()}
    if(opts.crest)try{ctx.save();ctx.translate(.098,1.37);ctx.scale(1,-1);ctx.drawImage(opts.crest,-.035,-.04,.07,.08);ctx.restore()}catch(_){}
   }else{
    ctx.fillStyle=accent;ctx.fillRect(-.09,1.5,.18,.03);
    word(ctx,'TRAINER',0,1.38,.04,ink);
   }
   // sleeve cuffs
   for(const s of [-1,1]){ctx.save();ctx.translate(s*.27,1.35);ctx.fillStyle=accent;ctx.fillRect(-.06,-.01,.12,.012);ctx.restore()}
  }
  // soft occlusion so the cloth keeps depth
  if(typeof ctx.createRadialGradient==='function'){
   for(const s of [-1,1]){ctx.save();ctx.translate(s*.2,1.33);ctx.scale(.07,.1);const g=ctx.createRadialGradient(0,0,0,0,0,1);g.addColorStop(0,'rgba(0,0,0,.3)');g.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=g;ctx.fillRect(-1,-1,2,2);ctx.restore()}
  }
  ctx.restore();
 }
 // fine weave
 let s=7;for(let i=0;i<size*size/120;i++){s=(Math.imul(s,1664525)+1013904223)>>>0;const x=(s>>>8)%size;s=(Math.imul(s,1664525)+1013904223)>>>0;const y=(s>>>8)%size;
  ctx.fillStyle=s&1?'rgba(255,255,255,.03)':'rgba(0,0,0,.05)';ctx.fillRect(x,y,1,1)}
 ctx.setTransform(1,0,0,1,0,0);
}

/* ---------- cloth tubes: trousers and long sleeves ---------- */
const V=()=>new THREE.Vector3();
function boneIndex(skeleton,name){return skeleton.bones.findIndex(b=>b.name===name)}
function bindBonePos(skeleton,name){const i=boneIndex(skeleton,name);return i<0?null:V().setFromMatrixPosition(skeleton.boneInverses[i].clone().invert())}
// Vertices of a mesh in bind (skeleton) space with their main bone.
function bindVertices(mesh,keepBones){
 const g=mesh.geometry,pos=g.getAttribute('position'),si=g.getAttribute('skinIndex'),sw=g.getAttribute('skinWeight');if(!pos||!si||!sw)return[];
 const bones=mesh.skeleton.bones,out=[],p=V();
 for(let i=0;i<pos.count;i++){
  let best=-1,w=0;for(let k=0;k<4;k++){const ww=sw.getComponent(i,k);if(ww>w){w=ww;best=si.getComponent(i,k)}}
  const name=bones[best]?.name;if(!keepBones.has(name))continue;
  p.fromBufferAttribute(pos,i).applyMatrix4(mesh.bindMatrix);
  out.push({p:p.clone(),si:[0,1,2,3].map(k=>si.getComponent(i,k)),sw:[0,1,2,3].map(k=>sw.getComponent(i,k)),bones});
 }
 return out;
}
// One tube along the joint chain a->b->c, from t0 to t1 (0..1 of the chain length).
// The radius of every ring and sector is the widest body point there plus some ease.
function clothTube(body,others,chain,opt){
 const sk=body.skeleton,P=chain.map(n=>n?.isVector3?n.clone():bindBonePos(sk,n));if(P.some(p=>!p))return null;
 const keep=new Set(opt.bones),verts=[body,...others].flatMap(m=>m?.skeleton?bindVertices(m,keep):[]).filter(v=>!opt.above||v.p.y>opt.above);
 if(verts.length<40)return null;
 const L1=P[0].distanceTo(P[1]),L2=P[1].distanceTo(P[2]),L=L1+L2,knee=L1/L;
 const at=t=>{const s=t*L;return s<=L1?P[0].clone().lerp(P[1],s/L1):P[1].clone().lerp(P[2],(s-L1)/L2)};
 const N=opt.rings||16,S=opt.sectors||20,t0=opt.t0,t1=opt.t1;
 const ts=Array.from({length:N},(_,i)=>t0+(t1-t0)*i/(N-1));
 // frames by parallel transport, first axis pointing out to the side (u=0 is the outer seam)
 const frames=[];let U=opt.out.clone();
 for(const t of ts){
  const d=.02,T=at(Math.min(1,t+d)).sub(at(Math.max(0,t-d))).normalize();
  U.addScaledVector(T,-U.dot(T)).normalize();const W=V().crossVectors(T,U).normalize();
  frames.push({c:at(t),T,U:U.clone(),W});
 }
 const R=Array.from({length:N},()=>new Float32Array(S).fill(-1));
 const seg=(p,a,b)=>{const ab=b.clone().sub(a),k=clamp(p.clone().sub(a).dot(ab)/ab.lengthSq());return{k,q:a.clone().addScaledVector(ab,k)}};
 for(const v of verts){
  const A=seg(v.p,P[0],P[1]),B=seg(v.p,P[1],P[2]);
  const t=A.q.distanceTo(v.p)<=B.q.distanceTo(v.p)?A.k*knee:knee+B.k*(1-knee);
  if(t<t0-.03||t>t1+.03)continue;
  const ri=Math.round(clamp((t-t0)/(t1-t0))*(N-1)),f=frames[ri];
  const r=v.p.clone().sub(f.c);r.addScaledVector(f.T,-r.dot(f.T));const d=r.length();if(d>opt.cap)continue;
  const th=Math.atan2(r.dot(f.W),r.dot(f.U));const si=((Math.round(th/(Math.PI*2)*S)%S)+S)%S;
  if(d>R[ri][si])R[ri][si]=d;
 }
 // fill gaps, then a gentle smoothing that never shrinks under the body
 for(let pass=0;pass<12;pass++)for(let i=0;i<N;i++)for(let j=0;j<S;j++)if(R[i][j]<0){
  let sum=0,n=0;for(const [a,b] of [[i-1,j],[i+1,j],[i,j-1],[i,j+1]]){const r=R[a]?.[(b+S)%S];if(r>0){sum+=r;n++}}
  if(n)R[i][j]=sum/n;
 }
 for(let i=0;i<N;i++)for(let j=0;j<S;j++)if(R[i][j]<0)R[i][j]=opt.minR;
 for(let pass=0;pass<(opt.smooth||2);pass++){
  const C=R.map(r=>Float32Array.from(r));
  for(let i=0;i<N;i++)for(let j=0;j<S;j++){
   let sum=0,n=0;for(let a=-1;a<=1;a++)for(let b=-1;b<=1;b++){const r=C[i+a]?.[(j+b+S)%S];if(r>0){sum+=r;n++}}
   R[i][j]=Math.max(C[i][j]*.97,sum/n);
  }
 }
 // trousers fall straight from the knee; sleeves keep a little room at the cuff
 if(opt.straight){const ki=Math.round(clamp((knee-t0)/(t1-t0))*(N-1));
  for(let i=ki+1;i<N;i++){const k=(ts[i]-knee)/Math.max(.01,1-knee);for(let j=0;j<S;j++)R[i][j]=Math.max(R[i][j],R[ki][j]*(1-.2*k))}}
 for(let i=0;i<N;i++){const e=typeof opt.ease==='function'?opt.ease(i/(N-1)):opt.ease;for(let j=0;j<S;j++)R[i][j]=Math.max(opt.minR,R[i][j])+e}
 // geometry (bind space), seam duplicated for the texture
 const pos=[],uv=[],idx=[],bind=[];
 for(let i=0;i<N;i++)for(let j=0;j<=S;j++){
  const f=frames[i],th=j/S*Math.PI*2,r=R[i][j%S];
  const p=f.c.clone().addScaledVector(f.U,Math.cos(th)*r).addScaledVector(f.W,Math.sin(th)*r);
  bind.push(p);pos.push(p.x,p.y,p.z);uv.push(j/S,i/(N-1));
 }
 for(let i=0;i<N-1;i++)for(let j=0;j<S;j++){const a=i*(S+1)+j,b=a+1,c=a+S+1,d=c+1;idx.push(a,c,b,b,c,d)}
 // weights from the nearest body vertex of this limb
 const skinI=[],skinW=[];
 for(const p of bind){let best=null,bd=Infinity;for(const v of verts){const d=v.p.distanceToSquared(p);if(d<bd){bd=d;best=v}}
  const map=best.si.map(i=>boneIndex(sk,best.bones[i]?.name));
  skinI.push(...map.map(i=>Math.max(0,i)));skinW.push(...best.sw.map((w,k)=>map[k]<0?0:w));
 }
 const inv=body.bindMatrixInverse,local=[];for(let i=0;i<pos.length;i+=3){const p=V().set(pos[i],pos[i+1],pos[i+2]).applyMatrix4(inv);local.push(p.x,p.y,p.z)}
 const geo=new THREE.BufferGeometry();
 geo.setAttribute('position',new THREE.Float32BufferAttribute(local,3));geo.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));
 geo.setAttribute('skinIndex',new THREE.Uint16BufferAttribute(skinI,4));geo.setAttribute('skinWeight',new THREE.Float32BufferAttribute(skinW,4));
 geo.setIndex(idx);geo.computeVertexNormals();
 return geo;
}
function tubeTexture(color,stripe,size=256){
 const c=document.createElement('canvas');c.width=c.height=size;const g=c.getContext('2d');
 g.fillStyle=color;g.fillRect(0,0,size,size);
 if(stripe){g.fillStyle=stripe;for(const x of [0,1])g.fillRect(x*size-size*.035,0,size*.07,size)}
 let s=3;for(let i=0;i<size*size/90;i++){s=(Math.imul(s,1664525)+1013904223)>>>0;g.fillStyle=s&1?'rgba(255,255,255,.03)':'rgba(0,0,0,.05)';g.fillRect((s>>>8)%size,(s>>>16)%size,1,1)}
 const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=4;return t;
}
function addTube(body,geo,map,owned,name,roughness){
 const mat=new THREE.MeshStandardMaterial({map,roughness,metalness:0,side:THREE.DoubleSide});
 const mesh=new THREE.SkinnedMesh(geo,mat);mesh.name=name;mesh.bind(body.skeleton,body.bindMatrix);
 mesh.frustumCulled=false;mesh.castShadow=true;mesh.receiveShadow=true;body.parent.add(mesh);
 owned.push({geometry:geo,material:mat});return mesh;
}
function addGlasses(model,body,style,owned){
 const eyes=[];model.traverse(n=>{if(n.isSkinnedMesh&&n.name==='FooteraEyes')eyes.push(n)});
 const head=body.skeleton.bones[boneIndex(body.skeleton,'Head')];if(!eyes.length||!head)return;
 const pts=[];for(const e of eyes){const pos=e.geometry.getAttribute('position');for(let i=0;i<pos.count;i++)pts.push(V().fromBufferAttribute(pos,i).applyMatrix4(e.bindMatrix))}
 if(pts.length<8)return;
 const cx=pts.reduce((s,p)=>s+p.x,0)/pts.length;
 const side=s=>{const list=pts.filter(p=>(p.x-cx)*s>0);const box=new THREE.Box3().setFromPoints(list);return{c:box.getCenter(V()),front:box.max.z,r:Math.max(.011,(box.max.x-box.min.x)/2)}};
 const L=side(1),Rr=side(-1);
 const metal=style==='gold',mat=new THREE.MeshStandardMaterial({color:metal?'#c9a24a':'#141414',metalness:metal?1:.1,roughness:metal?.25:.45});
 const lens=new THREE.MeshStandardMaterial({color:'#dfe8ee',metalness:0,roughness:.05,transparent:true,opacity:.18});
 const g=new THREE.Group();g.name='FooteraManagerGlasses';
 const r=Math.max(L.r,Rr.r)*1.55,z=Math.max(L.front,Rr.front)+.012,tube=metal?.0013:.0026;
 for(const e of [L,Rr]){
  const ring=new THREE.Mesh(new THREE.TorusGeometry(r,tube,8,28),mat);ring.scale.set(1,.78,1);ring.position.set(e.c.x,e.c.y,z);g.add(ring);
  const glass=new THREE.Mesh(new THREE.CircleGeometry(r,24),lens);glass.scale.set(1,.78,1);glass.position.set(e.c.x,e.c.y,z-.0005);g.add(glass);
  const out=Math.sign(e.c.x-cx),temple=new THREE.Mesh(new THREE.BoxGeometry(tube*1.6,tube*1.6,.1),mat);
  temple.position.set(e.c.x+out*r*1.02,e.c.y+.003,z-.05);temple.rotation.y=-out*.12;g.add(temple);
 }
 const bridge=new THREE.Mesh(new THREE.BoxGeometry(Math.abs(L.c.x-Rr.c.x)-2*r+.004,tube*1.6,tube*1.6),mat);bridge.position.set(cx,(L.c.y+Rr.c.y)/2+.004,z);g.add(bridge);
 // bind space -> head bone space
 const inv=body.skeleton.boneInverses[boneIndex(body.skeleton,'Head')];
 g.applyMatrix4(inv);head.add(g);
 g.traverse(o=>{if(o.isMesh){o.castShadow=false;owned.push(o)}});
}

// Dresses a cloned human model as the manager. Returns {owned}.
export function dressManager(model,look,m,opts={}){
 const asset=footeraHumanSource(look),info=asset?.info;
 const outfit={style:m.outfit||'suit',top:m.top,trousers:m.trousers,accent:m.accent,tie:m.tie};
 const shoes=outfit.style==='tracksuit'?'#e9e9e6':'#121212';
 const dressed=dressFooteraHuman(THREE,model,look,{shirt:outfit.top,shorts:outfit.trousers,socks:outfit.trousers},{detail:!!opts.detail,boots:shoes,sponsor:false});
 const owned=[...dressed.owned];
 const ctx=dressed.canvas.getContext('2d');
 if(ctx){paintManagerOutfit(ctx,dressed.canvas.width,outfit,{crest:opts.crest,name:m.name},info);dressed.kitMap.needsUpdate=true}
 const meshes=[];model.traverse(n=>{if(n.isSkinnedMesh)meshes.push(n)});
 const body=meshes.find(n=>n.name==='FooteraBody');
 // cloth sits matte; the suit gets a touch of sheen
 for(const n of meshes)if(/^Footera(Shirt|Shorts|Socks)$/.test(n.name)){n.material.roughness=outfit.style==='suit'?.7:.82;if(n.material.normalScale)n.material.normalScale.set(.35,.35)}
 if(body){
  model.updateMatrixWorld(true);
  const other=name=>meshes.find(n=>n.name===name);
  const stripe=outfit.style==='tracksuit'?hexOr(outfit.accent,'#ffffff'):null;
  const top=hexOr(outfit.top,'#1d2330'),trousers=hexOr(outfit.trousers,'#1a1e26');
  const legMap=tubeTexture(trousers,stripe),armMap=tubeTexture(top,stripe);owned.push({texture:legMap},{texture:armMap});
  // round the hips: the trousers' top from under the hem to below the crotch
  const sk=body.skeleton,pelvis=bindBonePos(sk,'pelvis'),tl=bindBonePos(sk,'thigh_l'),cl=bindBonePos(sk,'calf_l');
  const shirt=other('FooteraShirt');let hem=null;
  if(shirt&&pelvis){const pos=shirt.geometry.getAttribute('position');let lo=Infinity;const p=V();for(let i=0;i<pos.count;i++){p.fromBufferAttribute(pos,i).applyMatrix4(shirt.bindMatrix);if(Math.abs(p.x-pelvis.x)<.12)lo=Math.min(lo,p.y)}hem=Number.isFinite(lo)?lo:null}
  if(pelvis&&tl&&cl&&hem!=null){
   const topY=hem+.05,bottomY=tl.y-(tl.y-cl.y)*.24;
   const P0=V().set(pelvis.x,topY,pelvis.z),P2=V().set(pelvis.x,bottomY,pelvis.z),P1=P0.clone().lerp(P2,.5);
   const hips=clothTube(body,[other('FooteraShorts')],[P0,P1,P2],{bones:['pelvis','spine_01','thigh_l','thigh_r'],above:bottomY-.06,t0:0,t1:1,cap:.3,
    ease:t=>t<.3?-.008:t<.5?.004:.012,minR:.08,out:V().set(1,0,0),rings:10,sectors:28,smooth:5});
   const hipMap=tubeTexture(trousers,null);owned.push({texture:hipMap});
   if(hips)addTube(body,hips,hipMap,owned,'FooteraManagerHips',.8);
  }
  for(const s of ['l','r']){
   const out=V().set(s==='l'?1:-1,0,0);
   const pelvis=bindBonePos(body.skeleton,'pelvis'),thigh=bindBonePos(body.skeleton,'thigh_'+s);
   if(pelvis&&thigh&&Math.sign(thigh.x-pelvis.x))out.set(Math.sign(thigh.x-pelvis.x),0,0);
   const leg=clothTube(body,[other('FooteraShorts'),other('FooteraSocks')],['thigh_'+s,'calf_'+s,'foot_'+s],
    {bones:['thigh_'+s,'calf_'+s],t0:.04,t1:1.01,cap:.16,ease:.012,minR:.04,out,straight:true,rings:18});
   if(leg)addTube(body,leg,legMap,owned,'FooteraManagerTrousers_'+s,.8);
   if(outfit.style!=='polo'){
    const arm=clothTube(body,[other('FooteraShirt')],['upperarm_'+s,'lowerarm_'+s,'hand_'+s],
     {bones:['upperarm_'+s,'lowerarm_'+s],t0:.08,t1:.985,cap:.085,ease:.009,minR:.028,out:V().set(0,1,0),rings:14});
    if(arm)addTube(body,arm,armMap,owned,'FooteraManagerSleeve_'+s,.75);
   }
  }
  if(m.glasses&&m.glasses!=='none')addGlasses(model,body,m.glasses,owned);
 }
 return{owned};
}

/* ---------- the bench (V21.470) ---------- */
// Basti 2026-11-17: after the walk-out the manager is shown at the substitutes' bench.
// A covered dugout along the touchline (the perimeter boards are its back): floor, perspex roof and side
// panels, eight bucket seats in the club colour. Its front faces -x (the pitch).
// Pure presentation; every geometry and material goes through track() for disposal.
export function mountDugout(parent,{x=36.1,z=-7.2,length=6.4,seat='#971d42',track=o=>o}={}){
 const g=new THREE.Group();g.name='FooteraDugout';g.position.set(x,0,z);
 const mat=(c,o={})=>track(new THREE.MeshStandardMaterial({color:c,roughness:.6,metalness:.1,...o}));
 const box=(w,h,d,m,px,py,pz)=>{const b=new THREE.Mesh(track(new THREE.BoxGeometry(w,h,d)),m);b.position.set(px,py,pz);b.castShadow=true;b.receiveShadow=true;g.add(b);return b};
 const frame=mat('#2a3138',{metalness:.6,roughness:.35}),glass=mat('#bcd6e6',{transparent:true,opacity:.28,roughness:.08,metalness:.2,depthWrite:false});
 box(1.7,.1,length,mat('#3a4048'),.1,.05,0);
 const roof=box(1.9,.04,length+.1,glass,.05,1.86,0);roof.rotation.z=-.12;roof.castShadow=false;
 for(const sz of [-1,1]){const side=box(1.7,1.7,.04,glass,.1,.95,sz*length/2);side.castShadow=false;box(1.8,.06,.06,frame,.06,1.84,sz*length/2)}
 box(.06,.06,length,frame,-.82,1.75,0);
 const seatMat=mat(/^#[0-9a-f]{6}$/i.test(seat)?seat:'#971d42',{roughness:.45});
 const n=8,step=(length-.6)/n;
const seats=[];
 for(let i=0;i<n;i++){const sz=-length/2+.3+step*(i+.5);seats.push({x:x+.56,y:.6,z:z+sz});box(.46,.08,.46,seatMat,.5,.5,sz);const back=box(.08,.5,.46,seatMat,.74,.74,sz);back.rotation.z=.12;box(.06,.45,.06,frame,.5,.24,sz)}
  g.userData.seats=seats;parent.add(g);return g;
}

/* ---------- mounting and posing ---------- */
function bonesOf(model){const bones=new Map();model.traverse(n=>{if(n.isBone)bones.set(n.name,n)});return bones}
// A ready figure under its own root, feet on y=0, facing +Z.
export function mountManager(scene,m,opts={}){
 const look=managerLook(m),asset=footeraHumanSource(look);if(!asset)return null;
 const model=asset.clone(asset.scene);
 const {owned}=dressManager(model,look,m,opts);
 const meshes=[];model.traverse(n=>{if(n.isSkinnedMesh){n.frustumCulled=false;n.castShadow=true;n.receiveShadow=true;meshes.push(n)}});
 model.updateMatrixWorld(true);
 const bounds=new THREE.Box3();for(const x of meshes)if(x.name==='FooteraBody'||x.name==='FooteraBoots')bounds.expandByObject(x);
 const size=bounds.getSize(V());if(size.y<.05)return null;
 const scale=look.height/size.y,center=bounds.getCenter(V());
 const root=new THREE.Group();root.name='FooteraManager';const holder=new THREE.Group();holder.add(model);root.add(holder);
 model.scale.setScalar(scale);model.position.set(-center.x*scale,-bounds.min.y*scale,-center.z*scale);
 scene.add(root);
 return{root,holder,model,meshes,bones:bonesOf(model),look,scale,owned};
}
const UP=new THREE.Vector3(0,1,0);
function pointBone(bone,child,dirWorld){
 bone.updateMatrixWorld(true);
 const a=bone.getWorldPosition(V()),b=child.getWorldPosition(V());
 const q=new THREE.Quaternion().setFromUnitVectors(b.sub(a).normalize(),dirWorld.clone().normalize());
 const wq=bone.getWorldQuaternion(new THREE.Quaternion()),pq=bone.parent.getWorldQuaternion(new THREE.Quaternion());
 bone.quaternion.copy(pq.invert().multiply(q.multiply(wq)));bone.updateMatrixWorld(true);
}
// Arm poses in the body frame [out, up, forward] for upper arm and forearm.
export const MANAGER_ARMS=Object.freeze({
 crossed:{l:{upper:[.2,-.85,.35],lower:[-.97,.16,.24],curl:.8},r:{upper:[.2,-.82,.4],lower:[-.97,.26,.18],curl:.8}},
 down:{l:{upper:[.12,-1,.02],lower:[.05,-1,.18],curl:.35},r:{upper:[.12,-1,.02],lower:[.05,-1,.18],curl:.35}},
 fist:{l:{upper:[.85,.3,.3],lower:[-.25,1,.15]},r:{upper:[.12,-1,.02],lower:[.05,-1,.18]}},
 clap:{l:{upper:[.15,-.6,.6],lower:[-.6,.35,.75]},r:{upper:[.15,-.6,.6],lower:[-.6,.35,.75]}}
});
// Fingers fold towards the palm (as the Siegerfoto fists), amount 0..1.
function curlFingers(bones,side,amount){
 const hand=bones.get('hand_'+side),thumb=bones.get('thumb_01_'+side),mid=bones.get('middle_01_'+side);if(!hand||!thumb||!mid)return;
 hand.updateMatrixWorld(true);
 const h=hand.getWorldPosition(V()),d=mid.getWorldPosition(V()).sub(h).normalize();
 const t=thumb.getWorldPosition(V()).sub(h);t.addScaledVector(d,-t.dot(d)).normalize();
 const palm=t.clone().multiplyScalar(-(side==='l'?1:-1));
 for(const finger of ['index','middle','ring','pinky'])[[1,1.1],[2,1.25],[3,.85]].forEach(([joint,angle])=>{
  const bone=bones.get(finger+'_0'+joint+'_'+side);if(!bone)return;
  const wq=bone.getWorldQuaternion(new THREE.Quaternion()),pq=bone.parent.getWorldQuaternion(new THREE.Quaternion());
  bone.quaternion.copy(pq.invert().multiply(new THREE.Quaternion().setFromAxisAngle(palm,angle*amount).multiply(wq)));bone.updateMatrixWorld(true);
 });
}
export function poseManager(p,{pose='crossed',x=0,y=0,z=0,yaw=0,camera=null,body='victory',frame=20}={}){
 const {root,bones}=p;
 root.position.set(x,y,z);
 root.rotation.y=(camera?Math.atan2(camera.position.x-x,camera.position.z-z):0)+yaw;
 root.updateMatrixWorld(true);
 const footY=Math.min(...['foot_l','foot_r'].map(n=>bones.get(n)?.getWorldPosition(V()).y??0));
 const rig=createCaptureRetarget(bones,root,FOOTERA_MIXAMO_CELEBRATE);
 if(rig&&body&&pose!=='none')rig.pose(body,frame,{body:.55,legs:.4},0);
 root.updateMatrixWorld(true);
 const fwd=V().set(0,0,1).applyQuaternion(root.getWorldQuaternion(new THREE.Quaternion())).setY(0).normalize(),left=V().crossVectors(UP,fwd).normalize();
 const dir=(side,[o,u,w])=>left.clone().multiplyScalar(side==='l'?o:-o).addScaledVector(UP,u).addScaledVector(fwd,w).normalize();
 const arms=MANAGER_ARMS[pose];
 if(arms)for(const s of ['l','r']){const a=arms[s],up=bones.get('upperarm_'+s),lo=bones.get('lowerarm_'+s),hand=bones.get('hand_'+s);if(!a||!up||!lo||!hand)continue;
  pointBone(up,lo,dir(s,a.upper));pointBone(lo,hand,dir(s,a.lower));const mid=bones.get('middle_01_'+s);if(mid)pointBone(hand,mid,dir(s,a.lower));
  if(a.curl)curlFingers(bones,s,a.curl)}
 // straight up, eyes to the camera
 if(camera)for(const [name,share] of [['neck_01',.4],['Head',.6]]){
  const bone=bones.get(name);if(!bone)continue;bone.updateMatrixWorld(true);
  const fw=bone.userData.mgrForward||(bone.userData.mgrForward=fwd.clone().applyQuaternion(bone.getWorldQuaternion(new THREE.Quaternion()).invert()).normalize());
  const cur=fw.clone().applyQuaternion(bone.getWorldQuaternion(new THREE.Quaternion())).normalize(),want=camera.position.clone().sub(bone.getWorldPosition(V())).normalize();
  const q=new THREE.Quaternion().setFromUnitVectors(cur,want).slerp(new THREE.Quaternion(),1-share);
  const wq=bone.getWorldQuaternion(new THREE.Quaternion()),pq=bone.parent.getWorldQuaternion(new THREE.Quaternion());
  bone.quaternion.copy(pq.invert().multiply(q.multiply(wq)));bone.updateMatrixWorld(true);
 }
 root.updateMatrixWorld(true);
 let low=Infinity;for(const n of ['foot_l','foot_r']){const b=bones.get(n);if(b)low=Math.min(low,b.getWorldPosition(V()).y-(footY-y))}
 if(Number.isFinite(low))root.position.y+=y-low;
 root.updateMatrixWorld(true);
}
/* ---------- substitutes on the bench (V21.470) ---------- */
// Basti 2026-11-18: "Vielleicht auch Ersatzspieler mit einbinden sonst wirkt das nicht realistisch".
// Club warm-up tracksuits, seated: thighs forward, shins down, forearms on the thighs.
const SUB_SKINS=['#e6bf9c','#8a5a3c','#c88f69','#4a2e1f','#dbad88','#a96d4b','#6b4128','#f1d2b3'];
const SUB_HAIR=['short01','afro01','short02','bald','short04','dreads01','short01','afro01'];
const SUB_HAIR_COLOR=['#2a1d15','#120d0a','#5a3a22','#1a1410','#7a5a3a','#140f0c','#3b2a1f','#0f0b09'];
const SUB_BEARD=['none','Full_beard','none','none','Moustache','none','none','Full_beard'];
export function substituteLook(i,kit={}){
 const k=((i%8)+8)%8;
 return{name:'',gender:'male',skin:SUB_SKINS[k],hair:SUB_HAIR[k],hairColor:SUB_HAIR_COLOR[k],beard:SUB_BEARD[k],glasses:'none',age:k%3?'young':'prime',build:k%4===1?'strong':k%4===3?'slim':'normal',
  outfit:'tracksuit',top:hexOr(kit.top,'#971d42'),trousers:hexOr(kit.trousers,'#16191d'),accent:hexOr(kit.accent,'#f3f4ee')};
}
export function poseSeated(p,{x=0,y=.6,z=0,heading=-Math.PI/2,spread=.08,look=0}={}){
 const {root,bones,holder}=p;
 root.position.set(x,0,z);root.rotation.y=heading;root.updateMatrixWorld(true);
 const fwd=V().set(0,0,1).applyQuaternion(root.getWorldQuaternion(new THREE.Quaternion())).setY(0).normalize(),left=V().crossVectors(UP,fwd).normalize();
 const dir=(side,[o,u,w])=>left.clone().multiplyScalar(side==='l'?o:-o).addScaledVector(UP,u).addScaledVector(fwd,w).normalize();
 for(const s of ['l','r']){
  const th=bones.get('thigh_'+s),ca=bones.get('calf_'+s),ft=bones.get('foot_'+s);
  if(th&&ca)pointBone(th,ca,dir(s,[spread,.05,1]));
  if(ca&&ft)pointBone(ca,ft,dir(s,[.03,-1,.12]));
  const up=bones.get('upperarm_'+s),lo=bones.get('lowerarm_'+s),hand=bones.get('hand_'+s);
  if(up&&lo)pointBone(up,lo,dir(s,[.14,-.86,.42]));
  if(lo&&hand)pointBone(lo,hand,dir(s,[-.18,-.32,.93]));
  curlFingers(bones,s,.45);
 }
 const neck=bones.get('neck_01');if(neck&&look){neck.rotateY(look);neck.updateMatrixWorld(true)}
 root.updateMatrixWorld(true);
 const pelvis=bones.get('pelvis');if(pelvis){const py=pelvis.getWorldPosition(V()).y;root.position.y+=y-py+.04;root.updateMatrixWorld(true)}
}
export function mountSubstitute(parent,i,kit={},opts={}){return mountManager(parent,substituteLook(i,kit),opts)}
// Measure the head's forward axis before any pose (model faces +Z).
export function measureManagerHead(p){
 p.root.updateMatrixWorld(true);
 const fwd=V().set(0,0,1).applyQuaternion(p.root.getWorldQuaternion(new THREE.Quaternion()));
 for(const name of ['neck_01','Head']){const b=p.bones.get(name);if(b)b.userData.mgrForward=fwd.clone().applyQuaternion(b.getWorldQuaternion(new THREE.Quaternion()).invert()).normalize()}
}
export function disposeOwned(owned){
 for(const o of owned){
  if(o.isMesh){o.geometry?.dispose();const ms=Array.isArray(o.material)?o.material:[o.material];for(const mm of ms){mm?.map?.dispose?.();mm?.dispose?.()}}
  else{o.geometry?.dispose?.();o.material?.dispose?.();o.texture?.dispose?.()}
 }
}

/* ---------- portrait for the card and the editor ---------- */
async function loadBodies(timeout=20000){
 await prepareFooteraHumanModel();
 try{await Promise.race([footeraRealBodyLoaded(),new Promise(r=>setTimeout(r,timeout))])}catch(_){}
}
async function crestImage(html){
 if(!html)return null;let img=footeraCrestImageNow(html);
 if(!img)try{img=await Promise.race([loadFooteraCrestImage(html),new Promise(r=>setTimeout(()=>r(null),1500))])}catch(_){}
 return img;
}
let stage=null;
function portraitStage(width,height){
 if(stage&&stage.width===width&&stage.height===height)return stage;
 if(stage){stage.renderer.dispose();try{stage.renderer.forceContextLoss()}catch(_){}}
 const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
 const renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:true,preserveDrawingBuffer:true});
 renderer.setPixelRatio(1);renderer.setSize(width,height,false);renderer.setClearColor(0x000000,0);
 renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=.95;
 const scene=new THREE.Scene();
 const pmrem=new THREE.PMREMGenerator(renderer);scene.environment=pmrem.fromScene(new RoomEnvironment(renderer),.04).texture;pmrem.dispose();
 scene.add(new THREE.HemisphereLight('#f4f7ff','#3a3530',.7));
 const key=new THREE.DirectionalLight('#fff4e6',2.2);key.position.set(1.6,2.6,2.4);scene.add(key);
 const rim=new THREE.DirectionalLight('#cfe6ff',1.6);rim.position.set(-2,2.2,-1.6);scene.add(rim);
 const fill=new THREE.DirectionalLight('#ffffff',.5);fill.position.set(-1.5,1.2,2);scene.add(fill);
 stage={width,height,canvas,renderer,scene};return stage;
}
// spec: {manager, crestHTML}; opts {width,height,framing:'bust'|'full',pose}. Resolves to a PNG data URL (transparent).
export async function renderManagerPortrait(spec={},opts={}){
 if(typeof document==='undefined')throw new Error('no document');
 const m=spec.manager||{},width=opts.width||512,height=opts.height||512;
 await loadBodies(opts.bodyTimeout);
 const crest=await crestImage(spec.crestHTML);
 const st=portraitStage(width,height);
 const p=mountManager(st.scene,m,{detail:true,crest});if(!p)throw new Error('manager body not ready');
 try{
  const full=opts.framing==='full';
  const camera=new THREE.PerspectiveCamera(full?30:22,width/height,.1,30);
  const h=p.look.height;
  camera.position.set(.3,full?h*.55:h*.86,full?4.15:2.5);
  measureManagerHead(p);
  poseManager(p,{pose:opts.pose||'crossed',camera,yaw:opts.yaw??-.18,body:opts.body??'',frame:opts.frame??20});
  if(full)camera.lookAt(0,h*.5,0);
  else{
   // Card bust (Basti 2026-11-17 "wirkt so klein"): frame from the real head like the EA/POTM cards,
   // crown just under the window top, crossed arms at the bottom, shoulders across most of the width.
   const head=p.bones.get('Head'),hy=head?head.getWorldPosition(V()).y:h*.9;
   const top=hy+(opts.headroom??.25),bottom=hy-(opts.chest??.56),mid=(top+bottom)/2,half=(top-bottom)/2;
   const dist=half/Math.tan(THREE.MathUtils.degToRad(camera.fov/2));
   camera.position.set(dist*.09,mid+.04,dist);camera.lookAt(0,mid,0);
  }
  camera.updateMatrixWorld(true);
  st.renderer.render(st.scene,camera);
  return st.canvas.toDataURL('image/png');
 }finally{st.scene.remove(p.root);disposeOwned(p.owned)}
}
