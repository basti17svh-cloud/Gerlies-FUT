const test=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');

const html=require('./helpers/app-html.cjs')();
const source=html.slice(html.indexOf('let sbcPickerState=null'),html.indexOf('function renderSbcEditor('));
const formationSource=html.slice(html.indexOf('const FORMATIONS={'),html.indexOf('};',html.indexOf('const FORMATIONS={'))+2);
const FORM=['GK','LB','CB','CB','RB','CM','CM','CM','LW','ST','RW'];
let uidCounter=0;
const card=(position,rating,extra={})=>({uid:extra.uid||`c${++uidCounter}`,position,rating,league:'Bundesliga',team:'Club A',nation:'Germany',quality:rating>=75?'gold':rating>=65?'silver':'bronze',tradeable:true,...extra});

function setup({club=[],storage=[],squad=[],presets=[],evos=[],sbc}){
 const toasts=[];let writes=0;
 const ctx={
  state:{club,sbcStorage:storage,squad,squadPresets:presets},SBC_WORKSPACE:{},SBC_WORKSPACE_KEY:'test',activeSbcId:sbc.id,
  localStorage:{setItem(){writes++}},Promise,Map,Set,Math,Number,String,Array,JSON,Object,
  getActiveSbcById:id=>id===sbc.id?sbc:null,activeEvolutionEntries:()=>evos.map(uid=>({uid})),activeEvolutionForUid:uid=>evos.includes(uid)?{uid}:null,
  displayBase:item=>item,itemRating:item=>item.rating,rarityOf:item=>item.quality,resolvedAffiliation:item=>({league:item.league,team:item.team}),
  chemNationKey:n=>String(n||'').toLowerCase(),chemThreshold:(n,a,b,c)=>n>=c?3:n>=b?2:n>=a?1:0,
  inPosition:(item,slot)=>[item.position,...(item.alt||[])].includes(slot),playerPositions:item=>[item.position,...(item.alt||[])],
  isCardRare:(b,item)=>!!item.rare,isFounderItem:()=>false,isStoryItem:()=>false,isFooteraLiveCard:()=>false,
  normalizeKey:v=>String(v||'').toLowerCase().trim(),marqueeClubMatch:(team,aliases)=>aliases.includes(team),marqueeLeagueMatch:(a,b)=>String(a).toLowerCase()===String(b).toLowerCase(),
  playerSearchText:item=>String(item.name||'').toLowerCase(),pickerItemQuality:item=>item.quality,
  positionLabel:p=>({GK:'TW',ST:'ST'})[p]||p,esc:String,cardHTML:(b,item,mini,shown)=>`<card pos="${shown}">`,
  toast:m=>toasts.push(m),renderSBC(){},fmt:String,PACKS:[],nationLabel:v=>v
 };
 vm.createContext(ctx);vm.runInContext(formationSource+source+';this.FORMATIONS=FORMATIONS;',ctx);
 vm.runInContext(`SBC_WORKSPACE[${JSON.stringify(sbc.id)}]={squad:${JSON.stringify(Array.from({length:11},(_,i)=>squad[i]||null))}}`,ctx);
 return{ctx,toasts,squad:()=>Array.from(vm.runInContext(`sbcDraft(${JSON.stringify(sbc.id)}).squad`,ctx)),stats:()=>vm.runInContext(`sbcDraftStats(getActiveSbcById(${JSON.stringify(sbc.id)}))`,ctx),run:code=>vm.runInContext(code,ctx),writes:()=>writes};
}
const fullClub=(rating,extra={})=>FORM.map(p=>card(p,rating,extra));

test('formation slots match the auto-fill positions',()=>{
 const {ctx}=setup({sbc:{id:'x',count:11,filter:()=>true}});
 assert.deepEqual(Array.from(ctx.FORMATIONS['4-3-3'],s=>s.p),FORM);
});

test('a striker in goal keeps his own position, shows a warning and earns no chemistry',()=>{
 const undav=card('ST',85,{uid:'undav',name:'Deniz Undav'});
 const t=setup({club:[undav],sbc:{id:'s',count:11,req:'11 Spieler',filter:()=>true}});
 assert.equal(t.run(`sbcPlaceUid('s','undav','squad',0)`),true);
 const slot=t.run(`(()=>{const d=sbcDraft('s');return sbcWorkSlotHTML(getActiveSbcById('s'),0,{...FORMATIONS['4-3-3'][0],x:50,y:90},d,sbcDraftChemScores(d))})()`);
 assert.match(slot,/<card pos="ST">/);assert.doesNotMatch(slot,/pos="GK"/);
 assert.match(slot,/class="sbc-work-slot filled out"/);assert.match(slot,/poswarn/);
 assert.equal(t.stats().chemScores[0],0);
});

test('auto-fill uses the cheapest fitting cards, prefers SBC storage and keeps players on their positions',()=>{
 const strong=fullClub(90),weak=fullClub(70),dup=card('CM',72,{uid:'dup'});
 const t=setup({club:[...strong,...weak],storage:[dup],sbc:{id:'cheap',count:11,req:'11 Spieler',filter:()=>true}});
 t.run('sbcQuickFill()');
 const squad=t.squad(),ids=new Set(strong.map(c=>c.uid));
 assert.equal(squad.filter(Boolean).length,11);assert.ok(squad.includes('dup'),'storage duplicate is used');
 assert.ok(squad.every(uid=>!ids.has(uid)),'no 90 card is burned');
 const map=new Map([...weak,dup].map(c=>[c.uid,c]));
 squad.forEach((uid,i)=>assert.equal(map.get(uid).position,FORM[i],`slot ${i} in position`));
 assert.match(t.toasts.at(-1),/11 günstige Spieler eingesetzt/);
});

test('auto-fill reaches a squad rating with the cheapest mix and never touches team or evolution players',()=>{
 const club=[...fullClub(80),...fullClub(84),card('ST',95,{uid:'team-star'}),card('ST',94,{uid:'evo-star'})];
 const t=setup({club,presets:[{name:'Team 1',squad:['team-star']}],evos:['evo-star'],sbc:{id:'avg',count:11,minAvg:82,req:'11 Spieler · Ø GES 82',filter:()=>true}});
 t.run('sbcQuickFill()');
 const squad=t.squad(),stats=t.stats();
 assert.equal(stats.ok,true);assert.equal(stats.teamRating,82);
 assert.ok(!squad.includes('team-star')&&!squad.includes('evo-star'));
 const total=squad.reduce((n,uid)=>n+club.find(c=>c.uid===uid).rating,0);
 assert.ok(total<=Math.ceil(81.8*11)+3,`no wasted rating (${total})`);
});

test('league, rarity and chemistry requirements are solved instead of filling random players',()=>{
 const club=[...fullClub(78,{league:'Premier League',team:'PL A',nation:'England'}),...FORM.map((p,i)=>card(p,77,{league:'LALIGA',team:i<6?'Real':'Barca',nation:'Spain'})),card('CM',79,{rare:true,uid:'rare1',league:'LALIGA',team:'Real',nation:'Spain'})];
 const sbc={id:'mix',count:11,minAvg:76,minRare:1,matchLeague:'LALIGA',minMatchLeaguePlayers:4,minChem:20,req:'11 Spieler · min. 4 aus LALIGA · min. 1 selten · Ø GES 76 · 20 Chemie',filter:()=>true};
 const t=setup({club,sbc});t.run('sbcQuickFill()');
 const stats=t.stats();
 assert.equal(stats.ok,true,JSON.stringify({chem:stats.chem,rare:stats.rareCount,league:stats.matchLeaguePlayers}));
 assert.ok(t.squad().includes('rare1'));
});

test('an unsolvable SBC leaves the squad untouched and names the missing requirement',()=>{
 const club=fullClub(70);
 const t=setup({club,squad:[club[0].uid],sbc:{id:'hard',count:11,minAvg:85,req:'11 Spieler · Ø GES 85',filter:()=>true}});
 const before=t.squad();t.run('sbcQuickFill()');
 assert.deepEqual(t.squad(),before);assert.equal(t.writes(),0);
 assert.match(t.toasts.at(-1),/Nicht lösbar mit diesen Einstellungen: Ø GES 85\. Es wurde nichts eingesetzt/);
});

test('too few fitting cards are reported instead of filled up',()=>{
 const club=[card('GK',60,{quality:'bronze'}),card('ST',80)];
 const t=setup({club,sbc:{id:'bronze',count:11,req:'11× Bronze',filter:b=>b.quality==='bronze'}});
 t.run('sbcQuickFill()');
 assert.equal(t.squad().filter(Boolean).length,0);assert.match(t.toasts.at(-1),/Dir fehlen 10 passende Spieler/);
});

test('player search filters by nation, league and club and only offers cards the SBC accepts',()=>{
 const club=[card('ST',80,{uid:'de',nation:'Germany',name:'A'}),card('ST',81,{uid:'fr',nation:'France',league:'Ligue 1',team:'PSG',name:'B'}),card('ST',60,{uid:'bronze',quality:'bronze',nation:'France',name:'C'})];
 const t=setup({club,sbc:{id:'p',count:11,req:'11 Gold',filter:b=>b.quality==='gold'}});
 t.run(`sbcPickerState={...sbcDefaultPickerFilters(),position:'ST',area:'squad',index:9}`);
 assert.deepEqual(Array.from(t.run('sbcPickerCandidates()'),r=>r.item.uid),['de','fr']);
 t.run(`sbcPickerState.nation='France'`);assert.deepEqual(Array.from(t.run('sbcPickerCandidates()'),r=>r.item.uid),['fr']);
 t.run(`sbcPickerState.nation='';sbcPickerState.league='Bundesliga'`);assert.deepEqual(Array.from(t.run('sbcPickerCandidates()'),r=>r.item.uid),['de']);
 t.run(`sbcPickerState.league='';sbcPickerState.club='PSG'`);assert.deepEqual(Array.from(t.run('sbcPickerCandidates()'),r=>r.item.uid),['fr']);
 const opts=t.run(`sbcPickerOptions(getActiveSbcById('p'))`);
 assert.deepEqual(Array.from(opts.nations),['France','Germany']);
});

test('the same player never stands twice in one SBC, neither by auto-fill nor in the search',()=>{
 const club=[...fullClub(70).map((c,i)=>({...c,pid:`p${i}`})),card('CM',60,{uid:'dupe-cm',pid:'p5'})];
 const t=setup({club,storage:[card('CM',61,{uid:'store-cm',pid:'p6'})],sbc:{id:'dup',count:11,req:'11 Spieler',filter:()=>true}});
 t.run('sbcQuickFill()');
 const squad=t.squad(),pids=squad.map(uid=>[...club,{uid:'store-cm',pid:'p6'}].find(c=>c.uid===uid).pid);
 assert.equal(new Set(pids).size,11);
 t.run(`sbcPickerState={...sbcDefaultPickerFilters(),position:'',area:'squad',index:0}`);
 const offered=Array.from(t.run('sbcPickerCandidates()'),r=>r.item.pid);
 assert.ok(offered.every(pid=>pid==='p0'||!pids.includes(pid)),JSON.stringify(offered));
});

test('players parked in the Testareal are used first and leave the Testareal when placed',()=>{
 const club=[...fullClub(65),card('ST',88,{uid:'parked'})];
 const t=setup({club,sbc:{id:'park',count:11,req:'11 Spieler',filter:()=>true}});
 assert.equal(t.run(`sbcPlaceUid('park','parked','test',3)`),true);
 assert.equal(t.run(`sbcDraft('park').testOpen`),true);
 t.run('sbcQuickFill()');
 assert.ok(t.squad().includes('parked'),'parked card is used despite its rating');
 assert.equal(t.run(`sbcDraft('park').test[3]`),null);
 assert.equal(t.squad().filter(Boolean).length,11);
});

test('a card can be dragged between the Testareal and a position and back',()=>{
 const club=[card('ST',80,{uid:'a'}),card('GK',70,{uid:'b'})];
 const t=setup({club,sbc:{id:'drag',count:11,req:'11 Spieler',filter:()=>true}});
 t.run(`sbcPlaceUid('drag','a','test',0);sbcPlaceUid('drag','b','squad',9)`);
 assert.equal(t.run(`sbcSwapSlots('drag','test',0,'squad',9)`),true);
 assert.equal(t.squad()[9],'a');assert.equal(t.run(`sbcDraft('drag').test[0]`),'b');
 assert.equal(t.run(`sbcRemoveUid('drag','test',0)`),true);assert.equal(t.run(`sbcDraft('drag').test[0]`),null);
});

test('assistant settings: quality, rating range and strict positions limit the auto-fill',()=>{
 const gold=fullClub(80),silver=fullClub(70,{quality:'silver'});
 const t=setup({club:[...gold,...silver],sbc:{id:'opt',count:11,req:'11 Spieler',filter:()=>true}});
 t.run(`sbcQuickFill({...sbcAssistantDefaults(),quality:'gold'})`);
 assert.ok(t.squad().every(uid=>gold.some(c=>c.uid===uid)),'only gold cards');
 const t2=setup({club:[...gold,...silver],sbc:{id:'opt',count:11,req:'11 Spieler',filter:()=>true}});
 t2.run(`sbcQuickFill({...sbcAssistantDefaults(),min:75,max:99})`);
 assert.ok(t2.squad().every(uid=>gold.some(c=>c.uid===uid)),'rating range respected');
 const noKeeper=FORM.slice(1).map(p=>card(p,70)).concat(card('ST',71));
 const t3=setup({club:noKeeper,sbc:{id:'opt',count:11,req:'11 Spieler',filter:()=>true}});
 t3.run(`sbcQuickFill({...sbcAssistantDefaults(),strictPositions:true})`);
 assert.equal(t3.squad().filter(Boolean).length,0);assert.match(t3.toasts.at(-1),/passende Positionen/);
 t3.run('sbcQuickFill()');assert.equal(t3.squad().filter(Boolean).length,11,'without the switch an outfield player may stand in goal');
});
