// node ui.cjs <scene> <outDir> [dpr]  -- trailer UI captures (marketing only, never merged)
const fs=require('fs'),path=require('path');const {open,installStepper}=require('./ui-common.cjs');
const [scene,out,dpr='3']=process.argv.slice(2);fs.mkdirSync(out,{recursive:true});
const SAMPLE=(process.env.SAMPLE||'').split(',').filter(Boolean).map(Number);
(async()=>{const s=await open({dpr:+dpr});const p=s.page;let n=0,f=0;
 const shot=async()=>{if(!SAMPLE.length||SAMPLE.includes(f))await p.screenshot({path:path.join(out,SAMPLE.length?`s${f}.jpg`:`f${String(n++).padStart(4,'0')}.jpg`),type:'jpeg',quality:92});f++};
 const step=async(frames,fn)=>{for(let i=0;i<frames;i++){await p.evaluate(([i,frames,src])=>{if(src)(0,eval)(src)(i,frames);window.__step(1000/30)},[i,frames,fn?fn.toString():null]);await shot()}};
 const ease=t=>t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2;
 await p.evaluate(()=>{
  const pick=n=>PLAYERS.find(x=>x.name===n);
  const names=['Thibaut Courtois','Nuno Mendes','Virgil van Dijk','Willian Pacho','Achraf Hakimi','Rodri','Pedri','Jude Bellingham','Vini Jr.','Kylian Mbappé','Lamine Yamal','Harry Kane','Erling Haaland','Michael Olise','Joshua Kimmich','Aitana Bonmatí','Alexia Putellas','Jan Oblak','Gabriel','Florian Wirtz','Leroy Sané','Bukayo Saka'];
  const items=names.map(pick).filter(Boolean).map(b=>makeItem(b,false,{rare:true}));
  state.club=items;state.squad=items.slice(0,18).map(i=>i.uid);state.formation='4-3-3';state.coins=184500;state.points=1200;state.profile.clubName='Footera FC';
  try{save()}catch(_){}
  try{renderWallet();renderHeaderClubName()}catch(_){}
  window.__pick=pick;
 });
 await installStepper(p);
 const pan=async(view,frames,from,to,hold=20)=>{await p.evaluate(v=>{switchView(v,{push:false});window.scrollTo(0,0)},view);await step(hold);
  const max=await p.evaluate(()=>document.scrollingElement.scrollHeight-innerHeight);const a=Math.min(from,max),b=Math.min(to,max);
  for(let i=0;i<frames;i++){const y=a+(b-a)*ease(i/(frames-1));await p.evaluate(y=>{window.scrollTo(0,y);window.__step(1000/30)},y);await shot()}await step(hold)};
 if(scene==='kurier'||scene==='kabine'){
  const XI=JSON.parse(fs.readFileSync(path.join(__dirname,'xi-full.json'),'utf8'));
  const res=await p.evaluate((XI)=>{
   FooteraHighlights.setMode('off');
   const byId=id=>PLAYERS.find(x=>String(x.id)===String(id));const pk=r=>byId(r.id)||__pick(r.name);
   const home=XI.home.map(pk).filter(Boolean);const items=home.map(b=>makeItem(b,false,{rare:true}));state.club=items;state.squad=items.slice(0,18).map(i=>i.uid);state.profile.clubName=XI.homeName;try{renderHeaderClubName()}catch(_){}
   const want='Michael Olise';const orig=chooseMatchAttacker;chooseMatchAttacker=function(side,kind,ex){if(side==='home'&&match&&match.minute>=86){const r=matchActorRows(side).find(r=>(r.base?.name||r.name||'')===want);if(r)return r}return orig.apply(this,arguments)};
   const opp=XI.away.slice(0,11).map(pk).filter(Boolean);
   let tries=0;
   for(;tries<6000;tries++){
    try{cancelMatch3D();stopMatchTimer()}catch(_){}
    localStorage.removeItem('footera-kabine-v1');
    startMatch('rivals',{name:XI.awayName,rating:88,chem:33,power:89,formation:'4-3-3',tactic:'balanced',squad:opp});
    try{cancelMatch3D();stopMatchTimer()}catch(_){}
    match.injuryTriggered=true;let g=0;while(!match.finished&&g++<5000){simTick();try{cancelMatch3D();if(match.highlightActive)dismissMatchGoalMoment(false)}catch(_){}match.highlightActive=false;match.highlight3DPending=false;match.paused=false}
    const ge=match.goalEvents||[],last=ge[ge.length-1];
    if(match.home===3&&match.away===2&&last&&last.side==='home'&&last.minute>=89&&/Olise/.test(last.playerName||''))break;
   }
   try{document.getElementById('footeraWinInvite')?.remove()}catch(_){}
   state.stats=state.stats||{};state.stats.matches=27;
   return {tries,score:[match.home,match.away],goals:(match.goalEvents||[]).map(e=>e.minute+e.side+' '+e.playerName)};
  },XI);console.log(JSON.stringify(res));
  await step(10);
  if(scene==='kurier'){await p.evaluate(()=>{document.getElementById('footeraWinInvite')?.remove();FooteraNewspaper.open(match)});await step(45);
   const max=await p.evaluate(()=>{const m=document.getElementById('newspaperModal');return m.scrollHeight-m.clientHeight});
   for(let i=0;i<150;i++){const y=max*ease(i/149)*.85;await p.evaluate(y=>{document.getElementById('newspaperModal').scrollTop=y;window.__step(1000/30)},y);await shot()}await step(30);}
  else{await p.evaluate(()=>{document.getElementById('footeraWinInvite')?.remove();const v=JSON.parse(localStorage.getItem('footera-kabine-v1')||'{}');v.seen=0;localStorage.setItem('footera-kabine-v1',JSON.stringify(v));FooteraKabine.open()});await step(+(process.env.FRAMES||300));
   await p.evaluate(()=>{const b=[...document.querySelectorAll('#kabineModal button')].find(x=>/Pizza/.test(x.textContent));b&&b.click()});await step(90);}
 } else if(scene==='walkout'||scene==='founder'){
  await p.evaluate(scene=>{
   if(scene==='founder'){const r=FOUNDER_RULES[0];ownsFounderRule=()=>true;state[r.opening]=true;state.club=state.club.filter(i=>i.pid!==r.playerId);openPack(r.packId,[r.create()]);}
   else{const it=['Kylian Mbappé','Florian Wirtz','Leroy Sané','Granit Xhaka','Serge Gnabry','Robert Andrich'].map(__pick).filter(Boolean).map((b,i)=>makeItem(b,true,{rare:i<3}));openPack('ultimate',it);}
  },scene);
  await step(25);await p.evaluate(()=>document.getElementById('openPackBtn').click());await step(+(process.env.FRAMES||420));
 } else {
  const cfg={home:['homeView',150,0,700],squad:['squadView',120,0,300],store:['storeView',150,0,900],sbc:['sbcView',150,0,700],evo:['evolutionView',150,0,800],events:['eventsView',150,0,900],play:['playView',150,0,1100],pass:['seasonPassView',150,0,800],club:['clubView',150,0,800]}[scene];
  await pan(...cfg);
 }
 console.log('frames',n,'sampled',f);await s.close()})().catch(e=>{console.error(e);process.exit(1)});
