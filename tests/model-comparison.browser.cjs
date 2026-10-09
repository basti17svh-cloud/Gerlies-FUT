/* Real A/B GLB vs original Footera renderer; no generated assets. */
'use strict';
const {chromium}=require('playwright');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),out=path.join(root,'test-artifacts','model-ab');
fs.mkdirSync(out,{recursive:true});
const server=http.createServer((req,res)=>{
 const rel=new URL(req.url,'http://localhost').pathname;
 const file=path.resolve(root,'.'+decodeURIComponent(rel));
 if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404).end();return}
 res.setHeader('Content-Type',/\.(mjs|js)$/.test(file)?'text/javascript':file.endsWith('.html')?'text/html':file.endsWith('.glb')?'model/gltf-binary':'application/octet-stream');
 fs.createReadStream(file).pipe(res);
});
(async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const browser=await chromium.launch({headless:true,args:['--enable-unsafe-swiftshader','--use-angle=swiftshader']});
 try{
  const errors=[],base='http://127.0.0.1:'+server.address().port+'/modellvergleich.html';
  const page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:1,isMobile:true,hasTouch:true});
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base,{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>document.querySelector('#status').textContent.includes('12 echte WebGL-Renderings fertig'),null,{timeout:120000});
  const collected=await page.evaluate(()=>{
   const images=[...document.querySelectorAll('#views img')];
   return{status:document.querySelector('#status').textContent,images:images.map(e=>({id:e.id,length:e.src.length,png:e.src.startsWith('data:image/png;base64,'),complete:e.complete,width:e.naturalWidth,height:e.naturalHeight})),
    distinct:images.filter((e,i)=>i%2===0).every(e=>e.src!==document.getElementById(e.id.replace('old','new')).src)};
  });
  assert.equal(collected.images.length,12);
  assert.ok(collected.images.every(x=>x.png&&x.complete&&x.width===640&&x.length>25000));
  assert.ok(collected.distinct,'legacy and GLB must really differ');
  assert.deepEqual(errors,[]);
  await page.screenshot({path:path.join(out,'model-ab-390.png'),fullPage:true});
  const mobile=[];
  for(const width of [360,390,412]){
   await page.setViewportSize({width,height:844});
   const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
   assert.ok(overflow<=1,width+'px page horizontal overflow '+overflow);
   mobile.push({width,overflow});
  }
  await page.getByRole('button',{name:'Cut links'}).click();
  await page.waitForFunction(()=>document.querySelector('#status').textContent.includes('12 echte WebGL-Renderings fertig'),null,{timeout:120000});
  assert.equal(await page.getByRole('button',{name:'Cut links'}).getAttribute('aria-pressed'),'true');
  await page.locator('#moment').evaluate(el=>{el.value='4.25';el.dispatchEvent(new Event('input',{bubbles:true}))});
  assert.ok((await page.locator('#cut-new').getAttribute('src')).startsWith('data:image/png;base64,'));
  console.log('PASS real model comparison',JSON.stringify({status:collected.status,mobile,images:collected.images.length}));
 }finally{await browser.close();server.close()}
})().catch(e=>{console.error(e);server.close();process.exitCode=1});