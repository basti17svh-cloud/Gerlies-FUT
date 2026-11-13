/* Footera daily live smoke test (proposal #12, 13.11.2026).
   Opens the real Footera page as a brand-new player on a simulated phone and walks the
   main path: start, starter pack, store pack, a quick match, SBC overview.
   It never registers, never logs in, never agrees to statistics and never creates a guest
   account, so it leaves nothing behind in Supabase. Read-only for the backend.
   Usage: node scripts/live-smoke.cjs [url]   (default: the live GitHub Pages site)
          FOOTERA_SMOKE_LOCAL=1 node scripts/live-smoke.cjs   (serves this checkout instead) */
'use strict';
const {chromium}=require('playwright'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const LIVE='https://basti17svh-cloud.github.io/Gerlies-FUT/';
const out=path.join(__dirname,'..','test-artifacts','live-smoke');fs.mkdirSync(out,{recursive:true});
const report={startedAt:new Date().toISOString(),steps:[],errors:[],failedRequests:[],version:null};
let page,shot=0;
async function snap(name){try{await page.screenshot({path:path.join(out,String(++shot).padStart(2,'0')+'-'+name+'.png')})}catch{}}
async function step(name,fn,{optional=false}={}){
 const t=Date.now();
 try{const detail=await fn();report.steps.push({name,ok:true,ms:Date.now()-t,detail:detail??null});console.log('OK  ',name,((Date.now()-t)/1000).toFixed(1)+' s',detail??'');await snap(name.replace(/[^a-z0-9]+/gi,'-'))}
 catch(e){report.steps.push({name,ok:false,optional,ms:Date.now()-t,error:String(e.message||e).slice(0,400)});console.log(optional?'WARN':'FAIL',name,String(e.message||e).split('\n')[0]);await snap('FEHLER-'+name.replace(/[^a-z0-9]+/gi,'-'));if(!optional)throw e}
}
const visible=sel=>page.locator(sel).first().isVisible().catch(()=>false);
async function clickIfVisible(sel){if(await visible(sel)){await page.locator(sel).first().click();return true}return false}
// Friendly hints a real player would wave away (install tip, tutorial bubbles).
async function waveAwayHints(){for(const sel of ['button:has-text("Nicht mehr zeigen")','[data-ft="skip"]'])await clickIfVisible(sel).catch(()=>{})}
function localServer(root){
 const mime={'.js':'text/javascript','.mjs':'text/javascript','.html':'text/html','.css':'text/css','.json':'application/json','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml','.webmanifest':'application/manifest+json','.mp4':'video/mp4','.csv':'text/csv','.glb':'model/gltf-binary','.jpg':'image/jpeg','.woff2':'font/woff2'};
 const server=http.createServer((req,res)=>{const p=decodeURIComponent(new URL(req.url,'http://x').pathname);let file=path.resolve(root,'.'+p);if(p==='/')file=path.join(root,'index.html');if(!file.startsWith(root)){res.writeHead(403).end();return}fs.readFile(file,(err,body)=>{if(err){res.writeHead(404).end();return}res.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');res.end(body)})});
 return new Promise(r=>server.listen(0,'127.0.0.1',()=>r({server,url:`http://127.0.0.1:${server.address().port}/`})));
}
(async()=>{
 let local=null,url=process.argv[2]||LIVE;
 if(process.env.FOOTERA_SMOKE_LOCAL==='1'){local=await localServer(path.join(__dirname,'..'));url=local.url}
 report.url=url;
 const browser=await chromium.launch({headless:true,args:process.env.FOOTERA_SMOKE_ARGS?process.env.FOOTERA_SMOKE_ARGS.split(' '):[]});
 let failed=false;
 try{
  const ctx=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:1,isMobile:true,hasTouch:true,locale:'de-DE',timezoneId:'Europe/Berlin',
   userAgent:'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/134.0 Mobile Safari/537.36 FooteraSmokeTest'});
  page=await ctx.newPage();page.setDefaultTimeout(30000);
  page.on('pageerror',e=>report.errors.push({type:'pageerror',text:String(e.message).slice(0,300),stack:String(e.stack||'').split('\n').slice(1,4).join(' | ').slice(0,400)}));
  page.on('console',m=>{if(m.type()==='error'&&!/Failed to load resource/.test(m.text()))report.errors.push({type:'console',text:m.text().slice(0,300)})});
  page.on('requestfailed',r=>report.failedRequests.push({url:r.url().slice(0,160),why:r.failure()?.errorText}));
  page.on('response',r=>{if(r.status()>=500)report.failedRequests.push({url:r.url().slice(0,160),status:r.status()})});
  // Never create backend data: anonymous sign-up and the statistics endpoint are blocked for this visitor.
  await page.route(/\/auth\/v1\/signup|\/functions\/v1\/footera-analytics/,route=>route.abort());

  await step('Seite laden',async()=>{const r=await page.goto(url,{waitUntil:'domcontentloaded',timeout:60000});if(!r||r.status()>=400)throw Error('HTTP '+(r&&r.status()));});
  await step('Start bis Konto-Dialog',async()=>{
   await clickIfVisible('#bootIntroSkip').catch(()=>{});
   await page.waitForFunction(()=>{const v=id=>{const e=document.getElementById(id);return e&&getComputedStyle(e).display!=='none'&&e.getBoundingClientRect().height>0};return v('footeraAccountDialog')||v('onboard')},null,{timeout:90000});
   report.version=await page.locator('#buildBadge').textContent().catch(()=>null);
   return report.version;
  });
  await step('Statistik ablehnen und Konto-Dialog schließen',async()=>{
   await clickIfVisible('#footeraAnalyticsConsent button:has-text("Nein")');
   if(await visible('#footeraAccountDialog'))await page.locator('#footeraAccountClose').click();
  });
  await step('Benutzername und Liga',async()=>{
   await page.locator('#firstUsername').fill('Smoketest');
   await page.locator('#saveFirstUsername').click();
   await page.locator('#leagueGrid button, #leagueGrid [data-league]').first().click();
  });
  await step('Starterset öffnen',async()=>{
   await page.locator('#starterOpen').click();
   await page.waitForFunction(()=>Array.isArray(window.state?.club)?state.club.length>=11:(typeof state!=='undefined'&&state.club.length>=11),null,{timeout:30000});
   return (await page.evaluate(()=>state.club.length))+' Karten im Verein';
  });
  await step('Hinweise schließen',async()=>{
   // Tutorial and first-start hints are skipped so the smoke test reaches every screen directly.
   await page.evaluate(()=>{try{window.FooteraTutorial?._skip?.()}catch{}});
   for(let i=0;i<3;i++){if(!(await clickIfVisible('.ft-skip, [data-ft="skip"]')))break;await page.waitForTimeout(300)}
  },{optional:true});
  await step('Store: Bronze-Pack kaufen und öffnen',async()=>{
   await page.locator('nav.nav [data-view="storeView"]').click();
   await clickIfVisible('#storeTabClassic');
   const before=await page.evaluate(()=>state.club.length+(state.unassigned?.length||0)+(state.packQueue?.length||0));
   const buy=page.locator('#packGrid [data-buy][data-cur="coins"]:not([disabled])').first();
   await buy.click();
   // Walkout / pack result: tap through until the pack content is shown.
   for(let i=0;i<20;i++){
    if(await clickIfVisible('#bootIntroSkip, .walkout-skip, [data-walkout-skip], #openPackBtn'))await page.waitForTimeout(600);else await page.waitForTimeout(500);
    const done=await page.evaluate(b=>{const now=state.club.length+(state.unassigned?.length||0)+(state.packQueue?.length||0);return now>b||!!document.querySelector('#packResult .card-shell, .pack-result .card-shell, #packModal.show .card-shell')},before);
    if(done)break;
   }
   const after=await page.evaluate(()=>({coins:state.coins,cards:state.club.length+(state.unassigned?.length||0)}));
   return JSON.stringify(after);
  });
  await step('Pack-Karten in den Verein',async()=>{
   if(await visible('#resultAllClub'))await page.locator('#resultAllClub').click();
   await page.waitForTimeout(500);
   return (await page.evaluate(()=>state.club.length))+' Karten im Verein';
  });
  await step('Freundschaftsspiel bis Abpfiff',async()=>{
   await page.evaluate(()=>{document.querySelectorAll('.modal.active').forEach(m=>m.classList.remove('active'));document.getElementById('results')?.classList.remove('show')});
   await page.locator('nav.nav [data-view="playView"]').click();
   await page.locator('[data-play-mode="friendly-random"]').first().click();
   await page.waitForTimeout(1500); // the mode page scrolls smoothly to the top first
   await waveAwayHints();
   await page.locator('.startmode[data-mode="friendly-random"]').first().click();
   const deadline=Date.now()+8*60*1000;let clicks=[],lastSnap=Date.now();
   while(Date.now()<deadline){
    if(Date.now()-lastSnap>30000){lastSnap=Date.now();await snap('spiel-zwischenstand')}
    const st=await page.evaluate(()=>{const v=id=>{const e=document.getElementById(id);if(!e)return false;const r=e.getBoundingClientRect();return r.width>0&&r.height>0&&getComputedStyle(e).visibility!=='hidden'};return{result:v('matchResult'),minute:document.getElementById('matchMinute')?.textContent||''}});
    await waveAwayHints();
    if(st.result)return 'Ergebnis '+(await page.locator('#matchResultTitle').textContent().catch(()=>''))+' · '+(await page.locator('#matchScore').textContent().catch(()=>''));
    // Tap every "continue" control a player would tap: lineup start, skip goal scene, halftime.
    for(const sel of ['#squadBattleKickoff','#matchGoalSkip','#resumeMatchBtn','.hl-skip','[data-hl-skip]']){
     if(await clickIfVisible(sel)){clicks.push(sel);break}
    }
    if(await visible('#matchSpeedBtn')&&(await page.locator('#matchSpeedBtn').textContent()).includes('Normal'))await page.locator('#matchSpeedBtn').click().catch(()=>{});
    await page.waitForTimeout(1000);
   }
   throw Error('Kein Abpfiff nach 8 Minuten · Klicks: '+clicks.slice(-8).join(', '));
  });
  await step('Spiel beenden und zurück',async()=>{
   for(let i=0;i<6;i++){
    await waveAwayHints();
    let tapped=false;for(const sel of ['#matchGoalSkip','#matchClose','#postMatchProgressClose'])if(await clickIfVisible(sel)){tapped=true;break}
    if(!tapped)break;
    await page.waitForTimeout(800);
   }
   await page.evaluate(()=>{document.querySelectorAll('.modal.active').forEach(m=>{if(typeof closeUiLayer==='function')try{closeUiLayer(m.id)}catch{}})});
  });
  await step('SBC-Übersicht',async()=>{
   await page.locator('nav.nav [data-toggle="more"]').click();
   await page.locator('#moreTray [data-go="sbcView"]').click();
   await page.waitForFunction(()=>document.querySelectorAll('#sbcGrid > *').length>0,null,{timeout:20000});
   return (await page.locator('#sbcGrid > *').count())+' Einträge';
  });
  await step('Transfermarkt-Suche',async()=>{
   await page.locator('nav.nav [data-view="marketView"]').click();
   await clickIfVisible('[data-market-section="search"]');
   await page.locator('#refreshMarket').click();
   await page.waitForFunction(()=>document.querySelectorAll('#marketGrid .market-row').length>0,null,{timeout:20000});
   return (await page.locator('#marketGrid .market-row').count())+' Angebote';
  });
  await step('Spielstand nach Neuladen erhalten',async()=>{
   const before=await page.evaluate(()=>({club:state.club.length,name:state.profile.clubName}));
   await page.reload({waitUntil:'domcontentloaded'});
   await clickIfVisible('#bootIntroSkip').catch(()=>{});
   await page.waitForFunction(()=>typeof state!=='undefined'&&state.profile?.clubName&&state.club.length>0&&getComputedStyle(document.getElementById('bootIntro')||document.body).display!=='flex',null,{timeout:90000});
   const after=await page.evaluate(()=>({club:state.club.length,name:state.profile.clubName}));
   if(after.name!==before.name||after.club!==before.club)throw Error('vorher '+JSON.stringify(before)+' nachher '+JSON.stringify(after));
   return after.club+' Karten, '+after.name;
  });
 }catch(e){failed=true}
 finally{
  report.finishedAt=new Date().toISOString();
  const fatal=report.steps.some(s=>!s.ok&&!s.optional);
  if(report.errors.length)console.log('JS-Fehler:',JSON.stringify(report.errors.slice(0,10),null,1));
  fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,1));
  await browser.close();local?.server.close();
  process.exitCode=(failed||fatal||report.errors.some(e=>e.type==='pageerror'))?1:0;
 }
})();
