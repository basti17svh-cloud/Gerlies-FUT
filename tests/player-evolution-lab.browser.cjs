/* Player Evolution Step 2: real Chromium WebGL captures, not mockup images. */
'use strict';
const {chromium}=require('playwright');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),
 assert=require('node:assert/strict'),cp=require('node:child_process');
const root=path.resolve(__dirname,'..'),out=path.join(root,'test-artifacts','player-evolution');
const frames=path.join(out,'video-frames');fs.mkdirSync(frames,{recursive:true});
const server=http.createServer((req,res)=>{
 const url=new URL(req.url,'http://localhost');
 const file=path.resolve(root,'.'+decodeURIComponent(url.pathname));
 if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404).end();return}
 res.setHeader('Content-Type',/\.(mjs|js)$/.test(file)?'text/javascript':file.endsWith('.html')?'text/html':file.endsWith('.glb')?'model/gltf-binary':'application/octet-stream');
 fs.createReadStream(file).pipe(res);
});
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const browser=await chromium.launch({headless:true,args:['--enable-unsafe-swiftshader','--use-angle=swiftshader','--disable-dev-shm-usage']});
 try{
  const page=await browser.newPage({viewport:{width:920,height:820},deviceScaleFactor:1});
  const errors=[];page.on('pageerror',err=>errors.push(err.message));
  await page.goto('http://127.0.0.1:'+server.address().port+'/player-evolution-lab.html',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>document.documentElement.dataset.ready==='true'||document.documentElement.dataset.ready==='error',
   null,{timeout:180000});
  const status=await page.locator('#status').textContent();
  assert.equal(await page.locator('html').getAttribute('data-ready'),'true',status);
  const shot=async(name,arg)=>{
   const q=await page.evaluate(p=>window.footeraQaRender(p),arg);
   assert.ok(q.ok&&q.boneCount>=52&&q.skinnedMeshes>=5,JSON.stringify(q));
   await page.locator('canvas').screenshot({path:path.join(out,name+'.png')});
   return q;
  };
  const comparison=[];
  for(const [kind,angle,zoom] of [
   ['front',0,'full'],['threequarter',.7,'full'],['back',Math.PI,'full'],['face',0,'face']
  ]){
   for(const version of ['before','master']){
    const info=await shot(kind+'-'+version,{version,angle,zoom,time:0});
    comparison.push({kind,version,...info});
   }
  }
  assert.notDeepEqual(fs.readFileSync(path.join(out,'front-before.png')),
   fs.readFileSync(path.join(out,'front-master.png')),'rendered old/new images must differ');
  // Deterministic 360-degree render and arm/knee bending, real frames.
  for(let i=0;i<48;i++){
   await page.evaluate(x=>window.footeraQaRender(
    {version:'master',angle:x*Math.PI*2/48,pose:x>27,time:x/12,zoom:'full'}),i);
   await page.locator('canvas').screenshot({path:path.join(frames,'frame-'+String(i).padStart(3,'0')+'.png')});
  }
  cp.execFileSync('ffmpeg',['-hide_banner','-loglevel','error','-y','-framerate','12',
   '-i',path.join(frames,'frame-%03d.png'),'-vf','scale=720:-2',
   '-c:v','libx264','-crf','25','-pix_fmt','yuv420p',path.join(out,'footera-evolution-turntable.mp4')]);
  assert.ok(fs.statSync(path.join(out,'footera-evolution-turntable.mp4')).size>10000);
  fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(
   {source:'Real glTF / Three.js WebGL in Chromium',pictures:comparison,
    clip:'4 seconds; 12 fps; authentic master turntable and skeleton pose check',
    errors},null,2));
  assert.deepEqual(errors,[]);
  console.log('PASS player evolution 3D gallery + MP4',JSON.stringify({frames:48,comparison:comparison.length,status}));
 }finally{await browser.close();server.close()}
})().catch(err=>{console.error(err);server.close();process.exitCode=1});
