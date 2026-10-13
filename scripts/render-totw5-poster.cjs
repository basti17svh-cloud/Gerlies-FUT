/* Exact production card DOM; no regenerated portraits, ratings or artwork. */
const {chromium}=require('playwright'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {server}=require('../tests/3d-highlights.browser.cjs');
const root=path.join(__dirname,'..');
(async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const base='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({headless:true});
 try{
  const response=await fetch('https://raw.githubusercontent.com/mzafram2001/ea-fc/main/data/dataset_ea_fc_27.csv');assert.ok(response.ok);const csv=await response.text();
  const context=await browser.newContext({viewport:{width:1080,height:1350},deviceScaleFactor:2,serviceWorkers:'block'});
  await context.addInitScript(()=>{const NativeDate=Date,at=NativeDate.parse('2026-10-13T16:00:00+02:00');window.Date=class extends NativeDate{constructor(...args){super(...(args.length?args:[at]))}static now(){return at}}});
  const page=await context.newPage();await page.goto(base+'/index.html?totwPreview=5');
  await page.evaluate(csv=>{
   for(const id of ['bootIntro','dbGate','onboarding','usernameRequiredModal'])document.getElementById(id)?.remove();
   PLAYERS=parseCSV(csv).map(normCSV);applyPreferredPlayerNames(PLAYERS);applyPlayerTraits(PLAYERS);normalizePlayerAffiliations(PLAYERS);rebuildPlayerRuntimeIndexes();
   P_BY_ID=new Map(PLAYERS.map(p=>[String(p.id),p]));eventSelectedId='totw-review-5';renderEvents();
   document.querySelectorAll('.view').forEach(el=>{el.style.display=el.id==='eventsView'?'block':'none'});
   document.querySelectorAll('.event-player .face img').forEach(img=>{img.loading='eager'});
  },csv);
  await page.waitForFunction(()=>[...document.querySelectorAll('.event-player .face img')].length===18&&[...document.querySelectorAll('.event-player .face img')].every(img=>img.complete&&img.naturalWidth>=100&&img.currentSrc.includes('/assets/footera/totw/5/')),{},{timeout:45000});
  const source=await page.evaluate(()=>({styles:[...document.querySelectorAll('style,link[rel="stylesheet"]')].map(el=>el.outerHTML).join('\n'),cards:[...document.querySelectorAll('.event-player .card-shell')].map((el,index)=>({html:el.outerHTML,rating:TOTW_WEEK_5.players[index].ovr})).sort((a,b)=>b.rating-a.rating),names:TOTW_WEEK_5.players.map(p=>p.names[0]),ids:TOTW_WEEK_5.players.map(p=>p.eaId)}));
  assert.equal(source.cards.length,18);assert.equal(new Set(source.ids).size,18);
  assert.ok(source.cards.every((card,index)=>!index||source.cards[index-1].rating>=card.rating),'poster ratings are descending');
  const poster=await context.newPage();
  await poster.setContent(`<!doctype html><html><head><meta charset="utf-8"><base href="${base}/">${source.styles}<style>
   html,body{margin:0!important;padding:0!important;min-width:1080px!important;width:1080px!important;height:1350px!important;overflow:hidden!important;background:#080b09!important;color:#f9eabe;font-family:Arial,sans-serif}
   .poster{position:relative;width:1080px;height:1350px;padding:60px 40px 34px;box-sizing:border-box;background:radial-gradient(ellipse at 50% 37%,#66532c3d,transparent 65%),linear-gradient(155deg,#1d2118 0%,#090c0a 50%,#252012 100%)}
   .poster:before{content:"";position:absolute;inset:22px;border:1px solid #b3924f73;pointer-events:none}
   .poster:after{content:"";position:absolute;left:40px;right:40px;top:325px;height:1px;background:linear-gradient(90deg,transparent,#d6b872,transparent)}
   .brandline{display:flex;align-items:center;justify-content:center;gap:16px;font-size:27px;font-weight:900;letter-spacing:8px}.brandline img{width:44px;height:44px;object-fit:contain}
   .kicker{text-align:center;margin:25px 0 8px;font-size:16px;letter-spacing:7px;color:#d1bd83}
   h1{font:900 104px/.98 Arial,sans-serif!important;letter-spacing:-4px!important;text-align:center!important;color:#ffe5a0!important;margin:0!important;text-shadow:0 3px 28px #dba33925}
   .launch{margin:26px auto 0;display:flex;align-items:center;justify-content:center;gap:18px;font-size:24px;font-weight:900;letter-spacing:2px;color:#ffefc4}.launch span{color:#b7ae8b;font-size:17px;font-weight:600;letter-spacing:3px}
   .card-grid{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:24px 8px;margin-top:57px;align-items:start}
   .poster-card{min-width:0;filter:drop-shadow(0 5px 9px #000b)}.poster-card .card-shell{width:100%!important;max-width:none!important;margin:0!important}.poster-card img{loading:eager}
   .poster-bottom{position:absolute;left:55px;right:55px;bottom:57px;text-align:center}.line{height:1px;background:linear-gradient(90deg,transparent,#b89553aa,transparent);margin-bottom:24px}
   .tagline{font-size:28px;font-weight:900;letter-spacing:6px;color:#efe1b8}.availability{margin-top:17px;font-size:20px;font-weight:700;color:#d9c38a}
  </style></head><body><main class="poster"><div class="brandline"><img src="assets/footera/emblem.png" alt="">FOOTERA</div><div class="kicker">TEAM OF THE WEEK</div><h1>TOTW 5</h1><div class="launch">MITTWOCH · 19:00 UHR <span>14. OKTOBER 2026</span></div><div class="card-grid">${source.cards.map(card=>'<div class="poster-card">'+card.html+'</div>').join('')}</div><footer class="poster-bottom"><div class="line"></div><div class="tagline">BUILD YOUR ERA.</div><div class="availability">18 SPIELER. DEIN NÄCHSTES TEAM.</div></footer></main></body></html>`,{waitUntil:'networkidle'});
  await poster.evaluate(()=>document.querySelectorAll('.face img').forEach(img=>{img.loading='eager'}));
  await poster.waitForFunction(()=>[...document.querySelectorAll('.face img')].length===18&&[...document.querySelectorAll('.face img')].every(img=>img.complete&&img.naturalWidth>=100),{},{timeout:30000});
  assert.ok(!/basti17|github/i.test(await poster.locator('body').innerText()),'no personal account name or hosting address on the poster');
  const geometry=await poster.evaluate(()=>{const cards=[...document.querySelectorAll('.poster-card')].map(el=>{const r=el.getBoundingClientRect();return{left:r.left,right:r.right,bottom:r.bottom}});return{cards,footer:document.querySelector('.poster-bottom').getBoundingClientRect().top}});
  assert.ok(geometry.cards.every(card=>card.left>=35&&card.right<=1045&&card.bottom<geometry.footer-12),JSON.stringify(geometry));
  fs.mkdirSync(path.join(root,'assets/footera/social'),{recursive:true});
  await poster.screenshot({path:path.join(root,'assets/footera/social/totw5-2026-10-14.png')});
  console.log('PASS social poster: 2160x2700 px, eighteen loaded production portraits and original cards');
 }finally{await browser.close();server.close()}
})().catch(error=>{console.error(error);server.close();process.exitCode=1});
