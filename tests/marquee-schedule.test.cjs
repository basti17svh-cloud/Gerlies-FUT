const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const app=fs.readFileSync(require('node:path').join(__dirname,'../footera-app.js'),'utf8');
const section=(a,b)=>app.slice(app.indexOf(a),app.indexOf(b,app.indexOf(a)));
function setup(){
 const ctx={nationLabel:x=>x};vm.createContext(ctx);
 vm.runInContext(fs.readFileSync(require('node:path').join(__dirname,'../footera-time.js'),'utf8'),ctx);
 vm.runInContext(app.match(/^function hashNum\(.*$/m)[0],ctx);
 vm.runInContext(section('const MARQUEE_RELEASES=','// Tägliche SBCs:'),ctx);
 vm.runInContext(section('function activeMarqueeSBCs(','function activeEventPlayerSBCs('),ctx);
 vm.runInContext(app.match(/^function sbcContentWindowKey\(.*$/m)[0],ctx);
 return ctx;
}
function rows(c,at){return vm.runInContext(`activeMarqueeSBCs(new Date(${JSON.stringify(at)}))`,c)}
test('current Top-Partien are immediately available until Thursday November 5 at 19 Berlin',()=>{
 const c=setup(),r=rows(c,'2026-10-29T21:00:00Z');
 assert.equal(r.length,4);
 for(const s of r){assert.equal(s.releaseKey,'2026-10-29');assert.equal(s.expiresAt,Date.parse('2026-11-05T18:00:00Z'));assert.equal(s.once,true);}
 assert.deepEqual(Array.from(rows(c,'2026-11-01T23:00:00Z'),s=>s.id),Array.from(r,s=>s.id),'no midnight or four-day rollover');
});
test('weekly scheduling stays at 19 Berlin across summer and winter time',()=>{
 const c=setup();
 for(const [before,after,expiry] of [
  ['2026-10-29T17:59:59Z','2026-10-29T18:00:00Z','2026-11-05T18:00:00Z'],
  ['2026-07-09T16:59:59Z','2026-07-09T17:00:00Z','2026-07-16T17:00:00Z'],
  ['2026-03-26T17:59:59Z','2026-03-26T18:00:00Z','2026-04-02T17:00:00Z'],
  ['2026-10-22T16:59:59Z','2026-10-22T17:00:00Z','2026-10-29T18:00:00Z']
 ]){
  assert.equal(vm.runInContext(`nextSbcWeeklyReset(new Date("${before}")).toISOString()`,c),new Date(after).toISOString());
  assert.equal(vm.runInContext(`nextSbcWeeklyReset(new Date("${after}")).toISOString()`,c),new Date(expiry).toISOString());
 }
});
test('release uses four verified upcoming fixtures and fresh completion IDs',()=>{
 const c=setup(),r=rows(c,'2026-10-29T18:00:00Z');
 assert.deepEqual(Array.from(r,s=>s.name),['LOSC Lille – RC Lens','Chelsea – Manchester United','Bayern München – Borussia Dortmund','AC Milan – Inter']);
 for(const s of r){
  assert.match(s.id,/^top_partien_2026-10-29_fixtures_([124]|bayern-dortmund)$/);
  assert.ok(Date.parse(s.kickoffAt)>Date.parse('2026-10-29T18:00:00Z')&&Date.parse(s.kickoffAt)<s.expiresAt);
  assert.match(s.sourceUrl,/^https:/);assert.equal(s.matchClubs.length,2);
 }
 assert.equal(r[2].minEitherMatchClub,1);assert.equal(r[3].requireBothMatchClubs,true);
 assert.equal(new Set(r.map(s=>s.groupSet)).size,1);
 assert.equal(rows(c,'2026-10-29T17:59:59Z').length,0,'never launch before Thursday 19');
 assert.equal(rows(c,'2026-11-19T18:00:00Z').length,0,'never relabel old fixtures as a fresh week');
});
test('weekly boundary refreshes an open SBC view independently of daily and grind keys',()=>{
 const c=setup();c.promoWindowKey=()=> 'same-daily-key';c.sbcRotationWindow=()=>({key:'same-grind-key'});
 const key=at=>vm.runInContext(`sbcContentWindowKey(new Date(${JSON.stringify(at)}))`,c);
 assert.notEqual(key('2026-10-29T17:59:59Z'),key('2026-10-29T18:00:00Z'));
 assert.equal(key('2026-10-29T18:00:00Z'),key('2026-10-30T00:00:00Z'));
});

test('correcting Bundesliga fixture preserves other completions and group claim while retiring the old draft',()=>{
 const c=setup(),r=rows(c,'2026-10-29T18:00:00Z');
 const oldIds=[1,2,3,4].map(i=>'top_partien_2026-10-29_fixtures_'+i);
 const state={sbcCompletions:Object.fromEntries(oldIds.map(id=>[id,true])),sbcGroupClaims:{top_partien_2026_ignored:false}};
 const group=r[0].groupSet;state.sbcGroupClaims[group]=true;
 assert.deepEqual(Array.from(r.filter(s=>state.sbcCompletions[s.id]),s=>s.order),[0,1,3]);
 assert.equal(r[2].id,'top_partien_2026-10-29_fixtures_bayern-dortmund');
 assert.ok(!r.some(s=>s.id===oldIds[2]),'old Leverkusen draft cannot be submitted as Bayern');
 assert.equal(state.sbcGroupClaims[r[2].groupSet],true,'already claimed group bonus remains claimed');
 assert.match(r[2].matchClubs[0].join('|'),/Bayern/);assert.match(r[2].matchClubs[1].join('|'),/Dortmund/);
});

test('November 5 release switches exactly at 19, remains stable and expires without recycling',()=>{
 const c=setup(),old=rows(c,'2026-11-05T17:59:59Z'),r=rows(c,'2026-11-05T18:00:00Z');
 assert.equal(old[0].releaseKey,'2026-10-29');
 assert.deepEqual(Array.from(r,s=>s.name),['1. FC Köln – Bayer Leverkusen','Nottingham Forest – Manchester City','Fiorentina – Juventus','Atlético de Madrid – FC Barcelona']);
 const ids=Array.from(r,s=>s.id);
 assert.equal(new Set(ids).size,4);assert.equal(new Set(r.map(s=>s.matchLeague)).size,4);
 for(const at of ['2026-11-06T00:00:00Z','2026-11-09T18:00:00Z','2026-11-12T17:59:59Z'])assert.deepEqual(Array.from(rows(c,at),s=>s.id),ids);
 assert.equal(rows(c,'2026-11-19T18:00:00Z').length,0);
 for(const s of r){assert.equal(s.expiresAt,Date.parse('2026-11-12T18:00:00Z'));assert.ok(Date.parse(s.kickoffAt)>Date.parse('2026-11-05T18:00:00Z')&&Date.parse(s.kickoffAt)<s.expiresAt);assert.ok(!old.some(o=>o.id===s.id));}
 // No club repetition, including aliases, and no reward/requirement change.
 for(let i=0;i<4;i++){
  for(const club of r[i].matchClubs.flat())assert.ok(!old.some(o=>o.matchClubs.flat().includes(club)));
  for(const k of ['count','minAvg','minChem','minRare','minLeagues','maxSameClub','minMatchLeaguePlayers','minNations','minClubs','minEitherMatchClub','maxNations','requireBothMatchClubs'])assert.equal(r[i][k],old[i][k],k);
  assert.deepEqual(JSON.parse(JSON.stringify(r[i].reward)),JSON.parse(JSON.stringify(old[i].reward)));
  assert.equal(r[i].groupSet,'top_partien_2026-11-05_fixtures');assert.equal(r[i].groupReward.pack,'primegold');
 }
});

test('actual men database resolves both clubs and the league for all four new fixtures',()=>{
 const c=setup();
 for(const name of ['csvRow','parseCSV','normalizeKey','marqueeClubMatch','marqueeLeagueMatch'])vm.runInContext(app.match(new RegExp('^function '+name+'\\(.*$','m'))[0],c);
 c.csv=fs.readFileSync(require('node:path').join(__dirname,'../assets/players-db.csv'),'utf8');
 const db=vm.runInContext('parseCSV(csv)',c).filter(p=>p.gender==="Men's Football");
 for(const s of rows(c,'2026-11-05T18:00:00Z')){
  for(const aliases of s.matchClubs){const matches=db.filter(p=>c.marqueeClubMatch(p.club_name,aliases));assert.ok(matches.length>=11,s.name);assert.ok(matches.every(p=>c.marqueeLeagueMatch(p.league_name,s.matchLeague)),s.name);}
 }
 assert.ok(!c.marqueeClubMatch('Barcelona SC',['FC Barcelona','Barcelona']));
 assert.ok(!c.marqueeClubMatch('SC Fortuna Köln',['1. FC Köln','Köln']));
 assert.ok(c.marqueeLeagueMatch('Serie A Enilive','Serie A'));
 assert.ok(!c.marqueeLeagueMatch('Serie B','Serie A'));
});

test('four isolated submissions grant segment packs and group bonus once and retain older claims',()=>{
 const c=setup(),r=rows(c,'2026-11-05T18:00:00Z'),grants=[];
 Object.assign(c,{state:{club:[],sbcStorage:[],transferList:[],squad:[],squadPresets:[],stats:{sbcs:0},sbcCompletions:{old:true},sbcGroupClaims:{top_partien_2026_10_29:true}},SBC_WORKSPACE:{},history:{state:null},
 allActiveSBCs:()=>r,getActiveSbcById:id=>r.find(s=>s.id===id),sbcDraftStats:()=>({ok:true,items:[]}),isFounderItem:()=>false,isStoryItem:()=>false,isFooteraLiveCard:()=>false,
 ensureObjectiveWindows(){},persistActiveSquadPreset(){},removeActiveEvolutionForUid(){},grant:x=>grants.push(JSON.parse(JSON.stringify(x))),persistSbcWorkspace(){},save(){},renderAll(){},toast(){},sbcRewardText:()=>'',queuedSbcGroupRewardPack:null});
 vm.runInContext(section('function sbcIsCompleted(','function sbcTimeLeft(')+section('function sbcGroupProgress(','// Event names')+section('function maybeGrantSbcGroupReward(','function submitSbcById('),c);
 for(let i=0;i<4;i++){c.finalizeSbcSubmission(r[i].id);assert.equal(grants.length,i===3?5:i+1);c.finalizeSbcSubmission(r[i].id);assert.equal(grants.length,i===3?5:i+1);}
 assert.equal(c.state.stats.sbcs,4);assert.equal(grants[4].pack,'primegold');assert.equal(c.state.sbcGroupClaims[r[0].groupSet],true);assert.equal(c.state.sbcCompletions.old,true);assert.equal(c.state.sbcGroupClaims.top_partien_2026_10_29,true);
 c.maybeGrantSbcGroupReward(r[0]);assert.equal(grants.length,5);
 c.getActiveSbcById=()=>null;c.finalizeSbcSubmission(r[0].id);assert.equal(grants.length,5,'expired ID cannot submit');
});

test('runtime requirement checks reject wrong clubs and leagues for new Serie A and LaLiga tasks',()=>{
 const c=setup();
 for(const name of ['normalizeKey','marqueeClubMatch','marqueeLeagueMatch','isTotwSbcItem','isMomentumSbcItem','sbcRequiredClubAliases','sbcRequiredLeagueMatch'])vm.runInContext(app.match(new RegExp('^function '+name+'\\(.*$','m'))[0],c);
 vm.runInContext(section('function sbcDisplayedSquadRating(','function isTotwSbcItem('),c);
 vm.runInContext(section('function sbcDraftStats(','function sbcRequirementSummary('),c);
 Object.assign(c,{displayBase:x=>x,itemRating:x=>x.ovr,resolvedAffiliation:x=>x,chemNationKey:x=>x,isCardRare:()=>true,rarityOf:()=> 'gold',sbcDraftChemScores:()=>[3,3,3,3,3,3,3,3,3,3,3]});
 const r=rows(c,'2026-11-05T18:00:00Z');
 for(const [s,teams,league] of [[r[2],['Fiorentina','Juventus'],'Serie A Enilive'],[r[3],['Atlético de Madrid','FC Barcelona'],'LALIGA EA SPORTS']]){
  const items=Array.from({length:11},(_,i)=>({uid:String(i),team:teams[i%2],league,nation:s.matchNation,ovr:82})),draft={squad:items.map(p=>p.uid)};
  c.sbcSourceMap=()=>new Map(items.map(item=>[item.uid,{item}]));
  assert.equal(c.sbcDraftStats(s,draft).ok,true);
  for(const item of items)item.team='Unrelated FC';
  assert.equal(c.sbcDraftStats(s,draft).ok,false);
  items.forEach((item,i)=>item.team=teams[i%2]);
  if(s.minMatchLeaguePlayers){for(const item of items)item.league='Serie B';assert.equal(c.sbcDraftStats(s,draft).ok,false);}
  else {for(const item of items)item.team=teams[0];assert.equal(c.sbcDraftStats(s,draft).requireBothMatchClubsOk,false);}
 }
});
