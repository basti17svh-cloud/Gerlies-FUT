const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.join(__dirname,'..');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const bridge=fs.readFileSync(path.join(root,'3d-highlights-match.js'),'utf8');
const scene=fs.readFileSync(path.join(root,'3d-highlights-scene.mjs'),'utf8');
const css=fs.readFileSync(path.join(root,'3d-highlights.css'),'utf8');
function section(source,from,to){
 const start=source.indexOf(from),end=source.indexOf(to,start);
 assert.ok(start>=0&&end>start,from);
 return source.slice(start,end)
}
test('the 3D Matchday bridge resolves the defender for saves and the shooter for misses',()=>{
 const code=section(bridge,'function match3DPresentationMeta(', '// Resolve styles from copies');
 const home=[{uid:'keeper',index:0,name:'David Raya',slot:'GK',base:{name:'David Raya',ovr:87,position:'GK'}},{uid:'striker',index:9,name:'Bastian Gerlach',slot:'ST',base:{name:'Bastian Gerlach',ovr:88,position:'ST'}}];
 const away=[{index:0,name:'Aurora Keeper',slot:'GK',base:{name:'Aurora Keeper',ovr:85,position:'GK'}},{index:9,name:'Roberto Carlos',slot:'LB',base:{name:'Roberto Carlos',ovr:88,position:'LB'}}];
 const items=[{uid:'keeper',pid:'k'},{uid:'striker',pid:'s'}];
 const opponentItems=Array.from({length:11},()=>null);
 opponentItems[0]={pid:'away-gk'};opponentItems[9]={pid:'away-9'};
 const current={clubIndex:new Map(items.map(i=>[i.uid,i])),opponentProfile:{name:'CD Aurora',items:opponentItems},kickoffTeamIdentity:{home:{which:'home'},away:{which:'away'}}};
 const ctx={state:{club:items,profile:{clubName:'FC Gerlies'}},matchActorRows:side=>side==='home'?home:away,
   displayBase:item=>({name:item.uid==='keeper'?'David Raya':item.uid==='striker'?'Bastian Gerlach':item.pid==='away-gk'?'Aurora Keeper':'Roberto Carlos',ovr:88,position:'GK'}),
   cardHTML:base=>'<div class="card-shell">'+base.name+'</div>',crestHTML:identity=>identity.which,esc:String,console};
 vm.createContext(ctx);vm.runInContext(code,ctx);
 for(const type of ['goal','big_chance_saved','big_chance_missed','shot_post','ball_won']){
  for(const team of ['home','away']){
   const event={type,team,playerId:team==='home'?'striker':9,playerName:team==='home'?'Bastian Gerlach':'Roberto Carlos',
    goalkeeperUid:team==='away'?'keeper':'',goalkeeperIndex:team==='home'?0:-1,keeperName:team==='home'?'Aurora Keeper':'David Raya',
    defenderUid:team==='away'?'keeper':'',defenderSourceIndex:team==='home'?0:-1,defenderName:team==='home'?'Aurora Keeper':'David Raya'};
   const meta=ctx.match3DPresentationMeta(event,current);
   const defended=type==='big_chance_saved'||type==='ball_won';
   const expected=defended?(team==='home'?'Aurora Keeper':'David Raya'):(team==='home'?'Bastian Gerlach':'Roberto Carlos');
   assert.ok(meta.playerCardHTML.includes('card-shell')&&meta.playerCardHTML.includes(expected),type+' '+team);
   assert.equal(meta.teamCrestHTML,defended?(team==='home'?'away':'home'):team);
  }
 }
 assert.ok(scene.includes('if(event.playerCardHTML)card.innerHTML=event.playerCardHTML'));
 assert.ok(css.includes('same real card, club crest, minute and grid'));
});
test('match attacker selection excludes keepers by tactical slot and actual player position',()=>{
 const chooser=section(html,'function chooseMatchAttacker(side){','function matchDefensiveSkill(row){');
 const pick=section(html,'function weightedMatchPick(rows){','function scorerSlotWeight(slot){');
 const weight=section(html,'function scorerSlotWeight(slot){','function assistSlotWeight(slot){');
 const players=[{uid:'keeper',slot:'GK',base:{position:'GK'}},{uid:'wrong-slot',slot:'ST',base:{position:'GK'}},{uid:'forward',slot:'ST',base:{position:'ST'}}].map(p=>({...p,attrs:{sho:95,pac:95,dri:95},fitness:100,ctx:{scorer:1}}));
 const ctx={Math,matchActorRows:()=>players};
 vm.createContext(ctx);vm.runInContext(pick+weight+chooser,ctx);
 for(let i=0;i<100;i++)assert.equal(ctx.chooseMatchAttacker('home').uid,'forward');
 players.pop();
 assert.equal(ctx.chooseMatchAttacker('away'),null);
 assert.ok(html.includes('if(!attacker)return; // No fictional shot'));
});
