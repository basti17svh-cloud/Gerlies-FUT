const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'..'),app=fs.readFileSync(path.join(root,'footera-app.js'),'utf8');
const section=(a,b)=>{const i=app.indexOf(a);assert.ok(i>=0,a);const j=app.indexOf(b,i);assert.ok(j>i,b);return app.slice(i,j)};
const line=name=>app.match(new RegExp('^function '+name+'\\(.*$','m'))[0];
const RELEASE='2026-11-12T18:00:00Z',END='2026-11-19T18:00:00Z';
function setup(){
 const c={nationLabel:x=>x};vm.createContext(c);
 vm.runInContext(fs.readFileSync(path.join(root,'footera-time.js'),'utf8'),c);
 vm.runInContext(line('hashNum')+section('const MARQUEE_RELEASES=','// Tägliche SBCs:')+section('function marqueeClubMatch(','// Sunday Halloween SBC'),c);
 return c;
}
const rows=(c,at=RELEASE)=>vm.runInContext('activeMarqueeSBCs(new Date('+JSON.stringify(at)+'))',c);
function database(c){
 vm.runInContext(line('normalizeKey')+line('rarityOf')+section('const API_SPORTS_LEAGUE_IDS=','async function loadVerifiedBadges(')+section('function first(raw,','function keyNameTeam(')+section('const TOP5_CLUB_LEAGUES=','async function fetchText('),c);
 c.badges=JSON.parse(fs.readFileSync(path.join(root,'assets/badge-manifest.json'),'utf8'));vm.runInContext('VERIFIED_BADGES=badges',c);
 return c.parseCSV(fs.readFileSync(path.join(root,'assets/players-db.csv'),'utf8')).filter(p=>p.gender==="Men's Football").map(c.normCSV);
}
test('Nov 12 switches from previous release at 19 Berlin, with fresh stable IDs and a hard expiry',()=>{
 const c=setup(),r=rows(c),old=rows(c,'2026-11-12T17:59:59.999Z');
 assert.deepEqual(Array.from(r,s=>s.name),['Rochdale – York City','Stockport County – Reading','Granada CF – UD Las Palmas','Real Oviedo – Girona FC']);
 assert.equal(old[0].releaseKey,'2026-11-05');assert.equal(r.length,4);assert.equal(new Set(r.map(s=>s.id)).size,4);assert.equal(new Set(r.map(s=>s.groupSet)).size,1);
 for(const at of ['2026-11-13T00:00:00Z','2026-11-16T12:00:00Z','2026-11-19T17:59:59.999Z'])assert.deepEqual(Array.from(rows(c,at),s=>s.id),Array.from(r,s=>s.id));
 assert.equal(rows(c,END).length,0);
 for(let i=0;i<4;i++){
  const s=r[i];assert.equal(s.groupSet,'top_partien_2026-11-12_fixtures');assert.match(s.id,/^top_partien_2026-11-12_fixtures_[a-z-]+$/);assert.equal(s.expiresAt,Date.parse(END));assert.ok(Date.parse(s.kickoffAt)>Date.parse(RELEASE)&&Date.parse(s.kickoffAt)<Date.parse(END));
  assert.ok(!old.some(o=>o.id===s.id));for(const a of s.matchClubs.flat())assert.ok(!old.some(o=>o.matchClubs.flat().includes(a)));
  for(const k of ['count','minAvg','minChem','minRare','minLeagues','maxSameClub','minMatchLeaguePlayers','minNations','minClubs','minEitherMatchClub','maxNations','requireBothMatchClubs'])assert.equal(s[k],old[i][k],k);
  assert.deepEqual(JSON.parse(JSON.stringify(s.reward)),JSON.parse(JSON.stringify(old[i].reward)));assert.deepEqual(JSON.parse(JSON.stringify(s.groupReward)),{pack:'primegold',qty:1});
 }
 assert.equal(r[0].kickoffAt,'2026-11-14T16:00:00+01:00');assert.equal(r[1].kickoffAt,'2026-11-14T16:00:00+01:00');assert.equal(r[2].kickoffAt,'2026-11-15T16:15:00+01:00');assert.equal(r[3].kickoffAt,'2026-11-14T21:00:00+01:00');
});
test('all eight clubs resolve from the actual men database, including normalized second-division leagues',()=>{
 const c=setup(),db=database(c);
 for(const s of rows(c))for(const aliases of s.matchClubs){
  const players=db.filter(p=>c.marqueeClubMatch(p.team,aliases));assert.ok(players.length>=11,s.name+' '+aliases[0]);
  for(const p of players){const again=c.leagueFromClub(p.team,p.league,p.leagueId,p.gender,p.source);assert.ok(c.marqueeLeagueMatch(again,s.matchLeague),p.team+': '+again+' / '+s.matchLeague);}
 }
 const normalized=c.leagueFromClub('Granada CF','LALIGA HYPERMOTION','','Men\'s Football','fc27-open-data');assert.equal(normalized,'LaLiga 2');assert.equal(c.leagueFromClub('Granada CF',normalized),'LaLiga 2');
 assert.ok(!c.marqueeLeagueMatch('LALIGA EA SPORTS','LaLiga 2'));assert.ok(!c.marqueeClubMatch('New York City FC',['York City']));assert.ok(!c.marqueeLeagueMatch('EFL League Two','EFL League One'));
});

function runtime(){
 const c=setup(),db=database(c);
 vm.runInContext(section('const COUNTRY_CODES=','function hashNum(')+section('const FORMATIONS={','};')+'};'+section('function posFit(','function arrangeSquad(')+line('inPosition')+line('chemThreshold')+section('function chemNationKey(','function squadChemistry(')+section('function isBaseRare(','function isStoryItem(')+section('function sbcChemScores(','function sbcRequirementSummary('),c);
 c.db=db;
 Object.assign(c,{displayBase:p=>p,itemRating:p=>p.ovr,isFounderItem:()=>false,isStoryItem:()=>false,isFooteraLiveCard:()=>false,resolvedAffiliation:p=>({...p,league:c.leagueFromClub(p.team,p.league,p.leagueId,p.gender,p.source)})});
 return c;
}
function solution(c,s){
 const pool=c.db.slice().sort((a,b)=>b.ovr-a.ovr||String(a.id).localeCompare(String(b.id))),slots=['GK','LB','CB','CB','RB','CM','CM','CM','LW','ST','RW'];
 const spanish=p=>p.nation==='Spain',english=p=>p.nation==='England';
 const league=p=>c.marqueeLeagueMatch(p.league,s.matchLeague),club=p=>s.matchClubs.some(a=>c.marqueeClubMatch(p.team,a));
 const anchors=s.order===0?[p=>english(p)&&p.league==='Bundesliga',p=>english(p)&&p.league==='LALIGA EA SPORTS']:s.order===1?[league,league]:s.order===2?[p=>spanish(p)&&league(p)&&club(p),p=>spanish(p)&&league(p),p=>spanish(p)&&league(p)]:s.matchClubs.map(a=>p=>spanish(p)&&c.marqueeClubMatch(p.team,a));
 const chosen=Array(11).fill(null),used=new Set();
 for(const filter of anchors){
  let found=false;
  for(const p of pool.filter(filter)){
   const i=slots.findIndex((slot,i)=>!chosen[i]&&c.inPosition(p,slot));if(i<0||used.has(p.id))continue;
   chosen[i]=p;used.add(p.id);found=true;break;
  }
  assert.ok(found,'available anchor for '+s.name);
 }
 const fillFilter=s.order===0?english:s.order===1?p=>p.league==='Premier League':spanish;
 for(const i of [0,1,4,8,10,9,2,3,5,6,7])if(!chosen[i]){
  const p=pool.find(p=>fillFilter(p)&&!used.has(p.id)&&c.inPosition(p,slots[i]));assert.ok(p,'available '+slots[i]);chosen[i]=p;used.add(p.id);
 }
 return chosen.map((p,i)=>({...p,uid:s.id+'-'+i}));
}
function stats(c,s,items){c.sbcSourceMap=()=>new Map(items.map(item=>[item.uid,{item}]));return c.sbcDraftStats(s,{squad:items.map(p=>p.uid)})}

test('all four unmodified requirements are achievable with real base players and actual rating/chemistry checks',()=>{
 const c=runtime();
 for(const s of rows(c)){
  const items=solution(c,s),r=stats(c,s,items);
  assert.equal(r.ok,true,s.name+' '+JSON.stringify({...r,items:items.map(p=>({name:p.name,ovr:p.ovr,team:p.team,league:p.league}))}));
  assert.equal(new Set(items.map(p=>p.id)).size,11);
  if(s.minMatchLeaguePlayers){const wrong=items.map(p=>({...p,league:'Wrong League'}));assert.equal(stats(c,s,wrong).minMatchLeaguePlayersOk,false);}
  if(s.minEitherMatchClub||s.requireBothMatchClubs){const wrong=items.map(p=>({...p,team:'Unrelated Club'})),bad=stats(c,s,wrong);assert.equal(bad.ok,false);assert.equal(s.requireBothMatchClubs?bad.requireBothMatchClubsOk:bad.minEitherMatchClubOk,false);}
  if(s.requireBothMatchClubs){const one=items.map(p=>({...p,team:s.matchClubs[0][0]}));assert.equal(stats(c,s,one).requireBothMatchClubsOk,false);}
 }
});

test('real isolated 44-player submission flow consumes once, persists completion and grants one group bonus',()=>{
 const c=runtime(),r=rows(c),grants=[],drafts=new Map(),old=rows(c,'2026-11-12T17:59:59Z'),oldClaims={old_group:true,[old[0].groupSet]:true};
 let saves=0;const all=[];for(const s of r){const items=solution(c,s);all.push(...items);drafts.set(s.id,{squad:items.map(p=>p.uid)})}
 Object.assign(c,{state:{club:all,sbcStorage:[],transferList:[],squad:[],squadPresets:[],stats:{sbcs:0},sbcCompletions:{[old[0].id]:true},sbcGroupClaims:{...oldClaims}},history:{state:null},SBC_WORKSPACE:{},queuedSbcGroupRewardPack:null,
 allActiveSBCs:()=>r,getActiveSbcById:id=>r.find(s=>s.id===id),sbcDraft:s=>drafts.get(s),sbcSourceMap:()=>new Map(c.state.club.map(item=>[item.uid,{item}])),
 ensureObjectiveWindows(){},persistActiveSquadPreset(){},removeActiveEvolutionForUid(){},persistSbcWorkspace(){},save(){saves++},renderAll(){},toast(){},sbcRewardText:()=>'',grant:reward=>grants.push(JSON.parse(JSON.stringify(reward)))});
 vm.runInContext(section('function sbcIsCompleted(','function sbcTimeLeft(')+section('function sbcGroupProgress(','// Event names')+section('function maybeGrantSbcGroupReward(','function submitSbcById('),c);
 // A stale last-week ID cannot consume the newly prepared squad.
 c.finalizeSbcSubmission(old[0].id);assert.equal(c.state.club.length,44);assert.equal(grants.length,0);
 for(let i=0;i<4;i++){
  const s=r[i];assert.equal(c.sbcDraftStats(s).ok,true,s.name);c.finalizeSbcSubmission(s.id);
  assert.equal(c.state.club.length,44-11*(i+1));assert.equal(grants.length,i===3?5:i+1);
  c.finalizeSbcSubmission(s.id);assert.equal(grants.length,i===3?5:i+1,'double click is idempotent');
  // Simulated save/reload preserves receipts and confirmed previous-week claims.
  c.state=JSON.parse(JSON.stringify(c.state));assert.equal(c.state.sbcCompletions[s.id],true);assert.equal(c.state.sbcGroupClaims[old[0].groupSet],true);
 }
 assert.equal(saves,4);assert.equal(c.state.stats.sbcs,4);assert.equal(grants[4].pack,'primegold');assert.equal(c.state.sbcGroupClaims[r[0].groupSet],true);
 c.maybeGrantSbcGroupReward(r[0]);assert.equal(grants.length,5);assert.equal(c.state.sbcCompletions[old[0].id],true);
 c.getActiveSbcById=()=>null;c.finalizeSbcSubmission(r[0].id);assert.equal(grants.length,5,'expired ID is rejected');
});
