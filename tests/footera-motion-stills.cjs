/* Footera pilot diagnostic: capture real production WebGL stills for visual acceptance.
 * Baseline and new CC0 motion share exact sequence, camera, teams, score and frame times.
 * This file does not run inside the deployed game.
 */
const {chromium}=require('playwright');
const {server}=require('./3d-highlights.browser.cjs');
const fs=require('node:fs'),path=require('node:path');
(async()=>{
 await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
 const url='http://127.0.0.1:'+server.address().port;
 let browser;
 try{
  browser=await chromium.launch({headless:true,args:['--enable-unsafe-swiftshader','--use-angle=swiftshader']});
  const page=await browser.newPage({viewport:{width:390,height:844},serviceWorkers:'block'});
  await page.goto(url);
  const images=await page.evaluate(async()=>{
   const T=await import('./vendor/three/three.module.min.js');
   const M=await import('./3d-highlights-scene.mjs?v=2138');
   const canvas=document.createElement('canvas');
   const renderer=new T.WebGLRenderer({canvas,antialias:false,preserveDrawingBuffer:true});
   const event=FooteraHighlights.snapshot({id:'qa-still',type:'goal',minute:38,team:'home',period:1,
     playerName:'Jamal Musiala',keeperName:'Mike Maignan',sequence:'cut_inside_right',finish:'finesse',keeperAction:'classic'});
   const result={};
   for(const baseline of [true,false]){
    const w=M.makeScene(renderer,event,false,false,true,baseline);
    w.resize(390,300);
    for(const t of [2.35,4.95,5.25,5.63,6.4,7.1]){
     w.update(t);
     const label=(baseline?'before':'after')+'-'+String(t).replace('.','_');
     result[label]=canvas.toDataURL('image/jpeg',.70).split(',')[1];
    }
    w.dispose();
   }
   renderer.dispose();renderer.forceContextLoss();
   return result;
  });
  const out=path.resolve(__dirname,'../qa/footera-motion-stills.json');
  fs.mkdirSync(path.dirname(out),{recursive:true});
  fs.writeFileSync(out,JSON.stringify(images));
  console.log('PASS 12 production WebGL frames:',Object.keys(images).join(', '),fs.statSync(out).size,'bytes');
 }finally{if(browser)await browser.close();server.close()}
})().catch(e=>{console.error(e);server.close();process.exitCode=1});
