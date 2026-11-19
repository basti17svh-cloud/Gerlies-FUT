// Phase 1: play the real match (simulation untouched), record every 3D scene the game queues.
const {chromium}=require('playwright');const R='/home/user/gerlies-fut',fs=require('fs');
const {server}=require(R+'/tests/3d-highlights.browser.cjs');const OUT=process.argv[2]||'rec.json';
(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));const url=`http://127.0.0.1:${server.address().port}`;
const b=await chromium.launch();const p=await b.newPage({viewport:{width:432,height:960},serviceWorkers:'block'});p.on('pageerror',e=>console.log('pe',e.message));
await p.addInitScript(()=>{window.__FOOTERA_WEATHER='klar'});
await p.route('**/*',r=>r.request().url().startsWith(url)?r.continue():r.abort());
await p.goto(url);await p.waitForTimeout(5000);
await p.addScriptTag({path:__dirname+'/setup.js'});
const info=await p.evaluate(()=>{const s=__reelSetup();
 window.REC=[];const o=ensureMatch3DQueue;ensureMatch3DQueue=function(c){const q=o(c);if(!q.__rec){q.__rec=1;q.play=async ev=>{REC.push({ev:JSON.parse(JSON.stringify(ev)),at:{home:match.home,away:match.away,minute:match.minute,poss:match.poss,shotsHome:match.shotsHome,shotsAway:match.shotsAway}});await new Promise(r=>setTimeout(r,30));return 'done'}}return q};
 matchSpeed=25;startMatch('friendly-random',s.opp);
 window.__subDone=false;return s});
console.log(JSON.stringify(info));
for(let i=0;i<4000;i++){await p.waitForTimeout(150);
 const st=await p.evaluate(()=>{if(!match)return 'nomatch';
  if(!__subDone&&match.minute>=63&&!match.paused&&!match.highlight3DPending&&!match.finished){
   pauseForManagement('Wechsel');const d=getMatchManagerDraft();const L=d.lineup;const uidOf=n=>state.club.find(i=>P_BY_ID.get(i.pid)?.name.includes(n))?.uid;
   const pairs=[['Wilson','Baena'],['Dumornay','Wirtz'],['Giugliano','McTominay'],['Hakimi','Carpenter']];
   for(const [o,n] of pairs){const a=L.indexOf(uidOf(o)),c=L.indexOf(uidOf(n));if(a>=0&&c>=0){[L[a],L[c]]=[L[c],L[a]]}}
   confirmMatchManagerChanges();__subDone=true;return 'sub '+match.minute}
  if(match.paused&&!match.finished&&document.getElementById('managerPanel')?.classList.contains('active'))resumeMatch();
  if(match.penaltyActive&&typeof window.__pen!=='number'){window.__pen=1}
  return (match.finished?'F ':'')+Math.floor(match.minute)+' '+match.home+':'+match.away+' rec'+REC.length});
 if(i%20===0||/sub|F/.test(st))console.log(st);
 if(st.startsWith('F ')){await p.waitForTimeout(3000);break}}
const res=await p.evaluate(()=>({score:[match.home,match.away],pens:[match.pensHome,match.pensAway],goals:match.goalEvents.map(g=>({m:g.minute,side:g.side,who:g.playerName||g.scorer,assist:g.assist,var:g.varCheck})),
 yellow:match.yellowCards,red:match.redCards,subs:match.substitutionEvents,fouls:match.fouls,shots:[match.shotsHome,match.shotsAway],xg:[match.xgHome,match.xgAway],poss:match.poss,
 rec:REC.map(r=>({id:r.ev.id,type:r.ev.type,cer:r.ev.ceremony,m:r.ev.minute,team:r.ev.team,who:r.ev.playerName,seq:r.ev.sequence,var:r.ev.varCheck,card:r.ev.foulCard,at:r.at})),
 log:[...document.querySelectorAll('#matchLog > *')].map(e=>e.textContent).slice(0,200),REC}));
fs.writeFileSync(OUT,JSON.stringify(res));
console.log(JSON.stringify({score:res.score,pens:res.pens,goals:res.goals,yellow:res.yellow,red:res.red,subs:res.subs,rec:res.rec},null,0));
await b.close();server.close()})();
