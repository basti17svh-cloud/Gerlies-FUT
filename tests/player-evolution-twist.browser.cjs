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
  for(const mode of ['walk','kick']){
   for(const version of ['before','master'])
    await capture(mode+'-'+version,{version,mode,time:1.07});
  }
  // 5 seconds of genuine pose animation: axial, walking and a kick.
  for(let i=0;i<60;i++){
   const mode=i<15?'axial':i<40?'walk':'kick';
   const args={version:'master',mode,time:i/10,angle:.24,deg:(i%15)*6,
    bone:'lowerarm_l'};
   await page.evaluate(v=>window.footeraQaRender(v),args);
   await page.locator('canvas').screenshot({path:path.join(frames,
    'frame-'+String(i).padStart(3,'0')+'.png')});
  }
  cp.execFileSync(process.env.FOOTERA_FFMPEG||'ffmpeg',['-hide_banner','-loglevel','error','-y',
   '-framerate','12','-i',path.join(frames,'frame-%03d.png'),
   '-vf','scale=720:-2','-c:v','libx264','-crf','24','-pix_fmt','yuv420p',
   path.join(out,'footera-60-bone-engine-proof.mp4')]);
  assert.ok(fs.statSync(path.join(out,'footera-60-bone-engine-proof.mp4')).size>30000);
  assert.deepEqual(errors,[]);
  report.video={frames:60,fps:12,modes:['axial','walk','kick'],file:'footera-60-bone-engine-proof.mp4'};
  fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2));
  console.log('PASS: physical GLB WebGL before/after screenshots and MP4',JSON.stringify(report));
 }finally{await browser.close();server.close()}
})().catch(e=>{console.error(e);server.close();process.exitCode=1});
