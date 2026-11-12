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
  const names=['Thibaut Courtois','Nuno Mendes','Virgil van Dijk','Willian Pacho','Achraf Hakimi','Rodri','Pedri','Jude Bellingham','Vini Jr.','Kylian Mbappé','Lamine Yamal','Harry Kane','Erling Haaland','Michael Olise','Joshua Kimmich','Aitana Bonmatí','Alexia Putellas'];
  const items=names.map(pick).filter(Boolean).map(b=>makeItem(b,false,{rare:true}));
  state.club=items;state.squad=items.slice(0,11).map(i=>i.uid);state.formation='4-3-3';state.coins=184500;state.points=1200;state.profile.clubName='Footera FC';
  try{save()}catch(_){}
  try{renderWallet();renderHeaderClubName()}catch(_){}
  window.__pick=pick;
 });
 await installStepper(p);
 const pan=async(view,frames,from,to,hold=20)=>{await p.evaluate(v=>{switchView(v,{push:false});window.scrollTo(0,0)},view);await step(hold);
  const max=await p.evaluate(()=>document.scrollingElement.scrollHeight-innerHeight);const a=Math.min(from,max),b=Math.min(to,max);
  for(let i=0;i<frames;i++){const y=a+(b-a)*ease(i/(frames-1));await p.evaluate(y=>{window.scrollTo(0,y);window.__step(1000/30)},y);await shot()}await step(hold)};
 if(scene==='walkout'||scene==='founder'){
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
