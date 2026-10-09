'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const load=()=>import('../3d-player-materials.mjs');
test('V21.78: CC0 GLB uses authored material profiles with real roughness and occlusion',async()=>{
 const m=await load();
 assert.match(m.FOOTERA_PBR_VERSION,/21\.78/);
 const kit=m.sampleFooteraSurface(0,.5,.52),skin=m.sampleFooteraSurface(2,.5,.52);
 assert.ok(kit.roughness>skin.roughness,'cloth is rougher than bare skin');
 assert.ok(kit.normal.every(Number.isFinite));
 assert.ok(Math.hypot(...kit.normal)>.99);
 assert.ok(m.sampleFooteraSurface(0,.5,.99).occlusion<kit.occlusion,'collar darkens');
 assert.ok(m.vertexFooteraOcclusion(.285,.67,0,0)<1,'armpit crease AO');
});
test('V21.78: PBR atlas stays smaller than 256KiB and is properly disposed',async()=>{
 const m=await load();let disposed=0;
 class DataTexture{constructor(data,width,height){this.image={data,width,height}}dispose(){disposed++}}
 const THREE={DataTexture,RGBAFormat:1023,NoColorSpace:'',LinearFilter:1006,
  LinearMipmapLinearFilter:1008,ClampToEdgeWrapping:1001};
 const maps=m.createFooteraSurfaceMaps(THREE);
 assert.equal(maps.width,320);assert.equal(maps.height,64);
 assert.ok(maps.byteSize<256*1024);
 assert.equal(maps.packedMap.image.data.length,320*64*4);
 assert.equal(maps.normalMap.image.data.length,320*64*4);
 assert.equal(maps.packedMap.colorSpace,THREE.NoColorSpace);
 assert.equal(maps.normalMap.colorSpace,THREE.NoColorSpace);
 for(const array of [maps.packedMap.image.data,maps.normalMap.image.data])for(const value of array)
  assert.ok(value>=0&&value<=255);
 maps.dispose();assert.equal(disposed,2);
});
test('V21.78: PBR is HIGH/STANDARD only, preserves mesh draw count and LOW fallback',()=>{
 const root=path.resolve(__dirname,'..');
 const player=fs.readFileSync(path.join(root,'3d-player-prototype.mjs'),'utf8');
 const scene=fs.readFileSync(path.join(root,'3d-highlights-scene.mjs'),'utf8');
 assert.match(player,/detail\?createFooteraSurfaceMaps\(THREE\):null/);
 assert.match(player,/geometry\.setAttribute\('uv2',uvAttr\)/);
 assert.match(player,/roughnessMap:surfaceMaps&&isBody/);
 assert.match(player,/aoMap:surfaceMaps&&isBody/);
 assert.match(player,/normalMap:surfaceMaps&&isBody/);
 assert.match(player,/surfaceMaps\?\.dispose\(\)/);
 assert.match(scene,/attackKit,event\.playerName,!weak/);
 assert.match(scene,/importedPbr:/);
 const material=fs.readFileSync(path.join(root,'3d-player-materials.mjs'),'utf8');
 assert.doesNotMatch(material,/fetch\(|Math\.random|setTimeout|XMLHttpRequest|https?:\/\//);
});
