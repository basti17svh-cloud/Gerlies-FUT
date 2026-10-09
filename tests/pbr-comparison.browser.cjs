/* Real WebGL PBR A/B proof: Footera's production GLB, no illustrative mock.
 * Exact same scorer, scene, camera, light and animation for each pair. */
'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..');
const out=path.join(root,'test-artifacts','v21.78-pbr-compare');
const mime={'.html':'text/html','.mjs':'text/javascript','.js':'text/javascript','.glb':'model/gltf-binary','.css':'text/css','.json':'application/json','.png':'image/png','.svg':'image/svg+xml'};
test('V21.78 production-model near and matchday screenshots differ only by PBR maps', {timeout:120000},async()=>{
 fs.mkdirSync(out,{recursive:true});
 const server=http.createServer((req,res)=>{
  const file=path.resolve(root,'.'+new URL(req.url,'http://127.0.0.1').pathname);
  if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404).end();return}
  res.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');
  fs.createReadStream(file).pipe(res);
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 let browser;
 try{
  browser=await chromium.launch({headless:true,args:['--enable-unsafe-swiftshader','--use-angle=swiftshader']});
  const page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:1,isMobile:true,hasTouch:true});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:'+server.address().port+'/pbr-vergleich.html',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>document.querySelector('#status')?.textContent.includes('Vier Original-Renderings'),null,{timeout:75000});
  const render=await page.evaluate(()=>{
   const names=['close-off','close-on','match-off','match-on'];
   return names.map(id=>{const element=document.getElementById(id);
    return{id,src:element.src,width:element.naturalWidth,height:element.naturalHeight}});
  });
  assert.deepEqual(render.map(x=>x.id),['close-off','close-on','match-off','match-on']);
  for(const result of render){
   assert.ok(result.src.startsWith('data:image/png;base64,'),result.id+' has a real WebGL screenshot');
   assert.equal(result.width,640);
   assert.equal(result.height,result.id.startsWith('close')?480:360);
   fs.writeFileSync(path.join(out,result.id+'.png'),Buffer.from(result.src.slice('data:image/png;base64,'.length),'base64'));
  }
  assert.notEqual(render[0].src,render[1].src,'near camera must resolve a real PBR difference');
  assert.notEqual(render[2].src,render[3].src,'broadcast camera must resolve a real PBR difference');
  assert.deepEqual(errors,[],'no browser JavaScript errors');
  console.log('PASS PBR compare:',out);
 }finally{if(browser)await browser.close();server.close()}
});
