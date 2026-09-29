const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const source=fs.readFileSync(path.join(__dirname,'../friend-online.js'),'utf8');
const rankCode=source.slice(source.indexOf('function rankRows('),source.indexOf('async function showComparison('));
const ctx={};vm.createContext(ctx);vm.runInContext(rankCode,ctx);
const rank=(games)=>JSON.parse(JSON.stringify(ctx.rankRows(games,'me','friend','Gerlies FC','Rangers FC').map(({name,sp,s,u,n,tore,gt,pkt})=>({name,sp,s,u,n,tore,gt,pkt}))));

test('direct comparison counts only finished live matches in both directions',()=>{
 const matches=[
  {status:'finished',home_user:'me',away_user:'friend',home_score:3,away_score:1},
  {status:'finished',home_user:'friend',away_user:'me',home_score:2,away_score:2},
  {status:'finished',home_user:'friend',away_user:'me',home_score:2,away_score:0},
  {status:'invited',home_user:'me',away_user:'friend',home_score:5,away_score:0},
  {status:'finished',home_user:'me',away_user:'stranger',home_score:9,away_score:0}
 ];
 assert.deepEqual(rank(matches),[
  {name:'Gerlies FC',sp:3,s:1,u:1,n:1,tore:5,gt:5,pkt:4},
  {name:'Rangers FC',sp:3,s:1,u:1,n:1,tore:5,gt:5,pkt:4}
 ]);
});

test('goal difference, then scored goals, break equal-point ties',()=>{
 const games=[
  {status:'finished',home_user:'me',away_user:'friend',home_score:4,away_score:0},
  {status:'finished',home_user:'friend',away_user:'me',home_score:2,away_score:1}
 ];
 assert.equal(rank(games)[0].name,'Gerlies FC');
 assert.equal(rank([])[0].name,'Gerlies FC');
});
