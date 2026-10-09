/* Original Flashback skin in the actual SBC, club and biography renderers. */
const {chromium}=require('playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const root=path.resolve(__dirname,'..'),out=path.join(root,'test-artifacts');fs.mkdirSync(out,{recursive:true});
const mime={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml'};
const server=http.createServer((req,res)=>{
 let file=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname);if(file===root)file=path.join(root,'index.html');
 if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return}
 try{let body=fs.readFileSync(file);if(file.endsWith('index.html')){let s=body.toString(),last=s.lastIndexOf('<script>');body=Buffer.from(s.slice(0,last)+s.slice(s.indexOf('</script>',last)+9))}res.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');res.end(body)}catch{res.writeHead(404).end()}
});
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const url='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({headless:true,...(process.env.FOOTERA_CHROMIUM?{executablePath:process.env.FOOTERA_CHROMIUM}:{})});
 try{
  const page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true,serviceWorkers:'block',timezoneId:'Europe/Berlin'}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/*',r=>r.request().url().startsWith(url)?r.continue():r.abort());
  await page.clock.setFixedTime(new Date('2026-10-09T19:01:00+02:00'));
  await page.goto(url,{waitUntil:'load'});
  const release=await page.evaluate(()=>{
   for(const id of ['bootIntro','dbGate','onboarding','usernameRequiredModal'])document.getElementById(id)?.remove();
   const rowsAt=at=>activeEventPlayerSBCs(new Date(at)).filter(s=>s.eventId===FLASHBACK_REUS_EVENT.id);
   const counts=['2026-10-09T18:59:59+02:00','2026-10-09T19:00:00+02:00','2026-10-29T18:59:59+01:00','2026-10-29T19:00:00+01:00'].map(at=>rowsAt(at).length);
   state.sbcCompletions={};state.sbcGroupClaims={};
   const rows=rowsAt('2026-10-09T19:01:00+02:00');
   const premature=maybeGrantSbcGroupReward(rows[0]);
   rows.forEach(s=>state.sbcCompletions[s.id]=true);
   maybeGrantSbcGroupReward(rows[0]);const item=queuedSbcGroupRewardPack.items[0];
   const duplicate=maybeGrantSbcGroupReward(rows[0]);
   state.sbcCompletions={};state.sbcGroupClaims={};queuedSbcGroupRewardPack=null;
   state.club=[item];state.squad=Array(23).fill(null);state.activeEvos=[];
   activeSbcGroup='Profis';switchView('sbcView');renderSBC();
   return{counts,premature,duplicate,item,stats:cardStatPairs(displayBase(item)).map(x=>x[1])};
  });
  assert.deepEqual(release.counts,[0,3,3,0]);assert.equal(release.premature,'');assert.equal(release.duplicate,'');
  assert.equal(release.item.eventType,'flashback-sbc');assert.equal(release.item.tradeable,false);assert.deepEqual(release.stats,[87,86,88,90,52,72]);
  for(const width of [360,390,412]){
   await page.setViewportSize({width,height:844});
   for(const view of ['sbc','club','profile']){
    await page.evaluate(view=>{
     document.getElementById('bioModal').classList.remove('show');document.getElementById('bioModal').style.display='none';
     if(view==='sbc'){switchView('sbcView');activeSbcGroup='Profis';renderSBC()}
     if(view==='club'){switchView('clubView');renderClub();document.querySelector('[data-club-area="pros"]')?.click()}
     if(view==='profile'){document.getElementById('bioModal').style.removeProperty('display');openBiography(state.club[0],null)}
    },view);
    const selector=view==='sbc'?'.flashback-sbc .flashback-shell':view==='club'?'#clubGrid .flashback-shell':'#bioModal .flashback-shell';
    await page.locator(selector).waitFor({state:'visible'});
    await page.waitForFunction(selector=>{const img=document.querySelector(selector+' .face img');return img?.complete&&img.naturalWidth>0},selector);
    const metrics=await page.locator(selector).evaluate(shell=>{
     const c=shell.querySelector('.custom-card'),stat=c.querySelector('.stats'),alt=c.querySelector('.card-alt-positions'),name=c.querySelector('.pname'),face=c.querySelector('.face');
     const s=getComputedStyle(c),bounds=el=>{const r=el.getBoundingClientRect();return{left:r.left,right:r.right,top:r.top,bottom:r.bottom}};
     return{bg:s.backgroundImage,clip:s.clipPath,color:s.backgroundColor,size:s.backgroundSize,outline:getComputedStyle(c,':before').content,stat:bounds(stat),alt:bounds(alt),name:bounds(name),face:bounds(face),traits:bounds(shell.querySelector(".playstyle-card-row")),card:bounds(c),width:document.documentElement.scrollWidth,viewport:innerWidth,faceUrl:face.querySelector('img').getAttribute('src')};
    });
    assert.match(metrics.bg,/card-flashback-approved\.png/);assert.equal(metrics.clip,'none');assert.equal(metrics.size,'contain');assert.equal(metrics.color,'rgba(0, 0, 0, 0)');assert.equal(metrics.outline,'none');
    assert.ok(metrics.stat.bottom<=metrics.alt.top,`${view} ${width}: stats / secondary positions do not overlap`);
    assert.ok(metrics.stat.bottom<=metrics.traits.top&&metrics.traits.bottom<=metrics.alt.top,`${view} ${width}: traits fit between stats and secondary positions`);
    assert.ok(metrics.alt.bottom<=metrics.card.bottom-(metrics.card.bottom-metrics.card.top)*.08,`${view} ${width}: secondary positions remain inside frame`);
    assert.ok(metrics.face.bottom<=metrics.name.top,`${view} ${width}: portrait ends above name`);
    assert.ok(metrics.width<=metrics.viewport+1,`${view} ${width}: no page overflow`);
    assert.match(metrics.faceUrl,/events\/flashback\/reus-dortmund\.png/);
    if(width===390){await page.screenshot({path:path.join(out,'reus-'+view+'-390.png')});await page.locator(selector).screenshot({path:path.join(out,'reus-'+view+'-card.png')})}
   }
  }
  assert.deepEqual(errors,[]);console.log('PASS Reus: 4 release boundaries, single untradeable reward, actual SBC/club/profile at 360/390/412, original artwork, local portrait, no overlapping fields or runtime errors');
 }finally{await browser.close();server.close()}
})().catch(e=>{console.error(e);server.close();process.exitCode=1});
