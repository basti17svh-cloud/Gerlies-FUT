/* Step12 dedicated authentic WebGL QA (60-bone GLB, untouched Mixamo).
 * This fast focused run complements the complete evolution suite.
 * All video frames and numeric measurements come from the same browser rig.
 */
'use strict';
const {chromium}=require('playwright');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const cp=require('node:child_process'),assert=require('node:assert/strict');
const {PNG}=require('pngjs');
const root=path.resolve(__dirname,'..');
const out=path.join(root,'test-artifacts','plant-lock-step12');
const frames=path.join(out,'pair-frames');
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
const modes=[...['walk','jog','run','sprint'].map(name=>({name,gait:true,seconds:2})),
 ...['strafeLeft','strafeRight','backpedal'].map(name=>({name,gait:false,seconds:3}))];
const acceptance={penetration:0.003,supportHover:0.025,supportDrift:0.025,
 rootFrameStep:0.085,rootVelocityOverRate:0.10};
const report={title:'Footera Step 12 world-space plant lock – real WebGL 60-bone QA',
 originalMixamoClipsUnchanged:true,sourceSkeletonBones:60,flatPitch:true,
 liveGameVerified:false,realPhoneVerified:false,visualPremiumApproved:false,
 fps:12,seconds:17,perChannelFrames:204,sideBySide:true,
 before:'Step 11 only (plant lock disabled)',after:'Step 12 world plant lock enabled',
 camera:'follows model, 3D close-up to retain visible shoes',
 acceptance,modes:[],errors:[],qualityGatesPassed:false};
function metricSet(){return{
 maxPenetration:0,maxSupportHover:0,maxSupportDrift:0,maxRootFrameStep:0,
 maxRootVelocityOverRate:0,maxRootAcceleration:0,
 maxAnatomicalIKResidual:0,unreachableSamples:0,lockedSamples:0,
 firstFootContacts:0,frameCount:0
}}
(async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const browser=await chromium.launch({headless:true,
  ...(process.env.FOOTERA_CHROME_PATH?{executablePath:process.env.FOOTERA_CHROME_PATH}:{}),
  args:['--enable-unsafe-swiftshader','--use-angle=swiftshader','--disable-dev-shm-usage']});
 let passes=false;
 try{
  const page=await browser.newPage({viewport:{width:760,height:625},deviceScaleFactor:1});
  page.on('pageerror',e=>report.errors.push(e.message));
  await page.goto('http://127.0.0.1:'+server.address().port+'/player-evolution-twist-lab.html',
   {waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>['true','error'].includes(document.documentElement.dataset.ready),
   null,{timeout:180000});
  assert.equal(await page.locator('html').getAttribute('data-ready'),'true',
   await page.locator('#status').textContent());
  let videoIndex=0;
  for(const mode of modes){
   const sequences={before:[],after:[]},record={name:mode.name,seconds:mode.seconds},
    count=mode.seconds*report.fps;
   for(const enabled of [false,true]){
    const label=enabled?'after':'before',metrics=metricSet();
    let last=null;
    for(let i=0;i<count;i++){
     const time=i/report.fps;
     const args={version:'master',mode:mode.gait?'mocap':'directional',
      mocapClip:mode.gait?mode.name:'run',
      direction:mode.gait?'strafeLeft':mode.name,
      time,angle:Math.PI/2,zoom:'knees',cameraFixed:false,
      footPlant:true,rootTravel:true,kneeAlign:true,shoulderAlign:true,
      directionContact:true,groundIK:true,groundContinuity:true,
      collisionSafe:true,footMotion11:true,footPlantLock:enabled};
     const q=await page.evaluate(o=>window.footeraQaRender(o),args);
     assert.equal(q.boneCount,60,'Not the authentic 60-bone rig');
     assert.ok(q.twistReport?.ok,'Invalid 60-bone skinning');
     const d=mode.gait?q.mocap:q.mocap.direction;
     assert.ok(d?.collisionSoles?.after?.feet?.l?.meshCalibrated,
      'Not using real skinned footwear');
     assert.ok(d?.collisionSoles?.after?.feet?.r?.meshCalibrated,
      'Not using real skinned footwear');
     metrics.maxPenetration=Math.max(metrics.maxPenetration,
      d.collisionSoles.maxPenetration);
     metrics.maxRootVelocityOverRate=Math.max(metrics.maxRootVelocityOverRate,
      d.collisionRootOverRate||0);
     if(last){
      metrics.maxRootFrameStep=Math.max(metrics.maxRootFrameStep,
       Math.abs(d.rootGroundOffsetY-last.y));
      const accel=Math.abs((d.rootGroundVelocityY-last.velocity)*report.fps);
      metrics.maxRootAcceleration=Math.max(metrics.maxRootAcceleration,accel);
     }
     last={y:d.rootGroundOffsetY,velocity:d.rootGroundVelocityY};
     if(enabled){
      const lock=d.plantLock12;
      assert.ok(lock,'Step12 world-space lock diagnostics missing');
      const feet=mode.gait?d.feet:d.groundFeet;
      for(const side of ['l','r']){
       const contact=lock.feet[side],measured=lock.measured[side];
       if(contact?.touchdown)metrics.firstFootContacts++;
       if(contact?.locked&&contact.weight>.65){
        metrics.lockedSamples++;
        metrics.maxSupportHover=Math.max(metrics.maxSupportHover,measured.hover||0);
        metrics.maxSupportDrift=Math.max(metrics.maxSupportDrift,measured.driftXZ||0);
        if(contact.unreachable||measured.unreachable)metrics.unreachableSamples++;
        metrics.maxAnatomicalIKResidual=Math.max(metrics.maxAnatomicalIKResidual,
         feet?.[side]?.errorAfter3D||0);
       }
      }
     }else{
      const footStats=mode.gait?d.feet:d.groundFeet;
      for(const side of ['l','r'])
       if(footStats?.[side]?.active&&footStats[side].weight>.65)
        metrics.maxSupportHover=Math.max(metrics.maxSupportHover,
         d.collisionSoles.after.feet[side].lowest);
     }
     const b=await page.locator('canvas').screenshot();
     sequences[label].push(PNG.sync.read(b));
     metrics.frameCount++;
     if(i===Math.min(count-1,9)){
      const name='step12-'+mode.name+'-'+label+'.png';
      fs.writeFileSync(path.join(out,name),b);
     }
    }
    record[label]=metrics;
   }
   report.modes.push(record);
   for(let i=0;i<count;i++){
    const a=sequences.before[i],b=sequences.after[i];
    const pair=new PNG({width:a.width+b.width,height:a.height});
    PNG.bitblt(a,pair,0,0,a.width,a.height,0,0);
    PNG.bitblt(b,pair,0,0,b.width,b.height,a.width,0);
    fs.writeFileSync(path.join(frames,'frame-'+String(videoIndex++).padStart(3,'0')+'.png'),
     PNG.sync.write(pair));
   }
  }
  assert.equal(videoIndex,204,'17s real-time A/B footage must contain 204 frames');
  report.file='footera-step12-real-webgl-17s-before-after.mp4';
  cp.execFileSync(process.env.FOOTERA_FFMPEG||'ffmpeg',[
   '-hide_banner','-loglevel','error','-y','-framerate','12',
   '-i',path.join(frames,'frame-%03d.png'),
   '-vf','scale=1280:-2','-c:v','libx264','-crf','24','-pix_fmt','yuv420p',
   path.join(out,report.file)]);
  report.videoBytes=fs.statSync(path.join(out,report.file)).size;
  assert.ok(report.videoBytes>30000);
  report.blockers=report.modes.flatMap(row=>{
   const d=row.after,fail=[];
   if(d.lockedSamples===0)fail.push('no verifiable planted support foot');
   if(d.maxPenetration>acceptance.penetration)fail.push('boot penetration');
   if(d.maxSupportHover>acceptance.supportHover)fail.push('support boot floating');
   if(d.maxSupportDrift>acceptance.supportDrift)fail.push('plant foot drift');
   if(d.maxRootFrameStep>acceptance.rootFrameStep)fail.push('root Y jump');
   if(d.maxRootVelocityOverRate>acceptance.rootVelocityOverRate)
    fail.push('root collision emergency velocity');
   if(d.unreachableSamples>0)fail.push('unreachable anatomical foot');
   return fail.length?[{mode:row.name,fail,metrics:d}]:[];
  });
  if(report.errors.length)report.blockers.push({mode:'browser',fail:report.errors});
  report.qualityGatesPassed=report.blockers.length===0;
  report.visualPremiumApproved=false;
  report.limitations=[
   'No original Mixamo ground-truth foot-strike metadata',
   'No real uneven stadium terrain or live match movement root',
   'No real mobile-device GPU profiling',
   'Gait to gait crossfades are not individually tested (directional crossfades are)',
   'Automatic numeric green does not equal human visual approval'
  ];
  fs.writeFileSync(path.join(out,'step12-qa-report.json'),JSON.stringify(report,null,2));
  console.log('STEP12 DIAGNOSTIC SUMMARY',JSON.stringify({
   qualityGatesPassed:report.qualityGatesPassed,blockers:report.blockers,
   modes:report.modes.map(r=>({name:r.name,after:r.after}))}));
  passes=report.qualityGatesPassed;
 }catch(error){
  report.errors.push(String(error));
  fs.writeFileSync(path.join(out,'step12-qa-report.json'),JSON.stringify(report,null,2));
  throw error;
 }finally{
  await browser.close();server.close();
 }
 if(!passes)throw Error('STEP12 visual/physical gates failed: see artifact QA report');
})().catch(e=>{console.error(e);process.exitCode=1});
