const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const vm=require('node:vm');

const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
const between=(from,to)=>{const a=html.indexOf(from),b=html.indexOf(to,a);assert.ok(a>=0&&b>a,from);return html.slice(a,b)};
const founderCode=between('const FOUNDER_SAVE_ID=','let PLAYERS=');
const packCode=between('function generatePack(','function renderStore(');
const revealPlanCode=between('function packIsSpecial(','function finishPack(');
const finishCode=between('function finishPack(){','function packFxLayer(){');
const OWNER='GF-9AE6CDDEFE8A458D',PID='footera-founder-bastian-gerlach',PACK='founder-bastian';
const MARCO_OWNER='GF-7D87D08A06104571',MARCO_PID='footera-founder-marco-gerlach',MARCO_PACK='founder-marco';
function saveState(id=OWNER){return{profile:{saveId:id},packs:{},club:[],sbcStorage:[],transferList:[],transferSales:[],auctions:[],pendingPack:[],pendingResolved:[],squad:Array(23).fill(null),squadPresets:[],coins:3572,stats:{packs:12}}}
function setup(){const ctx={Date,Map,Set,state:null,pendingPack:[],PLAYERS:[],P_BY_ID:new Map(),PACKS:[],MID_ICON_BASES:[],LIVE_TOTW_BASE_CACHE:new Map(),isStoryItem:()=>false,reconcileStoryPassPlayers(){}};vm.createContext(ctx);vm.runInContext(founderCode+'\n'+between('const COMMON_PLAYER_NAMES_BY_ID=','function keyNameTeam(')+'\n'+packCode+'\n'+revealPlanCode,ctx);return ctx}
const call=(ctx,expr)=>vm.runInContext(expr,ctx);

test('the fixed profile alone gets one unopened Founder Pack; a foreign profile cannot open or keep it',()=>{
 const ctx=setup();ctx.state=call(ctx,'reconcileFounderState')(saveState());
 assert.equal(ctx.state.packs[PACK],1);assert.equal(ctx.state.club.length,0);
 const card=call(ctx,'generatePack')(PACK);assert.equal(card.length,1);
 assert.equal(card[0].pid,PID);assert.equal(card[0].uid,'footera-founder-bastian');assert.equal(card[0].tradeable,false);
 const foreign=saveState('GF-SOMEBODY-ELSE');foreign.club.push(card[0]);foreign.sbcStorage.push(card[0]);foreign.packs[PACK]=9;foreign.pendingPack.push(card[0]);
 ctx.state=call(ctx,'reconcileFounderState')(foreign);ctx.pendingPack=ctx.state.pendingPack;
 assert.equal(ctx.state.club.length,0);assert.equal(ctx.state.sbcStorage.length,0);assert.equal(ctx.state.pendingPack.length,0);
 assert.equal(ctx.state.packs[PACK],undefined);assert.equal(call(ctx,'generatePack')(PACK).length,0);
});

test('walkout is mandatory; claim, reload and duplicate save data leave exactly one protected card',()=>{
 const ctx=setup();ctx.state=call(ctx,'reconcileFounderState')(saveState());
 const [item]=call(ctx,'generatePack')(PACK);ctx.state.packs[PACK]=0;ctx.state.founderOpening=true;ctx.state.pendingPack=[item];ctx.pendingPack=ctx.state.pendingPack;
 ctx.itemRating=()=>88;const plan=call(ctx,'packRevealPlan')();assert.equal(plan.mode,'walkout');assert.equal(plan.label,'FOOTERA FOUNDER');assert.equal(plan.cards[0],item);
 const els=new Map();ctx.$=id=>{if(!els.has(id))els.set(id,{className:'',style:{},classList:{remove(){},add(){}},querySelector(){return null},textContent:''});return els.get(id)};
 ctx.pendingResolved=new Set();ctx.save=()=>{};ctx.flushSave=()=>{};ctx.resetBoardIntro=()=>{};ctx.resetWalkoutTunnel=()=>{};ctx.renderPackResults=()=>{};
 vm.runInContext(finishCode,ctx);call(ctx,'finishPack')();
 assert.equal(ctx.state.club.length,1);assert.equal(ctx.state.club[0].tradeable,false);assert.equal(ctx.state.founderClaimed,true);
 const saved=JSON.parse(JSON.stringify(ctx.state));saved.club.push({...item,uid:'copy'});saved.sbcStorage.push({...item,uid:'sbc'});saved.transferList.push(item.uid);saved.transferSales.push({item});saved.auctions.push({base:{id:PID}});
 ctx.state=call(ctx,'reconcileFounderState')(saved);assert.equal(ctx.state.club.filter(i=>i.pid===PID).length,1);
 assert.equal(ctx.state.club[0].uid,item.uid);assert.equal(ctx.state.packs[PACK],0);assert.equal(ctx.state.sbcStorage.length,0);
 assert.equal(ctx.state.transferList.length,0);assert.equal(ctx.state.transferSales.length,0);assert.equal(ctx.state.auctions.length,0);
 ctx.pendingPack=ctx.state.pendingPack;assert.equal(call(ctx,'generatePack')(PACK).length,0);
 assert.equal(ctx.state.coins,3572);assert.equal(ctx.state.stats.packs,12);
});

test('the synthetic player stays out of the live database, normal pack pool and generated market',()=>{
 const ctx=setup();const ordinary={id:'100',name:'Other',ovr:80,league:'Bundesliga'};
 ctx.PLAYERS=[ordinary,{id:'101',name:'Bastian Gerlach',fullName:'Bastian Gerlach',ovr:88}];
 Object.assign(ctx,{startPromoEventClock(){},applyPlayerTraits(){},normalizePlayerAffiliations(){},rebuildPlayerRuntimeIndexes(){},applyBadgeCacheToPlayers(){},rebuildMarketFilterIndex(){},restoreSyntheticPlayerIds(){ctx.P_BY_ID.set(PID,call(ctx,'FOUNDER_BASE'))},renderHeaderClubName(){},$(){return{style:{},classList:{add(){}},textContent:''}}});
 vm.runInContext(between('function finishDbLoad(','async function boot('),ctx);call(ctx,'finishDbLoad')(false);
 assert.deepEqual(Array.from(ctx.PLAYERS,p=>p.name),['Other']);assert.equal(ctx.P_BY_ID.get(PID).fullName,'Bastian Gerlach');
 ctx.state=call(ctx,'reconcileFounderState')(saveState('GF-OTHER'));ctx.pendingPack=[];
 assert.equal(call(ctx,'generatePack')(PACK).length,0);
 assert.match(html,/function marketSnapshotBases\(f\)[\s\S]*?pool=regular\.filter/);
 assert.match(html,/function weightedPlayer\(min,max\)[\s\S]*?PLAYERS\.filter/);
 const packCtx={FOUNDER_PACK_ID:PACK,MARCO_FOUNDER_PACK_ID:'founder-marco'};vm.createContext(packCtx);
 vm.runInContext(between('const PACKS=[','const TOTW_WEEK_1='),packCtx);
 const pack=vm.runInContext('PACKS.find(p=>p.id==="founder-bastian")',packCtx);
 assert.equal(pack.store,false);assert.equal(pack.reward,false);
});

test('Founder identity, card text, icon-like chemistry and bio values are exact',()=>{
 const ctx=setup(),b=call(ctx,'FOUNDER_BASE'),item=call(ctx,'founderItem')();
 assert.deepEqual([b.name,b.fullName,b.ovr,b.position,b.alt,b.nation,b.team,b.league,b.height,b.preferredFoot,b.skillMoves,b.weakFoot],['B. Gerlach','Bastian Gerlach',88,'ST','CAM','Germany','FC Gerlies','Footera',172,'Right',5,5]);
 assert.deepEqual([b.pac,b.sho,b.pas,b.dri,b.def,b.phy],[91,89,82,88,45,84]);
 const required=['FOUNDER','Bastian Gerlach','172 cm','Rechts','ZOM','Starker Fuß','Skills','Schwacher Fuß'];
 const bio=between('function openBiography(','function cardHTML(');
 const elements=new Map();Object.assign(ctx,{$:id=>{if(!elements.has(id))elements.set(id,{innerHTML:'',textContent:''});return elements.get(id)},displayBase:()=>b,resolvedPlayer:x=>x,ensurePlayerAffiliationAssets(){},isMomentumItem:()=>false,playerContextLine:()=> 'FC Gerlies · Footera · Germany',playerClubPerformance:()=>({goals:0,assists:0}),cardHTML:()=>'<div class="card-shell">B. Gerlach</div>',inPosition:()=>true,playerAffiliationHTML:()=>'',positionLabel:x=>x==='CAM'?'ZOM':x,flagEmoji:()=> '🇩🇪',nationLabel:()=> 'Germany',playerFoot:()=> 'Rechts',stars:n=>'★'.repeat(n),skillStars:()=>5,weakFootStars:()=>5,workRates:()=> '–',positionRoleLabel:()=> '–',cardStatPairs:()=>[['TEM',91],['SCH',89],['PAS',82],['DRI',88],['DEF',45],['PHY',84]],esc:String,showUiLayer(){}});
 vm.runInContext(bio,ctx);call(ctx,'openBiography')(item,-1);
 const markup=elements.get('bioDetailBody').innerHTML;
 for(const token of required)assert.ok(markup.includes(token),token);
 for(const n of [91,89,82,88,45,84])assert.ok(markup.includes(`<b>${n}</b>`));
 assert.match(markup,/★{5}/);assert.match(markup,/FC Gerlies · Footera/);
});

test('SBC pool, quick sell, transfer sale and evolution reject the Founder even with a forged tradeable flag',()=>{
 const ctx=setup(),item={...call(ctx,'founderItem')(),tradeable:true};ctx.state=saveState();ctx.state.club=[item,{uid:'ordinary',pid:'100',tradeable:true}];
 ctx.displayBase=i=>i.pid===PID?call(ctx,'FOUNDER_BASE'):{id:'100',ovr:80};ctx.itemRating=()=>88;
 vm.runInContext(between('function sbcSourceItems(){','function sbcSourceMap(){')+between('function quickSell(i){','function clubFilterItems(){'),ctx);
 assert.deepEqual(Array.from(call(ctx,'sbcSourceItems')(),x=>x.item.uid),['ordinary']);assert.equal(call(ctx,'quickSell')(item),0);
 ctx.toast=()=>{};vm.runInContext(between('function createTransferSale(','function settleTransferSales('),ctx);
 assert.equal(call(ctx,'createTransferSale')(item.uid,150,300,3600),false);assert.equal(ctx.state.transferSales.length,0);
 ctx.activeEvolutionForUid=()=>null;vm.runInContext(between('function evoEligible(','function eligibleEvoPlayers('),ctx);
 assert.equal(call(ctx,'evoEligible')(item,{req:{}}),false);
});

test('Marco alone receives his own one-time pack, and neither account receives the other Founder',()=>{
 const ctx=setup(),rule=call(ctx,'FOUNDER_RULES.find(r=>r.playerId===MARCO_FOUNDER_PLAYER_ID)');
 assert.equal(rule.saveId,MARCO_OWNER);assert.equal(rule.packId,MARCO_PACK);
 ctx.state=call(ctx,'reconcileFounderState')(saveState(MARCO_OWNER));
 assert.equal(ctx.state.packs[MARCO_PACK],1);assert.equal(ctx.state.packs[PACK],undefined);
 const [item]=call(ctx,'generatePack')(MARCO_PACK);
 assert.equal(item.pid,MARCO_PID);assert.equal(item.ownerSaveId,MARCO_OWNER);assert.equal(item.uid,'footera-founder-marco');assert.equal(item.tradeable,false);
 assert.equal(call(ctx,'generatePack')(PACK).length,0);
 const foreign=saveState(OWNER);foreign.club=[item];foreign.pendingPack=[item];foreign.packs[MARCO_PACK]=5;foreign.auctions=[{base:rule.base}];
 ctx.state=call(ctx,'reconcileFounderState')(foreign);ctx.pendingPack=ctx.state.pendingPack;
 assert.equal(ctx.state.club.length,0);assert.equal(ctx.state.pendingPack.length,0);assert.equal(ctx.state.packs[MARCO_PACK],undefined);assert.equal(ctx.state.auctions.length,0);
 assert.equal(ctx.state.packs[PACK],1);
});

test('Marco walkout resolves once; reload, interrupted opening and copied cards cannot grant duplicates',()=>{
 const ctx=setup();ctx.state=call(ctx,'reconcileFounderState')(saveState(MARCO_OWNER));
 const [item]=call(ctx,'generatePack')(MARCO_PACK);ctx.state.packs[MARCO_PACK]=0;ctx.state.marcoFounderOpening=true;ctx.state.pendingPack=[item];ctx.pendingPack=ctx.state.pendingPack;ctx.itemRating=()=>88;
 const plan=call(ctx,'packRevealPlan')();assert.equal(plan.mode,'walkout');assert.equal(plan.label,'FOOTERA FOUNDER');assert.equal(plan.cards.length,1);
 const elements=new Map();ctx.$=id=>{if(!elements.has(id))elements.set(id,{className:'',style:{},classList:{remove(){},add(){}},querySelector(){return null},textContent:''});return elements.get(id)};
 ctx.pendingResolved=new Set();ctx.save=()=>{};ctx.flushSave=()=>{};ctx.resetBoardIntro=()=>{};ctx.resetWalkoutTunnel=()=>{};ctx.renderPackResults=()=>{};
 vm.runInContext(finishCode,ctx);call(ctx,'finishPack')();assert.equal(ctx.state.club.length,1);assert.equal(ctx.state.marcoFounderClaimed,true);
 const saved=JSON.parse(JSON.stringify(ctx.state));saved.club.push({...item,uid:'copy',tradeable:true});saved.sbcStorage.push(item);saved.transferSales.push({item});saved.auctions.push({item});saved.packs[MARCO_PACK]=4;
 ctx.state=call(ctx,'reconcileFounderState')(saved);ctx.pendingPack=ctx.state.pendingPack;
 assert.equal(ctx.state.club.filter(i=>i.pid===MARCO_PID).length,1);assert.equal(ctx.state.club[0].tradeable,false);
 assert.equal(ctx.state.packs[MARCO_PACK],0);assert.equal(ctx.state.sbcStorage.length,0);assert.equal(ctx.state.transferSales.length,0);
 assert.equal(call(ctx,'generatePack')(MARCO_PACK).length,0);
 const interrupted=saveState(MARCO_OWNER);interrupted.packs[MARCO_PACK]=0;interrupted.marcoFounderOpening=true;
 assert.equal(call(ctx,'reconcileFounderState')(interrupted).packs[MARCO_PACK],1);
});

test('Marco uses his original assets and exact profile values without entering the random database',()=>{
 const ctx=setup(),b=call(ctx,'MARCO_FOUNDER_BASE'),item=call(ctx,'marcoFounderItem')();
 assert.deepEqual([b.name,b.fullName,b.ovr,b.position,b.alt,b.nation,b.team,b.league,b.height,b.preferredFoot,b.skillMoves,b.weakFoot],['M. Gerlach','Marco Gerlach',88,'ST','CAM','Germany','Schweinfurt Rangers 09','Footera',178,'Right',5,5]);
 assert.deepEqual([b.pac,b.sho,b.pas,b.dri,b.def,b.phy],[91,89,82,88,45,84]);
 for(const url of [b.face,b.clubLogo,b.leagueLogo])assert.ok(fs.existsSync(path.join(__dirname,'..',url)),url);
 const sha=file=>crypto.createHash('sha256').update(fs.readFileSync(path.join(__dirname,'..','assets','footera',file))).digest('hex');
 assert.equal(sha('founder-marco-original.png'),'8bc07943849fa5279b39370c2041b17f4af78ee45d1a1b6454155c2fbe8b5f87');
 assert.equal(sha('schweinfurt-rangers-09-original.jpg'),'04c1c20b7caa8ae0a1b3c53004fa19d5ad54ad6cb6caab1418900a3591852fa2');
 assert.equal(b.leagueLogo,'./assets/footera/emblem.png');assert.equal(item.variant,'founder');
 ctx.PLAYERS=[{id:'1',name:'Normal',ovr:70},{id:'2',name:'Marco Gerlach',ovr:88},{id:'3',fullName:'Bastian Gerlach',ovr:88}];
 Object.assign(ctx,{startPromoEventClock(){},applyPlayerTraits(){},normalizePlayerAffiliations(){},rebuildPlayerRuntimeIndexes(){},applyBadgeCacheToPlayers(){},rebuildMarketFilterIndex(){},restoreSyntheticPlayerIds(){},renderHeaderClubName(){},$(){return{style:{},classList:{add(){}},textContent:''}}});
 vm.runInContext(between('function finishDbLoad(','async function boot('),ctx);call(ctx,'finishDbLoad')(false);
 assert.deepEqual(Array.from(ctx.PLAYERS,p=>p.name),['Normal']);
});

test('Marco remains protected against forged SBC, transfer and quick-sell flags',()=>{
 const ctx=setup(),item={...call(ctx,'marcoFounderItem')(),tradeable:true};ctx.state=saveState(MARCO_OWNER);ctx.state.club=[item];
 ctx.displayBase=()=>call(ctx,'MARCO_FOUNDER_BASE');ctx.itemRating=()=>88;
 vm.runInContext(between('function sbcSourceItems(){','function sbcSourceMap(){')+between('function quickSell(i){','function clubFilterItems(){'),ctx);
 assert.equal(call(ctx,'sbcSourceItems')().length,0);assert.equal(call(ctx,'quickSell')(item),0);
 ctx.toast=()=>{};vm.runInContext(between('function createTransferSale(','function settleTransferSales('),ctx);
 assert.equal(call(ctx,'createTransferSale')(item.uid,150,300,3600),false);
});

test('Marco biography lists his full name, 178 cm, right foot, five stars, ZOM and six attributes',()=>{
 const ctx=setup(),b=call(ctx,'MARCO_FOUNDER_BASE'),item=call(ctx,'marcoFounderItem')();
 const els=new Map();Object.assign(ctx,{$:id=>{if(!els.has(id))els.set(id,{innerHTML:'',textContent:''});return els.get(id)},displayBase:()=>b,resolvedPlayer:x=>x,ensurePlayerAffiliationAssets(){},isMomentumItem:()=>false,playerContextLine:()=> 'Schweinfurt Rangers 09 · Footera · Deutschland',playerClubPerformance:()=>({goals:0,assists:0}),cardHTML:()=>'<div class="card-shell founder-shell">M. Gerlach</div>',inPosition:()=>true,playerAffiliationHTML:()=>'',positionLabel:x=>x==='CAM'?'ZOM':x,flagEmoji:()=> '🇩🇪',nationLabel:()=> 'Deutschland',playerFoot:()=> 'Rechts',stars:n=>'★'.repeat(n),skillStars:()=>5,weakFootStars:()=>5,workRates:()=> '–',positionRoleLabel:()=> '–',cardStatPairs:()=>[['TEM',91],['SCH',89],['PAS',82],['DRI',88],['DEF',45],['PHY',84]],esc:String,showUiLayer(){}});
 vm.runInContext(between('function openBiography(','function cardHTML('),ctx);call(ctx,'openBiography')(item,-1);
 const markup=els.get('bioDetailBody').innerHTML;
 for(const token of ['Marco Gerlach','FOOTERA FOUNDER','178 cm','Rechts','ZOM','Schweinfurt Rangers 09 · Footera','★★★★★'])assert.ok(markup.includes(token),token);
 for(const n of [91,89,82,88,45,84])assert.ok(markup.includes(`<b>${n}</b>`));
});
