'use strict';
// V21.376 Wochenrückblick: week boundaries (Berlin), summary, once-per-week Monday card, hooks wired in the app.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'..');
const src=fs.readFileSync(path.join(root,'footera-week-recap.js'),'utf8'),timeSrc=fs.readFileSync(path.join(root,'footera-time.js'),'utf8');

function load({history=[],rows=[],potm=null}={}){
 const store=new Map();
 const ctx={
  window:{},console,Intl,Date,JSON,Math,Number,String,Object,Array,setTimeout:()=>0,clearTimeout:()=>{},
  localStorage:{getItem:k=>store.has(k)?store.get(k):null,setItem:(k,v)=>store.set(k,String(v))},
  document:{readyState:'complete',addEventListener(){},querySelector:()=>null,getElementById:()=>null},
  state:{clubMatchHistory:history},
  matchReportPerformanceRows:()=>rows,matchReportPotm:()=>potm,
  displayBase:item=>item.base,itemRating:item=>item.base.ovr,
 };
 vm.createContext(ctx);vm.runInContext(timeSrc,ctx);vm.runInContext(src,ctx);
 return {api:ctx.window.FooteraWeekRecap,store,ctx};
}
const iso=s=>new Date(s);

test('weeks start Monday 00:00 Berlin, also across the DST switch',()=>{
 const {api}=load();
 assert.equal(api.weekStart(iso('2026-11-09T06:00:00Z')).toISOString(),'2026-11-08T23:00:00.000Z');// Mo 09.11. 00:00 CET
 assert.equal(api.weekStart(iso('2026-11-08T22:30:00Z')).toISOString(),'2026-11-01T23:00:00.000Z');// So 23:30 CET still old week
 assert.equal(api.previousWeekStart(iso('2026-11-09T06:00:00Z')).toISOString(),'2026-11-01T23:00:00.000Z');
 assert.equal(api.weekStart(iso('2026-10-28T10:00:00Z')).toISOString(),'2026-10-25T23:00:00.000Z');// week after DST end
 assert.equal(api.weekStart(iso('2026-10-24T10:00:00Z')).toISOString(),'2026-10-18T22:00:00.000Z');// CEST week
});

test('summary counts only matches of that week and picks player of the week',()=>{
 const prev=Date.parse('2026-11-01T23:00:00Z'),D=86400000;
 const history=[
  {ts:prev-1000,result:'win',gf:9,ga:0},// Sunday before: not counted
  {ts:prev+D,result:'win',gf:3,ga:1},{ts:prev+2*D,result:'draw',gf:1,ga:1},{ts:prev+6*D+23*3600e3-1000,result:'loss',gf:0,ga:2},
  {ts:prev+7*D+1000,result:'win',gf:5,ga:0},// next Monday: not counted
 ];
 const {api,store}=load({history});
 store.set('footera-week-recap-v1',JSON.stringify({weeks:{[new Date(prev).toISOString()]:{players:{a:{name:'Kane',goals:4,assists:0,rSum:16,n:2,potm:1},b:{name:'Wirtz',goals:0,assists:3,rSum:17,n:2,potm:0},c:{name:'Joker',goals:1,assists:0,rSum:9.5,n:1,potm:0}},packs:4,best:[{name:'Mbappé',ovr:91}],sbcs:1}}}));
 const s=api.summary(new Date(prev+3*D));
 assert.equal(s.matches,3);assert.equal(s.wins,1);assert.equal(s.draws,1);assert.equal(s.losses,1);
 assert.equal(s.gf,4);assert.equal(s.ga,4);
 assert.equal(s.playerOfWeek.name,'Wirtz','best average with at least 2 games, a one-game 9.5 does not win');
 assert.equal(s.topScorer.name,'Kane');
 assert.equal(s.best.name,'Mbappé');assert.equal(s.packs,4);assert.equal(s.sbcs,1);
});

test('match and pack hooks fill this week\'s log, best pull keeps the top 3',()=>{
 const rows=[{uid:'u1',base:{id:'1',name:'Kane'},minutes:90,goals:2,assists:0,rating:8.4},{uid:'u2',base:{id:'2',name:'Bank'},minutes:0,goals:0,assists:0,rating:0}];
 const {api,store}=load({rows,potm:{side:'home',uid:'u1'}});
 const m={};api.afterMatch(m);api.afterMatch(m);// same match twice counts once
 api.afterPack([{base:{name:'A',ovr:80}},{base:{name:'B',ovr:91}},{base:{name:'C',ovr:85}},{base:{name:'D',ovr:70}}]);
 api.afterSbc();
 const log=JSON.parse(store.get('footera-week-recap-v1'));const w=Object.values(log.weeks)[0];
 assert.equal(w.players.u1.goals,2);assert.equal(w.players.u1.n,1);assert.equal(w.players.u1.potm,1);
 assert.equal(w.players.u2,undefined,'unused bench players are not counted');
 assert.deepEqual(w.best.map(x=>x.name),['B','C','A']);assert.equal(w.packs,1);assert.equal(w.sbcs,1);
});

test('the Monday card is due once, only when last week had something',()=>{
 const now=iso('2026-11-09T07:00:00Z'),prev=Date.parse('2026-11-01T23:00:00Z');
 const empty=load();assert.equal(empty.api.dueFor(now),null,'empty week shows nothing');
 const {api,store}=load({history:[{ts:prev+3600e3,result:'win',gf:1,ga:0}]});
 assert.equal(api.dueFor(now),'2026-11-01T23:00:00.000Z');
 store.set('footera-week-recap-v1',JSON.stringify({seen:'2026-11-01T23:00:00.000Z',weeks:{}}));
 assert.equal(api.dueFor(now),null,'already seen');
});

test('recap is wired into the app, cache and Extras',()=>{
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8'),sw=fs.readFileSync(path.join(root,'service-worker.js'),'utf8'),app=fs.readFileSync(path.join(root,'footera-app.js'),'utf8');
 const js=html.match(/footera-week-recap\.js\?v=(\d+)/),css=html.match(/footera-week-recap\.css\?v=(\d+)/);
 assert.ok(js&&css);
 assert.ok(sw.includes(`./footera-week-recap.js?v=${js[1]}`)&&sw.includes(`./footera-week-recap.css?v=${css[1]}`));
 assert.match(html,/data-week-recap-open/);
 assert.match(app,/applyClubGoalStats\(\);globalThis\.FooteraWeekRecap\?\.afterMatch\(match\)/);
 assert.match(app,/state\.stats\.packs=\(state\.stats\.packs\|\|0\)\+1;save\(\);globalThis\.FooteraWeekRecap\?\.afterPack\(items\)/);
 assert.match(app,/state\.stats\.sbcs\+\+;globalThis\.FooteraWeekRecap\?\.afterSbc\(\)/);
});
