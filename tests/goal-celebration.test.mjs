import test from 'node:test';
import assert from 'node:assert/strict';
import {CELEBRATIONS,STAR_CELEBRATIONS,signatureCelebration,pickCelebration,celebrationDistance,applyCelebrationPose,
 celebrationHold,celebrationRelease,celebrationWalkBack,MATE_ACTIONS,mateAction,mateAfter,mateCelebration,mateCloseness,celebrationCapture,
 celebrationRoute,celebrationRouteDistance,CELEBRATION_SPOTS} from '../3d-goal-celebration.mjs';

const joint=()=>({rotation:{x:0,y:0,z:0},position:{x:0,y:0,z:0}});
const driver=()=>({rig:joint(),upper:joint(),arms:[joint(),joint()],elbows:[joint(),joint()],legs:[joint(),joint()],knees:[joint(),joint()],ankles:[joint(),joint()]});
const flat=p=>JSON.stringify(p);

test('each goal picks a stable celebration and every kind can occur', ()=>{
 const event={id:'g1',playerName:'Musiala',minute:41};
 assert.equal(pickCelebration(event),pickCelebration({...event}));
 const seen=new Set();
 for(let i=0;i<200;i++)seen.add(pickCelebration({id:'goal-'+i,playerName:'A',minute:i%90}));
 assert.deepEqual([...seen].sort(),[...CELEBRATIONS].sort());
 assert.equal(pickCelebration({...event,celebration:'knee_slide'}),'knee_slide');
});

test('celebration runs never move backwards and stay inside the pitch', ()=>{
 for(const kind of [...CELEBRATIONS,...STAR_CELEBRATIONS]){
  let last=0;
  for(let s=0;s<=3.5;s+=.05){const d=celebrationDistance(kind,s);assert.ok(d>=last-1e-9,kind);assert.ok(d<11,kind);last=d}
 }
});

test('poses are a pure function of time and the knee slide reaches the ground', ()=>{
 for(const kind of [...CELEBRATIONS,...STAR_CELEBRATIONS]){
  // The scene re-poses the driver every frame before the celebration runs.
  const a=driver(),b=driver();
  applyCelebrationPose(a,kind,2.2);applyCelebrationPose(b,kind,2.2);
  assert.equal(flat(a),flat(b),kind);
 }
 const slide=applyCelebrationPose(driver(),'knee_slide',2);
 assert.ok(slide.rootY<-.4);
 const jump=applyCelebrationPose(driver(),'jump_spin',1.75);
 assert.ok(jump.rootY>.3);
});

test('celebration arms move smoothly, never lock straight and lift the shoulders', ()=>{
 for(const kind of [...CELEBRATIONS,...STAR_CELEBRATIONS]){
  let previous=null,shrug=0;
  for(let s=0;s<=3.6;s+=1/30){
   const p=driver(),out=applyCelebrationPose(p,kind,s);
   const angles=[...p.arms.flatMap(a=>[a.rotation.x,a.rotation.z]),...p.elbows.map(e=>e.rotation.x)];
   // A fist pump or badge tap may be quick, but no joint may pop between frames.
   if(previous)angles.forEach((v,i)=>assert.ok(Math.abs(v-previous[i])<.4,`${kind} jumps at ${s.toFixed(2)}`));
   previous=angles;
   // V21.296: until the gesture starts the captured running arms own the
   // elbows; once the pose owns the arms they must never lock straight.
   if(s>.6&&out.arms>.8)p.elbows.forEach(e=>assert.ok(e.rotation.x>.2,`${kind} locked elbow at ${s.toFixed(2)}`));
   shrug=Math.max(shrug,...out.shrug);
   assert.equal(out.head.length,2);assert.equal(out.open.length,2);
  }
  assert.ok(shrug>.1,kind+' shoulders move with the arms');
 }
});

test('the scorer runs off with his own arms and then holds the pose without flapping', ()=>{
 // Badge: still sprinting at 0.5 s, so the run (not the pose) owns the arms.
 assert.ok(applyCelebrationPose(driver(),'badge',.5).arms<.05);
 assert.ok(applyCelebrationPose(driver(),'badge',2.4).arms>.95);
 // A held pose may live a little but must not swing like a metronome.
 for(const kind of ['open_arms','arms_crossed','airplane','hug_left','hug_right']){
  let low=Infinity,high=-Infinity;
  for(let s=2;s<=3.6;s+=1/30){const p=driver();applyCelebrationPose(p,kind,s);const z=p.arms[0].rotation.z+p.arms[0].rotation.x;low=Math.min(low,z);high=Math.max(high,z)}
  assert.ok(high-low<.25,`${kind} arm swings ${(high-low).toFixed(2)} rad while held`);
 }
});

test('stars celebrate their own way, namesakes and random goals never do', ()=>{
 const expected={'Cristiano Ronaldo':'jump_spin','Lionel Messi':'badge','Kylian Mbappé':'arms_crossed','Jude Bellingham':'open_arms',
  'Erling Haaland':'zen','Haaland':'zen','Cole Palmer':'cold','Vini Jr.':'samba','Viktor Gyökeres':'mask'};
 for(const [name,kind] of Object.entries(expected))assert.equal(pickCelebration({id:'x',playerName:name,minute:12}),kind,name);
 for(const name of ['Ethan Mbappé','Jobe Bellingham','Alex Palmer','Vinicius Souza','Fábio Ronaldo','Messiah Bright','Musiala'])
  assert.ok(!STAR_CELEBRATIONS.includes(pickCelebration({id:'x',playerName:name,minute:12}))&&signatureCelebration(name)===null,name);
 for(let i=0;i<300;i++)assert.ok(!STAR_CELEBRATIONS.includes(pickCelebration({id:'r'+i,playerName:'A',minute:i%90})));
 assert.equal(pickCelebration({celebration:'samba'}),'samba');
});

test('Haaland sits down cross-legged and stays still', ()=>{
 const sat=applyCelebrationPose(driver(),'zen',2.6),later=driver(),out=applyCelebrationPose(later,'zen',3.2);
 assert.ok(sat.rootY<-.65,'hips near the grass');
 assert.ok(Math.abs(sat.rootY-out.rootY)<.01,'no bobbing once seated');
 assert.ok(later.knees[0].rotation.x<-2&&later.legs[0].rotation.x>1.2,'knees folded, thighs forward');
 assert.ok(later.legs[0].rotation.z<-.6&&later.legs[1].rotation.z>.6,'knees out to the sides');
});

// V21.434 (Basti: "nicht so steril"): the scorer has his own short moment,
// teammates come one by one for a short contact, then everyone jogs back.
test('the scorer lets go of his pose and jogs back with the group', ()=>{
 for(const kind of [...CELEBRATIONS,...STAR_CELEBRATIONS]){
  const hold=celebrationHold(kind);
  // The whole moment fits the 3.4 s the scene shows after the goal.
  assert.ok(hold>=1.8&&hold<=2.9,kind+' hold '+hold);
  assert.equal(celebrationRelease(kind,hold-.1),1);
  assert.equal(celebrationRelease(kind,hold+.8),0);
  assert.equal(celebrationWalkBack(kind,hold),0);
  let last=0;
  for(let s=hold;s<hold+3;s+=.05){const w=celebrationWalkBack(kind,s);assert.ok(w>=last);
   // A jog, never a sprint: at most 1.2 m/s.
   assert.ok(w-last<=1.2*.05+1e-9);last=w}
 }
});
test('teammates vary their contact, then clap, and never hang on the scorer', ()=>{
 const seen=new Set();
 for(let g=0;g<60;g++)for(const slot of [0,1]){const a=mateAction('goal'+g,slot);assert.ok(MATE_ACTIONS.includes(a));seen.add(a)}
 assert.deepEqual([...seen].sort(),[...MATE_ACTIONS].sort());
 assert.notEqual(mateAction('x',0),mateAction('x',1),'two arriving mates do different things');
 for(const a of MATE_ACTIONS){
  assert.equal(mateCelebration(a,-.1),null);
  assert.equal(mateCelebration(a,.5)[0],a);
  assert.equal(mateCelebration(a,2.2)[0],'applause');
  assert.equal(mateCelebration(a,3.5),null);
  assert.equal(mateCloseness(a,0),1);assert.equal(mateCloseness(a,2),0);
  for(const s of [.3,.9,1.4]){const out={};applyCelebrationPose(driver(),a,s,out,1);assert.ok(Number.isFinite(out.arms))}
 }
});

// V21.435: captured Mixamo celebrations (Basti's uploads, baked; raw FBX never in the repo).
test('captured celebrations: every clip exists, the feet join only after the run', async ()=>{
 const {FOOTERA_MIXAMO_CELEBRATE:D}=await import('../3d-mocap-mixamo-celebrate-data.mjs');
 for(const kind of [...CELEBRATIONS,...STAR_CELEBRATIONS,'excited','cheering','waving']){
  const clip=celebrationCapture(kind);if(clip)assert.ok(D.clips[clip],kind+' -> '+clip);
 }
 for(const kind of ['fist_pump','open_arms','rally','dance','samba'])assert.ok(celebrationCapture(kind),kind);
 // The scorer still running: upper body only.
 const run={};applyCelebrationPose(driver(),'dance',1.2,run,1);
 assert.ok(run.capture&&run.capture.legs<.01);
 const stand={};applyCelebrationPose(driver(),'dance',2.2,stand,1);
 assert.ok(stand.capture.legs>.9&&stand.capture.body>.9);
 const none={};applyCelebrationPose(driver(),'knee_slide',1.5,none,1);assert.equal(none.capture,null);
 // Teammates' captured cheer never moves their walking legs.
 const mate={};applyCelebrationPose(driver(),'excited',.8,mate,1);assert.equal(mate.capture.legs,0);
 const after=new Set();for(let g=0;g<40;g++)after.add(mateAfter('g'+g,0));
 assert.ok(after.has('applause')&&after.size>=3);
});

// V21.439 (Basti: "Die Torjubel spielen sich alle auf der selben Stelle ab"):
test('celebration spots: corner flags, fans behind the goal, touchline; always on the pitch', ()=>{
 const seen=new Set();
 for(let g=0;g<80;g++)for(const start of [[0,-38],[-12,-40],[14,-36],[-4,-44]])for(const d of [1,-1]){
  const kind=pickCelebration({id:'r'+g,playerName:'A',minute:g});
  const r=celebrationRoute(kind,'r'+g,start,d);seen.add(r.spot);
  let last=0;
  for(let s=0;s<=r.approachTime+3.5;s+=.05){
   const m=celebrationRouteDistance(kind,r,s),x=start[0]+r.run[0]*m,z=start[1]+r.run[1]*m;
   assert.ok(m>=last-1e-9,'never backwards');
   // A sprint, never faster than a footballer, slowing into the celebration.
   assert.ok((m-last)/.05<8.6,'speed '+((m-last)/.05));
   assert.ok(Math.abs(x)<33.6&&z>-52.2&&z<0,`${r.spot} on the pitch ${x.toFixed(1)},${z.toFixed(1)}`);
   last=m;
  }
  // The longest sprint adds at most ~3 s to the goal scene.
  assert.ok(r.approachTime<=3.1,r.approachTime);
  if(r.spot==='corner_near')assert.ok(r.run[0]*d>0&&r.run[1]<0,'towards the near corner flag');
 }
 for(const spot of CELEBRATION_SPOTS)assert.ok(seen.has(spot),spot);
 // Stable per goal, and the spot can be forced for QA.
 assert.deepEqual(celebrationRoute('badge','k',[0,-38],1),celebrationRoute('badge','k',[0,-38],1));
 assert.equal(celebrationRoute('badge','k',[0,-38],1,'corner_near').spot,'corner_near');
});
