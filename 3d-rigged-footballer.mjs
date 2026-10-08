/* Footera: lightweight skinning pilot for the scorer and goalkeeper.
 * Original authored geometry, no external assets/licence dependencies.
 * Existing animated bone joints drive a continuous weighted football silhouette.
 * Body masses share a *single* SkinnedMesh with 5 material groups per actor.
 * The reference pose is built in actor-local coordinates, Y = metres.
 */
const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
const smooth=x=>{x=clamp(x);return x*x*(3-2*x)};
export const RIGGED_SURFACE_VERSION=1;
export const MATERIAL_SLOTS=Object.freeze(['shirt','shorts','skin','socks','sleeves']);
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
   const [y,rx,rz]=rings[i],[a,b,w]=influences(y),blend=smooth(w);
   for(let k=0;k<=segments;k++){
    const t=k/segments*Math.PI*2;
    v.push(centerX+rx*Math.sin(t),y,centerZ+rz*Math.cos(t));
    uv.push(k/segments,(y-ymin)/Math.max(.01,ymax-ymin));
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
 band([[1.00,.154,.109],[1.045,.181,.124],[1.10,.174,.118],
  [1.19,.183,.127],[1.30,.217,.147],[1.40,.238,.143],
  [1.48,.224,.118],[1.54,.083,.071]],0,0,0,y=>
  influenced(0,3,clamp((y-1.01)/.36)));
 band([[.84,.139,.109],[.89,.159,.125],[.96,.177,.134],[1.005,.157,.117]],0,0,1,y=>influenced(0,0,0));
 // Both arms stay continuous through the elbow. Wrist/hand is supplied by
 // the original skeleton accessory, preserving goalie glove aiming.
 for(let i=0;i<2;i++){
  const side=i?1:-1,arm=4+i*2,elbow=arm+1,x=side*.224;
  const soft=y=>influenced(arm,elbow,clamp((1.30-y)/.18));
  band([[1.29,.071,.078],[1.37,.079,.081],[1.44,.075,.080],
    [1.49,.055,.064]],x,0,4,soft);
  band([[.82,.030,.039],[.89,.036,.043],[1.02,.050,.054],
    [1.14,.057,.059],[1.27,.059,.060],[1.30,.060,.062]],x,0,2,soft);
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
 for(const [start,count,materialIndex] of groups)geometry.addGroup(start,count,materialIndex);
 geometry.computeVertexNormals();
 const model=new THREE.SkinnedMesh(geometry,materials);
 model.name='FooteraSkinnedFootballer';
 model.frustumCulled=false;
 model.castShadow=true;model.receiveShadow=true;
 root.add(model);
 root.updateMatrixWorld(true);
 const skeleton=new THREE.Skeleton(order);
 model.bind(skeleton);
 return{model,geometry,skeleton,bones:order.length,vertexCount:v.length/3,segmentCount:groups.length};
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
