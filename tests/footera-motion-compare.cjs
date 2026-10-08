/* Two actual Footera match captures: V21.37 reference motion vs V21.38 pilot.
 * Identical simulator fixture, scorer, kits, finish, scene and camera. The QA
 * switch bypasses ONLY the new additive skeleton motions in the reference.
 */
const {chromium}=require('playwright'),{server,fixture,force}=require('./3d-highlights.browser.cjs');
const {spawnSync}=require('node:child_process'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const out=path.resolve(__dirname,'../test-artifacts');fs.mkdirSync(out,{recursive:true});
(async()=>{
 await new Promise(ok=>server.listen(0,'127.0.0.1',ok));const url='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({headless:true,args:['--enable-unsafe-swiftshader','--use-angle=swiftshader']});
 let ctx;
 try{
  const comparison=await browser.newPage({viewport:{width:390,height:844},serviceWorkers:'block'});
  await comparison.goto(url);
  const measures=await comparison.evaluate(async()=>{
   const T=await import('./vendor/three/three.module.min.js'),M=await import('./3d-highlights-scene.mjs?v=2138');
   const c=document.createElement('canvas'),r=new T.WebGLRenderer({canvas:c,antialias:false});
   const output={reference:[],pilot:[]};
   for(const baseline of [true,false]){
    for(const [type,sequence,finish,keeperAction] of [['goal','cut_inside_right','finesse','classic'],['big_chance_saved','central','power','fingertip']]){
     const event=FooteraHighlights.snapshot({id:'qa-comparison',type,minute:38,team:'home',period:1,playerName:'Jamal Musiala',keeperName:'Mike Maignan',sequence,finish,keeperAction});
     const w=M.makeScene(r,event,false,false,true,baseline);w.resize(390,300);
     for(const time of [2,5.12,5.4,5.63,6.4,6.65,7,8.5]){w.update(time);const x=w.inspect();output[baseline?'reference':'pilot'].push({type,finish,time,motionPose:x.motionPose,ball:x.ball,gloves:x.gloves,drawCalls:x.drawCalls,riggedActors:x.riggedActors})}
     w.dispose();
    }
   }
   r.dispose();r.forceContextLoss();return output;
  });
  let moved=0;
  for(let i=0;i<measures.reference.length;i++){
   const a=measures.reference[i],b=measures.pilot[i];
   if(a.time>=5.4)assert.deepEqual(a.ball,b.ball,'unchanged post-contact authoritative ball flight');
   else assert.ok(Math.hypot(...a.ball.map((v,k)=>v-b.ball[k]))<.5,'pre-shot boot-guided dribble stays nearby');
   assert.equal(a.drawCalls,b.drawCalls,'unchanged draw-call budget');
   assert.equal(a.riggedActors,2);
   const keys=Object.keys(a.motionPose),distance=Math.hypot(...keys.map(k=>a.motionPose[k]-b.motionPose[k]));
   assert.ok(Number.isFinite(distance));
   if((a.time===5.12||a.time===5.63||a.time===6.4)&&distance>.12)moved++;
   if(a.type==='big_chance_saved'&&a.time===6.65)for(const item of [a,b]){
    const near=Math.min(...item.gloves.map(g=>Math.hypot(...g.map((v,k)=>v-item.ball[k]))));
    assert.ok(near<.16,'save/glove contact intact: '+near);
   }
  }
  assert.ok(moved>=3,'at least three clearly separated action poses vs V21.37: '+moved);
  fs.writeFileSync(path.join(out,'footera-motion-comparison.json'),JSON.stringify({comparison:'production same-code V21.37 motion disabled vs V21.38 additive motion',meaningfulPoseChanges:moved,measures},null,2));
  await comparison.close();
  for(const baseline of [true,false]){
   const name=baseline?'footera-v21.37-reference':'footera-v21.38-pilot';
   ctx=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:1,isMobile:true,hasTouch:true,serviceWorkers:'block',recordVideo:{dir:out,size:{width:390,height:844}}});
   await ctx.addInitScript(flag=>{window.__FOOTERA_V2137_BASELINE=flag;Object.defineProperty(navigator,'deviceMemory',{get:()=>8});Object.defineProperty(navigator,'hardwareConcurrency',{get:()=>8})},baseline);
   const page=await ctx.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.route('**/*',r=>r.request().url().startsWith(url)?r.continue():r.abort());
   await page.goto(url);await fixture(page);
   await page.evaluate(()=>{
    match.minute=38;updateMatchUI();
    const oldSequence=match3DSequence,oldChoose=FooteraHighlights.choosePresentation;
    match3DSequence=()=> 'cut_inside_right';
    FooteraHighlights.choosePresentation=(event,history)=>({...oldChoose(event,history),sequence:'cut_inside_right',finish:'finesse'});
    window.__restoreSequence=()=>{match3DSequence=oldSequence;FooteraHighlights.choosePresentation=oldChoose};
    match.kickoffKits={home:{pattern:'diagonal',shirtPrimary:'#072e29',shirtSecondary:'#e7c776',shorts:'#112627',socks:'#e7c776'},away:{pattern:'halves',shirtPrimary:'#f2f5f6',shirtSecondary:'#a52349',shorts:'#f2f5f6',socks:'#a52349'}};
   });
   await force(page,'goal');await page.evaluate(()=>{window.__restoreSequence();delete window.__restoreSequence});
   await page.waitForSelector('.fh3d canvas',{timeout:12000});
   await page.waitForSelector('.fh3d',{state:'detached',timeout:22000});
   const state=await page.evaluate(()=>({goals:match.goalEvents.length,score:[match.home,match.away],pending:!!match.highlight3DPending,disabled:!!match3DQueue.disabled}));
   assert.deepEqual(state,{goals:1,score:[1,0],pending:false,disabled:false});assert.deepEqual(errors,[]);
   const file=page.video();await ctx.close();ctx=null;
   const webm=path.join(out,name+'.webm');await file.saveAs(webm);await file.delete();
   assert.ok(fs.statSync(webm).size>12000,name+' real frames');
   const mp4=path.join(out,name+'.mp4');
   const ff=spawnSync('ffmpeg',['-hide_banner','-loglevel','error','-y','-i',webm,'-c:v','libx264','-preset','veryfast','-crf','23','-pix_fmt','yuv420p','-movflags','+faststart',mp4],{encoding:'utf8'});
   assert.equal(ff.status,0,'MP4 encoding: '+(ff.stderr||'').slice(-400));
   console.log('PASS',name,fs.statSync(mp4).size,'bytes; actual match state',JSON.stringify(state));
  }
  console.log('PASS V21.37 / V21.38 identical Footera scene and ball paths, '+moved+' visibly differing skeletal poses, both 390px videos');
 }finally{if(ctx)await ctx.close().catch(()=>{});await browser.close();server.close()}
})().catch(e=>{console.error(e);server.close();process.exitCode=1});
