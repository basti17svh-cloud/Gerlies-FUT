const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..'),source=fs.readFileSync(path.join(root,'potm.js'),'utf8'),html=fs.readFileSync(path.join(root,'index.html'),'utf8');
function app(saved){
 let now=Date.parse('2026-10-04T12:00:00Z'),seq=0;class Clock extends Date{constructor(...args){super(...(args.length?args:[now]))}static now(){return now}}
 const state=saved||{club:[],sbcStorage:[],transferList:[],squad:Array(23).fill(null),squadPresets:[{name:'Main Team',squad:Array(23).fill(null),roles:{},focus:{}}],roles:{},focus:{},stats:{sbcs:0},sbcCompletions:{},activeEvos:[]};
 const c={state,Date:Clock,Intl,Map,Set,Number,Array,Math,P_BY_ID:new Map(),PACKS:[],pendingPack:[],pendingResolved:new Set(),messages:[],saves:[],packs:[],esc:String,fmt:n=>Number(n).toLocaleString('de-DE'),
  makeItem:(b,t,opts)=>({uid:'reward-'+(++seq),pid:String(b.id),tradeable:t,evo:0,evoStats:{},...opts}),
  isFounderItem:i=>i.variant==='founder',isStoryItem:i=>i.variant==='story',cardClass:(p,i)=>i.evo?'evolution':i.variant==='special'?'special':'gold',
  itemBase:i=>c.P_BY_ID.get(String(i.pid)),itemRating:i=>i.displayRating||c.itemBase(i)?.ovr||0,
  displayBase:i=>{const b=c.itemBase(i);if(!b)return null;const out={...b,ovr:c.itemRating(i),position:i.overridePosition||b.position};if(i.eventStats)['pac','sho','pas','dri','def','phy'].forEach((k,n)=>out[k]=i.eventStats[n]);return out},
  emblemCandidates:(kind,p)=>['normal-'+kind],sbcSourceItems:()=>[...state.club.map(item=>({item,source:'club'})),...state.sbcStorage.map(item=>({item,source:'storage'}))],
  sbcTeamUsageForUid:uid=>state.squadPresets.filter(p=>p.squad.includes(uid)).map(p=>p.name),activeEvolutionForUid:uid=>state.activeEvos?.find(e=>e.uid===uid),removeActiveEvolutionForUid:uid=>{state.activeEvos=state.activeEvos.filter(e=>e.uid!==uid)},
  ensureObjectiveWindows(){},persistActiveSquadPreset(){},save:()=>c.saves.push(JSON.parse(JSON.stringify(state))),renderSBC(){},renderAll(){},toast:s=>c.messages.push(s),openPack:(id,items)=>c.packs.push({id,items})};
 vm.createContext(c);vm.runInContext(source,c);const potm=c.FooteraPotm;
 function add(uid,rating=84,opts={},place='club'){
  const pid=opts.pid||'base-'+uid;if(!c.P_BY_ID.has(pid))c.P_BY_ID.set(pid,{id:pid,name:'Player '+uid,ovr:rating,position:'CM',team:'QA Club',league:'QA League',nation:'Germany'});
  const item={uid,pid,evo:0,...opts};state[place].push(item);return item
 }
 return{c,state,potm,add,setTime:t=>now=Date.parse(t)}
}

test('all four published POTMs have original scores, stats, eligibility and precise 28-day UTC windows',()=>{
 const {potm}=app();assert.deepEqual(Array.from(potm.releases,r=>[r.pid,r.ovr,r.target,r.minRating]),[['247827',91,700000,45],['190765',84,18750,45],['233419',89,1300000,45],['231447',85,90000,45]]);
 for(const r of potm.releases){assert.equal(Date.parse(r.until)-Date.parse(r.from),28*86400000);assert.equal(potm.isActive(r,Date.parse(r.from)-1),false);assert.equal(potm.isActive(r,Date.parse(r.from)),true);assert.equal(potm.isActive(r,Date.parse(r.until)-1),true);assert.equal(potm.isActive(r,Date.parse(r.until)),false);assert.ok(r.stats.length===6&&r.stats.every(n=>n>0&&n<=99))}
 assert.equal(potm.activeSBCs(new Date('2026-10-04')).length,4);assert.equal(potm.activeSBCs(new Date('2026-10-31')).length,0);assert.ok(potm.activeSBCs(new Date('2026-10-04')).every(r=>r.scoreSbc&&r.once));assert.equal(potm.releases.some(r=>r.theme==='ligue-1'),false);
});
test('published EA OVR table handles every boundary and rejects invalid ratings',()=>{
 const {potm}=app();for(const [r,points] of [[44,0],[45,20],[64,20],[65,35],[74,35],[75,90],[83,410],[84,830],[85,2100],[86,4100],[87,5500],[88,8300],[89,11000],[90,14000],[91,19000],[92,20000],[93,25000],[94,30000],[95,40000],[96,55000],[97,85000],[98,90000],[99,100000],[100,0],[84.5,0],[NaN,0]])assert.equal(potm.scoreForRating(r),points,String(r));
});
test('partial submissions accept duplicate players with unique UIDs from club/storage and survive saving',()=>{
 const {potm,c,state,add}=app(),r=potm.releases[1];add('a',84,{pid:'same-player'});add('b',84,{pid:'same-player'},'sbcStorage');
 const p=potm.planSubmission(r.id,['a','b','a']);assert.equal(p.ok,true);assert.equal(p.points,1660);assert.equal(p.rows.length,2);assert.equal(p.complete,false);assert.equal(potm.commitSubmission(p),true);
 assert.equal(state.club.length,0);assert.equal(state.sbcStorage.length,0);assert.equal(state.stats.sbcs,0);assert.equal(c.packs.length,0);assert.equal(state.potmProgress[r.id].score,1660);assert.equal(state.potmProgress[r.id].submittedCount,2);
 const restored=app(c.saves.at(-1));assert.equal(restored.potm.progress(restored.potm.releases[1]).score,1660);
});
test('protected unique cards, unavailable cards and listed players cannot be consumed',()=>{
 const {potm,state,add}=app(),r=potm.releases[1];add('founder',99,{variant:'founder'});add('story',99,{variant:'story'});add('listed',84);state.transferList=['listed'];add('low',44);
 for(const uid of ['founder','story','listed','low','missing'])assert.equal(potm.planSubmission(r.id,[uid]).ok,false,uid);assert.equal(state.club.length,4);
});
test('confirmation identifies all saved teams/active evolutions and cleans their references on consumption',()=>{
 const {potm,state,add}=app(),r=potm.releases[1];add('shared',84);state.squad[0]='shared';state.roles[0]='GK';state.focus[0]='defend';state.squadPresets[0].squad[0]='shared';state.squadPresets[0].roles[0]='GK';state.squadPresets.push({name:'Team 2',squad:['shared'],roles:{0:'GK'},focus:{0:'defend'}});state.activeEvos=[{uid:'shared'}];
 const p=potm.planSubmission(r.id,['shared']);assert.deepEqual(Array.from(p.rows[0].teams),['Main Team','Team 2']);assert.equal(p.rows[0].evolution,true);assert.equal(potm.commitSubmission(p),true);assert.equal(state.squad[0],null);assert.equal(state.roles[0],undefined);assert.equal(state.focus[0],undefined);assert.ok(state.squadPresets.every(p=>!p.squad.includes('shared')&&!p.roles[0]&&!p.focus[0]));assert.equal(state.activeEvos.length,0);
});
test('expiry after review, missing items and changed risk context block stale confirmations',()=>{
 for(const change of ['expire','sell','team']){
  const {potm,state,add,setTime}=app(),r=potm.releases[1];add('a',84);const p=potm.planSubmission(r.id,['a']);
  if(change==='expire')setTime(r.until);if(change==='sell')state.club=[];if(change==='team')state.squadPresets[0].squad[0]='a';
  assert.equal(potm.commitSubmission(p),false,change);assert.equal(state.potmProgress,undefined);assert.equal(state.stats.sbcs,0);if(change!=='sell')assert.equal(state.club.length,1)
 }
});
test('completion saves a recoverable untradeable reward once before opening the pack',()=>{
 const {potm,c,state,add}=app(),r=potm.releases[1];add('a',91);const p=potm.planSubmission(r.id,['a']);assert.equal(p.points,19000);assert.equal(p.excess,250);assert.equal(p.complete,true);assert.equal(potm.commitSubmission(p),true);
 assert.equal(state.potmProgress[r.id].score,18750);assert.equal(state.sbcCompletions[r.id],true);assert.equal(state.stats.sbcs,1);assert.equal(c.packs[0].id,'potm-sbc-player');assert.equal(c.packs[0].items[0].tradeable,false);assert.equal(c.saves.at(-1).pendingPack[0].eventReleaseId,r.id);assert.equal(c.packs[0].items[0].displayRating,84);
 assert.equal(potm.commitSubmission(p),false);assert.equal(c.packs.length,1);assert.equal(state.stats.sbcs,1);const restored=app(c.saves.at(-1));assert.equal(restored.potm.planSubmission(r.id,['a']).ok,false);
});
test('an unresolved pack prevents another claim and a failed reveal still leaves its reward saved',()=>{
 const {potm,c,state,add}=app(),r=potm.releases[1];add('a',91);let p=potm.planSubmission(r.id,['a']);c.pendingPack=[{uid:'previous'}];assert.equal(potm.commitSubmission(p),false);assert.equal(state.club.length,1);
 c.pendingPack=[];c.openPack=()=>{throw Error('Reveal interrupted')};assert.throws(()=>potm.commitSubmission(p),/interrupted/);assert.equal(c.saves.at(-1).pendingPack[0].eventReleaseId,r.id);assert.equal(c.saves.at(-1).sbcCompletions[r.id],true);
});
test('POTM skins and current affiliations do not alter normal items; Evolutions retain priority',()=>{
 const {potm,c,add}=app();for(const r of potm.releases){const normal=add('normal-'+r.pid,75,{pid:r.pid}),before={...c.P_BY_ID.get(r.pid)},item=potm.itemFor(r),display=c.displayBase(item);assert.equal(c.cardClass(display,item),'potm potm-'+r.theme);assert.equal(c.cardClass(display,{...item,evo:1}),'evolution');assert.equal(display.team,r.team);assert.equal(display.nation,r.nation);assert.equal(display.skillMoves,r.skillMoves);assert.equal(display.weakFoot,r.weakFoot);assert.equal(display.alt,r.alt);assert.equal(display.dynamicFace,r.face);assert.equal(display.ovr,r.ovr);assert.deepEqual(['pac','sho','pas','dri','def','phy'].map(k=>display[k]),Array.from(r.stats));assert.equal(c.cardClass(c.displayBase(normal),normal),'gold');assert.deepEqual(c.P_BY_ID.get(r.pid),before);assert.equal(c.emblemCandidates('league',display)[0],display.leagueLogo)}
});
test('normal squad SBC submission cannot bypass the separate score workflow',()=>{
 const begin=html.indexOf('function finalizeSbcSubmission('),end=html.indexOf('$("sbcTabs").addEventListener(',begin),c={getActiveSbcById:()=>({scoreSbc:true}),toast:()=>{},sbcDraftStats:()=>{throw Error('Classic consumption must never run')}};vm.createContext(c);vm.runInContext(html.slice(begin,end),c);assert.doesNotThrow(()=>c.submitSbcById('potm'));assert.doesNotThrow(()=>c.finalizeSbcSubmission('potm'));
});
test('central affiliation enrichment cannot replace the locally verified POTM league logos',()=>{
 const {potm,c}=app();for(const r of potm.releases){const display=c.displayBase(potm.itemFor(r));const enriched={...display,leagueLogo:'https://external.example/incorrect.png'};assert.equal(c.emblemCandidates('league',enriched)[0],`./assets/footera/events/potm/logos/${r.theme}.png`)}
 assert.equal(c.emblemCandidates('league',{id:'normal',leagueLogo:'existing.png'})[0],'normal-league');
});
test('all original portraits, five vector frames and five league logos exist in the offline shell',()=>{
 const {potm}=app(),sw=fs.readFileSync(path.join(root,'service-worker.js'),'utf8');
 for(const r of potm.releases){const bytes=fs.readFileSync(path.join(root,r.face));assert.equal(bytes.subarray(1,4).toString(),'PNG');assert.ok(bytes.length>50000);assert.ok(sw.includes('./'+r.face))}
 for(const theme of ['bundesliga','premier-league','laliga','serie-a','ligue-1']){for(const file of [`assets/footera/events/potm/frames/${theme}.svg`,`assets/footera/events/potm/logos/${theme}.png`]){assert.ok(fs.existsSync(path.join(root,file)));assert.ok(sw.includes('./'+file))}}
 for(const file of ['potm.js','potm.css'])assert.ok(sw.includes('./'+file));assert.ok(html.indexOf('src="./potm.js"')<html.indexOf('initFooteraBootIntro();'));
});
