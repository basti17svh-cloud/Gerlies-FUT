/* Capture the actual production model and motion, including a diagnostic lens
 * on the same scene. The close view is QA only; the match camera is untouched. */
'use strict';
const {chromium}=require('playwright');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const root=process.env.FOOTERA_QA_ROOT||path.resolve(__dirname,'..');
const label=process.env.FOOTERA_QA_LABEL||'v21.75';
const out=path.resolve(__dirname,'../test-artifacts',label);fs.mkdirSync(out,{recursive:true});
const server=http.createServer((req,res)=>{
 if(req.url==='/qa-empty.html'){res.setHeader('Content-Type','text/html');res.end('<!doctype html><html><body></body></html>');return}
 const file=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname);
 if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404).end();return}
 res.setHeader('Content-Type',/\.(mjs|js)$/.test(file)?'text/javascript':file.endsWith('.html')?'text/html':'application/octet-stream');
 fs.createReadStream(file).pipe(res);
});
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const browser=await chromium.launch({headless:true,args:['--enable-unsafe-swiftshader','--use-angle=swiftshader']});
 try{
  const page=await browser.newPage({viewport:{width:780,height:600},deviceScaleFactor:1});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:'+server.address().port+'/qa-empty.html');
  await page.evaluate(async()=>{
   const T=await import('./vendor/three/three.module.min.js'),M=await import('./3d-highlights-scene.mjs');
   await M.prepareFooteraPlayerModel();
   const canvas=document.createElement('canvas');document.body.replaceChildren(canvas);
   document.body.style.cssText='margin:0;background:#102219';
   const renderer=new T.WebGLRenderer({canvas,antialias:true,preserveDrawingBuffer:true});renderer.setPixelRatio(1);
   const render=renderer.render.bind(renderer);let scene,camera;
   renderer.render=(s,c)=>{scene=s;camera=c;render(s,c)};
   const event={id:'quality-central',type:'shot_missed',team:'home',period:1,minute:1,attackDirection:1,
    sequence:'central',finish:'normal',playerName:'Alexander Isak',keeperName:'Keeper',defenderIndex:10,
    playerStyles:[],creatorStyles:[],defenderStyles:[],keeperStyles:[],homeColor:'#154a50',homeSecondary:'#e3ba60',homePattern:'diagonal',
    homeShorts:'#162b33',homeSocks:'#154a50',awayColor:'#f1f1ed',awaySecondary:'#263747',awayPattern:'halves',awayShorts:'#263747',awaySocks:'#f1f1ed'};
   let world=M.makeScene(renderer,event,false,false,true,false,true);world.resize(390,300);
   window.qaSetSequence=(sequence,finish='normal')=>{world.dispose();world=M.makeScene(renderer,{...event,sequence,finish},false,false,true,false,true);world.resize(390,300)};
   window.qaFrame=(time,close=false)=>{
    world.resize(close?780:390,close?600:300);world.update(time);
    const detail=world.inspect();
    if(close){
     const imported=scene.getObjectByName('FooteraPlayerPrototypeMount'),root=imported.parent;
     const focus=root.localToWorld(new T.Vector3(0,.95,0));
     const cam=new T.PerspectiveCamera(31,780/600,.05,100);
     cam.position.copy(root.localToWorld(new T.Vector3(2.7,1.7,-3.7)));cam.lookAt(focus);
     render(scene,cam);
    }
    return{png:canvas.toDataURL('image/png').split(',')[1],motion:detail.importedMotion,
     drawCalls:detail.drawCalls,ball:detail.ball,quality:detail.quality};
   };
  });
  const evidence=[];
  for(const [sequence,finish] of [['central','normal'],['cut_inside_right','finesse'],['cut_inside_left','finesse']]){
   await page.evaluate(([s,f])=>qaSetSequence(s,f),[sequence,finish]);
   for(const time of [0,1.55,3.12,5.18,5.4,5.79]){
    const frame=await page.evaluate(t=>qaFrame(t,true),time);
    fs.writeFileSync(path.join(out,sequence+'-'+time+'.png'),Buffer.from(frame.png,'base64'));delete frame.png;
    if(frame.motion.footTargets){
     frame.motion.feet.forEach((foot,i)=>assert.ok(Math.hypot(...foot.map((v,j)=>v-frame.motion.footTargets[i][j]))<.07,
      `${sequence} ${time}: imported boot follows the original contact target`));
     if(time===0){
      assert.ok(frame.motion.feet[0][0]<frame.motion.feet[1][0],'left/right driver mapping');
      frame.motion.toes.forEach((toe,i)=>assert.ok(toe[2]<frame.motion.feet[i][2]-.05,'imported toes face the same way as the run'));
     }
    }
    evidence.push({sequence,time,...frame});
   }
  }
  await page.evaluate(()=>qaSetSequence('central'));
  if(process.env.FOOTERA_QA_VIDEO){
   const frames=path.join(out,'frames');fs.mkdirSync(frames,{recursive:true});
   for(let n=0;n<192;n++){
    const frame=await page.evaluate(t=>qaFrame(t),n/30);
    fs.writeFileSync(path.join(frames,String(n).padStart(4,'0')+'.png'),Buffer.from(frame.png,'base64'));
   }
  }
  assert.deepEqual(errors,[]);assert.ok(evidence.every(e=>e.motion&&e.drawCalls<125));
  assert.ok(evidence.some(e=>e.time<4.6&&e.motion.capturedWeight>.1),'production clip layer is active before the shot');
  assert.ok(evidence.filter(e=>e.time===5.4).every(e=>e.motion.capturedWeight===0),'shot contact stays authoritative');
  fs.writeFileSync(path.join(out,'quality.json'),JSON.stringify({evidence,errors},null,2));
  console.log('PASS production GLB, central and mirrored cuts, diagnostic captures:',out);
 }finally{await browser.close();server.close()}
})().catch(e=>{console.error(e);process.exitCode=1;server.close()});
