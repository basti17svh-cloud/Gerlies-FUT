/* Social teaser "Wer gewinnt?" Best-of-TOTW-Elf vs Icon-Elf from real production cards. node scripts/social/render-duel-teaser.cjs <outdir> (LOCAL=1, FPS, ONLY=frames) */
const {chromium}=require('playwright'),fs=require('node:fs'),path=require('node:path');
const {server}=require('../../tests/3d-highlights.browser.cjs');
const OUT=path.resolve(process.argv[2]||'marketing-duel'),LOCAL=process.env.LOCAL==='1',FPS=Number(process.env.FPS||30),ONLY=process.env.ONLY;
// rows from GK to attack, left to right
const HOME={title:'BEST-OF-TOTW-ELF',rows:[['Kobel'],['Brugts','Bastoni','Gabriel','Hakimi'],['Giugliano','Bellingham','Dumornay'],['Wilson','Haaland','Yamal']]};
const AWAY={title:'ICON-ELF',rows:[['Gianluigi Buffon'],['Roberto Carlos','Paolo Maldini','Franz Beckenbauer','Cafu'],['Xavi','Zinedine Zidane','Iniesta'],['Ronaldinho','Ronaldo','Garrincha']]};
const TOTAL=31;
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch();
 try{
  const ctx=await browser.newContext({viewport:{width:1080,height:1920},deviceScaleFactor:1,serviceWorkers:'block'});
  const page=await ctx.newPage();await page.goto(base+'/index.html?totwPreview=10');await page.waitForTimeout(2000);
  await page.evaluate(()=>{if(!PLAYERS.length)syncDatabase(true)});await page.waitForFunction(()=>PLAYERS.length>10000,{},{timeout:90000});await page.waitForTimeout(1500);
  const grab=async(name,icon)=>{for(let t=0;t<40;t++){const c=await page.evaluate(([name,icon])=>{for(const id of ['bootIntro','dbGate','onboarding','usernameRequiredModal'])document.getElementById(id)?.remove();
    let el;
    if(icon){const b=MID_ICON_BASES.find(x=>x.name===name);if(!b)return{err:'no icon '+name};let host=document.getElementById('__duelHost');if(!host){host=document.createElement('div');host.id='__duelHost';host.style.cssText='position:fixed;left:0;top:0;width:470px;z-index:99999';document.body.appendChild(host)}
      if(host.dataset.name!==name){host.dataset.name=name;host.innerHTML=cardHTML(b,makeItem(b))}host.querySelectorAll('img').forEach(i=>{i.loading='eager'});el=host}
    else{if(eventSelectedId!=='totw-review-10'){eventSelectedId='totw-review-10';renderEvents()}document.querySelectorAll('.event-player img').forEach(i=>{i.loading='eager'});
      el=[...document.querySelectorAll('.event-player')].find(e=>e.innerText.includes(name.toUpperCase())||e.innerText.includes(name));if(!el)return null}
    const shell=el.querySelector('.card-shell');if(!shell)return null;const imgs=[...shell.querySelectorAll('img')];
    return{html:shell.outerHTML,rating:Number(shell.querySelector('.ovr')?.textContent||0),ok:imgs.every(i=>i.complete&&i.naturalWidth>0)}},[name,icon]);
    if(c?.err)throw new Error(c.err);if(c&&(c.ok||LOCAL))return c;await page.waitForTimeout(750)}throw new Error('card '+name)};
  const team=async(T,icon)=>{const rows=[];for(const r of T.rows){const row=[];for(const n of r)row.push(await grab(n,icon));rows.push(row)}
    const all=rows.flat(),avg=all.reduce((s,c)=>s+c.rating,0)/all.length;return{title:T.title,rows,avg}};
  const home=await team(HOME,false),away=await team(AWAY,true);
  console.log(home.title,home.rows.flat().map(c=>c.rating).join(','),home.avg.toFixed(2),'|',away.title,away.rows.flat().map(c=>c.rating).join(','),away.avg.toFixed(2));
  const styles=await page.evaluate(()=>[...document.querySelectorAll('style,link[rel="stylesheet"]')].map(e=>e.outerHTML).join('\n'));
  const q=await ctx.newPage();
  const f1=x=>x.toFixed(1).replace('.',',');
  await q.setContent(`<!doctype html><html><head><meta charset="utf-8"><base href="${base}/">${styles}<style>
  html,body{margin:0!important;width:1080px!important;min-width:1080px!important;height:1920px!important;overflow:hidden!important;background:#070906!important;font-family:Inter,"Inter Display",Arial,sans-serif;color:#fff}
  body:before,body:after{display:none!important;content:none!important}
  .dstage{position:absolute;inset:0;z-index:0;background-color:#0a0909!important;background-image:radial-gradient(ellipse 80% 40% at 50% 0%,rgba(227,32,43,.42),transparent 70%),linear-gradient(180deg,#160709 0%,#0b0b0e 60%,#070709 100%)!important}
  .dframe{position:absolute;z-index:5;inset:22px;border:1.5px solid rgba(255,70,80,.35);border-radius:4px;pointer-events:none}
  .dpitch{position:absolute;left:70px;right:70px;top:330px;height:1330px;border:3px solid #ffffff14;border-radius:8px;opacity:0}
  .dpitch:before{content:"";position:absolute;left:0;right:0;top:50%;border-top:3px solid #ffffff14}.dpitch:after{content:"";position:absolute;left:50%;top:50%;width:220px;height:220px;margin:-110px;border:3px solid #ffffff14;border-radius:50%}
  .dbrand{position:absolute;z-index:5;top:96px;left:0;right:0;display:flex;justify-content:center;align-items:center;gap:14px;font-size:30px;font-weight:900;letter-spacing:9px}.dbrand img{width:60px;height:60px;object-fit:contain}
  .d-txt{position:absolute;left:60px;right:60px;text-align:center;font-weight:900;opacity:0}
  .d-type{top:880px;font-size:66px;color:#fff}.d-type i{display:inline-block;width:6px;height:70px;background:#ff3347;vertical-align:-10px;margin-left:6px}
  .d-slam{top:720px;font:900 170px/.95 "Inter Display",Inter,Arial;color:#fff;letter-spacing:-.02em}.d-slam b{display:block;color:#ff3347;text-shadow:0 0 60px #ff334799}
  .d-head{font-size:54px;color:#fff;letter-spacing:1px}.d-head small{display:block;font-size:30px;color:#ffb3ba;letter-spacing:5px;margin-top:6px}
  .d-card{position:absolute;left:0;top:0;width:200px;transform-origin:50% 50%;opacity:0;will-change:transform}
  .d-card .card-shell{width:100%!important;max-width:none!important;margin:0!important}.d-card .card-alt-positions{display:none!important}
  .d-vs{position:absolute;left:50%;top:990px;width:150px;height:150px;margin:-75px;border-radius:50%;background:#c8102e;color:#fff;font-size:58px;font-weight:900;display:flex;align-items:center;justify-content:center;box-shadow:0 0 0 8px #0a0909,0 0 70px #ff334799;z-index:20;opacity:0}
  .d-score{top:700px;font-size:150px;color:#fff;letter-spacing:-2px}.d-score span{color:#ff3347;font-size:90px;margin:0 26px}
  .d-lbls{top:880px;display:flex;justify-content:center;gap:250px;font-size:28px;letter-spacing:4px;color:#ffb3ba}
  .d-sub{top:990px;font-size:44px;color:#efe1b8;line-height:1.3}
  .d-cta{top:760px;font-size:120px;line-height:1;color:#fff}.d-cta b{display:block;color:#ff3347}
  .d-cta2{top:1020px;font-size:40px;color:#efe1b8;font-weight:800}.d-cta3{top:1100px;font-size:38px;color:#ffb3ba;font-weight:800}
  .d-flash{position:absolute;inset:0;background:#fff;opacity:0;pointer-events:none;z-index:40}
  .d-foot{position:absolute;bottom:96px;left:0;right:0;text-align:center;font:800 26px Inter,Arial;letter-spacing:.32em;color:#ffb3b8}
  </style></head><body><div class="dstage"></div><div class="dframe"></div><div class="dpitch" id="pitch"></div><div class="dbrand"><img src="assets/footera/emblem.png">FOOTERA</div>
  <div class="d-txt d-type" id="t1"></div><div class="d-txt d-type" id="t2"></div>
  <div class="d-txt d-slam" id="slam">WER<b>GEWINNT?</b></div>
  <div class="d-txt d-head" id="hH">${home.title}<small>Ø ${f1(home.avg)}</small></div><div class="d-txt d-head" id="hA">${away.title}<small>Ø ${f1(away.avg)}</small></div>
  <div id="cards"></div><div class="d-vs" id="vs">VS</div>
  <div class="d-txt d-score" id="score">${f1(home.avg)}<span>vs</span>${f1(away.avg)}</div><div class="d-txt d-lbls" id="lbls"><div>BEST OF TOTW</div><div>ICONS</div></div>
  <div class="d-txt d-sub" id="sub">${f1(away.avg-home.avg)} Punkte weniger.<br>Schafft die Jubiläums-Elf die Sensation?</div>
  <div class="d-txt d-cta" id="cta">TIPP DAS<b>ERGEBNIS</b></div><div class="d-txt d-cta2" id="cta2">Auflösung am Montag · simuliert in Footera</div><div class="d-txt d-cta3" id="cta3">Schreib deinen Tipp in die Kommentare 👇</div>
  <div class="d-flash" id="flash"></div><div class="d-foot">BUILD YOUR ERA</div>
  <script>
  const HOME=${JSON.stringify(home.rows.map(r=>r.map(c=>c.html)))},AWAY=${JSON.stringify(away.rows.map(r=>r.map(c=>c.html)))};
  const cl=x=>Math.min(1,Math.max(0,x)),ease=x=>1-Math.pow(1-cl(x),3),io=x=>{x=cl(x);return x<.5?4*x*x*x:1-Math.pow(-2*x+2,3)/2};
  const back=x=>{x=cl(x);const c=1.9;return 1+(c+1)*Math.pow(x-1,3)+c*Math.pow(x-1,2)};
  const T1='Die Besten aus 9 Wochen TOTW …',T2='… gegen die größten Legenden.';
  const box=document.getElementById('cards'),cards=[];
  function add(rows,side){rows.forEach((row,ri)=>row.forEach((h,ci)=>{const d=document.createElement('div');d.className='d-card';d.innerHTML=h;box.appendChild(d);cards.push({d,side,ri,ci,n:row.length})}))}
  add(HOME,'H');add(AWAY,'A');
  // layout A: home alone, big, GK bottom. layout B: home top (GK top), away bottom (GK bottom)
  const ROWA=[1500,1190,880,570],GAPA=228,W=200;
  const ROWH=[415,575,735,893],ROWW=[1580,1415,1250,1090],GAPB=150,SB=.6;
  function posA(c){return{x:540+(c.ci-(c.n-1)/2)*GAPA,y:ROWA[c.ri],s:1}}
  function posB(c){const y=c.side==='H'?ROWH[c.ri]:ROWW[c.ri];return{x:540+(c.ci-(c.n-1)/2)*GAPB*(c.n===4?1.12:1.25),y,s:SB}}
  const order=c=>c.ri*4+c.ci; // GK first
  function op(id,o,tr){const e=document.getElementById(id);e.style.opacity=o;if(tr!==undefined)e.style.transform=tr}
  function typed(id,str,t0,t1,t){const n=Math.floor(cl((t-t0)/(t1-t0-0.9))*str.length);const e=document.getElementById(id);e.innerHTML=str.slice(0,n)+(t<t1-.25&&Math.floor(t*2.2)%2===0?'<i></i>':'');e.style.opacity=t>=t0&&t<t1?Math.min(1,(t-t0)/.15,(t1-t)/.25):0}
  window.render=t=>{
   typed('t1',T1,0,2.7,t);typed('t2',T2,2.7,5.2,t);
   const sl=t-5.2;op('slam',sl>=0&&t<7.6?Math.min(1,(7.6-t)/.25):0,'scale('+(sl<0?1:1+1.6*(1-back(sl/0.35))+0.04*sl)+') translate('+(sl>=0&&sl<.4?(Math.sin(sl*90)*16*(1-sl/.4)):0)+'px,0)');
   const fl=Math.max(sl>=0&&sl<.3?(1-sl/.3)*.6:0,(t>=15.9&&t<16.2)?(1-(t-15.9)/.3)*.45:0);op('flash',fl);
   op('pitch',t<7.6?0:t<15?.6*cl((t-7.6)/.6):Math.max(.6*cl((t-7.6)/.6),cl((t-15)/.8))*(t>23.3?1-cl((t-23.3)/.5):1));
   const mv=io((t-15)/.9);
   // headers
   const hHo=t<7.6?0:t<23.3?cl((t-7.6)/.4):1-cl((t-23.3)/.4);op('hH',hHo);document.getElementById('hH').style.top=(250-45*mv)+'px';document.getElementById('hH').style.transform='scale('+(1-.3*mv)+')';
   op('hA',t<16.2?0:t<23.3?cl((t-16.2)/.4):1-cl((t-23.3)/.4));document.getElementById('hA').style.top='1660px';document.getElementById('hA').style.transform='scale(.7)';
   const vs=t-15.9;op('vs',vs<0?0:t<23.3?1:1-cl((t-23.3)/.4),'scale('+(vs<0?0:back(vs/.4))+')');
   for(const c of cards){const o=order(c);let p,a;
    if(c.side==='H'){const t0=7.9+o*0.3;const A=posA(c),B=posB(c);p={x:A.x+(B.x-A.x)*mv,y:A.y+(B.y-A.y)*mv,s:A.s+(B.s-A.s)*mv};const k=t-t0;a=k<0?0:1;p.s*=k<0?0:(0.4+0.6*back(k/.4));if(k>=0&&k<.12)a=k/.12;}
    else{const t0=16.5+o*0.3,k=t-t0,B=posB(c);p={x:B.x,y:B.y+(k<.4?60*(1-ease(k/.4)):0),s:B.s*(k<0?0:0.4+0.6*back(k/.4))};a=k<0?0:Math.min(1,k/.12)}
    if(t>23.3)a*=1-cl((t-23.3)/.4);
    c.d.style.opacity=a;c.d.style.transform='translate('+(p.x-W/2)+'px,'+(p.y-W*0.7)+'px) scale('+p.s+')';c.d.style.zIndex=c.side==='H'?(10-c.ri):(5+c.ri)}
   const sc=t-23.8;op('score',sc<0||t>=27.3?0:Math.min(1,(27.3-t)/.25),'scale('+(sc<0?1:0.6+0.4*back(sc/.4))+')');op('lbls',sc<.3||t>=27.3?0:Math.min(1,(sc-.3)/.3,(27.3-t)/.25));op('sub',sc<.8||t>=27.3?0:Math.min(1,(sc-.8)/.4,(27.3-t)/.25));
   const ct=t-27.4;op('cta',ct<0?0:1,'scale('+(ct<0?1:0.7+0.3*back(ct/.4))+')');op('cta2',ct<.4?0:cl((ct-.4)/.4));op('cta3',ct<.9?0:cl((ct-.9)/.4));
  };
  </script></body></html>`,{waitUntil:'networkidle'});
  await q.evaluate(()=>document.querySelectorAll('img').forEach(i=>{i.loading='eager'}));await q.waitForTimeout(1500);
  fs.mkdirSync(OUT+'/frames',{recursive:true});
  const n=Math.round(TOTAL*FPS),list=ONLY?ONLY.split(',').map(Number):[...Array(n).keys()];
  for(const f of list){await q.evaluate(t=>render(t),f/FPS);await q.screenshot({path:`${OUT}/frames/${String(f).padStart(5,'0')}.jpg`,type:'jpeg',quality:92})}
  fs.writeFileSync(OUT+'/meta.json',JSON.stringify({fps:FPS,total:TOTAL,home:{title:home.title,avg:home.avg,ratings:home.rows.flat().map(c=>c.rating)},away:{title:away.title,avg:away.avg,ratings:away.rows.flat().map(c=>c.rating)}}));
  console.log('frames',list.length);
 }finally{await browser.close();server.close()}
})().catch(e=>{console.error(e);server.close();process.exitCode=1});
