const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.join(__dirname,'..'),H=require('../3d-highlights.js'); // V21.23 shell includes broadcast crowd + event cards without changing 3D simulation
const event=(type='goal',id='one')=>({id,type,minute:67,team:'home',playerId:'p9',playerName:'Jamal Musiala',keeperName:type==='big_chance_saved'?'Mike Maignan':''});
const turn=()=>new Promise(r=>setImmediate(r));
test('modes select all four important types; unknown future events safely fall back',()=>{
 assert.equal(H.getMode(),'important');for(const type of H.TYPES){assert.equal(H.accepts(type,'off'),false);assert.equal(H.accepts(type,'important'),true);assert.equal(H.accepts(type,'all'),true);assert.equal(H.accepts(type,'goals'),type==='goal')}
 assert.equal(H.accepts('corner','all'),false);
});
test('queue serializes, deduplicates and only passes immutable display snapshots',async()=>{
 const played=[],releases=[];let active=0,max=0,idle=0,busy=0;
 const q=new H.Queue({play:e=>{active++;max=Math.max(max,active);played.push(e);return new Promise(r=>releases.push(()=>{active--;r('played')}))},onBusy:()=>busy++,onIdle:()=>idle++});
 const live={...event(),match:{home:1}};assert.equal(q.enqueue(live),true);live.playerName='Changed';assert.equal(q.enqueue(live),false);q.enqueue(event('big_chance_saved','two'));
 await turn();assert.equal(played[0].playerName,'Jamal Musiala');assert.equal('match' in played[0],false);assert.ok(Object.isFrozen(played[0]));releases.shift()();await turn();releases.shift()();await turn();
 assert.equal(max,1);assert.equal(played.length,2);assert.equal(busy,1);assert.equal(idle,1);assert.equal(q.busy,false);
});
test('skip settles immediately even when rendering never resolves; event is never replayed',async()=>{
 let idle=0;const q=new H.Queue({play:()=>new Promise(()=>{}),onIdle:()=>idle++});q.enqueue(event());await turn();q.skip();await turn();assert.equal(idle,1);assert.equal(q.enqueue(event()),false);
});
test('load failures, context failures and watchdog timeouts return to fallback without hanging',async()=>{
 for(const play of [()=>{throw Error('WebGL unavailable')},()=>Promise.resolve('fallback'),()=>new Promise(()=>{})]){
  let idle=0,fail=0;const q=new H.Queue({play,timeout:15,onIdle:()=>idle++,onFallback:()=>fail++});q.enqueue(event());await new Promise(r=>setTimeout(r,30));assert.equal(idle,1);assert.equal(fail,1);assert.equal(q.disabled,true);assert.equal(q.enqueue(event('goal','next')),false);
 }
});
test('cancelling an old match prevents a stale completion resuming a new match',async()=>{
 let idle=0,resolve;const q=new H.Queue({play:()=>new Promise(r=>resolve=r),onIdle:()=>idle++});q.enqueue(event());await turn();q.cancel();resolve('played');await turn();assert.equal(idle,0);assert.equal(q.busy,false);
});
test('all finishes share build-up; foot contact precedes flight; rebound follows physical impact',async()=>{
 const {ballPosition,SHOT_TIME,IMPACT_TIME,shotFootPosition}=await import('../3d-highlights-scene.mjs');
 for(const t of [0,1,2,3.09,4.9,SHOT_TIME])for(const type of H.TYPES)assert.deepEqual(ballPosition(type,t),ballPosition('goal',t));
 assert.deepEqual(ballPosition('goal',SHOT_TIME),shotFootPosition());
 assert.ok(Math.hypot(...ballPosition('goal',SHOT_TIME+.001).map((v,i)=>v-shotFootPosition()[i]))<.03,'continuous foot release');
 const goal=ballPosition('goal',7.5),save=ballPosition('big_chance_saved',8),miss=ballPosition('big_chance_missed',8),post=ballPosition('shot_post',IMPACT_TIME),rebound=ballPosition('shot_post',8);
 assert.ok(goal[2]<-52.5&&goal[2]>-54.4&&Math.abs(goal[0])<3.66&&goal[1]<2.44);
 assert.ok(save[2]>-52.5);assert.ok(miss[0]>3.66&&miss[2]<-52.5);
 assert.ok(Math.abs(post[0]-3.66)<.15&&Math.abs(post[2]+52.5)<.01);assert.ok(rebound[2]>-52.5);
 for(const type of H.TYPES){const impact=ballPosition(type,IMPACT_TIME);for(const t of [IMPACT_TIME-.00001,IMPACT_TIME+.00001])assert.ok(Math.hypot(...ballPosition(type,t).map((v,i)=>v-impact[i]))<.001,'continuous impact '+type)}
});
test('Three resource UUIDs cannot consume the simulation random stream',async()=>{
 let calls=0;const original=Math.random;Math.random=()=>{calls++;return .5};
 try{const T=await import('../vendor/three/three.module.min.js');new T.Scene();new T.BoxGeometry();new T.MeshLambertMaterial();assert.equal(calls,0)}finally{Math.random=original}
});
test('current simulation reproduces pre-integration goals, shots, cards, fitness and RNG for 24 seeds',()=>{
 const old=require('node:child_process').execFileSync('git',['show','e35e439:index.html'],{cwd:root,encoding:'utf8',maxBuffer:3e6});
 const current=fs.readFileSync(path.join(root,'index.html'),'utf8');
 const fixtureSource=fs.readFileSync(path.join(__dirname,'matchday.test.cjs'),'utf8').split('function fixture(')[1].split("\ntest('")[0];
 function run(html,seed){
  const extract=(from,to)=>html.slice(html.indexOf(from),html.indexOf(to,html.indexOf(from)));
  const fixture=vm.runInNewContext('(function fixture('+fixtureSource+')',{vm,extract,assert});const {ctx}=fixture(seed);
  let ticks=0;while(!ctx.match.finished&&ticks++<160){if(ctx.match.paused){ctx.match.paused=false;ctx.match.halftimeActive=false;ctx.match.forcedOut=null}ctx.simTick()}
  assert.ok(ctx.match.finished);const m=ctx.match;
  return JSON.parse(JSON.stringify({home:m.home,away:m.away,minute:m.minute,shots:m.shotEvents,goals:m.goalEvents,defense:m.defensiveEvents,red:m.redCards,yellow:m.yellowCards,fitness:m.fitnessLoss,nextRandom:ctx.Math.random()},(key,value)=>['highlightType','playerName','goalkeeperName'].includes(key)?undefined:value));
 }
 for(let seed=1;seed<=24;seed++)assert.deepEqual(run(current,seed),run(old,seed),'seed '+seed);
});
test('scripts, module, stylesheet and pinned Three are in the new offline shell; inline JS parses',()=>{
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8'),sw=fs.readFileSync(path.join(root,'service-worker.js'),'utf8');
 for(const file of ['3d-highlights.js?v=2143','3d-highlights-match.js?v=2133','3d-highlights-scene.mjs?v=2143','3d-rigged-footballer.mjs?v=2137','3d-football-animation.mjs?v=2138','3d-motion-clips.mjs?v=2136','3d-squad-motion.mjs?v=2143','3d-highlights.css?v=2125','vendor/three/three.module.min.js'])assert.ok(sw.includes('./'+file),file);
 assert.ok(sw.includes('footera-v21-41'));assert.ok(html.includes('service-worker.js?v=2141'));
 for(const script of html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g))if(script[1].trim())new vm.Script(script[1]);
 for(const file of ['card-layout.css','legacy-card.css','chem-boosts.js','chem-boosts-ui.js','chem-boosts.css']){
  const old=require('node:child_process').execFileSync('git',['show','a5094f7:'+file],{cwd:root});assert.deepEqual(fs.readFileSync(path.join(root,file)),old,file+' remains byte-identical');
 }
});

test('period flags control sides, including stoppage time, with no per-highlight random reflection',()=>{
 for(const [flags,period] of [[{},1],[{halftimeLogged:true},2],[{halftimeLogged:true,extraTimeStarted:true},3],[{halftimeLogged:true,extraTimeStarted:true,extraTimeBreakLogged:true},4]]){
  for(const minute of [1,44,45,48,67,90,95,105,109,120]){
   assert.equal(H.getMatchPeriod({...flags,minute}),period);
   for(const team of ['home','away'])for(const type of H.TYPES){
    const e=H.snapshot({...event(type,`${minute}-${type}`),team,minute,period});
    assert.equal(e.attackDirection,(team==='home'?1:-1)*(period%2?1:-1));
   }
  }
 }
 for(const period of [1,2,3,4])assert.equal(H.getAttackDirection('home',period),-H.getAttackDirection('away',period));
});
test('the whole match space rotates together; the permanent broadcast camera pushes smoothly into the box',async()=>{
 const {worldPosition,cameraState,ballPosition,runPosition,RUNS,MIN_CAMERA_DISTANCE,keeperPose,SHOT_TIME}=await import('../3d-highlights-scene.mjs');
 assert.ok(RUNS.filter(r=>r.team==='attack').length>=7&&RUNS.filter(r=>r.team==='defend').length>=7);
 for(const aspect of [.9,1.05,1.3,1.78,2])for(const t of [0,2,4.9,5.4,6.65,7,9,10.3])for(const d of [-1,1]){
  for(const type of H.TYPES){const c=cameraState(d,t,aspect,type);assert.ok(c.distance>=MIN_CAMERA_DISTANCE&&c.distance<=56);assert.ok(c.position[0]>35&&c.position[1]>21);assert.ok(c.fov>=25.8&&c.fov<=29.5);const p=ballPosition(type,t);assert.deepEqual(worldPosition(worldPosition(p,d),d),p)}
 }
 const early=cameraState(1,0,1.3,'goal'),shot=cameraState(1,5.4,1.3,'goal'),late=cameraState(1,6.65,1.3,'goal');assert.ok(early.distance-shot.distance>6.5,'camera must move materially closer for the finish');assert.ok(early.fov-shot.fov>2.4,'finish must read larger without a cut');assert.ok(Math.abs(shot.distance-late.distance)<1);assert.notEqual(late.target[0],early.target[0]);
 const before=runPosition(0,SHOT_TIME-.18),contact=runPosition(0,SHOT_TIME),after=runPosition(0,SHOT_TIME+.18);assert.ok(contact[1]<before[1]&&after[1]<contact[1],'shooter must carry momentum through the strike');
 assert.equal(keeperPose('big_chance_saved',SHOT_TIME).dive,0);
 assert.ok(keeperPose('big_chance_saved',6.65).dive>.95);
 assert.equal(keeperPose('big_chance_saved',8).land,1);
 assert.ok(keeperPose('big_chance_saved',9.5).tilt<.2);
 for(let i=0;i<RUNS.length;i++)assert.notDeepEqual(runPosition(i,0),runPosition(i,4));
});
test('configured kit pattern and all saved colours survive the immutable highlight snapshot',()=>{
 const snap=H.snapshot({...event(),homeColor:'#123456',homeSecondary:'#abcdef',homePattern:'stripes',homeShorts:'#654321',homeSocks:'#111111',homeKitConfigured:true,awayColor:'#eeeeee',awaySecondary:'#222222',awayPattern:'halves',awayShorts:'#333333',awaySocks:'#444444',awayKitConfigured:true});
 assert.deepEqual({homeColor:snap.homeColor,homeSecondary:snap.homeSecondary,homePattern:snap.homePattern,homeShorts:snap.homeShorts,homeSocks:snap.homeSocks,homeKitConfigured:snap.homeKitConfigured},{homeColor:'#123456',homeSecondary:'#abcdef',homePattern:'stripes',homeShorts:'#654321',homeSocks:'#111111',homeKitConfigured:true});
 assert.deepEqual({awayColor:snap.awayColor,awaySecondary:snap.awaySecondary,awayPattern:snap.awayPattern,awayShorts:snap.awayShorts,awaySocks:snap.awaySocks,awayKitConfigured:snap.awayKitConfigured},{awayColor:'#eeeeee',awaySecondary:'#222222',awayPattern:'halves',awayShorts:'#333333',awaySocks:'#444444',awayKitConfigured:true});
});
test('presentation choreography has distinct football actions without changing the shot result',async()=>{
 const M=await import('../3d-highlights-scene.mjs');
 const sequences=['central','one_two','through_ball','dribble','wing_left','wing_right','cutback_left','cutback_right'];
 assert.deepEqual(M.PLAY_SEQUENCES.slice(0,sequences.length),sequences);assert.ok(M.PLAY_SEQUENCES.length>=30);
 const paths=new Map(sequences.map(seq=>[seq,M.ballPosition('goal',3.8,seq)]));
 assert.ok(Math.abs(paths.get('wing_left')[0])>18&&Math.abs(paths.get('wing_right')[0])>18,'wing attacks must reach the touchline');
 assert.ok(paths.get('wing_left')[0]<0&&paths.get('wing_right')[0]>0,'both wings must exist');
 assert.ok(M.ballPosition('goal',4.35,'wing_left')[1]>1.2,'cross must travel through the air');
 assert.ok(M.ballPosition('goal',4.35,'cutback_left')[1]<.5,'cutback stays low');
 assert.notDeepEqual(paths.get('one_two'),paths.get('through_ball'));
 const wingLeftCam=M.cameraState(1,2.7,1.15,'goal','wing_left'),wingRightCam=M.cameraState(1,2.7,1.15,'goal','wing_right'),centralCam=M.cameraState(1,2.7,1.15,'goal','central');
 assert.equal(wingLeftCam.phase,'build');assert.equal(wingRightCam.phase,'build');assert.ok(wingLeftCam.target[0]<-5&&wingRightCam.target[0]>5,'build camera must frame the active flank');assert.ok(Math.abs(wingLeftCam.target[0]-centralCam.target[0])>5,'wing framing must differ materially from central');
 const deliveryCam=M.cameraState(1,4.3,1.15,'goal','wing_right'),finishCam=M.cameraState(1,5.6,1.15,'goal','wing_right');assert.equal(deliveryCam.phase,'delivery');assert.equal(finishCam.phase,'finish');assert.ok(deliveryCam.distance>finishCam.distance&&deliveryCam.fov>finishCam.fov,'broadcast camera must push in smoothly through delivery to finish');
 for(const seq of ['wing_left','wing_right','cutback_left','cutback_right'])for(const boundary of [3.65,M.SHOT_TIME-.2]){const a=M.cameraState(1,boundary-.002,1.15,'goal',seq),b=M.cameraState(1,boundary+.002,1.15,'goal',seq),jump=Math.hypot(...a.target.map((v,i)=>v-b.target[i])),cameraJump=Math.hypot(...a.position.map((v,i)=>v-b.position[i]));assert.ok(jump<.12,`${seq} target jump at ${boundary}: ${jump}`);assert.ok(cameraJump<.12,`${seq} camera jump at ${boundary}: ${cameraJump}`)}
 for(const seq of ['wing_left','wing_right','cutback_left','cutback_right']){let prev=M.cameraState(1,3.5,1.05,'goal',seq);for(let t=3.55;t<=5.15;t+=.05){const next=M.cameraState(1,t,1.05,'goal',seq),step=Math.hypot(...prev.target.map((v,i)=>v-next.target[i]));assert.ok(step<1.7,`${seq} camera target must pan continuously @ ${t}: ${step}`);prev=next}}
 const dribbleEarly=M.runPosition(0,1,'dribble'),dribbleLate=M.runPosition(0,4.2,'dribble');assert.ok(dribbleEarly[0]<-4&&dribbleLate[0]>1,'dribble must change lane before cutting inside');
 for(const seq of sequences)assert.deepEqual(M.ballPosition('goal',M.SHOT_TIME,seq),M.shotFootPosition(),'all build-ups reach the same authoritative finish');
});
test('wing and cutback highlights start with a visible ball carrier and no sideways skating',async()=>{
 const M=await import('../3d-highlights-scene.mjs');
 for(const seq of ['wing_left','wing_right','cutback_left','cutback_right']){
  for(const time of [0,.6,1.2,1.64,2.4,3.4]){
   const ball=M.ballPosition('goal',time,seq),passer=M.runPosition(1,time,seq),distance=Math.hypot(ball[0]-passer[0],ball[2]-passer[1]);
   assert.ok(distance>.4&&distance<.75,`${seq} @ ${time}: ball must stay one stride ahead of the visible winger, distance=${distance}`);
  }
  const start=M.runPosition(1,0,seq),after=M.runPosition(1,1.2,seq),lateral=Math.abs(after[0]-start[0]),forward=Math.abs(after[1]-start[1]);
  assert.ok(Math.abs(start[0])>=22,'wide attack must begin with the winger already on the flank');
  assert.ok(forward>lateral*3,`${seq}: winger must run downfield instead of gliding sideways`);
 }
});
test('snapshot preserves the selected build-up and creator context',()=>{
 const snap=H.snapshot({...event(),sequence:'wing_left',assistName:'Creator',creatorName:'Creator',creationType:'assist',scorerSlot:'ST',creatorSlot:'LW'});
 assert.equal(snap.sequence,'wing_left');assert.equal(snap.creatorSlot,'LW');assert.equal(snap.scorerSlot,'ST');assert.equal(snap.assistName,'Creator');
});
test('similar team colours select contrasting complete kits',async()=>{
 const {kitColors}=await import('../3d-highlights-scene.mjs');
 for(const color of ['#111111','#ffffff','#91203e','#7a94a0']){
  const kits=kitColors({homeColor:color,awayColor:color});assert.notEqual(kits.home.shirt,kits.away.shirt);assert.notEqual(kits.keeper,kits.home.shirt);assert.notEqual(kits.keeper,kits.away.shirt);
 }
});
test('saved-chance snapshots keep the goalkeeper without giving him the shot',()=>{
 const snap=H.snapshot(event('big_chance_saved'));
 assert.equal(snap.playerName,'Jamal Musiala');
 assert.equal(snap.keeperName,'Mike Maignan');
 assert.equal(snap.type,'big_chance_saved');
});

test('Crowd Paket L reacts by supporter block without touching simulation RNG',async()=>{
 const M=await import('../3d-highlights-scene.mjs');
 const suspense=M.crowdReactionState('goal','home','home',M.IMPACT_TIME-.2);
 const homeGoal=M.crowdReactionState('goal','home','home',M.IMPACT_TIME+.9);
 const awayGoal=M.crowdReactionState('goal','home','away',M.IMPACT_TIME+.9);
 const homeSaved=M.crowdReactionState('big_chance_saved','home','home',M.IMPACT_TIME+.9);
 const awaySaved=M.crowdReactionState('big_chance_saved','home','away',M.IMPACT_TIME+.9);
 assert.ok(suspense.suspense>.6);
 assert.ok(homeGoal.mood>.6&&awayGoal.mood<-.25);
 assert.ok(homeSaved.mood<-.25&&awaySaved.mood>.45);
 const source=fs.readFileSync(path.join(__dirname,'../3d-highlights-scene.mjs'),'utf8');
 assert.match(source,/crowd-torso-human/);assert.match(source,/crowd-arm-human/);assert.match(source,/crowd-leg-human/);assert.match(source,/animatedShare=weak\?\.22:mobileStandard\?\.44:high\?\.76:\.62/);assert.match(source,/mobileStandard=mobile&&!weak/);assert.match(source,/mobileStandard\?2:high\?2\.25/);assert.match(source,/athleticGeometry/);assert.doesNotMatch(source,/crowd-body-human/);assert.match(source,/flagSegments=3/);assert.match(source,/crowd-flag-cloth-segment/);assert.match(source,/supporterBanner/);assert.match(source,/banner\.position\.set\(0,\.62,z\)/);assert.match(source,/updateCrowd\(time\)/);
 assert.doesNotMatch(source,/crowd(?:Static|Dynamic)\.body/);assert.match(source,/crowdDynamic\.legs/);assert.equal(/Math\.random\s*\(/.test(source),false);
});


test('V21.23 goal overlay stacks a compact minute above the scoring crest without changing the card renderer',()=>{
 const css=fs.readFileSync(path.join(root,'3d-highlights.css'),'utf8'),scene=fs.readFileSync(path.join(root,'3d-highlights-scene.mjs'),'utf8');
 assert.match(css,/\.fh3d-hud-goal\{[^}]*grid-template-columns:98px minmax\(0,1fr\) 60px/);
 assert.match(css,/\.fh3d-hud-goal \.fh3d-goal-meta\{[^}]*flex-direction:column/);
 assert.match(css,/\.fh3d-hud-goal \.fh3d-minute\{[^}]*font:950 14px\/1 system-ui/);
 assert.match(css,/\.fh3d-hud-goal \.fh3d-team-crest\{[^}]*opacity:\.72/);
 assert.match(css,/@media\(max-width:560px\)[\s\S]*\.fh3d-hud-goal\{grid-template-columns:82px minmax\(0,1fr\) 52px/);
 assert.match(scene,/meta\.className='fh3d-goal-meta'/);assert.match(scene,/meta\.append\(minute,crest\)/);
 assert.match(scene,/hud\.append\(card,mark,copy,meta\)/);
});

test('V21.23 snapshot carries only presentation card and club metadata',()=>{
 const snap=H.snapshot({...event(),playerCardHTML:'<div class="card-shell">CARD</div>',teamName:'FC Gerlies',teamCrestHTML:'<div class="club-crest"></div>',scoreBeforeHome:0,scoreBeforeAway:0});
 assert.equal(snap.teamName,'FC Gerlies');assert.match(snap.playerCardHTML,/card-shell/);assert.match(snap.teamCrestHTML,/club-crest/);assert.equal(snap.scoreBeforeHome,0);assert.equal(snap.scoreBeforeAway,0);assert.equal('match' in snap,false);
});

test('athletic loft has human proportions, outward normals and complete UVs at every quality',async()=>{
 const {athleticGeometry}=await import('../3d-highlights-scene.mjs');
 const torso=[[1,.162,.103],[1.12,.161,.105],[1.38,.215,.134],[1.46,.237,.115],[1.54,.069,.071]];
 for(const segments of [10,14,18]){
  const g=athleticGeometry(torso,segments);g.computeBoundingBox();
  const {min,max}=g.boundingBox;
  assert.ok(max.x-min.x>.44&&max.x-min.x<.48,'athletic shoulder width in metres');
  assert.ok(Math.abs((max.y-min.y)-.54)<.001,'shirt length');
  assert.equal(g.attributes.uv.count,g.attributes.position.count);
  for(let i=0;i<g.attributes.normal.count;i++){
   const n=g.attributes.normal,p=g.attributes.position;
   assert.ok(Number.isFinite(n.getY(i)));
   assert.ok(n.getX(i)*p.getX(i)+n.getZ(i)*p.getZ(i)>0,'outward-facing smooth surface');
  }
  assert.equal(g.index.count,(torso.length-1)*segments*6);g.dispose();
 }
});

test('goal roof clears the top edge and fits both wings through delivery on 360/390/412 phones',async()=>{
 const T=await import('../vendor/three/three.module.min.js'),M=await import('../3d-highlights-scene.mjs');
 for(const width of [342,372,394])for(const sequence of ['wing_left','wing_right','cutback_left','cutback_right'])for(const direction of [1,-1]){
  const camera=new T.PerspectiveCamera(28,width/340,.5,350);
  // Far-wing build-up follows the carrier; the full goal enters before delivery.
  for(let time=.5;time<=M.IMPACT_TIME;time+=.05){
   const c=M.cameraState(direction,time,width/340,'goal',sequence);camera.position.set(...c.position);camera.fov=c.fov;camera.updateProjectionMatrix();camera.lookAt(...c.target);camera.updateMatrixWorld();
   for(const x of [-3.72,3.72])for(const z of [-52.5,-54.45]){
    const roof=new T.Vector3(...M.worldPosition([x,2.5,z],direction)).project(camera);
    assert.ok(roof.y<.99&&(time<2.7||(roof.y>-.99&&Math.abs(roof.x)<.99)),`${width} ${sequence} ${direction} ${time}: clipped goal roof`);
   }
  }
 }
});

test('running feet plant flat, push backwards relative to forward travel and recover above grass',async()=>{
 const {runningLeg,runningStrideLength}=await import('../3d-highlights-scene.mjs');
 for(const speed of [.15,.4,.7,1]){
  let support=0,air=0,previous;
  for(let n=0;n<=240;n++){
   const phase=n/240*Math.PI*2,g=runningLeg(phase,speed);
   const y=g.hipHeight-.43*Math.cos(g.hip)-.43*Math.cos(g.hip+g.knee),z=-.43*Math.sin(g.hip)-.43*Math.sin(g.hip+g.knee);
   assert.ok(Math.abs(y-g.y)<.0001&&Math.abs(z-g.z)<.0001,'two-bone foot reaches its actual ground target');
   assert.ok(Math.abs(g.hip+g.knee+g.ankle)<.00001,'boots remain level');
   if(g.support){support++;assert.ok(Math.abs(y-.055)<.0001);if(previous?.support&&n<240)assert.ok(z>previous.z,'support foot pushes towards local +Z while torso runs -Z')}
   else{air++;assert.ok(y>=.055)}
   previous=g;
  }
  assert.ok(support>40&&air>40);assert.ok(runningStrideLength(speed)>.5&&runningStrideLength(speed)<2.7);
 }
});


test('V21.32: 42 visual scenes correspond to actual renderer IDs without changing outcome',async()=>{
 const M=await import('../3d-highlights-scene.mjs');
 assert.equal(H.VISUAL_SCENES.length,42);assert.equal(M.PLAY_SEQUENCES.length,H.VISUAL_SCENES.length);
 assert.deepEqual(new Set(H.VISUAL_SCENES.map(v=>v.id)),new Set(M.PLAY_SEQUENCES));
 const finishes=new Set(['normal','header','finesse','power','low_driven','volley','bicycle','chip']);
 for(const v of H.VISUAL_SCENES){
  assert.ok(finishes.has(v.finish),v.id);
  assert.equal(M.normalizeSequence(v.id),v.id);
  for(const direction of [-1,1])for(const outcome of H.TYPES){
   const c=M.cameraState(direction,4.2,360/340,outcome,v.id,v.finish);
   const p=M.ballPosition(outcome,M.SHOT_TIME,v.id,v.finish);
   const impact=M.ballPosition(outcome,M.IMPACT_TIME,v.id,v.finish);
   assert.ok([...c.position,...c.target,...p,...impact].every(Number.isFinite),v.id);
   assert.ok(Math.hypot(...p.map((x,i)=>x-M.ballPosition(outcome,M.SHOT_TIME+.0001,v.id,v.finish)[i]))<.03,'strike continuity: '+v.id);
   assert.deepEqual(impact,M.shotImpact(outcome,v.id,v.finish),'outcome class unchanged: '+v.id);
  }
 }
 const head=M.ballPosition('goal',M.SHOT_TIME,'near_post_left','header');
 const volley=M.ballPosition('goal',M.SHOT_TIME,'volley_right','volley');
 const low=M.ballPosition('goal',M.SHOT_TIME,'low_driven_duel','low_driven');
 assert.ok(head[1]>1.6&&volley[1]>.9&&low[1]<.3);
 assert.notDeepEqual(M.ballPosition('goal',6,'inside_left','finesse'),M.ballPosition('goal',6,'inside_left','power'));
 assert.ok(M.ballPosition('goal',4.35,'early_cross_left','header')[1]>1);
});

test('V21.26: style metadata and deterministic visual hashing never touch match RNG',()=>{
 const def=require('../playstyles.js').definitions,ids=new Set(def.map(x=>x.id));
 for(const v of H.VISUAL_SCENES)for(const id of v.tags)assert.ok(ids.has(id),'unrecognized PlayStyle ID: '+id);
 const snapshot=H.snapshot({...event(),finish:'header',playerStyles:[{id:'power-header',plus:true}],creatorStyles:[{id:'incisive-pass',plus:false}]});
 assert.equal(snapshot.finish,'header');assert.ok(Object.isFrozen(snapshot.playerStyles));assert.ok(Object.isFrozen(snapshot.playerStyles[0]));
 let calls=0;const saved=Math.random;Math.random=()=>{calls++;return .4};
 try{
  for(let i=0;i<400;i++){
   const e={...event('goal','g'+i),scorerSlot:'ST',creatorSlot:'CAM',creatorName:'Passer',playerStyles:[{id:'power-shot',plus:true}],creatorStyles:[{id:'incisive-pass'}]};
   assert.deepEqual(H.choosePresentation(e,[]),H.choosePresentation(e,[]));
   assert.ok(H.VISUAL_SCENES.some(x=>x.id===H.choosePresentation({...e,playerStyles:null,creatorStyles:null},[]).sequence));
  }
 }finally{Math.random=saved}
 assert.equal(calls,0);
});

test('V21.26: PlayStyles affect frequency, assist creators count, repeats decay, bicycle is rare',()=>{
 const make=(i,fields={})=>({...event('goal','variance-'+i),scorerSlot:'ST',creatorSlot:'CAM',creatorName:'Creator',...fields});
 const sample=(fields,predicate,count=4000,hist=[])=>{let n=0;for(let i=0;i<count;i++)if(predicate(H.choosePresentation(make(i,fields),hist)))n++;return n};
 const power=e=>['long_shot','power_drive'].includes(e.sequence);
 assert.ok(sample({playerStyles:[{id:'power-shot',plus:true}]},power)>sample({},power)*1.15,'power shot selection is weighted');
 const through=e=>['through_ball','one_two','one_on_one'].includes(e.sequence);
 assert.ok(sample({creatorStyles:[{id:'incisive-pass',plus:true}]},through)>sample({},through)*1.1,'assist provider matters');
 const central=e=>e.sequence==='central';
 assert.ok(sample({},central,1200,[{sequence:'central',family:'central'}])<sample({},central,1200)*.55,'immediate repeat is penalized');
 assert.ok(sample({},e=>e.sequence==='bicycle',4000)<25,'overhead should be exceptional');
 assert.ok(H.choosePresentation(make('none',{creatorName:'',creatorStyles:null,playerStyles:null})).sequence);
});

test('V21.32: actual inverted-wing dribbles, near/far posts and grounded crosses',async()=>{
 const M=await import('../3d-highlights-scene.mjs');
 for(const side of ['left','right']){
  const sign=side==='left'?-1:1;
  for(const kind of ['inside','cut_inside','double_feint','near_post_cut']){
   const id=kind+'_'+side, start=M.runPosition(0,0,id),mid=M.runPosition(0,4.3,id),end=M.runPosition(0,M.SHOT_TIME,id);
   assert.ok(start[0]*sign>16&&Math.abs(mid[0])<Math.abs(start[0])&&Math.abs(end[0])>7&&Math.abs(end[0])<11,'visible outside-inside half-space cut '+id);
   for(const time of [.2,1.6,2.8,4.1]){
    const ball=M.ballPosition('goal',time,id,'finesse'),runner=M.runPosition(0,time,id);
    assert.ok(Math.hypot(ball[0]-runner[0],ball[2]-runner[1])<1.1,'controlled dribble '+id+' @'+time);
   }
   assert.equal(Math.sign(M.shotImpact('goal',id,'finesse')[0]),kind==='near_post_cut'?sign:-sign,'targeted corner '+id);
  }
  const flat=M.ballPosition('goal',4.2,'low_cross_'+side),aerial=M.ballPosition('goal',4.2,'wing_'+side);
  assert.ok(flat[1]<aerial[1]-.3,'low cross stays below aerial delivery '+side);
 }
 const chip=M.ballPosition('goal',6.02,'chip_one_on_one','chip'),driven=M.ballPosition('goal',6.02,'one_on_one','low_driven');
 assert.ok(chip[1]>driven[1]+1,'chip goes over the goalkeeper');
});
test('V21.32: German positions and Chip Shot+ drive scene selection',()=>{
 const e=(i,props={})=>({...event('goal','german-'+i),scorerSlot:'LF',playerStyles:[{id:'finesse-shot',plus:true},{id:'technical'}],...props});
 const sample=props=>{let left=0,right=0;for(let i=0;i<1500;i++){const s=H.choosePresentation(e(i,props));if(/^(inside|cut_inside|double_feint|near_post_cut)_left$/.test(s.sequence))left++;if(/^(inside|cut_inside|double_feint|near_post_cut)_right$/.test(s.sequence))right++}return {left,right}};
 const l=sample({}),r=sample({scorerSlot:'RF'});
 assert.ok(l.left>l.right*3&&r.right>r.left*3,'scene direction follows LF/RF');
 const chips=styles=>Array.from({length:2000},(_,i)=>H.choosePresentation({...event('goal','chip-'+i),scorerSlot:'ST',playerStyles:styles})).filter(x=>x.family==='chip').length;
 assert.ok(chips([{id:'chip-shot',plus:true}])>chips([])*2,'Chip Shot+ visibly affects scene choice');
});
test('V21.33: defensive and goalkeeper choices are immutable, deterministic and never use simulator RNG',async()=>{
 const styles=['block','jockey','slide-tackle','intercept','anticipate','aerial','footwork','far-reach','rush-out','deflector','cross-claimer'];
 const declared=new Set(require('../playstyles.js').definitions.map(x=>x.id));
 for(const id of styles)assert.ok(declared.has(id),'current real PlayStyle ID: '+id);
 const e={...event('big_chance_saved','keeper-scenes'),sequence:'one_on_one',finish:'low_driven',
  defenderStyles:[{id:'slide-tackle',plus:true}],keeperStyles:[{id:'footwork',plus:true}],defenderName:'Ruben Dias',defenderIndex:9};
 const reactions=H.chooseReactions(e);assert.deepEqual(reactions,H.chooseReactions(e));assert.ok(Object.isFrozen(reactions));
 const snap=H.snapshot({...e,...reactions});
 assert.ok(Object.isFrozen(snap.defenderStyles)&&Object.isFrozen(snap.keeperStyles)&&Object.isFrozen(snap.keeperStyles[0]));
 assert.equal(snap.defenderIndex,9);assert.equal(snap.defenderName,'Ruben Dias');
 assert.equal(snap.defenderAction,reactions.defenderAction);assert.equal(snap.keeperAction,reactions.keeperAction);
 assert.equal(H.chooseReactions({...e,type:'goal'}).keeperAction,'beaten');
 assert.equal(H.chooseReactions({...e,type:'shot_post'}).keeperAction,'beaten');
 let calls=0;const original=Math.random;Math.random=()=>{calls++;return .18};
 try{for(let i=0;i<450;i++)assert.deepEqual(H.chooseReactions({...e,id:'s-'+i}),H.chooseReactions({...e,id:'s-'+i}))}
 finally{Math.random=original}
 assert.equal(calls,0,'presentation RNG must never touch simulation');
});
test('V21.33: defensive PlayStyles steer visible attempts; keeper styles steer only REAL saved chances',()=>{
 const sample=(which,base,slot)=>{let count=0;for(let i=0;i<2400;i++){
  const choice=H.chooseReactions({...event(base.type||'goal','def-'+i),sequence:base.sequence||'dribble',finish:base.finish||'normal',...(base.extra||{}),...slot});
  if(choice[which]===base.target)count++;
 }return count};
 const configs=[
  ['jockey','dribble','jockey','jockey'],
  ['slide_attempt','dribble','slide-tackle','slide-tackle'],
  ['block_attempt','central','block','block'],
  ['lane_read','through_ball','intercept','intercept'],
  ['aerial_challenge','early_cross_right','aerial','aerial']
 ];
 for(const [target,sequence,id] of configs){
  const base={sequence,target};
  const no=sample('defenderAction',base,{}),boosted=sample('defenderAction',base,{defenderStyles:[{id,plus:true}]});
  assert.ok(boosted>no*1.25,`${id}: ${boosted} > ${no}`);
 }
 const saves=[
  ['fingertip','power','halfspace_left','far-reach'],
  ['parry','normal','central','deflector'],
  ['low_reflex','low_driven','low_driven_duel','footwork'],
  ['rush_spread','normal','one_on_one','rush-out'],
  ['high_reach','header','early_cross_left','cross-claimer']
 ];
 for(const [target,finish,sequence,id] of saves){
  const base={target,type:'big_chance_saved',sequence,finish};
  const plain=sample('keeperAction',base,{}),boosted=sample('keeperAction',base,{keeperStyles:[{id,plus:true}]});
  assert.ok(boosted>plain*1.35,`${id}: ${boosted} > ${plain}`);
 }
});
test('V21.33: reactions have distinct poses while ball-contact and authoritative outcomes stay intact',async()=>{
 const M=await import('../3d-highlights-scene.mjs');
 const types=['jockey','close_down','slide_attempt','block_attempt','lane_read','aerial_challenge'];
 const samples=new Set();for(const kind of types){
  const t=kind==='lane_read'?2.45:kind==='aerial_challenge'?4.95:5.2;
  const a=M.defensiveMotion(kind,t,8,8),other=M.defensiveMotion(kind,t,9,8);
  assert.ok(a.intensity>.05&&Number.isFinite(a.jump)&&Number.isFinite(a.slide),kind);
  assert.equal(other.intensity,0,'no full animation on other defenders');
  assert.deepEqual(a,M.defensiveMotion(kind,t,8,8));
  samples.add([kind,a.slide>0,a.jump>0].join(':'));
 }
 assert.equal(samples.size,types.length);
 const keeper=['classic','fingertip','parry','low_reflex','rush_spread','high_reach'];
 for(const action of keeper){
  const contact=M.ballPosition('big_chance_saved',M.IMPACT_TIME,'central','normal',action);
  assert.deepEqual(contact,M.ballPosition('big_chance_saved',M.IMPACT_TIME,'central','normal','classic'),'same actual save contact');
  const rebound=M.ballPosition('big_chance_saved',8.2,'central','normal',action),classic=M.ballPosition('big_chance_saved',8.2,'central','normal','classic');
  if(action==='classic')assert.deepEqual(rebound,classic);else assert.notDeepEqual(rebound,classic,action+' unique rebound');
  const k=M.keeperPose('big_chance_saved',M.IMPACT_TIME,'normal','central',action);
  assert.ok([k.x,k.y,k.z,k.tilt,k.dive].every(Number.isFinite),action);
  const goal=M.ballPosition('goal',8,'central','normal',action);
  assert.deepEqual(goal,M.ballPosition('goal',8,'central','normal','classic'),'keeper visuals never turn goal into save');
  const miss=M.ballPosition('big_chance_missed',8,'central','normal',action);
  assert.deepEqual(miss,M.ballPosition('big_chance_missed',8,'central','normal','classic'),'miss remains a miss');
 }
 assert.ok(M.keeperPose('big_chance_saved',M.IMPACT_TIME,'normal','central','high_reach').y>M.keeperPose('big_chance_saved',M.IMPACT_TIME,'normal','central','classic').y);
 assert.ok(M.keeperPose('big_chance_saved',M.IMPACT_TIME,'normal','central','rush_spread').z>M.keeperPose('big_chance_saved',M.IMPACT_TIME,'normal','central','classic').z);
 const source=fs.readFileSync(path.join(root,'3d-highlights-scene.mjs'),'utf8');
 assert.doesNotMatch(source,/Math\.random\s*\(/);
});
// V21.30 — presentation-only motion remains bounded, deterministic and mobile-safe.
test('V21.30 reactive defending and pass swing keep visual movement deterministic',async()=>{
 const {PLAY_SEQUENCES,defenderTracking,passStrikePose}=await import('../3d-highlights-scene.mjs');
 let responsive=0;
 for(const sequence of PLAY_SEQUENCES)for(const t of [0,1.5,3,5.4,6.65,8.5])for(let i=8;i<16;i++){
  const v=defenderTracking(i,t,sequence);assert.deepEqual(v,defenderTracking(i,t,sequence));
  assert.ok(Number.isFinite(v.x)&&Number.isFinite(v.z)&&Number.isFinite(v.pressure));
  assert.ok(Math.abs(v.x)<=2.451&&Math.abs(v.z)<=1.851&&v.pressure>=0&&v.pressure<=1);
  if(t===0||t>=6.65)assert.equal(v.pressure,0,'no tracking outside build-up');
  if(v.pressure>.1)responsive++;
 }
 assert.ok(responsive>12,'defenders visibly react during build-up');
 assert.deepEqual(defenderTracking(0,3),{x:0,z:0,pressure:0});
 const wind=passStrikePose(0),strike=passStrikePose(.65),follow=passStrikePose(1);
 assert.ok(wind.hip<strike.hip&&strike.hip<follow.hip&&wind.follow<strike.follow);
 for(const k of [wind,strike,follow])assert.ok(Math.abs(k.ankle+k.hip+k.knee)<1e-10);
 const css=fs.readFileSync(path.join(root,'matchday.css'),'utf8');
 assert.match(css,/#match \.match-overview \.mstat strong\{[^}]*line-height:1\.3/);
 assert.match(css,/grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/);
});

test('V21.30: no carried ball may trail behind the running player across 42 sequences',async()=>{
 const M=await import('../3d-highlights-scene.mjs');
 let checked=0;const samples=[];
 for(const sequence of M.PLAY_SEQUENCES)for(let step=1;step<=104;step++){
  const time=step/10,c=M.controlCarrier(time,sequence);
  assert.deepEqual(c,M.controlCarrier(time,sequence),'deterministic owner');
  if(c.weight<.80)continue;
  checked++;
  const p=M.runPosition(c.index,time,sequence),prev=M.runPosition(c.index,time-.04,sequence),next=M.runPosition(c.index,time+.04,sequence),
   vx=next[0]-prev[0],vz=next[1]-prev[1],speed=Math.hypot(vx,vz),ball=M.ballPosition('goal',time,sequence);
  assert.ok(speed>.00001,'moving ball owner: '+sequence);
  const forward=((ball[0]-p[0])*vx+(ball[2]-p[1])*vz)/speed;
  assert.ok(forward>.25,sequence+' @'+time+' dribble must be IN FRONT of footballer, got '+forward);
  assert.ok(Math.hypot(ball[0]-p[0],ball[2]-p[1])<.8,sequence+' @'+time+' close boot control');
  assert.ok(Math.abs(ball[1]-.14)<.035,sequence+' @'+time+' controlled ball stays grounded');
  samples.push(forward);
 }
 assert.ok(checked>700,'test must cover most frames for all controlled attack types');
 assert.ok(Math.min(...samples)>.25);
 assert.equal(M.controlCarrier(M.SHOT_TIME,'dribble').index,-1,'kick releases controlled ball');
 assert.equal(M.controlCarrier(4.1,'wing_left').index,-1,'wing delivery is not glued to a boot');
 const before=M.passStrikePose(0),contact=M.passStrikePose(.5),after=M.passStrikePose(1);
 assert.ok(contact.hip>before.hip+.9,'visible kick contact around release');
 assert.ok(after.hip>contact.hip,'follow through after pass release');
});

test('V21.30: smooth handoffs keep every attacking pattern continuous',async()=>{
 const M=await import('../3d-highlights-scene.mjs');
 let checks=0,largest=0;
 for(const sequence of M.PLAY_SEQUENCES)for(const t of [2.35,2.5,2.9,3.1,3.2,3.36,3.65,4.65,5.16,M.SHOT_TIME]){
  const a=M.ballPosition('goal',t-.0001,sequence),b=M.ballPosition('goal',t+.0001,sequence),
    jump=Math.hypot(...a.map((v,i)=>v-b[i]));largest=Math.max(largest,jump);checks++;
  assert.ok(jump<.12,sequence+' at '+t+' has nonphysical ball teleport of '+jump+' m');
 }
 const renderer=fs.readFileSync(path.join(root,'3d-highlights-scene.mjs'),'utf8');
 assert.match(renderer,/function bootGuidedBall\(original,time\)/,'mesh ball follows real boot transforms');
 assert.match(renderer,/p\.root\.updateWorldMatrix\(true,true\)/,'animated boots are updated before attaching ball');
 assert.match(renderer,/const leftWeight=smooth/,'smooth foot switch instead of an abrupt left/right toggle');
 assert.match(renderer,/ball\.rotation\.x=ballRollAt\(time\)/,'roll is based on travel distance');
 assert.doesNotMatch(renderer,/ball\.rotation\.x=time\*9/,'remove constant unrelated spin');
 assert.ok(checks>=320);
 assert.ok(largest<.12);
});


// The television highlight must actually show a cut from the touchline into a
// half-space finish. Goal/save/miss still come only from the match simulation.
test('inverted winger cuts inward and curls toward the opposite far corner',async()=>{
 const {SHOT_TIME,IMPACT_TIME,runPosition,ballPosition,shotContact,shotImpact}=await import('../3d-highlights-scene.mjs');
 for(const [sequence,side] of [['cut_inside_right',1],['cut_inside_left',-1],['double_feint_right',1],['inside_left',-1]]){
  const before=runPosition(0,0,sequence),atStrike=runPosition(0,SHOT_TIME,sequence);
  assert.ok(before[0]*side>=19,'wide start '+sequence);
  assert.ok(atStrike[0]*side>7&&atStrike[0]*side<11,'strikes from half space, not centre '+sequence);
  assert.ok(Math.abs(before[0])-Math.abs(atStrike[0])>9,'actually cuts inward '+sequence);
  const contact=shotContact(sequence,'finesse'),ball=ballPosition('goal',SHOT_TIME,sequence,'finesse');
  assert.ok(Math.hypot(contact[0]-atStrike[0],contact[2]-atStrike[1])<1.05,'contact near shooter '+sequence);
  assert.deepEqual(ball,contact,'ball is at rotated boot contact '+sequence);
  const far=shotImpact('goal',sequence,'finesse');
  assert.equal(Math.sign(far[0]),-side,'far corner opposite starting wing '+sequence);
  assert.ok(Math.abs(far[0])>3&&Math.abs(far[0])<3.55&&far[1]>1.5&&far[1]<2.44,'high curl within goal frame '+sequence);
  const mid=ballPosition('goal',(SHOT_TIME+IMPACT_TIME)/2,sequence,'finesse');
  assert.ok(Math.abs(mid[0]-contact[0])>2,'clearly diagonal strike '+sequence);
  assert.deepEqual(ballPosition('big_chance_saved',SHOT_TIME,sequence,'finesse'),contact,'saved attempt uses same valid contact '+sequence);
 }
 const near=shotImpact('goal','near_post_cut_right','power');
 assert.ok(near[0]>2&&near[0]<3.6,'near-post finish stays on winger side');
});


test('V21.35: physical cut and defensive range are deterministic and presentation-only',async()=>{
 const M=await import('../3d-highlights-scene.mjs');
 const straight=M.locomotionDynamics(.85,0,3.5,.4,false),
  cutLeft=M.locomotionDynamics(.85,-.14,3.5,.4,false),
  cutRight=M.locomotionDynamics(.85,.14,3.5,.4,false),
  control=M.locomotionDynamics(.85,.14,3.5,.4,true);
 assert.equal(straight.bank,0);
 assert.ok(cutLeft.bank<-.1&&cutRight.bank>.1);
 assert.ok(cutLeft.plant>.5&&cutRight.plant>.5,'both turns plant the foot');
 assert.ok(Math.abs(cutLeft.forwardLean)>.12,'sprint visibly leans');
 assert.ok(control.armSwing<cutRight.armSwing&&control.strideReach<cutRight.strideReach,'dribbler uses compact steps');
 assert.deepEqual(cutLeft,M.locomotionDynamics(.85,-.14,3.5,.4,false));
 for(const action of ['slide_attempt','block_attempt','aerial_challenge']){
  const nearby=M.defensiveMotion(action,5.2,8,8,2),
   distant=M.defensiveMotion(action,5.2,8,8,13);
  assert.ok(nearby.intensity>.05,action+' attempts near attacker');
  assert.equal(distant.intensity,0,action+' cannot fall without attacker nearby');
  assert.equal(M.defensiveMotion(action,5.2,9,8,2).intensity,0,'only selected defender reacts');
  assert.ok(Number.isFinite(nearby.plant)&&Number.isFinite(nearby.recover));
 }
 assert.deepEqual(M.ballPosition('goal',M.IMPACT_TIME,'cut_inside_right','finesse'),
  M.shotImpact('goal','cut_inside_right','finesse'),'presentation never changes the final shot result');
});

test('V21.36: authored motion clips blend into foot-planted movement safely',async()=>{
 const C=await import('../3d-motion-clips.mjs');
 const M=await import('../3d-highlights-scene.mjs');
 const names=['jog','sprint','dribble','cut','normal','finesse','power','low_driven','header','volley','bicycle','keeper_save','keeper_beaten'];
 for(const name of names){
  assert.ok(C.MOTION_CLIPS[name]&&Object.isFrozen(C.MOTION_CLIPS[name]),'clip '+name);
  for(const phase of [0,.1,.25,.44,.67,.92,1]){
   const frame=C.sampleMotionClip(name,phase);
   assert.ok(C.MOTION_CHANNELS.every(channel=>Number.isFinite(frame[channel])),name+' @'+phase);
  }
  if(C.MOTION_CLIPS[name].loop)assert.deepEqual(C.sampleMotionClip(name,0),C.sampleMotionClip(name,1));
 }
 const slow=C.blendLocomotionClips(.15,0,2,0),sprint=C.blendLocomotionClips(.98,0,2,0),
 dribble=C.blendLocomotionClips(.98,0,2,1),cut=C.blendLocomotionClips(.98,.14,2,0);
 assert.ok(sprint.pitch<slow.pitch-.04,'sprint has distinct lean');
 assert.ok(dribble.reach<sprint.reach-.1,'dribbling shortens steps');
 assert.ok(cut.roll>sprint.roll+.02,'cut plants laterally');
 assert.ok(C.sampleMotionClip('finesse',.44).yaw>.16,'finesse hip rotation');
 assert.ok(C.sampleMotionClip('power',.44).pitch<-.2,'power follow-through');
 assert.notDeepEqual(C.sampleMotionClip('keeper_save',.44),C.sampleMotionClip('keeper_beaten',.44));
 const out={},scratch={};
 assert.equal(C.blendLocomotionClips(.7,.1,3,.25,out,scratch),out,'reusable buffer');
 assert.equal(C.motionClipBlend(4,4.9,6.05),0);
 assert.equal(C.motionClipBlend(5.4,4.9,6.05,.16),1);
 assert.equal(C.motionClipBlend(7,4.9,6.05),0);
 assert.deepEqual(M.ballPosition('goal',M.IMPACT_TIME,'cut_inside_right','finesse'),M.shotImpact('goal','cut_inside_right','finesse'));
});

test('V21.37: a real connected skinned skeleton deforms a weighted football body',async()=>{
 const T=await import('../vendor/three/three.module.min.js');
 const {buildSkinnedFootballer,createSkeletonMotion}=await import('../3d-rigged-footballer.mjs');
 const root=new T.Group(),rig=new T.Bone(),upper=new T.Bone(),motion=new T.Bone(),chest=new T.Bone();
 root.add(rig);rig.add(upper);upper.position.y=1;upper.add(motion);motion.add(chest);chest.position.y=-1;
 const arms=[],elbows=[],legs=[],knees=[],ankles=[];
 for(const side of [-1,1]){
  const arm=new T.Bone();arm.position.set(side*.224,1.45,0);chest.add(arm);arms.push(arm);
  const elbow=new T.Bone();elbow.position.y=-.32;arm.add(elbow);elbows.push(elbow);
  const leg=new T.Bone();leg.position.set(side*.108,.94,0);rig.add(leg);legs.push(leg);
  const knee=new T.Bone();knee.position.y=-.43;leg.add(knee);knees.push(knee);
  const ankle=new T.Bone();ankle.position.y=-.43;knee.add(ankle);ankles.push(ankle);
 }
 const mats=Array.from({length:5},()=>new T.MeshStandardMaterial());
 const skin=buildSkinnedFootballer(T,root,{rig,upper,motion,chest,arms,elbows,legs,knees,ankles},mats,10);
 assert.ok(skin.model.isSkinnedMesh&&skin.skeleton instanceof T.Skeleton&&skin.model.skeleton===skin.skeleton,'GPU skinning is real, not rigid-body meshes');
 assert.equal(skin.geometry.groups.length,0,'the atlas draws the skinned figure in one batch');
 assert.equal(skin.drawSurfaces,1);
 assert.ok(skin.atlasTexture.isDataTexture,'DOM-free atlas fallback supports CI');
 assert.equal(skin.bones,14);assert.ok(skin.vertexCount>400);assert.ok(skin.segmentCount>=10);
 assert.ok(skin.geometry.getAttribute('skinIndex').count===skin.vertexCount);
 for(let i=0;i<skin.vertexCount;i++){
  const w=skin.geometry.getAttribute('skinWeight'),index=skin.geometry.getAttribute('skinIndex');
  const sum=w.getX(i)+w.getY(i)+w.getZ(i)+w.getW(i);
  assert.ok(Math.abs(sum-1)<.00001,'normalized skin weights '+i);
  assert.ok(index.getX(i)<skin.bones&&index.getY(i)<skin.bones);
 }
 const before=motion.rotation.y,m=createSkeletonMotion(T,motion,'striker','finesse');
 m.mixer.setTime(5.4);
 assert.ok(Math.abs(motion.rotation.y-before)>.1,'AnimationMixer animates the skeleton transform');
 m.mixer.setTime(0);assert.ok(Math.abs(motion.rotation.y)<.01,'seek is deterministic and reversible');
 assert.equal(m.action.isRunning(),true);
 m.mixer.stopAllAction();skin.geometry.dispose();mats.forEach(mat=>mat.dispose());
});
