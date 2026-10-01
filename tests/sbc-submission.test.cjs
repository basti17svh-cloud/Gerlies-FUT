const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
function section(start,end){return html.slice(html.indexOf(start),html.indexOf(end))}
function setup(){
 const player={uid:'evo-player',name:'QA Evo',ovr:70},other={uid:'other',name:'Other',ovr:75};
 const evo={uid:player.uid,evoId:'breakthrough',instanceKey:'breakthrough@2026-09-28'};
 const state={club:[player,other],sbcStorage:[],transferList:[],squad:[player.uid,other.uid],squadPresets:[{name:'Team 1',squad:[player.uid,other.uid],roles:{0:'GK',1:'CB'},focus:{0:'defend',1:'defend'}}],activeEvos:[evo],evoProgress:{[evo.instanceKey]:{matches:1}},stats:{sbcs:0}};
 const sbc={id:'qa',once:true,reward:{coins:100}};
 const ctx={state,player,other,sbc,pendingSbcSubmissionId:null,sbcAssistantState:null,sbcSlotDetailState:null,activeSbcId:'qa',sbcPickerState:null,queuedSbcGroupRewardPack:null,SBC_WORKSPACE:{qa:{}},
  getActiveSbcById:id=>id==='qa'?sbc:null,sbcIsCompleted:s=>!!state.sbcCompletions?.[s.id],
  sbcDraftStats:()=>({ok:true,items:[player]}),isFounderItem:()=>false,isStoryItem:()=>false,
  ensureObjectiveWindows(){},persistActiveSquadPreset(){},persistSbcWorkspace(){},save(){},renderAll(){},renderSBC(){},toast(){},grant:r=>state.coins=(state.coins||0)+(r.coins||0),maybeGrantSbcGroupReward:()=>'',history:{state:null},
  activeEvolutionEntries:()=>state.activeEvos,activeEvolutionForUid:uid=>state.activeEvos.find(e=>e.uid===uid)||null,
  displayBase:i=>i,itemRating:i=>i.ovr,positionLabel:()=>'',cardHTML:()=>'',esc:s=>String(s)};
 vm.createContext(ctx);
 vm.runInContext(section('function removeActiveEvolutionForUid(','function removeActiveEvolutionInstance(')+section('function sbcTeamUsageForUid(','function sbcPickerFacetRows(')+section('function finalizeSbcSubmission(','$("sbcTabs").addEventListener('),ctx);
 return ctx
}

test('SBC submission warns for an active evolution even when the player is outside every saved squad',()=>{
 const c=setup();c.state.squadPresets=[];c.state.squad=[];
 c.submitSbcById('qa');
 assert.equal(c.pendingSbcSubmissionId,'qa');assert.equal(c.state.club.length,2);assert.equal(c.state.activeEvos.length,1);
 assert.match(c.sbcWarningHTML(c.sbc),/Evolution/);
});

test('confirmed SBC consumption clears its active evolution and all squad references exactly once',()=>{
 const c=setup();c.finalizeSbcSubmission('qa');
 assert.equal(c.state.activeEvos.length,0);assert.equal(Object.keys(c.state.evoProgress).length,0);
 assert.deepEqual(Array.from(c.state.squad),[null,'other']);assert.deepEqual(Array.from(c.state.squadPresets[0].squad),[null,'other']);
 assert.equal(c.state.squadPresets[0].roles[0],undefined);assert.equal(c.state.squadPresets[0].roles[1],'CB');
 assert.equal(c.state.club.length,1);assert.equal(c.state.club[0].uid,'other');assert.equal(c.state.stats.sbcs,1);assert.equal(c.state.coins,100);
 c.finalizeSbcSubmission('qa');assert.equal(c.state.stats.sbcs,1);assert.equal(c.state.coins,100);
});
