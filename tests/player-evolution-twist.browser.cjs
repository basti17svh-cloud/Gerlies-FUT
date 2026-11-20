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
  await capture('mixamo-run-60-front',{version:'master',mode:'mocap',
   mocapClip:'run',time:.15/1.7,angle:Math.PI,footPlant:true,rootTravel:true});
  await capture('mixamo-sprint-60-side',{version:'master',mode:'mocap',
   mocapClip:'sprint',time:.22/2.1,angle:Math.PI/2,footPlant:true,rootTravel:true});
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
  // Real, same-geometry 60-bone A/B: anatomical knee alignment OFF vs ON.
  // Do not label a pixel difference alone as a biomechanical improvement.
  report.mixamo.kneeAxis={geometry:'Same skinned 60-bone GLB',
   limitDegrees:14,samples:[],maxDeviationBefore:0,maxDeviationAfter:0,
   genuineCapture:true,visuallyReviewed:false};
  const cadence={walk:1.05,jog:1.4,run:1.7,sprint:2.1};
  let largest={deviation:-1,clip:'run',phase:.27,side:'l'};
  for(const clip of ['walk','jog','run','sprint']){
   for(const phase of [.12,.27,.63,.77]){
    const opts={version:'master',mode:'mocap',mocapClip:clip,
     time:phase/cadence[clip],angle:0,zoom:'knees',footPlant:true,rootTravel:true};
    const before=await page.evaluate(v=>window.footeraQaRender(v),
     {...opts,kneeAlign:false});
    const after=await page.evaluate(v=>window.footeraQaRender(v),
     {...opts,kneeAlign:true});
    for(const side of ['l','r']){
     const b=before.mocap.knees?.[side],a=after.mocap.knees?.[side];
     assert.ok(b&&a,'Knee measurement missing: '+clip+side);
     const original=Math.abs(b.deviationAfterDeg),corrected=Math.abs(a.deviationAfterDeg);
     assert.ok(Number.isFinite(original)&&Number.isFinite(corrected));
     if(original>largest.deviation)largest={deviation:original,clip,phase,side};
     report.mixamo.kneeAxis.maxDeviationBefore=Math.max(
      report.mixamo.kneeAxis.maxDeviationBefore,original);
     report.mixamo.kneeAxis.maxDeviationAfter=Math.max(
      report.mixamo.kneeAxis.maxDeviationAfter,corrected);
     if(original>14.5)assert.ok(corrected<14.7,
      clip+' '+phase+' '+side+' knee remains sideways: '+corrected+' deg');
     assert.ok(a.flexAfterDeg>=0&&a.flexAfterDeg<=180,
      'Impossible flex angle in '+clip+': '+a.flexAfterDeg);
     report.mixamo.kneeAxis.samples.push({clip,phase,side,
      originalLateralDegrees:original,alignedLateralDegrees:corrected,
      flexBeforeDegrees:b.flexAfterDeg,flexAfterDegrees:a.flexAfterDeg});
    }
   }
  }
  report.mixamo.kneeAxis.mostAffected=largest;
  // The largest abnormal knee pose receives camera-matched real screenshots,
  // from both a straight-on and a lateral viewing angle.
  const opts={version:'master',mode:'mocap',mocapClip:largest.clip,
   time:largest.phase/cadence[largest.clip],footPlant:true,rootTravel:true,
   zoom:'knees'};
  for(const [view,angle] of [['front',0],['side',Math.PI/2]]){
   await capture('knee-axis-'+view+'-before',
    {...opts,angle,kneeAlign:false});
   await capture('knee-axis-'+view+'-after',
    {...opts,angle,kneeAlign:true});
  }
  report.mixamo.kneeAxis.images=['knee-axis-front-before.png','knee-axis-front-after.png',
   'knee-axis-side-before.png','knee-axis-side-after.png'];
  report.mixamo.kneeAxis.note='Authentic capture, not procedural gait; inspection still required';
  // Render synchronized A/B frames for a second, dedicated before/after MP4.
  // Same GLB, clip, frame, lighting, camera and root-travel on each side.
  const pairFrames=path.join(out,'knee-pair-frames');
  fs.mkdirSync(pairFrames,{recursive:true});
  const {PNG}=require('pngjs');
  for(let i=0;i<48;i++){
   const clip=['walk','jog','run','sprint'][Math.floor(i/12)];
   const time=((i%12)/12)/cadence[clip],angle=i<24?0:Math.PI/2;
   const shot={version:'master',mode:'mocap',mocapClip:clip,time,
    angle,zoom:'full',footPlant:true,rootTravel:true};
   const result=[];
   for(const kneeAlign of [false,true]){
    await page.evaluate(v=>window.footeraQaRender(v),{...shot,kneeAlign});
    const png=await page.locator('canvas').screenshot();
    result.push(PNG.sync.read(png));
   }
   const width=result[0].width,height=result[0].height;
   const pair=new PNG({width:2*width,height});
   for(let j=0;j<2;j++)PNG.bitblt(result[j],pair,0,0,width,height,j*width,0);
   fs.writeFileSync(path.join(pairFrames,'frame-'+String(i).padStart(3,'0')+'.png'),
    PNG.sync.write(pair));
  }
  cp.execFileSync(process.env.FOOTERA_FFMPEG||'ffmpeg',['-hide_banner','-loglevel','error','-y',
   '-framerate','12','-i',path.join(pairFrames,'frame-%03d.png'),
   '-vf','scale=1440:-2','-c:v','libx264','-crf','24','-pix_fmt','yuv420p',
   path.join(out,'footera-knee-alignment-3d-before-after.mp4')]);
  assert.ok(fs.statSync(path.join(out,'footera-knee-alignment-3d-before-after.mp4')).size>30000);
  report.mixamo.kneeAxis.video='footera-knee-alignment-3d-before-after.mp4';
  // Same 60-bone GLB on BOTH sides: original recorded Mixamo upper arms
  // against pelvis-relative shoulder retarget (no added synthetic swing).
  report.mixamo.shoulders={source:'Adobe Mixamo originals retained',samples:[],
   maxBeforeDegrees:0,maxAfterDegrees:0,casesCorrected:0,
   geometryIdentical:true,visualApproval:false};
  let worst={excess:0,clip:'sprint',phase:.25,side:'l'};
  for(const clip of ['walk','jog','run','sprint']){
   const rate={walk:1.05,jog:1.4,run:1.7,sprint:2.1}[clip];
   for(const phase of [.12,.28,.48,.72,.88]){
    const args={version:'master',mode:'mocap',mocapClip:clip,
     time:phase/rate,footPlant:true,kneeAlign:true,rootTravel:true,
     angle:0,zoom:'chest'};
    const a=await page.evaluate(v=>window.footeraQaRender(v),
     {...args,shoulderAlign:false});
    const b=await page.evaluate(v=>window.footeraQaRender(v),
     {...args,shoulderAlign:true});
    assert.equal(a.mocap.clip,clip);
    assert.ok(b.mocap.shoulderSource.includes('Mixamo'));
    for(const side of ['l','r']){
     const x=a.mocap.shoulders[side],y=b.mocap.shoulders[side];
     assert.ok([x.beforeDeg,y.afterDeg,y.changeDeg].every(Number.isFinite));
     assert.ok(y.afterDeg<=x.beforeDeg+.01,'Shoulder wider than original');
     const excess=x.beforeDeg-y.afterDeg;
     if(excess>.1)report.mixamo.shoulders.casesCorrected++;
     if(excess>worst.excess)worst={excess,clip,phase,side};
     report.mixamo.shoulders.maxBeforeDegrees=Math.max(
      report.mixamo.shoulders.maxBeforeDegrees,x.beforeDeg);
     report.mixamo.shoulders.maxAfterDegrees=Math.max(
      report.mixamo.shoulders.maxAfterDegrees,y.afterDeg);
     report.mixamo.shoulders.samples.push({clip,phase,side,
      original:x.beforeDeg,after:y.afterDeg,change:excess});
    }
    for(const side of ['l','r']){
     const afoot=a.actualFeet[side],bfoot=b.actualFeet[side];
     assert.ok(Math.hypot(...afoot.map((p,i)=>p-bfoot[i]))<.0002,
      'Upper body must not change captured foot placement: '+clip+side);
    }
   }
  }
  report.mixamo.shoulders.worst=worst;
  assert.ok(report.mixamo.shoulders.casesCorrected>0,
   'The source mocap should expose at least one excessive arm-out pose');
  const worstRate={walk:1.05,jog:1.4,run:1.7,sprint:2.1}[worst.clip];
  for(const [view,angle] of [['front',0],['side',Math.PI/2]]){
   for(const [suffix,shoulderAlign] of [['before',false],['after',true]])
    await capture('shoulder-'+view+'-'+suffix,{version:'master',mode:'mocap',
     mocapClip:worst.clip,time:worst.phase/worstRate,angle,zoom:'chest',
     footPlant:true,kneeAlign:true,rootTravel:true,shoulderAlign});
  }
  // Capture synchronized before/after video with identical original gait
  // phases, real Three.js skin deformation and camera. Avoid fabricated images.
  const shoulderFrames=path.join(out,'shoulder-pair-frames');
  fs.mkdirSync(shoulderFrames,{recursive:true});
  for(let i=0;i<36;i++){
   const clip=i<12?'jog':i<24?'run':'sprint',
    rate={jog:1.4,run:1.7,sprint:2.1}[clip],
    shot={version:'master',mode:'mocap',mocapClip:clip,time:(i%12)/12/rate,
     angle:i<18?0:Math.PI/2,zoom:'full',
     kneeAlign:true,footPlant:true,rootTravel:true};
   const views=[];
   for(const shoulderAlign of [false,true]){
    await page.evaluate(v=>window.footeraQaRender(v),{...shot,shoulderAlign});
    views.push(PNG.sync.read(await page.locator('canvas').screenshot()));
   }
   const pair=new PNG({width:2*views[0].width,height:views[0].height});
   views.forEach((p,j)=>PNG.bitblt(p,pair,0,0,p.width,p.height,j*p.width,0));
   fs.writeFileSync(path.join(shoulderFrames,'frame-'+String(i).padStart(3,'0')+'.png'),
    PNG.sync.write(pair));
  }
  cp.execFileSync(process.env.FOOTERA_FFMPEG||'ffmpeg',
   ['-hide_banner','-loglevel','error','-y','-framerate','12','-i',
    path.join(shoulderFrames,'frame-%03d.png'),'-vf','scale=1440:-2',
    '-c:v','libx264','-crf','24','-pix_fmt','yuv420p',
    path.join(out,'footera-shoulder-mixamo-before-after.mp4')]);
  report.mixamo.shoulders.video='footera-shoulder-mixamo-before-after.mp4';
  report.mixamo.shoulders.images=['shoulder-front-before.png',
   'shoulder-front-after.png','shoulder-side-before.png','shoulder-side-after.png'];
  assert.ok(fs.statSync(path.join(out,report.mixamo.shoulders.video)).size>30000);
  // Original Adobe Mixamo directional moves, NOT synthetic cutPose.
  report.mixamo.directional={clips:[],genuineCaptures:true,headingsChecked:true,
   worldFootPlantGuaranteed:false,liveRootMotion:false,
   caveat:'In-place laboratory crossfades; game-root turn, contact and inertia pending'};
  for(const direction of ['strafeLeft','strafeRight','backpedal']){
   const sampled=[];
   for(const time of [.4,.65,.85,1.05,1.35,1.55,1.75,1.95,2.3]){
    const shot={version:'master',mode:'directional',direction,time,
     angle:Math.PI/2,zoom:'full',shoulderAlign:true};
    const qa=await page.evaluate(x=>window.footeraQaRender(x),shot);
    assert.ok(qa.skinnedMeshes>=5);
    assert.ok(qa.mocap.source.includes('original baked Adobe Mixamo'));
    assert.equal(qa.mocap.direction.to,direction);
    assert.equal(qa.mocap.direction.worldFootPlantGuaranteed,false);
    assert.ok(qa.mocap.direction.feet.l.every(Number.isFinite));
    assert.ok(qa.mocap.direction.feet.r.every(Number.isFinite));
    sampled.push({time,blend:qa.mocap.direction.easedWeight,
     sourceFrame:qa.mocap.direction.toFrame});
    if([.85,1.35,1.75].includes(time))
     await capture('direction-'+direction+'-'+time,{...shot,angle:0});
   }
   report.mixamo.directional.clips.push({direction,states:sampled,
    capture:'Footera baked Adobe Mixamo, captured real 60-bone WebGL'});
  }
  // 3 seconds of real skinned 3D at 12fps. Every frame is rendered from
  // the genuine Mixamo clip and interpolated source-joint quaternions.
  const directionFrames=path.join(out,'direction-mixamo-frames');
  fs.mkdirSync(directionFrames,{recursive:true});
  for(let i=0;i<36;i++){
   const direction=i<12?'strafeLeft':i<24?'strafeRight':'backpedal';
   const t=(i%12)*2.4/11;
   await page.evaluate(v=>window.footeraQaRender(v),{version:'master',
    mode:'directional',direction,time:t,angle:i%2?0:Math.PI/2,
    zoom:'full',shoulderAlign:true});
   await page.locator('canvas').screenshot({path:path.join(directionFrames,
    'frame-'+String(i).padStart(3,'0')+'.png')});
  }
  cp.execFileSync(process.env.FOOTERA_FFMPEG||'ffmpeg',
   ['-hide_banner','-loglevel','error','-y','-framerate','12','-i',
    path.join(directionFrames,'frame-%03d.png'),'-vf','scale=1280:-2',
    '-c:v','libx264','-crf','24','-pix_fmt','yuv420p',
    path.join(out,'footera-original-mixamo-directional-cuts.mp4')]);
  report.mixamo.directional.video='footera-original-mixamo-directional-cuts.mp4';
  assert.ok(fs.statSync(path.join(out,report.mixamo.directional.video)).size>20000);
  // Step 7 - same original directional Mixamo keyframes, original 60-bone
  // geometry and camera; contact-derived root OFF vs ON. A root controller
  // is NOT an IK solver: no fake boot-to-floor contact claim.
  report.mixamo.directional.contactRoot={
   derivedFrom:'Original Mixamo FK shoes at 90Hz, lowest-foot hysteresis',
   sourceBonesUnchanged:true,usesRealMatchRoot:false,usesCollisionFootIK:false,
   modes:[],video:'footera-direction-foot-contact-3d-before-after.mp4'};
  for(const direction of ['strafeLeft','strafeRight','backpedal']){
   const timePoints=[.18,.45,.85,1.08,1.35,1.61,1.86,2.20];
   const measurements=[];
   for(const time of timePoints){
    const args={version:'master',mode:'directional',direction,time,
     angle:0,zoom:'full',shoulderAlign:true};
    const off=await page.evaluate(x=>window.footeraQaRender(x),
     {...args,directionContact:false});
    const on=await page.evaluate(x=>window.footeraQaRender(x),
     {...args,directionContact:true});
    const d=on.mocap.direction;
    assert.equal(d.rootContactEnabled,true);
    assert.equal(d.contactInferred,true);
    assert.ok(['l','r'].includes(d.estimatedContactSide));
    assert.ok(d.rootTravel.every(Number.isFinite));
    assert.ok(d.contactStats.maxRootSpeed<=7.51,'Unphysical root jerk');
    assert.ok(d.contactStats.maxStepMetres<=7.5/90+.001);
    assert.ok(d.contactStats.switches>=1,'No alternate support foot');
    const shift=on.rootPosition.map((v,i)=>v-off.rootPosition[i]);
    const movement=Math.hypot(...shift);
    assert.ok(Math.abs(movement-Math.hypot(...d.rootTravel))<.0004,
     'Only authoritative preview root may move, no shoe or bone offsets');
    for(const side of ['l','r']){
     const shoeShift=on.actualFeet[side].map((v,i)=>v-off.actualFeet[side][i]);
     assert.ok(Math.hypot(...shoeShift.map((v,i)=>v-shift[i]))<.002,
      'Skeletal FK shoes must travel with captured root, not be stretched');
    }
    measurements.push({time,side:d.estimatedContactSide,
     rootMetres:d.rootTravel,contactErrorMetres:d.supportSlipMetres,
     speedLimited:d.speedLimited});
    if(Math.abs(time-1.35)<1e-6){
     await capture('direction-root-'+direction+'-before',
      {...args,directionContact:false,angle:Math.PI/2});
     await capture('direction-root-'+direction+'-after',
      {...args,directionContact:true,angle:Math.PI/2});
    }
   }
   report.mixamo.directional.contactRoot.modes.push({direction,measurements,
    trackStats:measurements.length?(
     await page.evaluate(x=>window.footeraQaRender(x),{
      version:'master',mode:'directional',direction,time:1.35
     })).mocap.direction.contactStats:null});
  }
  const contactFrames=path.join(out,'direction-foot-contact-pairs');
  fs.mkdirSync(contactFrames,{recursive:true});
  for(let i=0;i<36;i++){
   const direction=i<12?'strafeLeft':i<24?'strafeRight':'backpedal';
   const time=(i%12)*2.45/11;
   const args={version:'master',mode:'directional',direction,time,angle:0,
    zoom:'full',shoulderAlign:true};
   const imgs=[];
   for(const directionContact of [false,true]){
    await page.evaluate(v=>window.footeraQaRender(v),{...args,directionContact});
    imgs.push(PNG.sync.read(await page.locator('canvas').screenshot()));
   }
   const pair=new PNG({width:imgs[0].width*2,height:imgs[0].height});
   imgs.forEach((p,j)=>PNG.bitblt(p,pair,0,0,p.width,p.height,p.width*j,0));
   fs.writeFileSync(path.join(contactFrames,
    'frame-'+String(i).padStart(3,'0')+'.png'),PNG.sync.write(pair));
  }
  cp.execFileSync(process.env.FOOTERA_FFMPEG||'ffmpeg',
   ['-hide_banner','-loglevel','error','-y','-framerate','12','-i',
    path.join(contactFrames,'frame-%03d.png'),'-vf','scale=1440:-2',
    '-c:v','libx264','-crf','24','-pix_fmt','yuv420p',
    path.join(out,report.mixamo.directional.contactRoot.video)]);
  assert.ok(fs.statSync(path.join(out,report.mixamo.directional.contactRoot.video)).size>25000);
  // Step 8: SHOE OUTSOLE before/after, identical unmodified Mixamo capture,
  // fixed WORLD camera, identical root travel, identical lights and frame.
  report.groundIK2={source:'Original Adobe Mixamo + real 60-bone GLB boot outsole',
   camera:'fixed world-space',mobileGame:false,terrainRaycasts:false,
   gait:[],directional:[],frames:60,
   video:'footera-ground-ik2-fixed-camera-before-after.mp4'};
  const gaitRates={walk:1.05,jog:1.4,run:1.7,sprint:2.1};
  let visibleDifferences=0;
  for(const clip of ['walk','jog','run','sprint']){
   const args={version:'master',mode:'mocap',mocapClip:clip,
    time:.27/gaitRates[clip],angle:Math.PI/2,zoom:'full',cameraFixed:true,
    footPlant:true,kneeAlign:true,shoulderAlign:true,rootTravel:true};
   const a=await capture('foot-ik2-'+clip+'-before',{...args,groundIK:false});
   const b=await capture('foot-ik2-'+clip+'-after',{...args,groundIK:true});
   assert.ok(!a.mocap.groundContact&&b.mocap.groundContact,'Ground A/B mode invalid');
   assert.ok(Math.hypot(a.rootPosition[0]-b.rootPosition[0],
      a.rootPosition[2]-b.rootPosition[2])<.000001,
    'Ground IK must preserve horizontal captured root track');
   assert.ok(Math.abs(b.mocap.rootGroundOffsetY)<=.10001,
    'Preview contact root height correction exceeds 10 cm');
   const active=Object.values(b.mocap.feet).filter(f=>f.active);
   assert.ok(active.length>=1,clip+' no ground-contact foot');
   for(const foot of active){
    assert.ok(foot.floorPenetration>=0&&foot.floorPenetration<.02);
    assert.ok(Math.min(foot.heelHeight,foot.toeHeight)<.025,
     clip+' support shoe must be close to actual floor');
    assert.ok(Math.abs(foot.soleLift)<=.07001&&Math.abs(foot.rollDeg)<11.6);
   }
   report.groundIK2.gait.push({clip,active,soles:b.mocap.soles,
    rootMeters:b.rootPosition});
  }
  for(const direction of ['strafeLeft','strafeRight','backpedal']){
   const args={version:'master',mode:'directional',direction,time:1.35,
    angle:direction==='backpedal'?Math.PI/2:0,
    cameraFixed:true,footPlant:true,kneeAlign:true,shoulderAlign:true,
    directionContact:true};
   const off=await capture('foot-ik2-'+direction+'-before',{...args,groundIK:false});
   const on=await capture('foot-ik2-'+direction+'-after',{...args,groundIK:true});
   assert.equal(on.mocap.direction.groundIKEnabled,true);
   assert.equal(off.mocap.direction.groundIKEnabled,false);
   assert.ok(Math.hypot(off.rootPosition[0]-on.rootPosition[0],
     off.rootPosition[2]-on.rootPosition[2])<.000001,
    direction+' ground correction must preserve horizontal preview root');
   assert.ok(Math.abs(on.mocap.direction.rootGroundOffsetY)<=.10001,
    direction+' preview vertical root correction exceeds 10 cm');
   const feet=on.mocap.direction.groundFeet;
   assert.ok(feet?.l&&feet?.r,direction+' missing shoe diagnostics');
   const active=Object.values(feet).filter(f=>f.active);
   for(const foot of active){
    assert.ok(Math.abs(foot.soleLift)<=.07001&&Math.abs(foot.rollDeg)<=11.6);
    assert.ok(foot.floorPenetration<.025&&
      Math.min(foot.heelHeight,foot.toeHeight)<.035,
      direction+' planted shoe must not float or penetrate in flat studio');
   }
   report.groundIK2.directional.push({direction,
    source:on.mocap.source,active,rootMeters:on.rootPosition,
    support:on.mocap.direction.estimatedContactSide});
  }
  // Compare actual THREE canvas pixels; diagnostic, not human visual approval.
  for(const clip of ['walk','run','strafeLeft']){
   const off=PNG.sync.read(fs.readFileSync(path.join(out,'foot-ik2-'+clip+'-before.png')));
   const on=PNG.sync.read(fs.readFileSync(path.join(out,'foot-ik2-'+clip+'-after.png')));
   let count=0;
   for(let i=0;i<off.data.length;i+=4)
    if(Math.abs(off.data[i]-on.data[i])+
       Math.abs(off.data[i+1]-on.data[i+1])+
       Math.abs(off.data[i+2]-on.data[i+2])>30)count++;
   visibleDifferences+=count;
   report.groundIK2[clip+'PixelDelta']=count;
  }
  // 60 matching pairs, fixed camera across each actual gait/cut trajectory.
  const soleFrames=path.join(out,'ground-ik2-fixed-frames');
  fs.mkdirSync(soleFrames,{recursive:true});
  for(let i=0;i<60;i++){
   let shot;
   if(i<36){
    const clip=['walk','jog','run','sprint'][Math.floor(i/9)];
    const phase=(i%9)/9;
    shot={version:'master',mode:'mocap',mocapClip:clip,
     time:phase/gaitRates[clip],angle:Math.PI/2,
     rootTravel:true,footPlant:true,kneeAlign:true,shoulderAlign:true};
   }else{
    const direction=['strafeLeft','strafeRight','backpedal'][Math.floor((i-36)/8)];
    shot={version:'master',mode:'directional',direction,
     time:2.35*((i-36)%8)/7,
     angle:direction==='backpedal'?Math.PI/2:0,
     directionContact:true,footPlant:true,kneeAlign:true,shoulderAlign:true};
   }
   const imgs=[];
   for(const groundIK of [false,true]){
    await page.evaluate(v=>window.footeraQaRender(v),
     {...shot,groundIK,cameraFixed:true,zoom:'full'});
    imgs.push(PNG.sync.read(await page.locator('canvas').screenshot()));
   }
   const pair=new PNG({width:imgs[0].width*2,height:imgs[0].height});
   imgs.forEach((p,j)=>PNG.bitblt(p,pair,0,0,p.width,p.height,p.width*j,0));
   fs.writeFileSync(path.join(soleFrames,
    'frame-'+String(i).padStart(3,'0')+'.png'),PNG.sync.write(pair));
  }
  cp.execFileSync(process.env.FOOTERA_FFMPEG||'ffmpeg',
   ['-hide_banner','-loglevel','error','-y','-framerate','12','-i',
    path.join(soleFrames,'frame-%03d.png'),'-vf','scale=1440:-2',
    '-c:v','libx264','-crf','24','-pix_fmt','yuv420p',
    path.join(out,report.groundIK2.video)]);
  assert.ok(fs.statSync(path.join(out,report.groundIK2.video)).size>25000,
   'Missing actual GLB WebGL fixed-camera before/after MP4');
  report.groundIK2.measuredPixelDifferences=visibleDifferences;
  report.groundIK2.caveat='Not terrain collision, not actual match physics, no visual premium approval';
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
    angle:i>=54?Math.PI/2:i>=39?Math.PI/4:.18,
    deg:(i%10)*9,bone:'lowerarm_l'};
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
