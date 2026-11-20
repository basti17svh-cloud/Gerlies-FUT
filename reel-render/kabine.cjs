// Reel capture: the Kabinen-Chat after the simulated win (messages recorded by the real game in phase 1),
// then the coach asks for the Siegerfoto and the squad posts the 3D dressing-room photo.
// node reel-render/kabine.cjs <outDir>
const {chromium}=require('playwright'),path=require('path'),fs=require('fs');
const {server}=require(path.join(__dirname,'..','tests','3d-highlights.browser.cjs'));
const [out]=process.argv.slice(2);fs.mkdirSync(out,{recursive:true});
const KAB=fs.readFileSync(path.join(__dirname,'kabine.json'),'utf8');
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const url=`http://127.0.0.1:${server.address().port}`;
 const browser=await chromium.launch({headless:true,args:['--enable-unsafe-swiftshader','--use-angle=swiftshader']});
 const page=await browser.newPage({viewport:{width:432,height:768},deviceScaleFactor:2.5,serviceWorkers:'block'});
 page.on('pageerror',e=>console.log('pageerror',e.message));page.on('console',m=>{if(/Kabin|photo|Foto/i.test(m.text()))console.log('console',m.text().slice(0,200))});
 await page.addInitScript(k=>{try{localStorage.setItem('footera-kabine-v1',k);localStorage.setItem('footera-sound-v1','off')}catch(e){}
  Object.defineProperty(navigator,'deviceMemory',{configurable:true,get:()=>8});Object.defineProperty(navigator,'hardwareConcurrency',{get:()=>8})},KAB);
 await page.route('**/*',r=>{const u=r.request().url();if(u.startsWith(url)||!/supabase\.co\/(rest|auth|realtime|functions)|googletag/.test(u))return r.continue();return r.abort()});
 await page.goto(url);await page.waitForTimeout(5000);
 await page.addScriptTag({path:path.join(__dirname,'setup.js')});
 await page.evaluate(k=>{__reelSetup();
  // Same squad ids as in the recorded chat, so the photo finds every player.
  const v=JSON.parse(k),ctx=v.msgs.find(m=>m.ctx)?.ctx,byPid=new Map((ctx?.players||[]).map(p=>[p.pid,p.uid]));
  for(const it of state.club){const u=byPid.get(it.pid);if(u)it.uid=u}state.squad=state.club.map(i=>i.uid);
  localStorage.setItem('footera-kabine-v1',k);
  document.querySelectorAll('#footeraWinInvite,.modal.active').forEach(e=>e.classList.remove('active'));
 },KAB);
 const t0=Date.now();const frames=[];let n=0;
 const snap=async tag=>{await page.screenshot({path:path.join(out,`f${String(n).padStart(4,'0')}.jpg`),type:'jpeg',quality:90});frames.push({i:n,t:Date.now()-t0,tag});n++};
 await page.evaluate(()=>FooteraKabine.open());
 for(let i=0;i<400;i++){await snap('play');const playing=await page.evaluate(()=>!!document.querySelector('.kb-typing')||document.querySelectorAll('#kabineList [data-kb-id]').length<(FooteraKabine.read().msgs.length));if(!playing&&i>8)break}
 for(let i=0;i<10;i++)await snap('read');
 console.log('chips',await page.evaluate(()=>[...document.querySelectorAll('[data-kb-reply]')].map(b=>b.dataset.kbReply+':'+b.textContent).join(' | ')));
 await page.evaluate(()=>document.querySelector('[data-kb-reply="photo"]')?.click());
 let readyAt=-1;
 for(let i=0;i<700;i++){await snap('photo');const ready=await page.evaluate(()=>!!document.querySelector('.kb-photo.ready img'));if(ready&&readyAt<0){readyAt=i;await page.evaluate(()=>{const l=document.querySelector('#kabineList');l.scrollTop=l.scrollHeight})}if(readyAt>=0&&i-readyAt>25)break}
 const img=await page.evaluate(()=>document.querySelector('.kb-photo.ready img')?.src||'');
 if(img.startsWith('data:'))fs.writeFileSync(path.join(out,'siegerfoto.jpg'),Buffer.from(img.split(',')[1],'base64'));
 else if(img){const r=await page.evaluate(async u=>{const b=await (await fetch(u)).blob();return await new Promise(res=>{const f=new FileReader();f.onload=()=>res(f.result);f.readAsDataURL(b)})},img);fs.writeFileSync(path.join(out,'siegerfoto.jpg'),Buffer.from(r.split(',')[1],'base64'))}
 await page.evaluate(()=>document.querySelector('.kb-photo.ready')?.click());
 for(let i=0;i<20;i++)await snap('lightbox');
 fs.writeFileSync(path.join(out,'meta.json'),JSON.stringify({frames,readyAt,photo:!!img}));
 console.log('frames',n,'photo',!!img,'readyAt',readyAt);
 await browser.close();server.close();
})().catch(e=>{console.error(e);process.exit(1)});
