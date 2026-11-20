'use strict';
// V21.493: Max' Geburtstags-Pick (2 aus 6 · 90+ · tauschbar) and a smaller save for big clubs.
const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const html=require('./helpers/app-html.cjs')();
const section=(a,b)=>{const i=html.indexOf(a),j=html.indexOf(b,i);assert.ok(i>=0&&j>i,a);return html.slice(i,j)};
const read=f=>fs.readFileSync(path.join(__dirname,'..',f),'utf8');

function picksCtx(giftPicks,players){
 const els={};
 const el=id=>els[id]||(els[id]={id,textContent:'',innerHTML:'',hidden:false,disabled:false,classList:{toggle(){},add(){}},focus(){},dataset:{},setAttribute(){},querySelector:()=>el('q')});
 let click=null;
 const ctx={
  state:{club:[],sbcStorage:[],giftPicks,onboarded:false,profile:{saveId:'GF-35FADCCBA5AD4E15'}},
  PLAYERS:players,P_BY_ID:new Map(players.map(p=>[p.id,p])),MID_ICON_BASES:[],saves:0,toasts:[],
  makeItem:(b,t)=>({uid:'u-'+b.id+'-'+Math.random(),pid:b.id,tradeable:t,variant:'gold',rare:true}),
  save(){ctx.saves++},flushSave(){},toast(m){ctx.toasts.push(m)},renderAll(){},esc:s=>String(s),cardHTML:b=>'<card '+b.name+'>',
  showUiLayer(){},closeUiLayer(){},renderStore(){},currentViewId:()=>'storeView',
  localStorage:{getItem:()=>null},setTimeout(){},setInterval(){},window:null,
  document:{readyState:'complete',getElementById:el,createElement:()=>({}),body:{appendChild(){}},querySelector:()=>el('q'),addEventListener(type,fn){if(type==='click')click=fn}}
 };
 ctx.window=ctx;ctx.window.addEventListener=()=>{};ctx.FooteraAccount={};
 vm.createContext(ctx);vm.runInContext(read('player-picks.js'),ctx);
 ctx.els=els;ctx.tap=(attr,value)=>click({target:{closest:sel=>sel==='['+attr+']'?{dataset:{[attr.replace(/^data-/,'').replace(/-([a-z])/g,(_,c)=>c.toUpperCase())]:value},classList:{add(){}},setAttribute(){},querySelector:()=>el('q')}:null}});
 return ctx;
}
const players=[...Array.from({length:14},(_,i)=>({id:String(900+i),name:'Star '+i,ovr:90+(i%2)})),...Array.from({length:30},(_,i)=>({id:String(100+i),name:'Gold '+i,ovr:80+(i%9)}))];

test('gift pick rolls six different 90+ players once and lets Max take exactly two tradeable cards',()=>{
 const ctx=picksCtx([{id:'giftpick-max-geburtstag-20261120',choices:6,count:2,minRating:90,tradeable:true,title:'Geburtstags-Pick',options:null}],players);
 ctx.FooteraPlayerPicks.openGiftPick('giftpick-max-geburtstag-20261120');
 const options=[...ctx.state.giftPicks[0].options];
 assert.equal(options.length,6);assert.equal(new Set(options).size,6);
 assert.ok(options.every(id=>ctx.P_BY_ID.get(id).ovr>=90));
 assert.match(ctx.els.playerPickTitle.textContent,/Geburtstags-Pick · 90\+/);
 assert.match(ctx.els.playerPickDescription.textContent,/2 aus 6/);
 assert.match(ctx.els.playerPickDescription.textContent,/Tauschbar/);
 const opt=id=>({target:{closest:sel=>sel==='[data-pick-option]'?{dataset:{pickOption:id},classList:{add(){}},setAttribute(){},querySelector:()=>({})}:null}});
 // reveal + select three -> only the last two stay selected
 for(const id of options.slice(0,3)){ctx.tap('data-pick-option',id);ctx.tap('data-pick-option',id)}
 ctx.tap('data-pick-confirm','');
 assert.equal(ctx.state.club.length,2);
 assert.deepEqual(ctx.state.club.map(i=>i.pid).sort(),options.slice(1,3).sort());
 assert.ok(ctx.state.club.every(i=>i.tradeable===true&&i.acquisitionSource==='gift-pick'));
 assert.equal(ctx.state.giftPicks.length,0);
 assert.deepEqual([...ctx.state.giftPickClaims['giftpick-max-geburtstag-20261120'].selectedIds].sort(),options.slice(1,3).sort());
});

test('gift pick ticket is listed in the store and counted on the home notice',()=>{
 const ctx=picksCtx([{id:'giftpick-max-geburtstag-20261120',choices:6,count:2,minRating:90,tradeable:true,title:'Geburtstags-Pick',options:null}],players);
 ctx.FooteraPlayerPicks.refresh?.();
 ctx.renderStore();
 const store=ctx.els.playerPicks?.innerHTML||'';
 assert.match(store,/Geburtstags-Pick/);assert.match(store,/2 aus 6 · Goldspieler 90\+ · tauschbar/);
 assert.equal(ctx.els.homePlayerPickCount.textContent,'1');
});

test('the pick waits instead of rolling a short offer while players are still loading',()=>{
 const ctx=picksCtx([{id:'giftpick-x-1234',choices:6,count:2,minRating:90,tradeable:true,options:null}],[]);
 ctx.FooteraPlayerPicks.openGiftPick('giftpick-x-1234');
 assert.equal(ctx.state.giftPicks[0].options,null);assert.match(ctx.toasts[0],/noch geladen/);
});

function statsCtx(club){
 const ctx={state:{club,sbcStorage:[]},saves:0,save(){ctx.saves++},$:()=>null,document:{addEventListener(){},getElementById:()=>null},window:{},displayBase:i=>({name:i.pid}),
  matchReportPerformanceRows:()=>[],matchReportPotm:()=>null,renderClub(){},renderAll(){},cardHTML:()=>'',esc:String,openBiography(){},match:null};
 ctx.applyClubGoalStats=null;
 vm.createContext(ctx);vm.runInContext(read('club-stats.js'),ctx);return ctx;
}
test('empty card stats are dropped at start and never re-created by the stats screen',()=>{
 const zero={matches:0,starts:0,subApps:0,minutes:0,goals:0,assists:0,ratingTotal:0,ratedMatches:0,motm:0,yellow:0,red:0,saves:0,conceded:0,cleanSheets:0};
 const played={...zero,matches:3,goals:2};
 const club=[
  {uid:'a',pid:'1',clubGoals:0,clubAssists:0,clubStats:{version:1,overall:{...zero},modes:{squad:{...zero},rivals:{...zero}},_legacyMigrated:true}},
  {uid:'b',pid:'2',clubGoals:2,clubAssists:0,clubStats:{version:1,overall:{...played},modes:{squad:{...played},rivals:{...zero}},_legacyMigrated:true}},
  {uid:'c',pid:'3',clubGoals:4,clubAssists:1}
 ];
 const ctx=statsCtx(club);
 assert.equal(club[0].clubStats,undefined);
 assert.deepEqual(Object.keys(club[1].clubStats.modes),['squad']);
 assert.equal(club[2].clubStats,undefined,'legacy goals stay on clubGoals');
 assert.equal(ctx.saves,1);
 const src=read('club-stats.js');
 assert.match(src,/const b=readBucket\(item,mode\)/,'lists read without writing buckets');
 assert.doesNotMatch(src,/for\(const item of state\.club\|\|\[\]\)ensureItemStats\(item\)/);
});

test('a full Safari storage gives the portrait caches space to the save',()=>{
 const store=new Map([['gfutImageSourceCacheV9','x'.repeat(50)],['gfutImageFailureCacheV9','y'.repeat(50)]]);
 const LIMIT=120;
 const localStorage={setItem(k,v){const used=[...store].filter(([key])=>key!==k).reduce((n,[key,val])=>n+key.length+val.length,0);if(used+k.length+v.length>LIMIT)throw Error('QuotaExceededError');store.set(k,v)},removeItem(k){store.delete(k)}};
 const ctx={state:{a:'z'.repeat(40)},localStorage,window:{addEventListener(){}},document:{addEventListener(){},getElementById:()=>null},persistActiveSquadPreset(){},toast(){},setTimeout:()=>1,clearTimeout(){},$:()=>null,console:{warn(){}}};
 vm.createContext(ctx);
 vm.runInContext(section('let saveQueued=false','function toast(t){'),ctx);
 assert.equal(vm.runInContext('saveDirty=true;flushSave()',ctx),true);
 assert.ok(store.has('gerliesFutV9'));assert.ok(!store.has('gfutImageSourceCacheV9'));
});
