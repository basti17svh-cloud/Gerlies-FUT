/* Best of TOTW poster (10th TOTW anniversary): exact production cards from the TOTW archive, sorted by rating. */
const {chromium}=require('playwright'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {server}=require('../../tests/3d-highlights.browser.cjs');
const root=path.join(__dirname,'../..'),outDir=path.join(root,'assets/footera/social/best-of-totw');
const LOCAL=process.env.LOCAL==='1';
// [week, card name as shown, kicker label]
const ELF=[[6,'Mbappé'],[6,'Haaland'],[8,'Yamal'],[4,'Bellingham'],[8,'Hakimi'],[7,'Gabriel'],[8,'Rice'],[8,'Dumornay'],[4,'Donnarumma'],[2,'Marquinhos'],[4,'Cancelo']];
const OUT=[[4,'Kane'],[2,'Olise'],[9,'Shaw']];
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({headless:true});
 try{
  const ctx=await browser.newContext({viewport:{width:1080,height:1350},deviceScaleFactor:2,serviceWorkers:'block'});
  const page=await ctx.newPage();await page.goto(base+'/index.html');
  await page.waitForTimeout(2000);await page.evaluate(()=>{if(!PLAYERS.length)syncDatabase(true)});await page.waitForFunction(()=>typeof PLAYERS!=='undefined'&&PLAYERS.length>10000,{},{timeout:90000});await page.waitForTimeout(1500);
  const grab=async picks=>{const cards=[];for(const [week,name] of picks){
   let card=null;for(let t=0;t<40&&!card;t++){
    card=await page.evaluate(([week,name])=>{for(const id of ['bootIntro','dbGate','onboarding','usernameRequiredModal'])document.getElementById(id)?.remove();
     eventSelectedId='totw-'+week;renderEvents();document.querySelectorAll('.event-player .face img').forEach(i=>{i.loading='eager'});
     const el=[...document.querySelectorAll('.event-player')].find(e=>e.innerText.includes(name));if(!el)return null;
     const img=el.querySelector('.face img');const flag=el.innerText.includes('🏳');
     return{html:el.querySelector('.card-shell').outerHTML,rating:Number(el.querySelector('.ovr')?.textContent.match(/\d+/)?.[0]||0),ok:!!img&&img.complete&&img.naturalWidth>=100,src:img?.currentSrc||img?.getAttribute('src')||'none',flag}},[week,name]);
    if(card&&!card.ok&&!LOCAL){console.log('waiting',name,card.src,card.flag);if(t<39){card=null;await page.waitForTimeout(750)}}}
   assert.ok(card,`card ${name} (TOTW ${week}) not rendered with portrait`);cards.push({...card,week,name})}
   return cards.sort((a,b)=>b.rating-a.rating)};
  const elf=await grab(ELF),out=await grab(OUT);
  console.log(elf.map(c=>c.rating+' '+c.name+' W'+c.week).join('\n'));
  assert.ok(elf.every((c,i)=>!i||elf[i-1].rating>=c.rating));
  const styles=await page.evaluate(()=>[...document.querySelectorAll('style,link[rel="stylesheet"]')].map(el=>el.outerHTML).join('\n'));
  const tag=(c,cls)=>`<div class="pc ${cls||''}">${c.html}<div class="wk">TOTW ${c.week}</div></div>`;
  const css=(w,h)=>`html,body{margin:0!important;padding:0!important;width:${w}px!important;min-width:${w}px!important;height:${h}px!important;overflow:hidden!important;background:#070906!important;color:#f9eabe;font-family:Arial,sans-serif}
   .poster{position:relative;width:${w}px;height:${h}px;box-sizing:border-box;padding:var(--pad);background:radial-gradient(ellipse at 50% 30%,#8a6a2a55,transparent 60%),radial-gradient(ellipse at 50% 100%,#c8102e33,transparent 55%),linear-gradient(160deg,#1d2118 0%,#090c0a 50%,#252012 100%)}
   .poster:before{content:"";position:absolute;inset:22px;border:1px solid #b3924f73;pointer-events:none}
   .brandline{display:flex;align-items:center;justify-content:center;gap:14px;font-size:25px;font-weight:900;letter-spacing:8px}.brandline img{width:40px;height:40px;object-fit:contain}
   .kicker{text-align:center;margin:var(--kgap) 0 6px;font-size:17px;letter-spacing:7px;color:#d1bd83}
   h1{font:900 var(--h1)/.95 Arial,sans-serif!important;letter-spacing:-3px!important;text-align:center!important;color:#ffe5a0!important;margin:0!important;text-shadow:0 3px 28px #dba33940}
   h1 b{color:#fff}.sub{text-align:center;margin-top:12px;font-size:21px;font-weight:800;letter-spacing:3px;color:#efe1b8}
   .rows{display:flex;flex-direction:column;align-items:center;gap:var(--rgap);margin-top:var(--top)}.row{display:flex;justify-content:center;gap:12px}
   .pc{position:relative;filter:drop-shadow(0 6px 10px #000c)}.pc .card-shell{width:100%!important;max-width:none!important;margin:0!important}
   .r1 .pc{width:var(--c1)}.r2 .pc{width:var(--c2)}
   .wk{position:absolute;left:50%;bottom:-13px;transform:translateX(-50%);background:#c8102e;color:#fff;font-size:13px;font-weight:900;letter-spacing:1.5px;padding:3px 9px;border-radius:9px;white-space:nowrap;box-shadow:0 2px 6px #000a}
   .bottom{position:absolute;left:55px;right:55px;bottom:var(--bot);text-align:center}.line{height:1px;background:linear-gradient(90deg,transparent,#b89553aa,transparent);margin-bottom:20px}
   .tagline{font-size:27px;font-weight:900;letter-spacing:6px;color:#efe1b8}.avail{margin-top:12px;font-size:19px;font-weight:700;color:#d9c38a}`;
  const head=`<div class="brandline"><img src="assets/footera/emblem.png" alt="">FOOTERA</div>`;
  const render=async(file,w,h,vars,body)=>{const p=await ctx.newPage();await p.setViewportSize({width:w,height:h});
   await p.setContent(`<!doctype html><html><head><meta charset="utf-8"><base href="${base}/">${styles}<style>${css(w,h)}</style></head><body><main class="poster" style="${vars}">${head}${body}</main></body></html>`,{waitUntil:'networkidle'});
   if(!LOCAL)await p.waitForFunction(()=>[...document.querySelectorAll('.face img')].every(i=>i.complete&&i.naturalWidth>=100),{},{timeout:30000});
   assert.ok(!/basti17|github/i.test(await p.locator('body').innerText()));
   fs.mkdirSync(outDir,{recursive:true});await p.screenshot({path:path.join(outDir,file)});await p.close();console.log('wrote',file)};
  const elfRows=`<div class="rows"><div class="row r1">${elf.slice(0,3).map(c=>tag(c)).join('')}</div><div class="row r2">${elf.slice(3,7).map(c=>tag(c)).join('')}</div><div class="row r2">${elf.slice(7).map(c=>tag(c)).join('')}</div></div>`;
  const title=`<div class="kicker">JUBILÄUM ZU TOTW 10</div><h1>BEST OF <b>TOTW</b></h1><div class="sub">DIE STÄRKSTE ELF AUS TOTW 1–9</div>`;
  const foot=`<footer class="bottom"><div class="line"></div><div class="tagline">BUILD YOUR ERA.</div><div class="avail">TOTW 10 · MITTWOCH · 19:00 UHR</div></footer>`;
  await render('best-of-totw-feed.png',1080,1350,'--pad:50px 36px;--kgap:16px;--h1:92px;--top:34px;--rgap:30px;--c1:218px;--c2:190px;--bot:40px',title+elfRows+foot);
  await render('best-of-totw-story.png',1080,1920,'--pad:150px 36px;--kgap:26px;--h1:118px;--top:60px;--rgap:44px;--c1:270px;--c2:232px;--bot:150px',title+elfRows+foot);
  const outRow=`<div class="rows"><div class="row r1">${out.map(c=>tag(c)).join('')}</div></div>`;
  await render('best-of-totw-knapp-raus.png',1080,1350,'--pad:50px 36px;--kgap:30px;--h1:104px;--top:130px;--rgap:30px;--c1:322px;--c2:190px;--bot:40px',`<div class="kicker">BEST OF TOTW</div><h1>KNAPP <b>RAUS</b></h1><div class="sub">WEN HÄTTEST DU REINGENOMMEN? 👇</div>`+outRow+foot);
 }finally{await browser.close();server.close()}
})().catch(e=>{console.error(e);server.close();process.exitCode=1});
