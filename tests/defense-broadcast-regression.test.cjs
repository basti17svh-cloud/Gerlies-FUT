const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..');
test('V21.107: actual simulator ball wins can render without inventing events',async()=>{
 const M=await import('../3d-highlights-scene.mjs'),H=require('../3d-highlights.js');
 const bridge=fs.readFileSync(path.join(root,'3d-highlights-match.js'),'utf8');
 for(const sequence of ['defense_interception','defense_standing_tackle','defense_slide_tackle','defense_press_recovery']){
  assert.equal(M.PLAY_SEQUENCES.includes(sequence),true);
  assert.ok(!H.PLAYBOOK_SCENES.some(v=>v.id===sequence));
 }
 assert.equal(H.accepts('ball_won','off'),false);
 assert.equal(H.accepts('ball_won','goals'),false);
 assert.equal(H.accepts('ball_won','important'),true);
 assert.equal(H.accepts('ball_won','all'),true);
 assert.match(bridge,/function queueMatchDefensive3D\(action,attackingSide,attacker\)/);
 assert.match(bridge,/match\.defenseHighlightsShown/);
 assert.match(bridge,/type:'ball_won'/);
});
test('V21.89: defensive actions still animate during shots',()=>{
 const H=require('../3d-highlights.js');
 let blocks=0,slides=0;
 for(let i=0;i<600;i++){
  const e={id:String(i),type:'big_chance_saved',sequence:'dribble',minute:44,defenderStyles:[{id:'block',plus:true},{id:'slide-tackle',plus:true}]};
  const action=H.chooseReactions(e).defenderAction;
  blocks+=action==='block_attempt'?1:0;slides+=action==='slide_attempt'?1:0;
 }
 assert.ok(blocks>0&&slides>0);
});

test('defensive HUD uses the actual winning team, correct player card and frozen crest',()=>{
 const vm=require('node:vm'),bridge=fs.readFileSync(path.join(root,'3d-highlights-match.js'),'utf8');
 const start=bridge.indexOf('function match3DPresentationMeta('),end=bridge.indexOf('// Resolve styles from copies',start);
 assert.ok(start>=0&&end>start);
 const actors={
  home:[{uid:'home-1',index:1,name:'L. Yamal',base:{name:'L. Yamal',position:'RW'},slot:'RW'},
        {uid:'home-3',index:3,name:'J. Tah',base:{name:'J. Tah',position:'CB'},slot:'CB'}],
  away:[{uid:'',index:2,name:'K. Laimer',entry:{id:'away-laimer'},base:{name:'K. Laimer',position:'CM'},slot:'CM'}]
 };
 const home={crest:{initials:'GER'}},away={crest:{initials:'MON'}};
 const context={
  matchActorRows:side=>actors[side],state:{profile:{clubName:'FC Gerlies'},club:[{uid:'home-3',pid:'tah'}]},
  cardHTML:(base)=>'<div class="card-shell">'+base.name+'</div>',
  displayBase:()=>null,clubIdentitySnapshot:()=>home,
  crestHTML:id=>'<div class="club-crest">'+id.crest.initials+'</div>',
  esc:text=>String(text).replace(/</g,'&lt;')
 };
 const meta=vm.runInNewContext(bridge.slice(start,end)+'\nmatch3DPresentationMeta',context);
 const fixture={opponentProfile:{name:'SV Monte Claro'},opponentName:'SV Monte Claro',kickoffTeamIdentity:{home,away}};
 const defended=meta({type:'ball_won',team:'home',playerId:'home-1',playerName:'L. Yamal',defenderSourceIndex:2,defenderName:'K. Laimer'},fixture);
 assert.equal(defended.teamName,'SV Monte Claro');assert.match(defended.teamCrestHTML,/MON/);
 assert.doesNotMatch(defended.teamCrestHTML,/GER/);assert.match(defended.playerCardHTML,/K\. Laimer/);
 const recovered=meta({type:'ball_won',team:'away',playerId:0,playerName:'Angreifer',defenderUid:'home-3',defenderName:'J. Tah'},fixture);
 assert.equal(recovered.teamName,'FC Gerlies');assert.match(recovered.teamCrestHTML,/GER/);
 assert.match(recovered.playerCardHTML,/J\. Tah/);
 const noLogo=meta({type:'ball_won',team:'home',playerId:'home-1',defenderSourceIndex:2,defenderName:'K. Laimer'},
  {...fixture,kickoffTeamIdentity:{home,away:null}});
 assert.match(noLogo.teamCrestHTML,/fh3d-opponent-crest/);
 assert.match(noLogo.teamCrestHTML,/SMC/);
 assert.doesNotMatch(noLogo.teamCrestHTML,/GER/);
 const scored=meta({type:'goal',team:'home',playerId:'home-1',playerName:'L. Yamal'},fixture);
 assert.equal(scored.teamName,'FC Gerlies');assert.match(scored.teamCrestHTML,/GER/);
});
test('ball win follows goal HUD sizing on mobile without splitting player names',()=>{
 const css=fs.readFileSync(path.join(root,'3d-highlights.css'),'utf8');
 const scene=fs.readFileSync(path.join(root,'3d-highlights-scene.mjs'),'utf8');
 assert.match(css,/\.fh3d-hud-ball_won\{[^}]*grid-template-columns:98px minmax\(0,1fr\) 60px/);
 assert.match(css,/@media\(max-width:560px\)[\s\S]*\.fh3d-hud-ball_won\{grid-template-columns:82px minmax\(0,1fr\) 52px/);
 assert.match(css,/\.fh3d-hud-ball_won \.fh3d-name\{[^}]*word-break:normal/);
 assert.match(scene,/if\(event\.playerCardHTML\)card\.innerHTML=event\.playerCardHTML/);
});
