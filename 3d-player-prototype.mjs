/* Footera 3D player prototype.
 * Real imported Quaternius CC0 humanoid glTF, not another primitive-based JS
 * figure. Drives its articulated skeleton from the existing visual animation.
 * One foreground scorer only; no change to authoritative match state.
 */
import * as THREE from './vendor/three/three.module.min.js';
import {sampleGlbBodyMotion} from './3d-glb-motion.mjs?v=2172';

const ASSET_URL=new URL('./assets/footera/models/footballer-prototype.glb',import.meta.url);
const REQUIRED=['pelvis','spine_01','spine_03','Head','upperarm_l','upperarm_r',
 'lowerarm_l','lowerarm_r','thigh_l','thigh_r','calf_l','calf_r','foot_l','foot_r'];
let source=null,pending=null;
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));

export async function prepareFooteraPlayerModel(){
 if(source)return true;
 if(typeof document==='undefined'||typeof fetch!=='function')return false;
 if(!pending)pending=(async()=>{
  const [{GLTFLoader},{clone}]=await Promise.all([
   import('./vendor/three/GLTFLoader.mjs'),
   import('./vendor/three/SkeletonUtils.mjs')
  ]);
  const gltf=await new GLTFLoader().loadAsync(ASSET_URL.href);
  const bones=new Set();let weighted=0,verts=0;
  gltf.scene.traverse(node=>{
   if(node.isBone)bones.add(node.name);
   if(node.isSkinnedMesh){weighted++;verts+=node.geometry.getAttribute('position')?.count||0}
  });
  if(!weighted||verts<2000||REQUIRED.some(name=>!bones.has(name)))
   throw new Error('Footera CC0 humanoid failed rig validation');
  source={scene:gltf.scene,clone,vertexCount:verts,boneCount:bones.size};
  return true;
 })().catch(error=>{pending=null;throw error});
 return pending;
}
export function isFooteraPlayerModelReady(){return !!source}

// Restrained team colors; a single dynamically colored material on each of
// the three imported meshes (including face) avoids unnecessary draw calls.
export function footballerKitColorAt(nx,ny,nz,kit={},hair=0){
 const c=key=>new THREE.Color(kit[key]||({shirt:'#1b4c52',shirtSecondary:'#dbb45a',shorts:'#15222a',socks:'#173744'}[key]));
 const skin=new THREE.Color(['#dfac87','#c68a66','#ad7558','#80533f'][hair%4]);
 const dark=new THREE.Color('#191b20'),boot=new THREE.Color('#e0ddd3');
 const shirt=c('shirt'),shorts=c('shorts'),socks=c('socks'),second=c('shirtSecondary');
 if(ny<.072)return boot;
 if(ny<.31)return ny>.284?second:socks;
 if(ny<.445)return skin;
 if(ny<.557)return shorts;
 if(ny>.965)return dark;
 if(ny>.80)return skin;
 if(Math.abs(nx)>.235&&ny<.72)return skin;
 if(Math.abs(nx)>.235&&ny>=.72)return shirt;
 if(ny>.565&&ny<.795){
  if(kit.pattern==='halves')return nx>0?second:shirt;
  if(kit.pattern==='stripes'&&Math.floor((nx+.5)*11)%2===0)return second;
  if(kit.pattern==='diagonal'&&Math.floor((nx+nz*.5+.8)*8)%5===0)return second;
  if(kit.pattern==='sleeves'&&Math.abs(nx)>.2)return second;
  return shirt;
 }
 return skin;
}

// Convert one real imported skinned GLB to the exact Footera player footprint.
// The original 65-bone hierarchy, weights, geometry and face are preserved.
export function mountFooteraPlayerModel(playerRoot,existingDriver,kit,name=''){
 if(!source)return null;
 const model=source.clone(source.scene);
 model.name='FooteraImportedFootballer';
 const bones=new Map(),meshes=[];
 model.traverse(node=>{
  if(node.isBone)bones.set(node.name,node);
  if(node.isSkinnedMesh){node.frustumCulled=false;node.castShadow=true;node.receiveShadow=true;meshes.push(node)}
 });
 if(REQUIRED.some(key=>!bones.has(key))||!meshes.length)return null;
 model.updateMatrixWorld(true);
 const bounds=new THREE.Box3().setFromObject(model);
 const size=new THREE.Vector3();bounds.getSize(size);
 if(size.y<.05||size.y>100)return null;
 const center=bounds.getCenter(new THREE.Vector3());
 const scale=1.83/size.y,normalized=new THREE.Group();
 normalized.name='FooteraPlayerPrototypeMount';
 normalized.add(model);model.scale.setScalar(scale);
 model.position.set(-center.x*scale,-bounds.min.y*scale,-center.z*scale);
 playerRoot.add(normalized);
 // Imported meshes have different polygon shapes than the old procedurally
 // generated skin; tint their original vertices using mesh local coordinates.
 const tintIndex=[...String(name)].reduce((n,ch)=>n+ch.charCodeAt(0),0)%4;
 model.updateMatrixWorld(true);
 const colorsByMesh=[];
 for(const mesh of meshes){
  const geometry=mesh.geometry.clone(),pos=geometry.getAttribute('position');
  const colors=new Float32Array(pos.count*3),p=new THREE.Vector3();
  const relative=mesh.matrixWorld.clone();
  // vertex position in the original GLB's unscaled world coordinates.
  const localToModel=model.matrixWorld.clone().invert().multiply(mesh.matrixWorld);
  for(let i=0;i<pos.count;i++){
   p.fromBufferAttribute(pos,i).applyMatrix4(localToModel);
   const c=footballerKitColorAt((p.x-center.x)*scale,(p.y-bounds.min.y)*scale/1.83,(p.z-center.z)*scale,kit,tintIndex);
   colors[i*3]=c.r;colors[i*3+1]=c.g;colors[i*3+2]=c.b;
  }
  geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
  mesh.geometry=geometry;
  mesh.material=new THREE.MeshStandardMaterial({vertexColors:true,metalness:0,roughness:.87,side:THREE.DoubleSide});
  colorsByMesh.push({geometry,material:mesh.material});
 }
 // Neutral T pose is converted once into normal running arm-down posture.
 const aim=new THREE.Vector3(),from=new THREE.Vector3();
 for(const side of ['l','r']){
  const shoulder=bones.get('upperarm_'+side),elbow=bones.get('lowerarm_'+side);
  for(const [bone,target,desired] of [
   [shoulder,elbow,new THREE.Vector3(side==='l'?.06:-.06,-1,0)],
   [elbow,bones.get('hand_'+side),new THREE.Vector3(side==='l'?.03:-.03,-1,0)]
  ]){
   if(!bone||!target)continue;
   model.updateMatrixWorld(true);
   from.copy(target.getWorldPosition(new THREE.Vector3())).sub(bone.getWorldPosition(new THREE.Vector3())).normalize();
   aim.copy(desired).normalize();
   const worldQ=bone.getWorldQuaternion(new THREE.Quaternion());
   const wanted=new THREE.Quaternion().setFromUnitVectors(from,aim).multiply(worldQ);
   const parentWorld=bone.parent.getWorldQuaternion(new THREE.Quaternion());
   bone.quaternion.copy(parentWorld.invert().multiply(wanted));
  }
 }
 const neutral=new Map();
 for(const [key,bone] of bones)neutral.set(key,bone.quaternion.clone());
 const delta=new THREE.Quaternion(),rot=new THREE.Euler();
 function apply(name,x=0,y=0,z=0){
  const bone=bones.get(name);
  if(!bone)return;
  delta.setFromEuler(rot.set(x,y,z,'XYZ'));
  bone.quaternion.copy(neutral.get(name)).multiply(delta);
 }
 const motion={};let frameTime=0;
 function animate(time=0,info={}){
  const driver=existingDriver;
  frameTime=Number.isFinite(time)?time:0;
  const m=sampleGlbBodyMotion(frameTime,info,motion);
  // The existing Footera pose owns shot contact and leg planting. The
  // imported GLB adds a modest counter-rotating kinetic chain and head aim.
  // Rest-posed neutral quaternions prevent cumulative joint rotation.
  normalized.position.y=clamp(driver.rig.position.y*.68+m.bob,-.10,.22);
  apply('pelvis',driver.rig.rotation.x*.45+m.pelvisPitch,driver.rig.rotation.y+m.pelvisYaw,driver.rig.rotation.z*.7+m.pelvisRoll);
  apply('spine_01',driver.upper.rotation.x*.48+m.spinePitch*.37,driver.upper.rotation.y*.48+m.spineYaw*.38,driver.upper.rotation.z*.45+m.spineRoll*.37);
  apply('spine_02',driver.upper.rotation.x*.33+m.spinePitch*.35,driver.upper.rotation.y*.34+m.spineYaw*.36,driver.upper.rotation.z*.35+m.spineRoll*.34);
  apply('spine_03',driver.upper.rotation.x*.28+m.spinePitch*.28,driver.upper.rotation.y*.26+m.spineYaw*.26,driver.upper.rotation.z*.28+m.spineRoll*.29);
  apply('Head',m.headPitch,m.headYaw,m.headRoll);
  for(let i=0;i<2;i++){
   const side=i?'r':'l',sign=i?1:-1;
   apply('thigh_'+side,driver.legs[i].rotation.x,driver.legs[i].rotation.y,driver.legs[i].rotation.z);
   apply('calf_'+side,driver.knees[i].rotation.x-m.kneeCushion*(driver.gait[i]?.support?0:1),0,driver.knees[i].rotation.z);
   apply('foot_'+side,driver.ankles[i].rotation.x+(i?m.rightToeLift:m.leftToeLift)*(driver.gait[i]?.support?0:1),
     driver.ankles[i].rotation.y,driver.ankles[i].rotation.z);
   apply('upperarm_'+side,driver.arms[i].rotation.x*.94+sign*m.armSwing,
     driver.arms[i].rotation.y,driver.arms[i].rotation.z*.92+sign*m.armBrace);
   apply('lowerarm_'+side,driver.elbows[i].rotation.x*.72+.055*m.running,0,driver.elbows[i].rotation.z);
  }
 }
 function inspectMotion(){
  return{time:frameTime,rootY:normalized.position.y,headYaw:motion.headYaw||0,
   spineYaw:motion.spineYaw||0,pelvisYaw:motion.pelvisYaw||0,cut:motion.cut||0,
   shot:motion.shot||0,follow:motion.follow||0,running:motion.running||0,
   hipLeft:bones.get('thigh_l').quaternion.toArray(),hipRight:bones.get('thigh_r').quaternion.toArray()};
 }
 animate();
 return{model,modelRoot:normalized,meshCount:meshes.length,vertexCount:source.vertexCount,
  boneCount:source.boneCount,animate,inspectMotion,
  dispose(){normalized.removeFromParent();for(const {geometry,material} of colorsByMesh){geometry.dispose();material.dispose()}}
 };
}
