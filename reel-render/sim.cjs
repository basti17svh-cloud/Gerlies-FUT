// Phase 1 v2: Icons (user) vs Best of TOTW. Plays real matches until the final score is TARGET (Basti: Icons 3:1).
const {chromium}=require('playwright');const R='/home/user/gerlies-fut',fs=require('fs');
const {server}=require(R+'/tests/3d-highlights.browser.cjs');const OUT=process.argv[2]||'rec2.json',TARGET=(process.env.TARGET||'3:1'),TRIES=+(process.env.TRIES||40);
(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));const url=`http://127.0.0.1:${server.address().port}`;
const b=await chromium.launch();
for(let run=1;run<=TRIES;run++){
const p=await b.newPage({viewport:{width:432,height:960},serviceWorkers:'block'});
await p.addInitScript(()=>{window.__FOOTERA_WEATHER='klar'});
await p.route('**/*',r=>r.request().url().startsWith(url)?r.continue():r.abort());
await p.goto(url);await p.waitForTimeout(3500);
await p.addScriptTag({path:__dirname+'/setup2.js'});
await p.evaluate(()=>{const s=__reelSetup2();
 window.REC=[];const o=ensureMatch3DQueue;ensureMatch3DQueue=function(c){const q=o(c);if(!q.__rec){q.__rec=1;q.play=async ev=>{REC.push({ev:JSON.parse(JSON.stringify(ev)),at:{home:match.home,away:match.away,minute:match.minute}});await new Promise(r=>setTimeout(r,20));return 'done'}}return q};
 matchSpeed=20;startMatch('friendly-random',s.opp);window.__subDone=false});
let st='';
for(let i=0;i<5000;i++){await p.waitForTimeout(120);
 st=await p.evaluate(()=>{if(!match)return 'nomatch';
  if(!__subDone&&match.minute>=63&&!match.paused&&!match.highlight3DPending&&!match.finished){
   pauseForManagement('Wechsel');const d=getMatchManagerDraft();const L=d.lineup;const uidOf=n=>state.club.find(i=>P_BY_ID.get(i.pid)?.name===n)?.uid;
   for(const [o,n] of [['Garrincha','Pelé'],['Iniesta','Diego Armando Maradona'],['Xavi','Andrea Pirlo'],['Ronaldo','Thierry Henry']]){const a=L.indexOf(uidOf(o)),c=L.indexOf(uidOf(n));if(a>=0&&c>=0)[L[a],L[c]]=[L[c],L[a]]}
   confirmMatchManagerChanges();__subDone=true}
  if(match.paused&&!match.finished&&document.getElementById('managerPanel')?.classList.contains('active'))resumeMatch();
  // stop early when the score is already out of reach for TARGET
  return (match.finished?'F ':'')+Math.floor(match.minute)+' '+match.home+':'+match.away});
 if(st.startsWith('F '))break;
 const [h,a]=st.split(' ')[1].split(':').map(Number),[th,ta]=TARGET.split(':').map(Number);if(h>th||a>ta)break}
const fin=st.startsWith('F ')&&st.endsWith(' '+TARGET)&&Number(st.split(' ')[1])<=95;
console.log('run',run,st,fin?'HIT':'');
if(fin){await p.waitForTimeout(4000);
 const res=await p.evaluate(()=>({score:[match.home,match.away],goals:match.goalEvents.map(g=>({m:g.minute,side:g.side,who:g.playerName||g.scorer,assist:g.assist,var:g.varCheck})),
  yellow:match.yellowCards,red:match.redCards,subs:match.substitutionEvents,shots:[match.shotsHome,match.shotsAway],
  rec:REC.map(r=>({id:r.ev.id,type:r.ev.type,cer:r.ev.ceremony,m:r.ev.minute,team:r.ev.team,who:r.ev.playerName,seq:r.ev.sequence,var:r.ev.varCheck,card:r.ev.foulCard,at:r.at})),
  kabine:localStorage.getItem('footera-kabine-v1'),REC}));
 fs.writeFileSync(OUT,JSON.stringify(res));console.log(JSON.stringify({score:res.score,goals:res.goals,yellow:res.yellow,rec:res.rec.map(r=>[r.id,r.m,r.who,r.var,r.card].join('|'))}));
 await p.close();break}
await p.close()}
await b.close();server.close()})();
