const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
const previewCode=html.slice(html.indexOf('function ownLineupHTML(){'),html.indexOf('function renderSquadBattleSelection('));
const imageCode=html.slice(html.indexOf('function officialCardCandidates('),html.indexOf('function playerGender('));
const cardCode=html.slice(html.indexOf('function cardHTML('),html.indexOf('function normalizeKey('));
const swapCode=html.slice(html.indexOf('function swapPreviewSlots('),html.indexOf('let previewDrag=null'));

test('pre-match preview exposes XI, bench and reserve slots and responds to squad changes',()=>{
 const state={squad:Array.from({length:23},(_,i)=>i<18?`p${i}`:null),formation:'4-3-3',tactic:'attacking',profile:{clubName:'Mein Team'},club:[]};
 const elements=Object.fromEntries(['squadBattleModal','squadBattleModalBody','squadBattleModalSub','matchPreviewModalTitle'].map(id=>[id,{innerHTML:'',textContent:'',classList:{contains:()=>true}}]));
 const ctx={state,pendingMatchContext:null,squadBattleStage:'closed',previewSwapFrom:-1,
  $:id=>elements[id],esc:x=>String(x),showUiLayer:()=>{},squadPresetTabsHTML:()=>'<button data-select-squad="0">Mein Team</button>',
  squadMetrics:()=>({filled:state.squad.slice(0,18).filter(Boolean).length,rating:state.squad[0]==='p11'?85:82,chem:state.squad[0]==='p11'?27:24}),
  currentFormation:()=>Array.from({length:11},(_,i)=>({p:'ST',x:10+i*8,y:15+i*7})),
  squadItems:()=>state.squad.map(uid=>uid?{uid,name:uid,position:'ST'}:null),
  displayBase:item=>item,posFit:()=>1,positionLabel:pos=>pos,cardHTML:(b)=>`<span>${b.name}</span>`};
 vm.createContext(ctx);vm.runInContext(previewCode,ctx);
 ctx.renderMatchPreview('rivals',null);
 const body=()=>elements.squadBattleModalBody.innerHTML;
 assert.equal((body().match(/data-preview-slot="\d+"/g)||[]).length,23);
 assert.match(body(),/data-preview-slot="0"/);
 assert.match(body(),/data-preview-slot="11"/);
 assert.match(body(),/data-preview-slot="22"/);
 assert.match(body(),/data-select-squad="0"/);
 assert.match(body(),/id="previewTacticSelect"/);
 assert.match(body(),/value="attacking" selected>Offensiv/);
 assert.match(body(),/Rating<\/span><\/div>/);
 assert.doesNotMatch(body(),/id="squadBattleKickoff"[^>]*disabled/);
 [state.squad[0],state.squad[11]]=[state.squad[11],state.squad[0]];
 ctx.refreshOpenMatchPreview();
 assert.match(elements.squadBattleModalSub.textContent,/Rating 85 · Chemie 27\/33/);
 state.squad[2]=null;ctx.refreshOpenMatchPreview();
 assert.match(body(),/id="squadBattleKickoff"[^>]*disabled/);
 assert.match(body(),/Für den Anpfiff fehlen 1 Spieler/);
});

test('preview drag swap changes lineup and refreshes the displayed team',()=>{
 let saves=0,renders=0,previews=0;
 const ctx={state:{squad:['starter',...Array(10).fill(null),'bench',...Array(11).fill(null)]},previewSwapFrom:0,
  save:()=>saves++,renderAll:()=>renders++,refreshOpenMatchPreview:()=>previews++};
 vm.createContext(ctx);vm.runInContext(swapCode,ctx);
 assert.equal(ctx.swapPreviewSlots(0,11),true);
 assert.equal(ctx.state.squad[0],'bench');assert.equal(ctx.state.squad[11],'starter');
 assert.equal(ctx.previewSwapFrom,-1);
 assert.deepEqual([saves,renders,previews],[1,1,1]);
 assert.equal(ctx.swapPreviewSlots(0,99),false);
 assert.deepEqual([saves,renders,previews],[1,1,1]);
});

test('the official card stays visible at a valid secondary position with a position label',()=>{
 const ctx={prioritizeCached:arr=>arr,imageCacheKey:()=>'',esc:String,imgCandidatesAttr:JSON.stringify,
  resolvedPlayer:p=>p,cardClass:()=>"gold",isCardRare:()=>false,emblemsHTML:()=>'',portraitHTML:()=>'',
  positionLabel:pos=>({CAM:'ZOM',RM:'RM'})[pos]||pos,cardStatPairs:()=>[]};
 vm.createContext(ctx);vm.runInContext(`${imageCode}\n${cardCode}`,ctx);
 const palmer={id:'257498',name:'C. Palmer',ovr:85,position:'CAM',alt:'RM',team:'Chelsea FC'};
 const card=ctx.cardHTML(palmer,null,true,'RM');
 assert.match(card,/class="official-card"/);
 assert.match(card,/class="official-assigned-position" aria-label="Eingesetzt als RM">RM/);
 assert.match(card,/class="custom-card gold"/,'a fallback stays available if the remote card fails');
});

test('base player cards use the official FC27 image path while special cards retain their own art',()=>{
 const ctx={prioritizeCached:arr=>arr,imageCacheKey:()=>'',esc:String,imgCandidatesAttr:JSON.stringify};
 vm.createContext(ctx);vm.runInContext(imageCode,ctx);
 const player={id:'235073',name:'Gregor Kobel'};
 assert.match(ctx.officialCardHTML(player,null),/235073_de-DE\.webp/);
 assert.equal(ctx.officialCardHTML({...player,isIcon:true},null),'');
 assert.equal(ctx.officialCardHTML(player,{evo:1}),'');
 assert.equal(ctx.officialCardHTML(player,{variant:'special'}),'');
});

test('a failed official card starts the deferred portrait instead of leaving the player blank',()=>{
 const failures=new Map();let removed=false;
 const ctx={prioritizeCached:arr=>arr,imageCacheKey:()=>'',esc:String,imgCandidatesAttr:JSON.stringify,
  IMAGE_FAILURE_CACHE:failures,persistImageCaches:()=>{},imageFailedRecently:()=>false};
 vm.createContext(ctx);vm.runInContext(imageCode,ctx);
 const portrait={dataset:{pendingSrc:'https://portraits.example/kobel.png'},style:{display:'none'},src:''};
 const url='https://ratings-images-prod.pulse.ea.com/FC27/components/items/235073_de-DE.webp';
 ctx.advanceOfficialCard({currentSrc:url,dataset:{candidates:JSON.stringify([url]),idx:'0'},parentElement:{querySelector:()=>portrait},remove:()=>{removed=true}});
 assert.equal(removed,true);
 assert.equal(portrait.src,'https://portraits.example/kobel.png');
 assert.equal(portrait.style.display,'');
 assert.equal(portrait.dataset.pendingSrc,undefined);
 assert.ok(failures.has(url));
});
