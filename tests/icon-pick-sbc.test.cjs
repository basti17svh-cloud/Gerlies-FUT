'use strict';
// V21.380 Icon Player Pick SBC: three part SBCs with packs, group bonus = local pick 1 of 4 random Icons.
const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const html=require('./helpers/app-html.cjs')();
const section=(a,b)=>html.slice(html.indexOf(a),html.indexOf(b,html.indexOf(a)));
const picksSrc=fs.readFileSync(path.join(__dirname,'..','player-picks.js'),'utf8');

function sbcCtx(){
 const ctx={};vm.createContext(ctx);
 vm.runInContext(section('// Icon Player Pick (Basti 2026-11-09)','function activeEventPlayerSBCs('),ctx);
 return ctx;
}

test('three part SBCs: 85 + TOTW, 86, 86 + TOTW, each with its own pack',()=>{
 const rows=vm.runInContext('activeIconPickSBCs(new Date("2026-11-10T12:00:00Z"))',sbcCtx());
 assert.equal(rows.length,3);
 assert.deepEqual(JSON.parse(JSON.stringify(rows.map(r=>[r.minAvg,r.minTotw||0,r.reward.pack]))),[[85,1,'goldplayers'],[86,0,'primegold'],[86,1,'84x2-sbc']]);
 for(const r of rows){
  assert.equal(r.group,'Profis');assert.equal(r.count,11);assert.ok(r.once);
  assert.equal(r.groupSet,'icon_player_pick_20261109');
  assert.deepEqual({...r.groupReward.iconPick},{choices:4,count:1});
  assert.equal(r.expiresAt,undefined,'kein Ablaufdatum');
 }
 const packs=new Set([...html.matchAll(/\{"?id"?:"([^"]+)"/g)].map(m=>m[1]));
 for(const id of ['goldplayers','primegold','84x2-sbc'])assert.ok(packs.has(id),id);
 assert.match(html,/\.\.\.activeIconPickSBCs\(now\)/);
});

test('grant stores one unopened Icon pick',()=>{
 const ctx={state:{},uid:()=>'x1'};vm.createContext(ctx);
 vm.runInContext(section('// Local Icon Player Picks','function iconPickLabel(')+section('function iconPickLabel(','\n'),ctx);
 assert.equal(vm.runInContext('grantIconPick({choices:4,count:1})',ctx),1);
 assert.equal(ctx.state.iconPicks.length,1);
 assert.equal(ctx.state.iconPicks[0].choices,4);
 assert.equal(ctx.state.iconPicks[0].options,null);
 assert.equal(vm.runInContext('iconPickLabel({choices:4})',ctx),'Icon Player Pick (1 aus 4)');
});

function picksCtx(iconPicks){
 const icons=Array.from({length:8},(_,i)=>({id:'midicon-i'+i,name:'Icon '+i,ovr:86+i,isIcon:true}));
 const els={};
 const el=id=>els[id]||(els[id]={id,textContent:'',innerHTML:'',hidden:false,disabled:false,classList:{toggle(){},add(){}},focus(){},dataset:{},setAttribute(){},querySelector:()=>el('q')});
 const ctx={
  state:{club:[],sbcStorage:[],iconPicks,onboarded:false,profile:{saveId:'GF-T'}},
  MID_ICON_BASES:icons,saves:0,toasts:[],layers:[],
  makeMidIconItem:(b,t)=>({uid:'u-'+b.id,pid:b.id,tradeable:t,variant:'icon-mid',eventName:'Icon'}),
  save(){ctx.saves++},flushSave(){},toast(m){ctx.toasts.push(m)},renderAll(){},esc:s=>String(s),cardHTML:()=>'<card>',
  showUiLayer(id){ctx.layers.push('open:'+id)},closeUiLayer(id){ctx.layers.push('close:'+id)},renderStore(){},currentViewId:()=>'homeView',
  localStorage:{getItem:()=>null},setTimeout(){},setInterval(){},window:null,
  document:{readyState:'complete',getElementById:el,createElement:()=>({}),body:{appendChild(){}},querySelector:()=>el('q'),addEventListener(){}}
 };
 ctx.window=ctx;ctx.window.addEventListener=()=>{};ctx.FooteraAccount={};
 vm.createContext(ctx);vm.runInContext(picksSrc,ctx);
 ctx.els=els;return ctx;
}

test('opening rolls 4 different Icons once; closing and reopening keeps them',()=>{
 const ctx=picksCtx([{id:'p1',choices:4,minRating:0,options:null}]);
 ctx.FooteraPlayerPicks.openIconPick('p1');
 const first=[...ctx.state.iconPicks[0].options];
 assert.equal(first.length,4);assert.equal(new Set(first).size,4);
 assert.ok(first.every(id=>id.startsWith('midicon-')));
 assert.equal(ctx.saves,1,'Auswahl wird sofort gespeichert');
 ctx.FooteraPlayerPicks.onClose();
 ctx.FooteraPlayerPicks.openIconPick('p1');
 assert.deepEqual([...ctx.state.iconPicks[0].options],first);
 assert.equal(ctx.saves,1,'kein neues Würfeln');
});

test('a stored pick opens the four stored Icons and lists them in the store',()=>{
 const ctx=picksCtx([{id:'p2',choices:4,minRating:0,options:['midicon-i1','midicon-i2','midicon-i3','midicon-i4']}]);
 ctx.FooteraPlayerPicks.openIconPick();
 assert.match(ctx.els.playerPickOptions.innerHTML,/data-pick-option="midicon-i1"/);
 assert.match(ctx.els.playerPickOptions.innerHTML,/ICON PICK/);
 assert.match(ctx.els.playerPickTitle.textContent,/^Icon Player Pick$/);
});

test('Basti receives three Icon picks once as a direct gift',()=>{
 let n=0;const ctx={state:{profile:{saveId:'GF-9AE6CDDEFE8A458D'},packs:{}},uid:()=>'g'+(++n),PACKS:[],save(){},flushSave(){},isTesterClub:()=>false,TESTER_REWARDS:[]};vm.createContext(ctx);
 vm.runInContext(section('// Local Icon Player Picks','function iconPickLabel(')+section('const DIRECT_REWARDS=','// Thank-you gifts')+section('function grantDirectRewards(','const PROMO_CODES='),ctx);
 const first=vm.runInContext('grantDirectRewards()',ctx);
 assert.ok(first.some(r=>r.id==='basti_iconpicks_20261109'));
 assert.equal(ctx.state.iconPicks.length,3);
 assert.ok(ctx.state.iconPicks.every(p=>p.choices===4&&p.options===null&&p.source==='gift'));
 assert.equal(vm.runInContext('grantDirectRewards()',ctx).length,0);
 assert.equal(ctx.state.iconPicks.length,3,'nur einmal');
});
