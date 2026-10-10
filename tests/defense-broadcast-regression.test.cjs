const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..');
test('V21.89: remove standalone ball-winning scenes but keep actual game defenses',async()=>{
 const M=await import('../3d-highlights-scene.mjs'),H=require('../3d-highlights.js');
 const bridge=fs.readFileSync(path.join(root,'3d-highlights-match.js'),'utf8');
 for(const sequence of ['defense_interception','defense_standing_tackle','defense_slide_tackle','defense_press_recovery']){
  assert.equal(M.PLAY_SEQUENCES.includes(sequence),false);
  assert.ok(!H.PLAYBOOK_SCENES.some(v=>v.id===sequence));
 }
 assert.equal(H.accepts('ball_won'),false);
 assert.ok(bridge.includes('function queueMatchDefensive3D(){return false}'));
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
