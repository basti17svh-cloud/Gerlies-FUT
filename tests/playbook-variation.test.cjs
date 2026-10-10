const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..');
const importPlaybook=()=>import('../3d-playbook.mjs');
test('V21.86: thirty distinct authored attacking sequences, not just different labels',async()=>{
 const {PLAYBOOK,getPlay,PLAYBOOK_IDS,playTouches}=await importPlaybook();
 assert.equal(PLAYBOOK.length,30);
 assert.equal(new Set(PLAYBOOK_IDS).size,30);
 assert.ok(PLAYBOOK.every(p=>p.order.length>=2&&p.order.at(-1)===0&&p.seconds>=9&&p.seconds<=20));
 assert.ok(new Set(PLAYBOOK.map(p=>p.order.join(','))).size>=18);
 assert.ok(PLAYBOOK.every(p=>playTouches(p).length===p.order.length-1));
 for(const id of PLAYBOOK_IDS)assert.equal(getPlay(id).id,id);
});
test('V21.86: ball flight reaches the actual animated passer and receiver in every sequence',async()=>{
 const {PLAYBOOK,playTouches,playBall,playPosition}=await importPlaybook(),contact=[.105,.17,-37.25];
 for(const p of PLAYBOOK){
  for(const beat of playTouches(p)){
   const from=playBall(p,beat.release,contact),to=playBall(p,beat.arrival-.00001,contact);
   const origin=playPosition(beat.passer,beat.release,p),receiver=playPosition(beat.receiver,beat.arrival,p);
   assert.ok(Math.hypot(from[0]-origin[0],from[2]-origin[1])<.70,p.id+' pass release');
   assert.ok(Math.hypot(to[0]-receiver[0],to[2]-receiver[1])<.9,p.id+' pass receipt');
   const mid=playBall(p,(beat.release+beat.arrival)/2,contact);
   assert.ok(mid[1]>=.13&&mid[1]<4,p.id+' valid pass arc');
  }
  assert.deepEqual(playBall(p,5.4,contact),contact,p.id+' canonical shot contact');
 }
});
test('V21.86: attacking choreography and interceptions are stateless and independent from RNG',async()=>{
 const s=fs.readFileSync(path.join(root,'3d-playbook.mjs'),'utf8');
 assert.doesNotMatch(s,/Math\.random\s*\(/);
 assert.doesNotMatch(s,/match\./);
 const {PLAYBOOK,playBall,DEFENSIVE_SCENES,defenseBall,defensePosition}=await importPlaybook();
 for(const p of PLAYBOOK)for(const t of [0,.8,1.6,2.8,4.2,5.4]){
  const point=playBall(p,t,[.105,.17,-37.25]);
  assert.ok(point.every(Number.isFinite),p.id);
  assert.deepEqual(point,playBall(p,t,[.105,.17,-37.25]));
 }
 assert.equal(DEFENSIVE_SCENES.length,4);
 for(const id of DEFENSIVE_SCENES){
  const take=defenseBall(4.4,id),defender=defensePosition(8,4.4,id),after=defenseBall(7.2,id);
  assert.ok(Math.hypot(take[0]-defender[0],take[2]-defender[1])<.65,id+' ball won at foot');
  assert.ok(after[2]>take[2]+3,id+' defender carries away from goal');
  assert.ok(after.every(Number.isFinite));
 }
});
test('V21.89: no obsolete independent ball-won highlight type',()=>{
 const H=require('../3d-highlights.js');
 assert.equal(H.accepts('ball_won'),false);
});

test('V21.86: all authored scene PlayStyles match the actual Footera registry',async()=>{
 const H=require('../3d-highlights.js');
 const P=await import('../3d-playbook.mjs');
 const ids=new Set(require('../playstyles.js').definitions.map(style=>style.id));
 for(const scene of H.PLAYBOOK_SCENES){
  const authored=P.getPlay(scene.id);
  assert.ok(authored,'missing authored movement: '+scene.id);
  assert.deepEqual([...scene.tags],[...authored.tags],scene.id+' must use identical style weights');
  for(const id of scene.tags)assert.ok(ids.has(id),'unknown PlayStyle: '+scene.id+' / '+id);
 }
});
