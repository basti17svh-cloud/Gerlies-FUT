// Mobile check: real Rivals match finish feeds the Freundesliga; board, Sunday reward, claim and reload.
const {chromium}=require('playwright'),http=require('http'),fs=require('fs'),path=require('path'),assert=require('node:assert/strict');
const root=path.join(__dirname,'..');const mime={'.js':'text/javascript','.mjs':'text/javascript','.html':'text/html','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.csv':'text/csv','.png':'image/png','.webp':'image/webp'};
const server=http.createServer((req,res)=>{let file=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname);if(file===root)file=path.join(root,'index.html');if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return}try{res.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');res.end(fs.readFileSync(file))}catch{res.writeHead(404).end()}});
const hide='#bootIntro,#dbGate,#onboard,#onboarding,#usernameRequiredModal,#footeraAccountDialog,#footeraAnalyticsConsent{display:none!important}';
const F1='00000000-0000-4000-8000-00000000b002',F2='00000000-0000-4000-8000-00000000b003';
async function boot(p,base){await p.goto(base,{waitUntil:'load'});await p.waitForFunction(()=>typeof PLAYERS!=='undefined'&&PLAYERS.length>10000&&!!window.FooteraRivalsLeague&&!!window.FooteraTournaments,null,{timeout:90000});await p.addStyleTag({content:hide})}
// Fake online friends board (no network): two friends with points in the same week.
const fakeOnline=([f1,f2,closed])=>{const o=window.FooteraOnline;o.ready=true;o.userId='00000000-0000-4000-8000-00000000b001';
 o.authClient=async()=>({rpc:async(name,args)=>name==='footera_rivals_league_board'?{data:[{user_id:f1,club_name:'Kickers Nord',points:7,wins:2,draws:1,losses:1,goals_for:6,goals_against:4,closed},{user_id:f2,club_name:'Real Freunde 09 mit langem Namen',points:3,wins:1,draws:0,losses:3,goals_for:3,goals_against:7,closed}],error:null}:{data:{week:args.p_week},error:null}})};
(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port,b=await chromium.launch({headless:true});
 try{const ctx=await b.newContext({serviceWorkers:'block',timezoneId:'Europe/Berlin',viewport:{width:390,height:844}});await ctx.route('**/*',r=>r.request().url().startsWith(base)?r.continue():r.abort());
  const p=await ctx.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));await boot(p,base);
  fs.mkdirSync(path.join(root,'test-artifacts'),{recursive:true});
  await p.evaluate(([f1,f2])=>{state.onboarded=true;state.profile.username='Liga QA';state.profile.clubName='QA Liga FC';state.friends=[{onlineUid:f1,clubName:'Kickers Nord'},{onlineUid:f2,clubName:'Real Freunde 09'}];
   const o=FooteraTournaments.opponent('open');state.club=o.squad.map(x=>makeItem(x,false));state.squad=state.club.map(i=>i.uid).concat(Array(5).fill(null));state.squadPresets[0].squad=[...state.squad];state.squadPresets[0].formation='4-3-3';state.activeSquadPreset=0;state.formation='4-3-3';initMatch3D=()=>{};queueMatchCeremony3D=()=>false},[F1,F2]);
  await p.evaluate(fakeOnline,[F1,F2,false]);
  // Three real Rivals matches through the normal finish handler: 2:0, 1:1, 3:1.
  for(const [h,a] of [[2,0],[1,1],[3,1]]){await p.evaluate(([h,a])=>{startMatch('rivals');if(!match||match.mode!=='rivals')throw Error('no rivals match');stopMatchTimer();match.home=h;match.away=a;match.minute=90;finishMatch();document.getElementById('match').classList.remove('active');match=null},[h,a])}
  const key=await p.evaluate(()=>FooteraRivalsLeague.leagueWindow().key);
  const own=await p.evaluate(k=>state.rivalsLeague.weeks[k],key);
  assert.deepEqual({w:own.wins,d:own.draws,l:own.losses,gf:own.gf,ga:own.ga},{w:2,d:1,l:0,gf:6,ga:2});
  await p.evaluate(async()=>{await FooteraRivalsLeague.refresh(true);switchView('playView',{push:false});FooteraPlayHub.open('rivals');FooteraRivalsLeague.render()});
  const table=await p.evaluate(()=>[...document.querySelectorAll('#rvLeague .rivals-league-table li')].map(li=>li.querySelector('.rivals-league-club').textContent.trim()));
  assert.deepEqual(table,['QA Liga FC Du','Kickers Nord','Real Freunde 09 mit langem Namen']);
  for(const w of [360,390,412]){await p.setViewportSize({width:w,height:844});await p.locator('#rvLeague').scrollIntoViewIfNeeded();await p.locator('#rvLeague').screenshot({path:path.join(root,'test-artifacts/rivals-league-'+w+'.png')});assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'mobile overflow '+w)}
  // Friends area shows the same board.
  await p.evaluate(()=>{switchView('socialView',{push:false});FooteraFriendsHub.open('duels');FooteraRivalsLeague.render()});
  assert.equal(await p.evaluate(()=>document.querySelectorAll('#friendsLeague .rivals-league-table li').length),3);
  await p.setViewportSize({width:390,height:844});await p.locator('#friendsLeague').screenshot({path:path.join(root,'test-artifacts/rivals-league-friends.png')});
  // Sunday 19:11: the week is closed on the server -> Platz 1 reward row, claim, reload keeps it claimed.
  await p.evaluate(fakeOnline,[F1,F2,true]);
  const row=await p.evaluate(async k=>{const realNow=Date.now;const end=FooteraRivalsLeague.leagueWindow().end.getTime()+11*60000;Date.now=()=>end;try{await FooteraRivalsLeague.finalize(true)}finally{Date.now=realNow}return state.weeklyRewards.find(r=>r.mode==='league'&&r.week===k)},key);
  assert.equal(row.place,1);assert.equal(row.players,3);assert.equal(row.reward.coins,12000);
  const before=await p.evaluate(()=>state.coins);
  await p.evaluate(()=>{switchView('homeView',{push:false});renderAll();FooteraWeeklyRewards.open('league',FooteraRivalsLeague.leagueWindow().key)});
  await p.locator('#weeklyRewardModal').screenshot({path:path.join(root,'test-artifacts/rivals-league-reward.png')});
  assert.match(await p.locator('#weeklyRewardModalBody').innerText(),/Platz 1 von 3/i);
  await p.click('[data-weekly-reward-claim="league"]');
  assert.equal(await p.evaluate(()=>state.coins),before+12000);
  await p.evaluate(()=>flushSave());await p.reload({waitUntil:'load'});await p.waitForFunction(()=>typeof PLAYERS!=='undefined'&&PLAYERS.length>10000&&!!window.FooteraRivalsLeague,null,{timeout:90000});
  const after=await p.evaluate(k=>({claimed:state.weeklyRewards.filter(r=>r.mode==='league'&&r.week===k).map(r=>r.claimed),coins:state.coins,pack:state.packs['reward-84-1']}),key);
  assert.deepEqual(after,{claimed:[true],coins:before+12000,pack:1});
  const relevant=errors.filter(e=>/league|rivals|Freundesliga/i.test(e));
  console.log('PASS: real Rivals finishes, board 360/390/412, friends area, Sunday reward, claim, reload',JSON.stringify(errors));
  if(relevant.length)throw Error(relevant.join('\n'));await ctx.close()}finally{await b.close();server.close()}})().catch(e=>{console.error(e);server.close();process.exitCode=1});
