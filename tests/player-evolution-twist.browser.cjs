/* Real WebGL / Chrome renders of original 52 and experimental 60 bone GLBs.
   Captured frames are genuine Three.js skinning output, not AI illustrations.
   This does not replace a manual anatomical quality review. */
'use strict';
const {chromium}=require('playwright');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const assert=require('node:assert/strict'),cp=require('node:child_process');
const root=path.resolve(__dirname,'..'),out=path.join(root,'test-artifacts','player-evolution-twist');
const frames=path.join(out,'video-frames');
fs.mkdirSync(frames,{recursive:true});
const server=http.createServer((req,res)=>{
 const url=new URL(req.url,'http://localhost');
 const file=path.resolve(root,'.'+decodeURIComponent(url.pathname));
 if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){
  res.writeHead(404).end();return;
 }
 res.setHeader('Content-Type',/\.(mjs|js)$/.test(file)?'text/javascript':
  file.endsWith('.html')?'text/html':file.endsWith('.glb')?'model/gltf-binary':'application/octet-stream');
 fs.createReadStream(file).pipe(res);
});
(async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const browser=await chromium.launch({headless:true,
  ...(process.env.FOOTERA_CHROME_PATH?{executablePath:process.env.FOOTERA_CHROME_PATH}:{}),args:[
  '--enable-unsafe-swiftshader','--use-angle=swiftshader','--disable-dev-shm-usage']});
 try{
  const page=await browser.newPage({viewport:{width:940,height:840},deviceScaleFactor:1});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:'+server.address().port+'/player-evolution-twist-lab.html',
   {waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>['true','error'].includes(document.documentElement.dataset.ready),
   null,{timeout:180000});
  const status=await page.locator('#status').textContent();
  assert.equal(await page.locator('html').getAttribute('data-ready'),'true',status);
  const report={engine:'Three.js WebGL / GLBLoader / Chrome SwiftShader',
   caveat:'Automated screenshots and pose checks, not a passed human visual approval',
   comparisons:[],errors};
  async function capture(name,args){
   const data=await page.evaluate(v=>window.footeraQaRender(v),args);
   assert.ok(data.ok&&data.skinnedMeshes>=5,'Invalid model QA: '+JSON.stringify(data));
   assert.equal(data.boneCount,args.version==='master'?60:52);
   if(args.version==='master'){
    assert.equal(data.twistReport?.auxiliaryBones,8);
    assert.ok(data.twistReport.ok,'Twist skin audit failed');
   }
   await page.locator('canvas').screenshot({path:path.join(out,name+'.png')});
   return data;
  }
  for(const [joint,side] of [
   ['upperarm','l'],['lowerarm','l'],['thigh','l'],['calf','l'],
   ['upperarm','r'],['lowerarm','r'],['thigh','r'],['calf','r']
  ]){
   const bone=joint+'_'+side;
   for(const deg of [0,45,90,-90]){
    const label=joint+'-'+side+'-'+(deg<0?'minus':'plus')+Math.abs(deg);
    const info=await capture(label+'-twist',{version:'master',mode:'axial',bone,deg});
    if(deg===90){
     await capture(label+'-52',{version:'before',mode:'axial',bone,deg});
     const a=fs.readFileSync(path.join(out,label+'-twist.png'));
     const b=fs.readFileSync(path.join(out,label+'-52.png'));
     assert.notDeepEqual(a,b,'No visible deformation difference: '+bone);
     report.comparisons.push({bone,angle:deg,visibleDifference:true,
      vertices:info.twistReport.skinnedVertices[joint+'_twist_'+side]});
    }
   }
  }
  // Same 60-bone geometry, OLD synthetic gait vs NEW biomechanics.
  // A change in pixel values is not an aesthetic/IK-quality guarantee.
  const hipBefore=await capture('hip-walk-stiff-before',
   {version:'master',mode:'walk',zoom:'hips',time:.17,hipNatural:false});
  const hipAfter=await capture('hip-walk-natural-after',
   {version:'master',mode:'walk',zoom:'hips',time:.17,hipNatural:true});
  assert.ok(hipBefore.pelvisOffset.every(x=>Math.abs(x)<1e-9),
   'Legacy gait must keep the pelvis locked');
  assert.ok(Math.abs(hipAfter.pelvisOffset[0])>.01,
   'New gait needs actual pelvis weight transfer');
  assert.ok(hipBefore.pelvisRotation.some((x,i)=>Math.abs(x-hipAfter.pelvisRotation[i])>.01),
   'Pelvis quaternion must actually change, not just skin shading');
  assert.notDeepEqual(fs.readFileSync(path.join(out,'hip-walk-stiff-before.png')),
   fs.readFileSync(path.join(out,'hip-walk-natural-after.png')),
   'Visual hip comparison must show a different pose');
  report.hipComparison={
   sameModelAndGeometry:true,oldHipOffset:hipBefore.pelvisOffset,
   newHipOffset:hipAfter.pelvisOffset,
   hipQuaternionChanged:true,imageDifference:true,
   images:['hip-walk-stiff-before.png','hip-walk-natural-after.png']
  };
  // Real baked Adobe Mixamo locomotion on BOTH GLBs. Compare captured hip,
  // shoulder and foot motion, and quantify what the local preview IK changes.
  report.mixamo={source:'FOOTERA_MIXAMO_GAIT and FOOTERA_MIXAMO baked captures',
   clips:[],footContact:null};
  for(const clip of ['walk','jog','run','sprint']){
   const a=await capture('mixamo-'+clip+'-52',{version:'before',mode:'mocap',
    mocapClip:clip,time:.31,footPlant:true});
   const b=await capture('mixamo-'+clip+'-60',{version:'master',mode:'mocap',
    mocapClip:clip,time:.31,footPlant:true});
   assert.equal(b.mocap.clip,clip);
   assert.ok(b.mocap.source.includes('Adobe Mixamo'),'Not an authentic baked clip');
   assert.ok(b.mocap.frame>=0&&b.mocap.frame<=40,'Bad capture frame '+clip);
   assert.ok(b.pelvisRotation.every(Number.isFinite));
   assert.ok(b.actualFeet.l.every(Number.isFinite));
   report.mixamo.clips.push({clip,source:b.mocap.source,frame:b.mocap.frame,
    hipTranslation:b.mocap.hipTranslation,rigs:[a.boneCount,b.boneCount]});
  }
  // Quantify true world-foot stability with recovered captured root travel.
  // Two instants INSIDE the same left-stance half cycle.
  const stationaryA=await capture('mixamo-run-treadmill-early',
   {version:'master',mode:'mocap',mocapClip:'run',time:.15/1.7,
    footPlant:false,rootTravel:false});
  const stationaryB=await capture('mixamo-run-treadmill-late',
   {version:'master',mode:'mocap',mocapClip:'run',time:.35/1.7,
    footPlant:false,rootTravel:false});
  const movingA=await capture('mixamo-run-root-motion-early',
   {version:'master',mode:'mocap',mocapClip:'run',time:.15/1.7,
    footPlant:false,rootTravel:true});
  const movingB=await capture('mixamo-run-root-motion-late',
   {version:'master',mode:'mocap',mocapClip:'run',time:.35/1.7,
    footPlant:false,rootTravel:true});
  const slide=(a,b)=>Math.hypot(a.actualFeet.l[0]-b.actualFeet.l[0],
   a.actualFeet.l[2]-b.actualFeet.l[2]);
  const beforeSlip=slide(stationaryA,stationaryB),
   afterSlip=slide(movingA,movingB);
  assert.ok(beforeSlip>.07,'A treadmill must have measurable slip from the baked capture');
  assert.ok(afterSlip<.025,'Real root travel must keep the support shoe world-fixed');
  assert.ok(afterSlip<beforeSlip*.15,'Must remove at least 85% of stance shoe sliding');
  report.mixamo.rootTravel={
   capturedSource:'Mixamo shoe positions, not procedural sway',
   stanceShoeSlipBeforeMetres:beforeSlip,
   stanceShoeSlipAfterMetres:afterSlip,
   rootPositionEarly:movingA.rootPosition,rootPositionLate:movingB.rootPosition,
   caveat:'Preview root on static test floor; authoritative live gameplay root remains unchanged'
  };
  const noIK=await capture('mixamo-run-60-no-foot-ik',
   {version:'master',mode:'mocap',mocapClip:'run',time:.25/1.7,footPlant:false});
  const yesIK=await capture('mixamo-run-60-with-foot-ik',
   {version:'master',mode:'mocap',mocapClip:'run',time:.25/1.7,footPlant:true});
  assert.ok(yesIK.mocap.feet?.l?.active,'Missing captured-foot IK during midstance');
  const measured=yesIK.mocap.feet.l;
  assert.ok(measured.errorAfter<=measured.errorBefore+.008,
   'Foot IK should not increase in-place ankle slip');
  report.mixamo.footContact={hipAndFootCaptureBefore:noIK.mocap.source,
   clip:'run',stance:'left',anchorErrorBeforeMetres:measured.errorBefore,
   anchorErrorAfterMetres:measured.errorAfter,
   peakCorrectionMetres:measured.correction,footIKChangedPose:
   yesIK.actualFeet.l.some((x,i)=>Math.abs(x-noIK.actualFeet.l[i])>.0001),
   caveat:'In-place test-studio foot plant; no live moving-root game footage'};
  for(const mode of ['walk','cut','kick']){
   for(const version of ['before','master'])
    await capture(mode+'-'+version,{version,mode,time:1.07});
  }
  // 6-second MP4, 72 actual Chrome GLB frames. Most frames now sample the
  // EXISTING baked Mixamo footwork rather than invented synthetic motion.
  for(let i=0;i<72;i++){
   const mode=i<10?'axial':i<65?'mocap':'kick';
   const mocapClip=i<24?'walk':i<39?'jog':i<54?'run':'sprint';
   const segStart=i<24?10:i<39?24:i<54?39:54;
   const args={version:'master',mode,mocapClip,footPlant:true,
    time:mode==='mocap'?Math.max(0,i-segStart)/12:i/12,
    angle:.18,deg:(i%10)*9,bone:'lowerarm_l'};
   await page.evaluate(v=>window.footeraQaRender(v),args);
   await page.locator('canvas').screenshot({path:path.join(frames,
    'frame-'+String(i).padStart(3,'0')+'.png')});
  }
  cp.execFileSync(process.env.FOOTERA_FFMPEG||'ffmpeg',['-hide_banner','-loglevel','error','-y',
   '-framerate','12','-i',path.join(frames,'frame-%03d.png'),
   '-vf','scale=720:-2','-c:v','libx264','-crf','24','-pix_fmt','yuv420p',
   path.join(out,'footera-60-bone-engine-proof.mp4')]);
  assert.ok(fs.statSync(path.join(out,'footera-60-bone-engine-proof.mp4')).size>30000);
  // Mobile viewport/GLB load smoke check (NOT a real phone GPU benchmark).
  const mobile=await browser.newPage({viewport:{width:412,height:915},
   deviceScaleFactor:1,isMobile:true,hasTouch:true});
  await mobile.goto('http://127.0.0.1:'+server.address().port+'/player-evolution-twist-lab.html',
   {waitUntil:'domcontentloaded'});
  await mobile.waitForFunction(()=>['true','error'].includes(document.documentElement.dataset.ready),
   null,{timeout:180000});
  assert.equal(await mobile.locator('html').getAttribute('data-ready'),'true',
   await mobile.locator('#status').textContent());
  const mobileResult=await mobile.evaluate(()=>window.footeraQaRender(
   {version:'master',mode:'cut',time:1.5,angle:.4}));
  assert.equal(mobileResult.boneCount,60);
  assert.ok(mobileResult.twistReport?.ok);
  await mobile.locator('canvas').screenshot({path:path.join(out,'mobile-viewport-60bone.png')});
  report.mobileViewport={width:412,height:915,load:true,skinning:true,
   caveat:'Software-rendered mobile viewport; no actual smartphone FPS measured'};
  await mobile.close();
  assert.deepEqual(errors,[]);
  report.video={frames:72,fps:12,modes:['axial','mixamo-walk','mixamo-jog',
   'mixamo-run','mixamo-sprint','kick'],file:'footera-60-bone-engine-proof.mp4'};
  fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2));
  console.log('PASS: physical GLB WebGL before/after screenshots and MP4',JSON.stringify(report));
 }finally{await browser.close();server.close()}
})().catch(e=>{console.error(e);server.close();process.exitCode=1});
