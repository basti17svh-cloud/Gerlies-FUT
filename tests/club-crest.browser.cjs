/* V21.29: real mobile browser checks for editable club crest proportions. */
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
  assert.equal(await page.locator("#identityHeroCrest .club-crest-art").count(),1,"new SVG crest is present");
  assert.equal(await page.locator("#identityCrestSymbols button").count(),36);
  assert.equal(await page.locator("#identityCrestSymbols svg").count(),35,"all non-eagle options are vectors");
  assert.equal(await page.locator(".identity-hero-kits .kit-crest-stamp").count(),2,"both jersey previews have the selected crest");
  for(const width of [360,390,412]){
   await page.setViewportSize({width,height:844});
   const bounds=await page.evaluate(()=>{
    const root=document.querySelector("#identityHeroCrest .club-crest"),svg=root?.querySelector("svg"),text=svg?.querySelector("text:last-of-type");
    const badge=root?.getBoundingClientRect(),copy=document.querySelector(".identity-hero-copy")?.getBoundingClientRect();
    const letters=text?.getBBox();
    return{screen:innerWidth,doc:document.documentElement.scrollWidth,badge:badge?{left:badge.left,right:badge.right,width:badge.width}:null,copy:copy?{left:copy.left,right:copy.right,width:copy.width}:null,letters:letters?{x:letters.x,y:letters.y,width:letters.width,height:letters.height}:null}
   });
   assert.ok(bounds.doc<=bounds.screen+2,width+"px: no horizontal overflow "+JSON.stringify(bounds));
   console.log("MEASURED "+width+"px",JSON.stringify(bounds));
   assert.ok(bounds.badge?.width>=110,width+"px: crest large enough "+JSON.stringify(bounds));
   assert.ok(bounds.badge.right<=bounds.copy.left+2,width+"px: crest/copy do not overlap");
   assert.ok(bounds.letters?.x>=39&&bounds.letters.x+bounds.letters.width<=161,width+"px: FCG05 fits banner "+JSON.stringify(bounds.letters));
   assert.ok(bounds.letters?.y>=180&&bounds.letters.y+bounds.letters.height<=215,width+"px: FCG05 vertically aligned");
   await page.screenshot({path:path.join(output,"footera-crest-v2129-"+width+".png"),fullPage:false});
   console.log("PASS mobile crest",width,JSON.stringify(bounds))
  }
  await page.locator('[data-identity-tab="crest"]').click();
  await page.locator('[data-crest-symbol="wolf"]').click();
  assert.equal(await page.evaluate(()=>clubIdentityDraft.identity.crest.symbol),"wolf");
  assert.ok(await page.locator("#identityHeroCrest .club-crest-art svg g path").count()>0,"wolf vector preview");
  await page.locator('[data-crest-symbol="eagle"]').click();
  assert.equal(await page.evaluate(()=>clubIdentityDraft.identity.crest.symbol),"eagle");
  assert.ok((await page.locator("#identityHeroCrest .club-crest-art").textContent()).includes("🦅"),"eagle remains original emoji");
  assert.deepEqual(errors,[],"no new uncaught JavaScript errors");
  console.log("PASS crest options and live previews")
 }finally{await browser.close();server.close()}
})().catch(error=>{console.error(error);server.close();process.exitCode=1});
