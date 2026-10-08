/* V21.30: real mobile browser checks for editable club crest proportions. */
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
 await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));
 const base="http://127.0.0.1:"+server.address().port;
 const browser=await chromium.launch({headless:true});
 try{
  const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:2,timezoneId:"Europe/Berlin",serviceWorkers:"block"});
  const page=await context.newPage(),errors=[];
  page.on("pageerror",error=>errors.push(error.message));
  await page.route("**/*",route=>route.request().url().startsWith(base)?route.continue():route.abort());
  await page.goto(base,{waitUntil:"load"});
  await page.evaluate(()=>{
   for(const id of ["bootIntro","dbGate","onboarding","usernameRequiredModal"])document.getElementById(id)?.remove();
   state.profile.clubName="FC Gerlies";state.profile.clubShortName="FCG";
   state.profile.clubIdentity=cleanClubIdentity({crest:{shape:"shield",symbol:"shieldmark",primary:"#173f32",secondary:"#0b241b",accent:"#ffffff",borderColor:"#bf263a",borderWidth:"strong",initials:"FCG05"}});
   switchView("clubView");
  });
  await page.locator(".club-hub-identity").click();

  assert.equal(await page.locator('#identityCrestSymbols svg').count(),36);
  assert.equal(await page.locator('#identityHeroCrest [data-crest-star]').count(),0);
  assert.equal(await page.locator('.identity-hero-kits .kit-crest-stamp').count(),2);
  for(const width of [360,390,412]){
   await page.setViewportSize({width,height:844});
   await page.locator('[data-identity-tab="crest"]').click();
   for(const preset of ['heritage','athletic','union','racing','city','dynamo']){
    await page.locator('[data-crest-preset="'+preset+'"]').click();
    const bounds=await page.evaluate(()=>{
     const badge=document.querySelector('#identityHeroCrest .club-crest').getBoundingClientRect(),copy=document.querySelector('.identity-hero-copy').getBoundingClientRect();
     const text=document.querySelector('#identityCrestPreview [data-crest-part="text"]').getBBox();
     return{doc:document.documentElement.scrollWidth,screen:innerWidth,width:badge.width,overlap:badge.right>copy.left+2,text:{x:text.x,y:text.y,width:text.width}};
    });
    assert.ok(bounds.doc<=width+2,JSON.stringify(bounds));assert.ok(bounds.width>=110);assert.ok(!bounds.overlap);
    assert.ok(bounds.text.x>=40&&bounds.text.x+bounds.text.width<=160,JSON.stringify(bounds));
   }
   await page.locator('[data-crest-preset="heritage"]').click();
   await page.locator('.identity-tabs').scrollIntoViewIfNeeded();
   await page.screenshot({path:path.join(output,'footera-crest-v2130-'+width+'.png')});
   await page.locator('[data-identity-tab="kits"]').click();
   assert.equal(await page.locator('#identityHomePattern option').count(),20);
   for(const side of ['Home','Away']){
    const preview=page.locator('#identity'+side+'KitPreview .kit-shirt');
    const size=await preview.boundingBox();assert.ok(size.width>=180&&size.height>=195,JSON.stringify(size));
    assert.equal(await preview.locator('.kit-crest-stamp').count(),1);
    assert.ok(!(await preview.getAttribute('class')).includes('kit-mini'));
   }
   await page.locator('#identityHomePattern').selectOption('pinstripes');
   await page.locator('#identityAwayPattern').selectOption('checkers');
   await page.locator('.kit-grid').scrollIntoViewIfNeeded();
   await page.screenshot({path:path.join(output,'footera-kits-v2130-'+width+'.png')});
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2));
   console.log('PASS crest and full-size kits at '+width+'px');
  }
  await page.locator('[data-identity-tab="crest"]').click();
  await page.locator('[data-crest-symbol="eagle"]').click();
  const fields={SymbolColor:'#e74759',TextColor:'#a2ddff',BorderColor:'#fdc85b',Primary:'#183743',Secondary:'#233345',Accent:'#91aa77'};
  for(const [name,value] of Object.entries(fields)){
   await page.locator('#identityCrest'+name).evaluate((el,v)=>{el.value=v;el.dispatchEvent(new Event('input',{bubbles:true}))},value);
  }
  await page.locator('#identityCrestStars').selectOption('2');
  await page.locator('#identityCrestField').selectOption('quarters');
  assert.equal(await page.locator('#identityHeroCrest [data-crest-star]').count(),2);
  assert.equal(await page.locator('#identityHeroCrest [data-crest-part="symbol"]').getAttribute('color'),'#e74759');
  assert.equal(await page.locator('#identityHeroCrest [data-crest-part="text"]').getAttribute('fill'),'#a2ddff');
  await page.locator('#saveClubIdentity').click();
  const saved=await page.evaluate(()=>JSON.stringify(state.profile.clubIdentity));
  await page.reload({waitUntil:'load'});
  await page.evaluate(()=>{for(const id of ['bootIntro','dbGate','onboarding','usernameRequiredModal'])document.getElementById(id)?.remove();switchView('clubView')});
  await page.locator('.club-hub-identity').click();
  assert.equal(await page.evaluate(()=>JSON.stringify(state.profile.clubIdentity)),saved,'actual save survives reload');
  assert.equal(await page.locator('#identityHeroCrest [data-crest-part="symbol"]').getAttribute('color'),'#e74759');
  await page.locator('[data-identity-tab="colors"]').click();
  await page.locator('#identityColorPrimary').evaluate(el=>{el.value='#112244';el.dispatchEvent(new Event('input',{bubbles:true}))});
  assert.equal(await page.evaluate(()=>clubIdentityDraft.identity.crest.primary),'#183743','club colour changes cannot overwrite custom badge colours');
  assert.deepEqual(errors,[],'no uncaught JavaScript errors');
  console.log('PASS independent colours, stars, actual save/reload and legacy migration');
 }finally{await browser.close();server.close()}
})().catch(error=>{console.error(error);server.close();process.exitCode=1});
