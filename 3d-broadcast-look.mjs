// Footera V21.184 broadcast look: stadium image-based light on the athletes,
// warm floodlight key, cool rim light, tighter soft shadows and cloth sheen on
// the imported players. Purely visual; it never touches simulation or camera.
import * as THREE from './vendor/three/three.module.min.js';
import {RoomEnvironment} from './vendor/three/RoomEnvironment.mjs';

const envCache=new WeakMap();
function stadiumEnvironment(renderer){
 if(envCache.has(renderer))return envCache.get(renderer);
 const pmrem=new THREE.PMREMGenerator(renderer);
 const texture=pmrem.fromScene(new RoomEnvironment(renderer),.04).texture;
 pmrem.dispose();envCache.set(renderer,texture);return texture;
}

function upgradeMaterial(material,kind,envMap){
 if(!material||material.userData.footeraBroadcastLook)return material;
 const physical=new THREE.MeshPhysicalMaterial();
 THREE.MeshStandardMaterial.prototype.copy.call(physical,material);
 physical.userData={...material.userData,footeraBroadcastLook:true};
 // Image-based reflections only on the athletes: grass and stands keep their
 // authored contrast instead of being lifted by a global environment.
 physical.envMap=envMap;
 if(kind==='kit'){
  // Woven polyester: soft grazing highlight instead of a plastic sheen.
  physical.sheen=.3;physical.sheenRoughness=.5;physical.sheenColor=new THREE.Color('#c9ced8');
  physical.envMapIntensity=.32;
 }else if(kind==='hair'){
  physical.sheen=.35;physical.sheenRoughness=.55;physical.sheenColor=new THREE.Color('#6b5444');
  physical.envMapIntensity=.2;
 }else if(kind==='boot'){
  physical.clearcoat=.6;physical.clearcoatRoughness=.28;physical.envMapIntensity=.9;
 }else{
  physical.envMapIntensity=.3;
 }
 return physical;
}

export function applyBroadcastLook(scene,renderer,{high=false}={}){
 if(scene.userData.footeraBroadcastLook)return scene.userData.footeraBroadcastLook;
 const envMap=stadiumEnvironment(renderer);
 let hemi=null,sun=null,fill=null;
 scene.traverse(o=>{
  if(o.isHemisphereLight&&!hemi)hemi=o;
  else if(o.isDirectionalLight){if(!sun||o.intensity>sun.intensity){fill=sun||fill;sun=o}else fill=o}
 });
 // Players get image-based light below; trim only part of the flat sky bounce.
 if(hemi)hemi.intensity*=.8;
 if(sun){
  sun.color.set('#ffecd2');sun.intensity*=1.05;
  sun.shadow.mapSize.set(high?4096:2048,high?4096:2048);sun.shadow.radius=3;sun.shadow.normalBias=.012;
  sun.shadow.map?.dispose();sun.shadow.map=null;
 }
 if(fill){fill.color.set('#b9d3ff');fill.intensity*=.7}
 // Cool floodlight from the far stand outlines shoulders, hair and kit edges.
 const rim=new THREE.DirectionalLight('#cfe0ff',1.25);
 rim.name='FooteraBroadcastRim';rim.position.set(-60,28,0);scene.add(rim);
 let upgraded=0;const created=new Set();
 scene.traverse(o=>{
  if(!o.isMesh||!o.material)return;
  const name=String(o.name||'');
  const imported=!!o.parent&&(name.startsWith('FooteraAthleteHair')||name.startsWith('FooteraBoot')||name.includes('MakeHuman')||o.isSkinnedMesh);
  if(!imported)return;
  const kind=name.includes('Hair')?'hair':name.startsWith('FooteraBoot')?'boot':'kit';
  const upgrade=m=>{const next=upgradeMaterial(m,kind,envMap);if(next!==m)created.add(next);return next};
  o.material=Array.isArray(o.material)?o.material.map(upgrade):upgrade(o.material);
  upgraded++;
 });
 renderer.toneMappingExposure=1.0;
 // The shared stadium environment stays cached per renderer.
 const result={upgraded,rim,dispose(){for(const m of created)m.dispose();created.clear();rim.removeFromParent()}};
 scene.userData.footeraBroadcastLook=result;
 return result;
}
