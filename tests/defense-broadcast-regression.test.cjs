const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..');
test('V21.87: defenses show opposing possession, pass, tackle and escape',async()=>{
 const P=await import('../3d-playbook.mjs');
 for(const seq of ['defense_interception','defense_standing_tackle','defense_slide_tackle','defense_press_recovery']){
  const source=P.defensePosition(1,0,seq),first=P.defenseBall(0,seq);
  assert.ok(Math.hypot(first[0]-source[0],first[2]-source[1])<.75,seq+' opponent starts with ball');
  assert.ok(P.defenseBall(1.03,seq)[1]>.17,seq+' pass is visibly off the grass');
  const recv=P.defenseBall(1.42,seq),attacker=P.defensePosition(0,1.42,seq);
  assert.ok(Math.hypot(recv[0]-attacker[0],recv[2]-attacker[1])<.72,seq+' attacking receiver has ball');
  const defender=P.defensePosition(8,4.4,seq),win=P.defenseBall(4.4,seq);
  assert.ok(Math.hypot(win[0]-defender[0],win[2]-defender[1])<.65,seq+' defender wins the ball');
  assert.ok(P.defenseBall(6.3,seq)[2]>win[2]+2,seq+' starts countering');
  for(const time of [.65,1.42,4.03,4.4]){
   const x=P.defenseBall(time-.0001,seq),y=P.defenseBall(time+.0001,seq);
   assert.ok(Math.hypot(...x.map((v,i)=>v-y[i]))<.04,seq+' smooth ball path @'+time);
  }
 }
});
test('V21.87: camera closes on defense but never changes touchline',async()=>{
 const M=await import('../3d-highlights-scene.mjs');
 for(const sequence of ['defense_interception','defense_standing_tackle','defense_slide_tackle','defense_press_recovery']){
  for(const dir of [-1,1]){
   const before=M.cameraState(dir,.2,1,'ball_won',sequence),won=M.cameraState(dir,4.65,1,'ball_won',sequence);
   assert.ok(before.distance<58&&won.distance<49,sequence+' useful TV distance');
   assert.ok(before.fov<=31&&won.fov<29,sequence+' players stay readable');
   assert.ok(before.position[0]>0&&won.position[0]>0,sequence+' fixed sideline');
   assert.ok(won.distance<before.distance,'camera pushes toward challenge');
  }
 }
 for(const sequence of ['triangle_left','overlap_left_low','split_defenders']){
  const c=M.cameraState(1,1.4,1,'goal',sequence);
  assert.ok(c.distance<62&&c.fov<33,sequence+' no microscopic players');
 }
 const src=fs.readFileSync(path.join(root,'3d-highlights-scene.mjs'),'utf8');
 assert.ok(src.includes("event.type==='ball_won'?4.55:REVEAL_TIME"));
});
test('V21.87: interception banner fits mobile width in a dedicated layout',()=>{
 const css=fs.readFileSync(path.join(root,'3d-highlights.css'),'utf8');
 assert.ok(css.includes('.fh3d-hud-ball_won{left:10px'));
 assert.ok(css.includes('white-space:nowrap}'));
 assert.ok(css.includes('.fh3d-hud-ball_won .fh3d-team-crest{display:none}'));
});
