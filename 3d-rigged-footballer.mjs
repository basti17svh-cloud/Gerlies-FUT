/* Footera: lightweight skinning pilot for the scorer and goalkeeper.
 * Original authored geometry, no external assets/licence dependencies.
 * Existing animated bone joints drive a continuous weighted football silhouette.
 * All surfaces share ONE atlas material and ONE SkinnedMesh draw per actor.
 * The reference pose is built in actor-local coordinates, Y = metres.
 */
const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
const smooth=x=>{x=clamp(x);return x*x*(3-2*x)};
export const RIGGED_SURFACE_VERSION=2;
export const MATERIAL_SLOTS=Object.freeze(['shirt','shorts','skin','socks','sleeves']);
// A one-row atlas bakes the existing saved club-kit shirt pattern alongside
// shorts, skin, socks and sleeve materials. Avoid one draw per limb/material.
export function createFootballKitAtlas(THREE,materials,segments=12){
 const canDraw=typeof document!=='undefined'&&typeof document.createElement==='function';
 let texture;
 if(canDraw){
  const tile=segments>=16?256:128,canvas=document.createElement('canvas');
  canvas.width=tile*MATERIAL_SLOTS.length;canvas.height=tile;
  const ctx=canvas.getContext('2d');
  if(!ctx)throw new Error('Football kit atlas needs Canvas 2D');
  for(let index=0;index<MATERIAL_SLOTS.length;index++){
   const material=materials[index],left=index*tile;
   ctx.fillStyle=material?.color?.getStyle?.()||'#ffffff';
   ctx.fillRect(left,0,tile,tile);
   if(index===0&&material?.map?.image){
    try{ctx.drawImage(material.map.image,left,0,tile,tile)}catch(_){}
   }
   // Bake cloth relief into one atlas; no additional renderer draw call.
   ctx.save();ctx.translate(left,0);
   const shade=ctx.createLinearGradient(0,0,tile,0);
   shade.addColorStop(0,'rgba(0,0,0,.17)');
   shade.addColorStop(.19,'rgba(255,255,255,.055)');
   shade.addColorStop(.48,'rgba(0,0,0,.04)');
   shade.addColorStop(.73,'rgba(255,255,255,.04)');
   shade.addColorStop(1,'rgba(0,0,0,.16)');
   ctx.fillStyle=shade;ctx.fillRect(0,0,tile,tile);
   if(index===0||index===1||index===4){
    ctx.strokeStyle='rgba(0,0,0,.18)';ctx.lineWidth=Math.max(1,tile/128);
    for(const x of [tile*.08,tile*.92]){
     ctx.beginPath();ctx.moveTo(x,0);ctx.bezierCurveTo(x+tile*.022,tile*.37,x-tile*.016,tile*.68,x,tile);ctx.stroke();
    }
   }
   if(index===3){
    ctx.strokeStyle='rgba(255,255,255,.15)';ctx.lineWidth=1;
    for(let y=3;y<tile;y+=Math.max(5,tile/18)){
     ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(tile,y);ctx.stroke();
    }
   }
   ctx.restore();
  }
  texture=new THREE.CanvasTexture(canvas);
 }else{
  // Node unit tests have no DOM; fallback validates the same five atlas slots.
  const data=new Uint8Array(MATERIAL_SLOTS.length*4);
  materials.forEach((material,i)=>{
   const color=material.color||new THREE.Color('#ffffff'),j=i*4;
   data[j]=Math.round(color.r*255);data[j+1]=Math.round(color.g*255);
   data[j+2]=Math.round(color.b*255);data[j+3]=255;
  });
  texture=new THREE.DataTexture(data,MATERIAL_SLOTS.length,1,THREE.RGBAFormat);
  texture.needsUpdate=true;
 }
 texture.colorSpace=THREE.SRGBColorSpace;
 texture.wrapS=THREE.ClampToEdgeWrapping;
 texture.magFilter=THREE.LinearFilter;
 const atlasMaterial=new THREE.MeshStandardMaterial({map:texture,roughness:.92,metalness:0});
 return{texture,material:atlasMaterial};
}
export function buildSkinnedFootballer(THREE,root,joints,materials,segments=12){
 const order=[joints.rig,joints.upper,joints.motion,joints.chest,
  joints.arms[0],joints.elbows[0],joints.arms[1],joints.elbows[1],
  joints.legs[0],joints.knees[0],joints.ankles[0],
  joints.legs[1],joints.knees[1],joints.ankles[1]];
 if(order.some(b=>!b?.isBone))throw new Error('Footera skinned rig requires connected THREE.Bone joints');
 const v=[],uv=[],ids=[],weights=[],ix=[],groups=[];
 function influenced(a,b,blend=0){
  const w=smooth(blend);
  return[a,b,w];
 }
 function band(rings,centerX,centerZ,mat,influences){
  const start=ix.length,vertexStart=v.length/3;
  const ymin=rings[0][0],ymax=rings[rings.length-1][0];
  for(let i=0;i<rings.length;i++){
   const [y,rx,rz,depth=0]=rings[i],[a,b,w]=influences(y),blend=smooth(w);
   for(let k=0;k<=segments;k++){
    const t=k/segments*Math.PI*2;
    v.push(centerX+rx*Math.sin(t),y,centerZ+depth+rz*Math.cos(t));
    uv.push((mat+.015+k/segments*.97)/MATERIAL_SLOTS.length,(y-ymin)/Math.max(.01,ymax-ymin));
    ids.push(a,b,0,0);weights.push(1-blend,blend,0,0);
   }
  }
  for(let i=1;i<rings.length;i++)for(let j=1;j<=segments;j++){
   const b=vertexStart+i*(segments+1)+j;
   ix.push(b,b-1,b-segments-2,b,b-segments-2,b-segments-1);
  }
  groups.push([start,ix.length-start,mat]);
 }
 // A torso with a soft hip/upper-torso blend avoids the 'floating armour' seam.
 band([[1.00,.151,.108],[1.045,.171,.121],[1.10,.174,.119],
  [1.19,.182,.128],[1.28,.204,.138,-.003],[1.34,.222,.147,-.007],
  [1.405,.231,.141,-.006],[1.465,.208,.119,-.002],
  [1.505,.150,.088],[1.54,.080,.069]],0,0,0,y=>
  influenced(0,3,clamp((y-1.01)/.36)));
 band([[.84,.137,.108],[.885,.156,.122],[.945,.173,.127],[.988,.168,.115],[1.008,.151,.105]],0,0,1,y=>influenced(0,0,0));
 // Both arms stay continuous through the elbow. Wrist/hand is supplied by
 // the original skeleton accessory, preserving goalie glove aiming.
 for(let i=0;i<2;i++){
  const side=i?1:-1,arm=4+i*2,elbow=arm+1,x=side*.224;
  const soft=y=>influenced(arm,elbow,clamp((1.30-y)/.18));
  band([[1.28,.058,.065],[1.31,.069,.072],[1.38,.079,.082],
    [1.445,.073,.078],[1.49,.048,.054]],x,0,4,soft);
  band([[.82,.030,.037],[.91,.037,.042],[1.025,.050,.052],
    [1.13,.056,.058],[1.24,.059,.061],[1.29,.058,.063]],x,0,2,soft);
 }
 // Weighted thigh/knee/shin sections bend as a single surface, rather than
 // independent solid tubes passing through one another at the joint.
 for(let i=0;i<2;i++){
  const side=i?1:-1,x=side*.108,leg=8+i*3,knee=leg+1,ankle=leg+2;
  const upper=y=>influenced(leg,knee,clamp((.68-y)/.17));
  band([[.72,.099,.102],[.82,.101,.109],[.93,.101,.107],
    [.985,.091,.096]],x,0,1,upper);
  band([[.49,.061,.070],[.56,.079,.083],[.66,.086,.092],
    [.73,.088,.088]],x,0,2,upper);
  const lower=y=>influenced(knee,ankle,clamp((.28-y)/.18));
  band([[.08,.037,.043],[.16,.039,.043],[.24,.047,.051],
    [.34,.059,.065],[.45,.057,.060],[.51,.054,.056]],x,0,3,lower);
 }
 const geometry=new THREE.BufferGeometry();
 geometry.setAttribute('position',new THREE.Float32BufferAttribute(v,3));
 geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));
 geometry.setAttribute('skinIndex',new THREE.Uint16BufferAttribute(ids,4));
 geometry.setAttribute('skinWeight',new THREE.Float32BufferAttribute(weights,4));
 geometry.setIndex(ix);
 // NO geometry groups: GPU processes the entire figure in one skinning draw.
 geometry.computeVertexNormals();
 const atlas=createFootballKitAtlas(THREE,materials,segments);
 const model=new THREE.SkinnedMesh(geometry,atlas.material);
 model.name='FooteraSkinnedFootballer';
 model.frustumCulled=false;
 model.castShadow=true;model.receiveShadow=true;
 root.add(model);
 root.updateMatrixWorld(true);
 const skeleton=new THREE.Skeleton(order);
 model.bind(skeleton);
 return{model,geometry,skeleton,bones:order.length,vertexCount:v.length/3,
  segmentCount:groups.length,atlasTexture:atlas.texture,atlasMaterial:atlas.material,drawSurfaces:1};
}
export function createSkeletonMotion(THREE,motionBone,role='striker',finish='normal',duration=10.4){
 if(!motionBone?.isBone)throw new Error('AnimationMixer requires a THREE.Bone');
 const keeper=role==='keeper',finesse=finish==='finesse',power=finish==='power';
 const times=keeper?[0,3.8,4.7,5.15,5.55,6.05,6.65,7.25,8.35,duration]:
  [0,1.2,2.8,4.25,4.9,5.2,5.4,5.8,6.3,7.2,duration];
 // Motion is on a dedicated torso transform bone. The existing leg trajectories,
 // glove/ball contact and authoritative shot result remain untouched.
 const pitch=keeper?[0,-.02,-.04,-.15,-.15,-.10,-.02,.09,0,0]:
  [-.025,-.05,-.065,-.085,-.11,-.17,power?-.21:-.12,-.08,0,0,0];
 const yaw=keeper?[0,0,0,0,.07,.08,.06,0,0,0]:
  [0,.03,-.04,.06,.11,finesse?.20:.055,finesse?.23:.07,.10,0,0,0];
 const roll=keeper?[0,0,0,.045,.07,.09,.045,0,0,0]:
  [0,-.015,.016,.05,.065,finesse?.11:.05,finesse?.12:.06,.025,0,0,0];
 const tracks=[
  new THREE.NumberKeyframeTrack('.rotation[x]',times,pitch),
  new THREE.NumberKeyframeTrack('.rotation[y]',times,yaw),
  new THREE.NumberKeyframeTrack('.rotation[z]',times,roll)
 ];
 const clip=new THREE.AnimationClip('Footera-'+role+'-'+finish,duration,tracks);
 const mixer=new THREE.AnimationMixer(motionBone),action=mixer.clipAction(clip);
 action.setLoop(THREE.LoopOnce,1);
 action.clampWhenFinished=true;action.play();
 return{mixer,action,clip,role};
}
