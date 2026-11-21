/* Footera Player Evolution Step13: authentic 60-bone WebGL speed transition QA.
 * 16 seconds @ 10 FPS / actual original Mixamo, full-frame A/B.
 * Gait transition acceptance is independent from Step12 outsole contact gate.
 */
'use strict';
const {chromium}=require('playwright');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const cp=require('node:child_process'),assert=require('node:assert/strict');
const {PNG}=require('pngjs');
const root=path.resolve(__dirname,'..'),out=path.join(root,'test-artifacts','natural-locomotion-step13'),frameDir=path.join(out,'frames');
fs.mkdirSync(frameDir,{recursive:true});
const phases=[
 {seconds:3,target:1.25,clip:'walk'},
 {seconds:3,target:3.5,clip:'jog'},
 {seconds:3,target:5.5,clip:'run'},
 {seconds:3,target:6.75,clip:'sprint'},
 {seconds:2,target:2.65,clip:'jog'},
 {seconds:2,target:0,clip:'walk'}
];
const fps=10,duration=phases.reduce((t,p)=>t+p.seconds,0),frames=fps*duration;
const report={title:'Footera Step13 speed-matched real 60-bone WebGL gait QA',
 originalMixamoUnmodified:true,liveMatchValidated:false,realPhoneValidated:false,
 footContactApproved:false,visualApprovalPending:true,
 fps,seconds:duration,framesPerChannel:frames,sideBySide:true,source:'Original captured Adobe Mixamo',
 acceptance:{maxAccelerationMps2:6.55,maxDecelerationMps2:8.05,
  rootTravelStepMultiplier:1.12,continuityMaxStepMetres:.82,
  noPageExceptions:true,requireActiveCrossfades:true},
 samples:[],blockers:[],errors:[],qualityGatesPassed:false};
function interval(time){let total=0;for(const p of phases){total+=p.seconds;if(time<total)return p}return phases.at(-1)}
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
  ...(process.env.FOOTERA_CHROME_PATH?{executablePath:process.env.FOOTERA_CHROME_PATH}:{}),
  args:['--enable-unsafe-swiftshader','--use-angle=swiftshader','--disable-dev-shm-usage']});
 try{
  const page=await browser.newPage({viewport:{width:760,height:625},deviceScaleFactor:1});
  page.on('pageerror',e=>report.errors.push(e.message));
  await page.goto('http://127.0.0.1:'+server.address().port+'/player-evolution-natural-locomotion-lab.html',
   {waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>['true','error'].includes(document.documentElement.dataset.ready),
   null,{timeout:180000});
  assert.equal(await page.locator('html').getAttribute('data-ready'),'true',
   await page.locator('#status').textContent());
  const images={before:[],after:[]};
  for(const enabled of [false,true]){
   let previous=null,nonTrivialBlend=0,maxAccel=0,maxDecel=0,maxRootJump=0;
   let maxRootOvershoot=0,atGoal=0;
   for(let i=0;i<frames;i++){
    const time=i/fps,step=interval(time);
    const args={version:'master',mode:'mocap',time,
     mocapClip:enabled?'run':step.clip,angle:Math.PI/2,
     zoom:'knees',cameraFixed:false,footPlant:false,
     rootTravel:true,kneeAlign:false,shoulderAlign:false,
     groundIK:false,groundContinuity:false,collisionSafe:false,
     footMotion11:false,footPlantLock:false,
     locomotion13:enabled,locomotionSpeed:step.target};
    const q=await page.evaluate(o=>window.footeraQaRender(o),args);
    assert.equal(q.boneCount,60,'QA must use the original 60-bone GLB');
    assert.ok(q.twistReport?.ok,'No valid 60-bone mesh skinning');
    assert.ok(q.mocap?.source.includes('Adobe Mixamo'),'Rendered animation is not original Mixamo');
    assert.ok(q.rootPosition.every(Number.isFinite),'Nonfinite 60-bone player root');
    if(enabled){
     const d=q.mocap.naturalLocomotion13;
     assert.ok(d&&Number.isFinite(d.speedMps),'Step13 adapter not active');
     assert.equal(d.calibrated.length,4,'Missing four measured Mixamo stride calibrations');
     assert.ok(d.calibrated.every(x=>x.strideMetres>0&&x.capturedSpeedMps>0));
     assert.ok(d.speedMps>=0&&d.speedMps<=6.76);
     const weights=Object.values(d.clipWeights);
     assert.ok(Math.abs(weights.reduce((s,x)=>s+x,0)-1)<1e-6);
     if(weights.length>1&&weights.every(x=>x>.05))nonTrivialBlend++;
     if(Math.abs(d.speedMps-step.target)<.25)atGoal++;
     if(previous){
      const dt=time-previous.time;
      const dv=d.speedMps-previous.speed;
      const speedRate=dv/dt;
      maxAccel=Math.max(maxAccel,speedRate);
      maxDecel=Math.max(maxDecel,-speedRate);
      const stepRoot=Math.hypot(q.rootPosition[0]-previous.root[0],
       q.rootPosition[2]-previous.root[2]);
      maxRootJump=Math.max(maxRootJump,stepRoot);
      maxRootOvershoot=Math.max(maxRootOvershoot,Math.max(0,
       stepRoot-((d.speedMps+previous.speed)*.5)*dt*report.acceptance.rootTravelStepMultiplier));
      assert.ok(d.cycles>=previous.cycles,'Stride phase moved backwards');
     }
     previous={time,root:q.rootPosition,speed:d.speedMps,cycles:d.cycles};
     if(i%10===0||i===frames-1)report.samples.push({
      time,speedMps:d.speedMps,targetSpeedMps:step.target,
      gaitWeights:d.clipWeights,rootTravel:d.rootDisplacementMetres});
    }
    const shot=await page.locator('canvas').screenshot();
    images[enabled?'after':'before'].push(PNG.sync.read(shot));
    if(i%30===10)fs.writeFileSync(path.join(out,enabled?'after-'+i+'.png':'before-'+i+'.png'),shot);
   }
   if(enabled){
    report.metrics={nonTrivialBlendFrames:nonTrivialBlend,
     atTargetFrames:atGoal,maxAccelerationMps2:maxAccel,
     maxDecelerationMps2:maxDecel,
     maxRootFrameStepMetres:maxRootJump,
     maxRootStepOvershootMetres:maxRootOvershoot,
     animationFrames:frames};
   }
  }
  assert.equal(images.before.length,frames);assert.equal(images.after.length,frames);
  for(let i=0;i<frames;i++){
   const left=images.before[i],right=images.after[i];
   const pair=new PNG({width:left.width+right.width,height:left.height});
   PNG.bitblt(left,pair,0,0,left.width,left.height,0,0);
   PNG.bitblt(right,pair,0,0,right.width,right.height,left.width,0);
   fs.writeFileSync(path.join(frameDir,'frame-'+String(i).padStart(3,'0')+'.png'),PNG.sync.write(pair));
  }
  report.file='footera-step13-natural-locomotion-original-mixamo-before-after-16s.mp4';
  cp.execFileSync(process.env.FOOTERA_FFMPEG||'ffmpeg',[
   '-hide_banner','-loglevel','error','-y','-framerate',String(fps),
   '-i',path.join(frameDir,'frame-%03d.png'),
   '-vf','scale=1280:-2','-c:v','libx264','-crf','25','-pix_fmt','yuv420p',
   path.join(out,report.file)]);
  report.videoBytes=fs.statSync(path.join(out,report.file)).size;
  const m=report.metrics;
  if(m.nonTrivialBlendFrames<8)report.blockers.push('No sustained real-clip crossfade');
  if(m.maxAccelerationMps2>report.acceptance.maxAccelerationMps2)
   report.blockers.push('Acceleration above speed envelope');
  if(m.maxDecelerationMps2>report.acceptance.maxDecelerationMps2)
   report.blockers.push('Braking above speed envelope');
  if(m.maxRootFrameStepMetres>report.acceptance.continuityMaxStepMetres)
   report.blockers.push('Preview root teleport');
  if(m.maxRootStepOvershootMetres>.02)
   report.blockers.push('Root displacement exceeds measured speed integral');
  if(report.videoBytes<30000)report.blockers.push('Missing video pixels');
  if(report.errors.length)report.blockers.push('Browser exceptions');
  report.qualityGatesPassed=report.blockers.length===0;
  report.limitations=['No physical foot-contact quality check: Step12 has its own strict 17s WebGL gate',
   'Not a live match integration','No original Mixamo contact tags','No real smartphone GPU test',
   'Automated numerical green never substitutes for human visual inspection'];
  fs.writeFileSync(path.join(out,'step13-qa-report.json'),JSON.stringify(report,null,2));
  console.log('STEP13 GENUINE WEBGL REPORT',JSON.stringify({metrics:report.metrics,
   blockers:report.blockers,qualityGatesPassed:report.qualityGatesPassed,videoBytes:report.videoBytes}));
  if(!report.qualityGatesPassed)throw Error('Step13 genuine WebGL speed gating failed');
 }catch(e){
  report.errors.push(String(e));
  fs.writeFileSync(path.join(out,'step13-qa-report.json'),JSON.stringify(report,null,2));
  throw e;
 }finally{
  await browser.close();server.close();
 }
})().catch(e=>{console.error(e);process.exitCode=1});
