/* Social quiz video "Welches Rating ist höher?" from real production TOTW cards. node scripts/social/render-higher-lower-quiz.cjs <outdir> */
const {chromium}=require('playwright'),fs=require('node:fs'),path=require('node:path'),{execFileSync}=require('node:child_process');
const {server}=require('../../tests/3d-highlights.browser.cjs');
const OUT=path.resolve(process.argv[2]||'marketing-quiz'),LOCAL=process.env.LOCAL==='1',FPS=Number(process.env.FPS||30),ONLY=process.env.ONLY;
// [week, name] left vs right; never a tie.
const ROUNDS=[[[6,'Haaland'],[9,'Shaw']],[[7,'Gabriel'],[8,'Hakimi']],[[9,'Kimmich'],[8,'Rice']],[[8,'Wilson'],[9,'Russo']],[[9,'Berger'],[7,'Kobel']],[[6,'Mbappé'],[6,'Yamal']]];
const INTRO=3,ROUND=6,OUTRO=4.5,TOTAL=INTRO+ROUNDS.length*ROUND+OUTRO;
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch();
 try{
  const ctx=await browser.newContext({viewport:{width:1080,height:1920},deviceScaleFactor:1,serviceWorkers:'block'});
  const page=await ctx.newPage();await page.goto(base+'/index.html');await page.waitForTimeout(2000);
  await page.evaluate(()=>{if(!PLAYERS.length)syncDatabase(true)});await page.waitForFunction(()=>PLAYERS.length>10000,{},{timeout:90000});await page.waitForTimeout(1500);
  const grab=async([week,name])=>{for(let t=0;t<40;t++){const c=await page.evaluate(([week,name])=>{for(const id of ['bootIntro','dbGate','onboarding','usernameRequiredModal'])document.getElementById(id)?.remove();
    eventSelectedId='totw-'+week;renderEvents();document.querySelectorAll('.event-player img').forEach(i=>{i.loading='eager'});
    const el=[...document.querySelectorAll('.event-player')].find(e=>e.innerText.includes(name));if(!el)return null;
    const imgs=[...el.querySelectorAll('img')];return{html:el.querySelector('.card-shell').outerHTML,rating:Number(el.querySelector('.ovr').textContent),ok:imgs.every(i=>i.complete&&i.naturalWidth>0)}},[week,name]);
    if(c&&(c.ok||LOCAL))return c;await page.waitForTimeout(750)}throw new Error('card '+name)};
  const rounds=[];for(const [a,b] of ROUNDS){const L=await grab(a),R=await grab(b);if(L.rating===R.rating)throw new Error('tie '+a+b);rounds.push({L,R})}
  console.log(rounds.map((r,i)=>`R${i+1} ${r.L.rating}:${r.R.rating}`).join(' '));
  const styles=await page.evaluate(()=>[...document.querySelectorAll('style,link[rel="stylesheet"]')].map(e=>e.outerHTML).join('\n'));
  const q=await ctx.newPage();
  await q.setContent(`<!doctype html><html><head><meta charset="utf-8"><base href="${base}/">${styles}<style>
  html,body{margin:0!important;width:1080px!important;min-width:1080px!important;height:1920px!important;overflow:hidden!important;background:#07070a!important;font-family:Inter,"Inter Display",Arial,sans-serif;color:#fff}
  body:before,body:after,html:before,html:after{display:none!important;content:none!important}
  .qstage{position:absolute;inset:0;z-index:0;background-image:radial-gradient(ellipse 80% 40% at 50% 0%,rgba(227,32,43,.42),transparent 70%),linear-gradient(180deg,#160709 0%,#0b0b0e 60%,#070709 100%)!important;background-color:#07070a!important}
  .qframe{position:absolute;z-index:5;inset:22px;border:1.5px solid rgba(255,70,80,.35);border-radius:4px;pointer-events:none}
  .qbrand{position:absolute;z-index:5;top:96px;left:0;right:0;display:flex;justify-content:center;align-items:center;gap:14px;font:800 30px Inter,Arial;letter-spacing:.32em;color:#fff}.qbrand img{width:60px;height:60px;object-fit:contain}
  .scene{position:absolute;inset:0;opacity:0;background:transparent!important;border:0!important;box-shadow:none!important}
  .big{position:absolute;left:50px;right:50px;text-align:center}
  .kick{font:700 26px Inter,Arial;letter-spacing:.34em;color:#ffb3b8;text-transform:uppercase}
  .t1{top:560px;font:900 150px/.95 "Inter Display",Inter,Arial;letter-spacing:-.02em;text-transform:uppercase;text-shadow:0 0 40px rgba(255,40,50,.45)}.t1 em,.q em{font-style:normal;color:#ff3341}
  .t2{top:1060px;font:800 38px/1.3 Inter,Arial;letter-spacing:.04em;text-transform:uppercase}
  .t3{top:1200px}
  .round{position:absolute;top:220px;left:0;right:0;display:flex;justify-content:center}.round span{font:800 26px Inter,Arial;letter-spacing:.3em;padding:12px 26px;border:2px solid rgba(255,51,65,.75);border-radius:8px;background:rgba(20,6,8,.8)}
  .q{position:absolute;top:310px;left:40px;right:40px;text-align:center;font:900 64px/1.02 "Inter Display",Inter,Arial;text-transform:uppercase;text-shadow:0 0 40px rgba(255,40,50,.35)}
  .cards{position:absolute;top:520px;left:0;right:0;display:flex;justify-content:center;gap:36px;z-index:1}
  .slot{position:relative;width:470px;transition:none}.slot .card-shell{width:100%!important;max-width:none!important;margin:0!important}
  .slot .card-alt-positions{display:none!important}
  .slot.hide .ovr{color:transparent!important;text-shadow:none!important}
  .slot.hide .ovr:after{content:"?";position:absolute;inset:0;display:flex;align-items:center;justify-content:center;color:#fff}
  .slot .ovr{position:relative}
  .slot.hide [data-hide-stat]{visibility:hidden}
  .tag{position:absolute;left:50%;bottom:-86px;transform:translateX(-50%) scale(var(--s,0));font:900 38px Inter,Arial;letter-spacing:.06em;padding:12px 30px;border-radius:10px;white-space:nowrap}
  .win .tag{background:#ff3341;color:#fff;box-shadow:0 0 40px rgba(255,51,65,.6)}
  .lose .tag{background:rgba(255,255,255,.08);border:2px solid rgba(255,255,255,.18);color:#bbb}
  .win{filter:drop-shadow(0 0 36px rgba(255,51,65,.75))}
  .vs{position:absolute;top:880px;left:50%;transform:translate(-50%,-50%);width:120px;height:120px;border-radius:50%;background:#e3202b;color:#fff;font:900 44px Inter,Arial;display:flex;align-items:center;justify-content:center;box-shadow:0 0 0 6px #0b0b0e,0 0 50px rgba(255,40,50,.6);z-index:10}
  .timer{position:absolute;top:1360px;left:50%;transform:translateX(-50%);width:210px;height:210px}
  .timer svg{position:absolute;inset:0;transform:rotate(-90deg)}.timer .num{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font:900 110px Inter,Arial;color:#fff}
  .dots{position:absolute;top:1700px;left:0;right:0;display:flex;justify-content:center;gap:18px}.dots i{width:22px;height:22px;border-radius:50%;background:rgba(255,255,255,.15);display:block}.dots i.on{background:#ff3341;box-shadow:0 0 14px rgba(255,51,65,.7)}
  .foot{position:absolute;bottom:96px;left:0;right:0;text-align:center;font:800 26px Inter,Arial;letter-spacing:.32em;color:#ffb3b8}
  </style></head><body><div class="qstage"></div><div class="qframe"></div><div class="qbrand"><img src="assets/footera/emblem.png">FOOTERA</div>
  <div class="scene" id="intro"><div class="big kick" style="top:470px">Quiz · 6 Runden</div><div class="big t1">Höher<br>oder<br><em>tiefer?</em></div><div class="big t2">Welche Karte hat<br>das höhere Rating?</div><div class="big kick t3">Zähl mit 👇</div></div>
  <div class="scene" id="game"><div class="round" id="rlabel"></div><div class="q">Wer hat das<br><em>höhere</em> Rating?</div>
   <div class="cards"><div class="slot hide" id="L"></div><div class="slot hide" id="R"></div></div><div class="vs">VS</div>
   <div class="timer" id="timer"><svg viewBox="0 0 210 210"><circle cx="105" cy="105" r="92" fill="#0008" stroke="#ffffff22" stroke-width="14"/><circle id="arc" cx="105" cy="105" r="92" fill="none" stroke="#ffffff" stroke-width="14" stroke-linecap="round" stroke-dasharray="578" stroke-dashoffset="0"/></svg><div class="num" id="num">3</div></div>
   <div class="dots" id="dots">${ROUNDS.map(()=>'<i></i>').join('')}</div></div>
  <div class="scene" id="outro"><div class="big t1" style="top:560px;font-size:120px">Wie viele<br><em>hattest du?</em></div><div class="big" style="top:880px;font:900 170px Inter,Arial;letter-spacing:.04em;text-shadow:0 0 50px rgba(255,40,50,.5)">? / 6</div><div class="big t2" style="top:1120px">Schreib's in<br>die Kommentare 👇</div></div>
  <div class="foot">BUILD YOUR ERA</div>
  <script>
  const ROUNDS=${JSON.stringify(rounds.map(r=>({L:r.L,R:r.R})))};const INTRO=${INTRO},ROUND=${ROUND},OUTRO=${OUTRO};let cur=-1;
  const ease=x=>1-Math.pow(1-Math.min(1,Math.max(0,x)),3);
  const back=x=>{x=Math.min(1,Math.max(0,x));const c=1.7;return 1+(c+1)*Math.pow(x-1,3)+c*Math.pow(x-1,2)};
  function mark(slot){slot.querySelectorAll('*').forEach(el=>{if(el.children.length===0&&/^\\d{1,2}$/.test(el.textContent.trim())&&!el.classList.contains('ovr'))el.setAttribute('data-hide-stat','')})}
  function load(i){const r=ROUNDS[i];for(const k of ['L','R']){const s=document.getElementById(k);s.innerHTML=r[k].html+'<div class="tag"></div>';mark(s)}
   const win=r.L.rating>r.R.rating?'L':'R';document.getElementById(win).querySelector('.tag').textContent='✓ HÖHER';document.getElementById(win==='L'?'R':'L').querySelector('.tag').textContent='TIEFER';
   document.getElementById('rlabel').innerHTML='<span>RUNDE '+(i+1)+' / '+ROUNDS.length+'</span>';cur=i}
  window.render=t=>{const show=(id,o)=>document.getElementById(id).style.opacity=o;
   if(t<INTRO){show('intro',Math.min(1,t/0.35)*(t>INTRO-0.35?(INTRO-t)/0.35:1));show('game',0);show('outro',0);const s=0.92+0.08*ease(t/0.6);document.querySelector('#intro .t1').style.transform='scale('+s+')';return}
   const g=t-INTRO,i=Math.floor(g/ROUND);
   if(i>=ROUNDS.length){const o=t-INTRO-ROUNDS.length*ROUND;show('intro',0);show('game',Math.max(0,1-o/0.3));show('outro',Math.min(1,o/0.4));document.querySelector('#outro .t1').style.transform='scale('+(0.9+0.1*back(o/0.6))+')';return}
   show('intro',0);show('outro',0);show('game',1);if(i!==cur)load(i);const u=g-i*ROUND;
   const L=document.getElementById('L'),R=document.getElementById('R');
   const inn=ease(u/0.45);L.style.transform='translateX('+(-700*(1-inn))+'px)';R.style.transform='translateX('+(700*(1-inn))+'px)';
   const tStart=0.5,tLen=3,rev=tStart+tLen;
   const tm=document.getElementById('timer'),left=Math.max(0,tLen-(u-tStart));
   tm.style.opacity=u<tStart?ease(u/tStart):u<rev?1:Math.max(0,1-(u-rev)/0.25);
   document.getElementById('num').textContent=u<rev?String(Math.max(1,Math.ceil(left))):'';
   const frac=u<tStart?0:Math.min(1,(u-tStart)/tLen);document.getElementById('arc').setAttribute('stroke-dashoffset',String(578*frac));
   document.getElementById('arc').setAttribute('stroke',left<1.0?'#ff3341':'#ffffff');
   const tick=(u-tStart)%1;document.getElementById('num').style.transform='scale('+(u>tStart&&u<rev?1+0.18*Math.max(0,1-tick/0.25):1)+')';
   const revealed=u>=rev;for(const s of [L,R])s.classList.remove('win','lose');for(const s of [L,R]){s.classList.toggle('hide',!revealed)}
   const r=ROUNDS[i],win=r.L.rating>r.R.rating?L:R,lose=win===L?R:L;
   win.classList.toggle('win',revealed);lose.classList.toggle('lose',revealed);
   const p=back((u-rev)/0.45);win.querySelector('.tag').style.setProperty('--s',revealed?p:0);lose.querySelector('.tag').style.setProperty('--s',revealed?p:0);
   win.style.transform+=' scale('+(revealed?1+0.06*p:1)+')';lose.style.transform+=' scale('+(revealed?1-0.06*p:1)+')';lose.style.opacity=revealed?1-0.45*Math.min(1,(u-rev)/0.4):1;win.style.opacity=1;
   if(!revealed){win.classList.remove('win');lose.classList.remove('lose');L.style.opacity=R.style.opacity=1}
   document.querySelectorAll('#dots i').forEach((d,k)=>d.classList.toggle('on',k<i||(k===i&&revealed)));
  };
  </script></body></html>`,{waitUntil:'networkidle'});
  await q.evaluate(()=>document.querySelectorAll('img').forEach(i=>{i.loading='eager'}));await q.waitForTimeout(1500);
  fs.mkdirSync(OUT+'/frames',{recursive:true});
  const n=Math.round(TOTAL*FPS);
  const list=ONLY?ONLY.split(',').map(Number):[...Array(n).keys()];
  for(const f of list){await q.evaluate(t=>render(t),f/FPS);await q.screenshot({path:`${OUT}/frames/${String(f).padStart(5,'0')}.jpg`,type:'jpeg',quality:92})}
  fs.writeFileSync(OUT+'/meta.json',JSON.stringify({fps:FPS,total:TOTAL,intro:INTRO,round:ROUND,rounds:rounds.map(r=>[r.L.rating,r.R.rating])}));
  console.log('frames',list.length);
 }finally{await browser.close();server.close()}
})().catch(e=>{console.error(e);server.close();process.exitCode=1});
