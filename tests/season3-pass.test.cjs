'use strict';
// Season 3 "Winternächte" (Basti 2026-11-13): 12 new pass players from clubs outside the usual big ones,
// premium beats free on every level, premium pays back 500 Footera Points, free pays 200 Points in total.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'..');
const html=require('./helpers/app-html.cjs')();
const app=fs.readFileSync(path.join(root,'footera-app.js'),'utf8');
const season=fs.readFileSync(path.join(root,'season-system.js'),'utf8');
const time=fs.readFileSync(path.join(root,'footera-time.js'),'utf8');
function load(){
 const s=app.indexOf('const SEASON_REWARDS='),e=app.indexOf('];',s)+2;
 const ps=app.indexOf('const STORY_PASS_PLAYERS='),pe=app.indexOf('});',ps)+3;
 const ctx={state:{coins:0,points:0,sp:0,packs:{},seasonClaims:{},seasonPass:null,stats:{competitiveMatches:0,competitiveWins:0,rivalsMatches:0,squadMatches:0,packs:0,market:0,sbcs:0},claims:{},objectiveWindows:{},objectiveClaims:{},objectiveBonuses:{}},activeEventObjectives:()=>[],TASKS:[],fmt:String,esc:String,rewardText:JSON.stringify,claimSeasonRewards(){},renderHome(){},$:()=>({addEventListener(){},querySelector:()=>null}),save(){},renderAll(){},toast(){},setInterval(){},grant(){},grantSeasonOnly(){}};
 vm.createContext(ctx);
 vm.runInContext(time,ctx);
 vm.runInContext(app.slice(s,e)+';'+app.slice(ps,pe)+';'+season+';this.SEASON_REWARDS=SEASON_REWARDS;this.STORY_PASS_PLAYERS=STORY_PASS_PLAYERS;this.seasonTierReward=seasonTierReward;this.seasonInfo=seasonInfo;this.seasonLevelSp=seasonLevelSp;',ctx);
 return ctx;
}
// Rough coin values to compare the two tracks (packs by store price or contents, 1 Point = 100 Coins).
const PACK={silver:900,gold:4500,goldplayers:15000,'82':20000,'85':40000,'pass-83x10':60000,'pass-84x5':50000,'pass-84x10':100000,'pass-85x7':120000};
const value=r=>{if(!r)return 0;let v=(r.coins||0)+(r.points||0)*100+(r.coinBoost?r.coinBoost.games*r.coinBoost.amount:0);if(r.pack){assert.ok(r.pack in PACK,`known pack ${r.pack}`);v+=PACK[r.pack]*(r.qty||1)}return v};

test('Season 3 runs 11.12.2026 19:00 to 29.01.2027 19:00 as WINTERNÄCHTE',()=>{
 const ctx=load();
 const at=ctx.seasonInfo(new Date('2026-12-11T18:00:00Z'));
 assert.equal(at.key,'s3');assert.equal(at.name,'WINTERNÄCHTE');
 assert.equal(ctx.seasonInfo(new Date('2027-01-29T17:59:00Z')).key,'s3');
 assert.equal(ctx.seasonInfo(new Date('2027-01-29T18:00:00Z')).key,'s4');
 assert.equal(ctx.seasonLevelSp(ctx.SEASON_REWARDS.at(-1),'s3'),39750);
});

test('12 new pass players, ratings rise, no club twice, winter design, real DB players',()=>{
 const ctx=load();
 const s3=Object.entries(ctx.STORY_PASS_PLAYERS).filter(([,p])=>p.season==='s3');
 assert.equal(s3.length,12);
 const rows=new Map(fs.readFileSync(path.join(root,'assets/players-db.csv'),'utf8').split('\n').map(l=>{const c=l.match(/("[^"]*"|[^,]*)(,|$)/g)||[];return[c[0]?.replace(/,$/,''),l]}));
 for(const [key,p] of s3){
  assert.equal(key,`s3-${p.track==='premium'?'premium-':''}${p.level}`);
  const row=rows.get(p.pid);assert.ok(row,`${p.name} in players-db.csv`);
  assert.equal(p.design,'winter');assert.equal(p.stats.length,6);
  assert.ok(p.stats.every(v=>v>=20&&v<=99));
  assert.ok(fs.existsSync(path.join(root,p.face)),`${p.name} portrait ${p.face}`);
 }
 for(const track of ['free','premium']){
  const list=s3.filter(([,p])=>p.track===track).map(([,p])=>p).sort((a,b)=>a.level-b.level);
  for(let i=1;i<list.length;i++)assert.ok(list[i].rating>list[i-1].rating,`${track} ratings rise`);
 }
 const csv=fs.readFileSync(path.join(root,'assets/players-db.csv'),'utf8');
 const clubOf=pid=>{const line=csv.split('\n').find(l=>l.startsWith(pid+','));return line.match(/,([^,]+),\d+,https:\/\/[^,]*,[^,]*,https/)?.[1]||line};
 const names=s3.map(([,p])=>clubOf(p.pid));
 assert.equal(new Set(names).size,12,'never two players from the same club: '+names.join(' | '));
 const big=/Real Madrid|Barcelona|Bayern|Manchester City|Arsenal|Chelsea|Liverpool|Inter$|Dortmund|Paris/;
 for(const c of names)assert.doesNotMatch(c,big,`no usual big club (${c})`);
});

test('pass players appear in no other promo (TOTW, events, earlier seasons)',()=>{
 const ctx=load();
 const ps=html.indexOf('const STORY_PASS_PLAYERS='),pe=html.indexOf('});',ps)+3;
 const outside=html.slice(0,ps)+html.slice(pe);
 const promoPids=new Set([...outside.matchAll(/pid:"(\d+)"/g)].map(m=>m[1]));
 const earlier=Object.values(ctx.STORY_PASS_PLAYERS).filter(p=>p.season!=='s3');
 for(const p of Object.values(ctx.STORY_PASS_PLAYERS).filter(p=>p.season==='s3')){
  assert.ok(!promoPids.has(p.pid),`${p.name} is in no other promo`);
  assert.ok(!earlier.some(o=>o.pid===p.pid||o.name===p.name),`${p.name} was no earlier pass player`);
 }
});

test('premium beats free on every level; points: premium 500 (next pass), free 200',()=>{
 const ctx=load();
 let freePts=0,premPts=0;
 for(const tier of ctx.SEASON_REWARDS){
  const f=ctx.seasonTierReward(tier,'free','s3'),p=ctx.seasonTierReward(tier,'premium','s3');
  freePts+=f.points||0;premPts+=p.points||0;
  if(f.story||p.story)continue; // player levels: each track has its own pass player
  assert.ok(value(p)>value(f),`level ${tier.level}: premium ${JSON.stringify(p)} > free ${JSON.stringify(f)}`);
 }
 assert.equal(freePts,200);
 assert.equal(premPts,500);
 assert.match(season,/const PASS_PRICE=\{coins:50000,points:500\}/);
 // Season 2 keeps its own rewards.
 assert.equal(ctx.seasonTierReward(ctx.SEASON_REWARDS[15],'free','s2').pack,'pass-83x10');
});
