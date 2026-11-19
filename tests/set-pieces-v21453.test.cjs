// V21.453 Standards: several authored variants per restart (corners, free kicks,
// penalties, throw-ins on both sides). Presentation only; outcomes are untouched.
const test=require('node:test'),assert=require('node:assert/strict'),H=require('../3d-highlights.js');

test('every restart kind offers several variants and history avoids repeats',async()=>{
 const seen={corner:new Set(),free_kick:new Set(),penalty:new Set()};
 for(let n=0;n<80;n++)for(const kind of Object.keys(seen)){
  const finish=kind==='corner'?(n%3?'header':'volley'):'normal';
  const seq=H.choosePresentation({id:'e'+n,minute:n,sceneKind:kind,restartSide:n%2?'right':'left',finish}).sequence;
  seen[kind].add(seq.replace(/_right$/,''));
 }
 assert.ok(seen.corner.size>=5,'corners: '+[...seen.corner]);
 assert.ok(seen.free_kick.size>=4,'free kicks: '+[...seen.free_kick]);
 assert.ok(seen.penalty.size>=3,'penalties: '+[...seen.penalty]);
 // The edge volley belongs to volleys only, the near-post flick to headers only.
 for(let n=0;n<60;n++){
  const header=H.choosePresentation({id:'h'+n,sceneKind:'corner',finish:'header'}).sequence;
  const volley=H.choosePresentation({id:'v'+n,sceneKind:'corner',finish:'volley'}).sequence;
  assert.ok(!/_edge/.test(header),header);assert.ok(!/_near/.test(volley),volley);
 }
 // Corners keep their real flank; a left throw-in is the mirrored scene.
 assert.match(H.choosePresentation({id:'c',sceneKind:'corner',restartSide:'right',finish:'header'}).sequence,/_right$/);
 assert.doesNotMatch(H.choosePresentation({id:'c',sceneKind:'corner',restartSide:'left',finish:'header'}).sequence,/_right$/);
 assert.equal(H.choosePresentation({id:'t',sceneKind:'throw_in',restartSide:'left'}).sequence,'extended_throw_in_right');
 assert.equal(H.choosePresentation({id:'t',sceneKind:'throw_in',restartSide:'right'}).sequence,'extended_throw_in');
 // The previous corner variant is not shown again straight away.
 const first=H.choosePresentation({id:'x',sceneKind:'corner',finish:'header'}).sequence;
 const second=H.choosePresentation({id:'x',sceneKind:'corner',finish:'header'},[{sequence:first}]).sequence;
 assert.notEqual(second.replace(/_right$/,''),first.replace(/_right$/,''));
 // A short corner credits the crosser, not the corner taker.
 assert.equal(H.creatorActor('extended_corner_short'),6);assert.equal(H.creatorActor('extended_corner_near'),1);
});

test('free kicks: wall at 9.15 m facing the ball, ball clears it, mirrored sides match',async()=>{
 const E=await import('../3d-extended-match.mjs'),M=await import('../3d-highlights-scene.mjs');
 for(const seq of E.EXTENDED_SEQUENCES.filter(s=>E.extendedKind(s)==='free_kick')){
  // V21.479: the cross is struck from the touchline over a two-man wall; the shot is a header later.
  const cross=E.extendedVariant(seq)==='cross',fk=E.freeKickSpot(seq);
  const contact=cross?[fk[0],.14,fk[1]]:M.shotContact(seq);
  // The trick is laid off first: the wall lines up against the ball's original spot.
  const ref=E.extendedVariant(seq)==='trick'?[fk[0],.14,fk[1]]:contact;
  for(let j=8;j<=(cross?9:11);j++){
   const w=E.extendedPosition(j,cross?4.2:5.3,seq),d=Math.hypot(w[0]-ref[0],w[1]-ref[2]);
   assert.ok(d>9&&d<10,seq+' wall distance '+d);
   // Heading faces the ball (heading 0 looks toward -Z).
   const h=E.extendedWallHeading(seq),face=[-Math.sin(h),-Math.cos(h)],to=[ref[0]-w[0],ref[2]-w[1]];
   assert.ok((face[0]*to[0]+face[1]*to[1])/Math.hypot(...to)>.97,seq+' wall faces ball');
  }
  const wall=E.extendedPosition(9,cross?4.3:5.39,seq),reach=Math.hypot(wall[0]-contact[0],wall[1]-contact[2]);
  let height=null;
  for(let n=0;n<=400&&height===null;n++){const b=M.ballPosition('goal',(cross?4.3:5.4)+n/400*1.25,seq,cross?'header':'normal');if(Math.hypot(b[0]-contact[0],b[2]-contact[2])>=reach)height=b[1]}
  assert.ok(height>2.4,seq+' over the jumping wall: '+height);
 }
 for(const base of ['extended_free_kick_side','extended_free_kick_edge','extended_corner_short','extended_penalty_angled','extended_throw_in'])
  for(const t of [0,2,4,5.4]){const a=E.extendedPosition(0,t,base),b=E.extendedPosition(0,t,base+'_right');assert.ok(Math.abs(a[0]+b[0])<1e-9&&Math.abs(a[1]-b[1])<1e-9,base+' mirror')}
});

test('set-piece variants: no ball teleport, human run speeds, players on the pitch',async()=>{
 const E=await import('../3d-extended-match.mjs'),M=await import('../3d-highlights-scene.mjs');
 for(const seq of E.EXTENDED_SEQUENCES.filter(s=>E.extendedVariant(s)||/_right$/.test(s))){
  const kind=E.extendedKind(seq),finish=kind==='corner'?(E.extendedVariant(seq)==='edge'?'volley':'header'):'normal';
  let prev=M.ballPosition('goal',0,seq,finish);
  for(let n=1;n<=540;n++){
   const t=n/100,b=M.ballPosition('goal',t,seq,finish),dt=E.extendedSeconds(seq,t)-E.extendedSeconds(seq,t-.01);
   assert.ok(Math.hypot(...b.map((v,i)=>v-prev[i]))/dt<28,seq+' ball speed at '+t);prev=b;// a real corner cross flies at ~20-25 m/s
  }
  for(let i=0;i<17;i++){
   let p=E.extendedPosition(i,0,seq);
   for(let n=1;n<=540;n++){
    const t=n/100,q=E.extendedPosition(i,t,seq),dt=E.extendedSeconds(seq,t)-E.extendedSeconds(seq,t-.01);
    assert.ok(Math.hypot(q[0]-p[0],q[1]-p[1])/dt<8.2,seq+' actor '+i+' speed at '+t);
    assert.ok(Math.abs(q[0])<=34.3&&q[1]>=-53&&q[1]<=53,seq+' actor '+i+' on pitch');p=q;
   }
  }
  assert.deepEqual(M.ballPosition('goal',5.4,seq,finish),M.shotContact(seq,finish));
 }
 // Short corner: a real short pass, a carry to the byline and then the cross.
 const s='extended_corner_short',passes=E.extendedPasses(s);
 assert.deepEqual(passes.map(p=>[p[0],p[1]]),[[1,6],[6,0]]);
 const t=x=>x/7.4*5.4;
 assert.ok(E.extendedControl(t(5.5),s).index===6,'crosser carries the ball');
 const carry=E.extendedBall(t(5.5),s,M.shotContact(s,'header')),crosser=E.extendedPosition(6,t(5.5),s);
 assert.ok(Math.hypot(carry[0]-crosser[0],carry[2]-crosser[1])<.8,'ball at the crosser\'s feet');
});
