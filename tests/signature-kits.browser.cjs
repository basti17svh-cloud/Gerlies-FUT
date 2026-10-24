/* Signature jersey editor, persistence and real Canvas atlas checks. */
const {chromium}=require("playwright"),fs=require("node:fs"),path=require("node:path"),http=require("node:http"),assert=require("node:assert/strict");
const root=path.join(__dirname,".."),output=path.join(root,"test-artifacts");fs.mkdirSync(output,{recursive:true});
const mime={".js":"text/javascript",".mjs":"text/javascript",".html":"text/html",".css":"text/css",".json":"application/json",".webp":"image/webp",".png":"image/png",".svg":"image/svg+xml",".webmanifest":"application/manifest+json"};
const server=http.createServer((req,res)=>{
 let file=path.resolve(root,"."+new URL(req.url,"http://localhost").pathname);if(file===root)file=path.join(root,"index.html");
 if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return}
 try{
  let body=fs.readFileSync(file);
  if(file.endsWith("index.html")){const html=body.toString(),last=html.lastIndexOf("<script>");body=Buffer.from(html.slice(0,last)+html.slice(html.indexOf("</script>",last)+9))}
  res.setHeader("Content-Type",mime[path.extname(file)]||"application/octet-stream");res.end(body)
 }catch(_){res.writeHead(404).end()}
});
(async()=>{
 await new Promise(r=>server.listen(0,"127.0.0.1",r));
 const base="http://127.0.0.1:"+server.address().port;
 const browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH,args:["--no-sandbox","--disable-dev-shm-usage"]}: {})});
 try{
  const page=await browser.newPage({viewport:{width:1366,height:1000},serviceWorkers:'block'}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/*',r=>r.request().url().startsWith(base)?r.continue():r.abort());
  await page.goto(base,{waitUntil:'load'});
  const enter=async()=>{
   await page.evaluate(()=>{
    for(const id of ['bootIntro','dbGate','onboard','usernameRequiredModal'])document.getElementById(id)?.remove();
    const guard=document.createElement('style');guard.textContent='#footeraAccountDialog,#footeraAnalyticsConsent{display:none!important}';document.head.append(guard);switchView('clubView');
   });
   await page.locator('.club-hub-identity').click();await page.locator('[data-identity-tab="kits"]').click();
  };
  await enter();
  for(const side of ['Home','Away']){
   await page.locator('#identity'+side+'Primary').evaluate((e,v)=>{e.value=v;e.dispatchEvent(new Event('input',{bubbles:true}))},side==='Home'?'#122333':'#f2f2ec');
   await page.locator('#identity'+side+'Secondary').evaluate((e,v)=>{e.value=v;e.dispatchEvent(new Event('input',{bubbles:true}))},side==='Home'?'#edc565':'#147b71');
   await page.locator('.kit-signature-picker[data-kit-side="'+side+'"] summary').click();
   assert.equal(await page.locator('#identity'+side+'Pattern option').count(),27);
   assert.equal(await page.locator('.kit-signature-picker[data-kit-side="'+side+'"] [data-kit-design]').count(),7);
  }
  const colors=await page.evaluate(()=>[identityHomePrimary.value,identityHomeSecondary.value,identityAwayPrimary.value,identityAwaySecondary.value]);
  const ids=await page.evaluate(()=>FooteraKitArt.ids);
  for(const id of ids){
   await page.locator('.kit-signature-picker[data-kit-side="Home"] [data-kit-design="'+id+'"]').click();
   assert.equal(await page.locator('#identityHomePattern').inputValue(),id);
   assert.equal(await page.locator('#identityHomeKitPreview .kit-pattern-art').count(),1);
   assert.equal(await page.locator('#identityHomeKitPreview .kit-crest-stamp').count(),1);
   assert.deepEqual(await page.evaluate(()=>[identityHomePrimary.value,identityHomeSecondary.value,identityAwayPrimary.value,identityAwaySecondary.value]),colors);
  }
  for(const width of [360,390,1366]){
   await page.setViewportSize({width,height:1000});
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'responsive at '+width);
   await page.locator('.kit-signature-picker[data-kit-side="Home"]').screenshot({path:path.join(output,'signature-kits-'+width+'.png')});
  }
  // Render production recipes into the actual Three.js kit atlas, not a mock.
  const atlas=await page.evaluate(async()=>{
   const T=await import('./vendor/three/three.module.min.js'),K=await import('./3d-rigged-footballer.mjs'),M=await import('./3d-highlights-scene.mjs');
   const hashes=[],colors=['#122333','#edc565'];
   for(const id of FooteraKitArt.ids){
    const kit={pattern:id,shirt:colors[0],shirtSecondary:colors[1],shorts:'#111111',socks:'#111111'};
    const pair=M.kitColors({homeColor:kit.shirt,homeSecondary:kit.shirtSecondary,homePattern:id,homeKitConfigured:true,awayColor:'#ffffff',awayPattern:'solid'});
    if(pair.home.pattern!==id)throw Error('Scene rejected '+id);
    const canvas=document.createElement('canvas');canvas.width=256;canvas.height=256;
    K.paintFooteraKitTile(canvas.getContext('2d'),kit,256,256,'shirt');
    const bytes=canvas.getContext('2d').getImageData(0,0,256,256).data;
    let hash=0,secondary=0;for(let i=0;i<bytes.length;i+=4){hash=(Math.imul(hash,31)+bytes[i]+bytes[i+1]*7+bytes[i+2]*13)|0;if(bytes[i]>100)secondary++}
    if(secondary<100)throw Error('Blank signature shirt '+id);hashes.push(hash);
    const materials=K.MATERIAL_SLOTS.map(()=>new T.MeshStandardMaterial({color:'#ffffff'}));
    const atlas=K.createFootballKitAtlas(T,materials,16,9,kit),texture=atlas.texture;
    if(!texture.image.width||!texture.image.height)throw Error('Missing production texture '+id);
    texture.dispose();atlas.material.dispose();materials.forEach(m=>m.dispose());
   }
   return{count:K.FOOTERA_KIT_PATTERNS.length,unique:new Set(hashes).size};
  });
  assert.deepEqual(atlas,{count:27,unique:7});
  await page.locator('.kit-signature-picker[data-kit-side="Home"] [data-kit-design="volt"]').click();
  await page.locator('.kit-signature-picker[data-kit-side="Away"] [data-kit-design="orbit"]').click();
  await page.locator('#saveClubIdentity').click();
  assert.deepEqual(await page.evaluate(()=>[state.profile.clubIdentity.kits.home.pattern,state.profile.clubIdentity.kits.away.pattern]),['volt','orbit']);
  await page.reload({waitUntil:'load'});await enter();
  assert.equal(await page.locator('#identityHomePattern').inputValue(),'volt');assert.equal(await page.locator('#identityAwayPattern').inputValue(),'orbit');
  assert.deepEqual(await page.evaluate(()=>[identityHomePrimary.value,identityHomeSecondary.value,identityAwayPrimary.value,identityAwaySecondary.value]),colors);
  assert.deepEqual(errors,[]);
  console.log('PASS seven distinct signature designs, both kits, saved colors, mobile gallery, save/reload and all production 3D atlases');
 }finally{await browser.close();server.close()}
})().catch(e=>{console.error(e);server.close();process.exitCode=1});
