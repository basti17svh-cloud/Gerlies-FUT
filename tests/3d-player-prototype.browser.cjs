/* Real browser smoke test: imported Quaternius CC0 humanoid in Footera's
 * production makeScene, same broadcast camera and deterministic match event.
 * Never updates user accounts or the simulation. */
'use strict';
const {chromium}=require('playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const root=path.resolve(__dirname,'..'),out=path.join(root,'test-artifacts');
fs.mkdirSync(out,{recursive:true});
const mime={'.html':'text/html','.mjs':'text/javascript','.js':'text/javascript','.glb':'model/gltf-binary','.css':'text/css','.png':'image/png','.svg':'image/svg+xml'};
const server=http.createServer((req,res)=>{
 const p=path.resolve(root,'.'+new URL(req.url,'http://127.0.0.1').pathname);
 if(!p.startsWith(root+path.sep)||!fs.existsSync(p)||!fs.statSync(p).isFile()){res.writeHead(404);res.end();return}
 res.writeHead(200,{'Content-Type':mime[path.extname(p)]||'application/octet-stream'});fs.createReadStream(p).pipe(res);
});
(async()=>{
 await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
 const url='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({headless:true,args:['--enable-unsafe-swiftshader','--use-angle=swiftshader']});
 try{
  const page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:1,isMobile:true,hasTouch:true});
  const errors=[];page.on('pageerror',e=>errors.push(e.stack||e.message));
  await page.goto(url+'/motion-lab.html',{waitUntil:'domcontentloaded'});
  const result=await page.evaluate(async()=>{
   const THREE=await import('./vendor/three/three.module.min.js');
   const {makeScene,prepareFooteraPlayerModel}=await import('./3d-highlights-scene.mjs?v=2168');
   const loaded=await prepareFooteraPlayerModel();
   const canvas=document.createElement('canvas');canvas.id='real-player-prototype';
   canvas.style.cssText='width:390px;height:300px;display:block';
   document.body.replaceChildren(canvas);
   const renderer=new THREE.WebGLRenderer({canvas,alpha:false,antialias:false});
   renderer.setPixelRatio(1);
   const event={id:'glb-prototype-qa',type:'goal',team:'home',period:1,minute:45,
    attackDirection:1,sequence:'cut_inside_right',finish:'finesse',playerName:'Footera Testspieler',
    keeperName:'Footera Torwart',defenderName:'Footera Abwehr',defenderIndex:10,
    playerStyles:[],creatorStyles:[],keeperStyles:[],defenderStyles:[],
    homeColor:'#174f5a',homeSecondary:'#d7a954',homePattern:'diagonal',
    homeShorts:'#152936',homeSocks:'#174f5a',awayColor:'#f1f1f1',
    awaySecondary:'#192d42',awayPattern:'halves',awayShorts:'#192d42',awaySocks:'#f1f1f1'};
   const main=makeScene(renderer,event,false,false,true,false,true);
   main.resize(390,300);main.update(2.75);
   const detail=main.inspect();
   const fallback=makeScene(renderer,event,true,false,false,false,false);
   fallback.resize(390,300);fallback.update(2.75);
   const low=fallback.inspect();
   fallback.dispose();
   main.update(5.4);
   const finish=main.inspect();
   main.dispose();renderer.dispose();
   return{loaded,detail:{imported:detail.importedFootballer,vertices:detail.importedVertices,bones:detail.importedBones,
     drawCalls:detail.drawCalls,quality:detail.quality,cameraDistance:detail.cameraDistance,
     visiblePlayers:detail.visibleFieldPlayers},fallback:{imported:low.importedFootballer,quality:low.quality},
     finish:{imported:finish.importedFootballer,triangles:finish.triangles,drawCalls:finish.drawCalls}};
  });
  console.log('FOOTERA IMPORTED PLAYER WEBGL',JSON.stringify(result));
  assert.equal(result.loaded,true,'CC0 GLB loads with official r160 glTF importer');
  assert.equal(result.detail.imported,true,'real GLB deployed in production makeScene striker');
  assert.ok(result.detail.vertices>=3000,'real authored 3D humanoid vertices');
  assert.ok(result.detail.bones>=45,'full articulated humanoid skeleton');
  assert.equal(result.fallback.imported,false,'weak mobile keeps legacy model');
  assert.ok(result.detail.drawCalls<125,'one imported foreground player stays in mobile draw call budget');
  assert.equal(result.finish.imported,true);
  assert.ok(result.finish.triangles>2000);
  assert.deepEqual(errors,[]);
  console.log('PASS V21.68 imported real CC0 humanoid renders and animates in Footera camera');
  await page.close();
 }finally{await browser.close();server.close()}
})().catch(e=>{console.error(e);process.exitCode=1;server.close()});
