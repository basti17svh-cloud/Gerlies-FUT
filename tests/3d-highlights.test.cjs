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
 for(const file of ['3d-highlights.js?v=2122','3d-highlights-match.js?v=2122','3d-highlights-scene.mjs?v=2122','3d-highlights.css?v=2122','vendor/three/three.module.min.js'])assert.ok(sw.includes('./'+file),file);
 assert.ok(sw.includes('footera-v21-22'));assert.ok(html.includes('service-worker.js?v=2123'));
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
 assert.deepEqual([...M.PLAY_SEQUENCES],sequences);
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
