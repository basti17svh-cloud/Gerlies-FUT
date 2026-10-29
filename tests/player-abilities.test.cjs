const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const A=require('../footera-match-actions.js'),H=require('../3d-highlights.js');
const player=(base={},styles=[])=>({base:{preferredFoot:'Right',skillMoves:3,weakFoot:3,...base},attrs:{pac:80,sho:80,pas:80,dri:80,phy:80,def:80},styles});
test('strong foot and weak-foot stars affect real shot and passing calculations symmetrically',()=>{
 for(const preferredFoot of ['Left','Right']){
  const opposite=preferredFoot==='Left'?'Right':'Left',shot={actionKind:'through',finish:'normal'},values=[];
  for(let stars=1;stars<=5;stars++){
   const p=player({preferredFoot,weakFoot:stars}),strong=A.goalChance(.2,p,{...shot,shotFoot:preferredFoot}),weak=A.goalChance(.2,p,{...shot,shotFoot:opposite});
   values.push(weak);assert.equal(strong,A.goalChance(.2,player({preferredFoot,weakFoot:5}),{...shot,shotFoot:preferredFoot}));
   assert.equal(A.actionFoot(p,'through',.01),opposite);assert.equal(A.actionFoot(p,'through',.9),preferredFoot);
   assert.equal(A.goalChance(.2,p,{...shot,finish:'header',shotFoot:opposite}),A.goalChance(.2,p,{...shot,finish:'header',shotFoot:preferredFoot}));
  }
  assert.ok(values.every((v,i)=>i===0||v>values[i-1]));
  assert.equal(A.footFactor(player({preferredFoot,weakFoot:5}),opposite),1);
  assert.ok(A.buildSkill(player({preferredFoot,weakFoot:1}),'through',{creatorFoot:opposite})<A.buildSkill(player({preferredFoot,weakFoot:5}),'through',{creatorFoot:opposite}));
 }
 assert.deepEqual(A.playerTraits({base:{ovr:99}}),{preferredFoot:'',weakFoot:0,skillMoves:0});
 assert.equal(A.footFactor(player({weakFoot:0}),'Left'),1,'unknown data does not fabricate stars');
});
test('skill stars gate moves and improve duels; Plus increases relevant skill usage',()=>{
 const duel=[];
 for(let stars=1;stars<=5;stars++){
  const row=player({skillMoves:stars}),seen=new Set();duel.push(A.duelSkill(row,'dribble'));
  for(let i=0;i<2000;i++){const skill=A.skillFor(row,'dribble',(i+.5)/2000);if(skill){assert.ok(A.SKILL_LEVELS[skill]<=stars);seen.add(skill)}}
  assert.equal(seen.size,Object.values(A.SKILL_LEVELS).filter(n=>n<=stars).length);
  assert.equal(A.skillFor(row,'combination',.1),'');
 }
 assert.ok(duel.every((v,i)=>i===0||v>duel[i-1]));
 const count=styles=>Array.from({length:1000},(_,i)=>A.skillFor(player({skillMoves:5},styles),'dribble',(i+.5)/1000)).filter(Boolean).length;
 assert.ok(count([{id:'trickster',plus:true}])>count([{id:'trickster'}]));
 assert.ok(count([{id:'trickster'}])>count([]));
 assert.equal(A.skillFor(player({skillMoves:0}),'dribble',.1),'');
});
test('all 32 new plays have continuous passing and foot contact, with ten distinct skill motions',async()=>{
 const P=await import('../3d-playbook.mjs'),S=await import('../3d-skill-actions.mjs'),M=await import('../3d-highlights-scene.mjs');
 assert.deepEqual(S.SKILL_LEVELS,A.SKILL_LEVELS);assert.equal(P.V303_ATTACK_IDS.length,32);
 const poses=new Set();
 for(const id of P.V303_ATTACK_IDS){
  const plan=P.getPlay(id),contact=M.shotContact(id,'normal');let before=P.playBall(plan,0,contact);
  for(let t=.01;t<=5.4;t+=.01){
   const ball=P.playBall(plan,t,contact);assert.ok(ball.every(Number.isFinite));assert.ok(Math.hypot(...ball.map((x,i)=>x-before[i]))<.65,id+' ball continuity');before=ball;
  }
  assert.deepEqual(P.playBall(plan,5.4,contact),contact);
  if(S.skillScene(id)){
   for(const time of [1.65,2.1,2.7,3.35])assert.equal(P.playCarrier(plan,time),0,id+' retains possession during skill');
   const p=S.sampleSkill(id,2.4);assert.ok(p.weight>.9);poses.add(JSON.stringify([p.left,p.right,p.ballSide,p.yaw]));
  }
  for(const type of ['goal','big_chance_saved','big_chance_missed','shot_post']){
   const skill=S.skillScene(id),event={id:'abilities-'+id,type,actionKind:plan.family,finish:'normal',skillMove:skill?.move,skillMoves:skill?.minStars,creatorName:'Vorlage'};
   if(skill)assert.match(H.choosePresentation(event).sequence,new RegExp('^skill_'+skill.move+'_'));
   assert.equal(H.choosePresentation(event).finish,'normal');
  }
 }
 assert.ok(poses.size>=18,'distinct movement shapes, not just new names');
 for(const min of [1,2,3,4])for(let i=0;i<100;i++)assert.ok(!/elastico/.test(H.choosePresentation({id:'low'+i,type:'goal',actionKind:'dribble',finish:'normal',skillMoves:min,skillMove:'elastico'}).sequence));
 assert.equal(P.V303_ATTACK_IDS.filter(id=>P.getPlay(id).family==='combination').length,8);
});
test('foot and skill data survive snapshot, goal and miss bridges without changing results',()=>{
 const payload={shotFoot:'Left',creatorFoot:'Right',preferredFoot:'Right',weakFoot:2,skillMoves:5,skillMove:'elastico'};
 const snap=H.snapshot({id:'traits',type:'goal',...payload});for(const [key,val] of Object.entries(payload))assert.equal(snap[key],val);
 const src=fs.readFileSync(require.resolve('../3d-highlights-match.js'),'utf8'),a=src.indexOf('function queueMatchGoal3D('),b=src.indexOf('\n(function(){',a),events=[];
 const ctx={match:{goalEvents:[{}],shotEvents:[{}]},queueMatch3D:e=>{events.push(e);return true}};vm.createContext(ctx);vm.runInContext(src.slice(a,b),ctx);
 ctx.queueMatchGoal3D({side:'home',scoreHome:1,scoreAway:0,...payload});
 ctx.queueMatchChance3D({side:'home',highlightType:'big_chance_saved',...payload});
 for(const event of events)for(const [key,val] of Object.entries(payload))assert.equal(event[key],val);
 assert.equal(ctx.match.goalEvents.length,1);assert.equal(ctx.match.shotEvents.length,1);
});

test('new attacks preserve a stable TV camera and goal coverage at all three phone widths',async()=>{
 const P=await import('../3d-playbook.mjs'),M=await import('../3d-highlights-scene.mjs'),T=await import('../vendor/three/three.module.min.js');
 for(const id of P.V303_ATTACK_IDS)for(const direction of [-1,1])for(const width of [360,390,412]){
  const aspect=width/340,track=M.createBroadcastCameraTrack({direction,aspect,sequence:id,type:'goal',finish:'normal'}),camera=new T.PerspectiveCamera(40,aspect,.1,250);
  let prev=track(0);
  for(let time=.05;time<=6.7;time+=.05){
   const c=track(time);assert.ok(c.position[0]>0&&c.position[1]>0);assert.ok(Math.hypot(...c.position.map((x,i)=>x-c.target[i]))>=31,id+' TV distance');
   assert.ok(Math.hypot(...c.target.map((x,i)=>x-prev.target[i]))<1,id+' continuous pan');prev=c;
   if(time>4.8){
    camera.position.set(...c.position);camera.fov=c.fov;camera.lookAt(new T.Vector3(...c.target));camera.updateProjectionMatrix();camera.updateMatrixWorld(true);
    for(const x of [-3.66,3.66]){const q=new T.Vector3(x*direction,2.44,-52.5*direction).project(camera);assert.ok(Math.abs(q.x)<.98&&Math.abs(q.y)<.98,id+' full goal '+width+' '+direction)}
   }
  }
 }
});
test('skill and left-foot poses blend continuously, use different joints and never accumulate on seeks',async()=>{
 const T=await import('../vendor/three/three.module.min.js'),S=await import('../3d-skill-actions.mjs');
 const actor=()=>({rig:new T.Group(),upper:new T.Group(),legs:[new T.Group(),new T.Group()],knees:[new T.Group(),new T.Group()],ankles:[new T.Group(),new T.Group()],arms:[new T.Group(),new T.Group()]});
 for(const move of Object.keys(S.SKILL_LEVELS)){
  const id='skill_'+move+'_left';let prev;
  for(let t=1.64;t<3.37;t+=.005){
   const a=actor();S.applySkillPose(a,t,id);const q=a.rig.quaternion.clone();if(prev)assert.ok(prev.angleTo(q)<.05,id+' continuous turn');prev=q;
   assert.ok(a.legs.every(n=>[n.rotation.x,n.rotation.y,n.rotation.z].every(Number.isFinite)));
  }
 }
 const a=actor();a.legs[0].rotation.set(.2,.1,.3);a.legs[1].rotation.set(-.8,.2,-.5);a.knees[1].rotation.x=-.9;
 assert.equal(S.applyFootedPose(a,5.4,'Left'),1);assert.equal(a.legs[0].rotation.x,-.8);assert.ok(Math.abs(a.legs[1].rotation.x-.2)<1e-12);assert.equal(a.knees[0].rotation.x,-.9);
 assert.equal(S.applyFootedPose(actor(),4.64,'Left'),0);assert.equal(S.applyFootedPose(actor(),6.36,'Left'),0);assert.equal(S.applyFootedPose(actor(),5.4,'Right'),0);
});
