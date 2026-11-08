// Footera Stadion-Sound for 3D scenes (V21.371).
// Turns what the scene already shows into stadium sound: the ball's own
// movement gives every pass and shot its kick, the distance to goal lifts the
// crowd, and the outcome (net, post, save, miss) gets its roar or "Ohhh".
// Presentation only: reads scene time and the ball position, nothing else.

const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));

// A touch shows up in the ball's own movement. Passes in the scenes are eased
// (the ball speeds up over a few frames), shots and deflections change the
// velocity at once, so both patterns count:
//  - launch: the ball was slow (< LAUNCH_ARM m/s) and now speeds up hard
//  - impulse: the velocity jumps or turns by more than KICK_MIN_CHANGE m/s
//  - receive: a fast ball is stopped (soft touch)
export const KICK_MIN_CHANGE=7.5;
export const KICK_GAP=.2;           // scene seconds between two counted touches
export const LAUNCH_ARM=5,LAUNCH_SPEED=6,LAUNCH_ACCEL=20;

export function createKickDetector({minChange=KICK_MIN_CHANGE,gap=KICK_GAP}={}){
 let last=null,lastVel=null,lastKick=-Infinity,armed=true,fast=false;
 return{
  reset(){last=null;lastVel=null;armed=true;fast=false},
  // time in scene seconds, ball [x,y,z] in metres. Returns null or {strength,kind}.
  sample(time,ball){
   if(!ball||!Number.isFinite(time))return null;
   if(!last||time<=last.time||time-last.time>.3){last={time,ball:[...ball]};lastVel=null;return null}
   const dt=time-last.time;
   // Tiny steps (slow motion, 120 Hz) are too noisy to differentiate.
   if(dt<.012)return null;
   const vel=[(ball[0]-last.ball[0])/dt,(ball[1]-last.ball[1])/dt,(ball[2]-last.ball[2])/dt];
   last={time,ball:[...ball]};
   const prev=lastVel;lastVel=vel;
   if(!prev)return null;
   const speed=Math.hypot(vel[0],vel[1]*.6,vel[2]),prevSpeed=Math.hypot(prev[0],prev[1]*.6,prev[2]);
   const change=Math.hypot(vel[0]-prev[0],vel[1]-prev[1],vel[2]-prev[2]),accel=(speed-prevSpeed)/dt;
   if(speed<LAUNCH_ARM)armed=true;
   let hit=null;
   if(time-lastKick>=gap){
    if(change>=minChange&&speed>=Math.max(3.5,prevSpeed*.55))hit={kind:'impulse',strength:clamp(speed/18,.15,1)};
    else if(armed&&speed>=LAUNCH_SPEED&&accel>=LAUNCH_ACCEL)hit={kind:'launch',strength:clamp(.18+accel/160,.18,.85)};
    else if(fast&&speed<4&&prevSpeed>=4&&accel<=-25)hit={kind:'receive',strength:.12};
   }
   if(speed>=8)fast=true;else if(speed<4)fast=false;
   if(!hit)return null;
   lastKick=time;armed=false;if(hit.kind==='receive')fast=false;
   return{time,speed,...hit};
  }
 };
}

// How excited the stand is: base level plus up to +.45 as the ball nears goal.
export function crowdExcitement(distanceToGoal,{base=.32}={}){
 const d=Number.isFinite(distanceToGoal)?distanceToGoal:60;
 return clamp(base+.45*clamp((42-d)/30,0,1),0,.9);
}

// When each outcome sound fires, in scene seconds.
export function outcomeCues(event,{impactTime,goalArrival,actionTime=4.4,ceremonyCut=null}={}){
 const cues=[],type=event?.type,home=event?.team!=='away';
 if(type==='ceremony'){
  if(event.ceremony==='kickoff'){
   cues.push({time:.2,cue:'applause',seconds:4.2,level:.55},{time:1.6,cue:'chant',seconds:5.2,level:.2});
   cues.push({time:Math.max(2,(ceremonyCut??4.4)+3.6),cue:'whistle',pattern:'kickoff'});
  }else{
   cues.push({time:.15,cue:'whistle',pattern:'final'});
   cues.push({time:1.5,cue:event.result==='draw'?'applause':'roar',size:event.result==='draw'?0:home?.85:.4,seconds:4.5,level:.5});
  }
  return cues;
 }
 if(type==='goal'){
  const at=Number.isFinite(goalArrival)?goalArrival:6.9;
  cues.push({time:at,cue:'net'},{time:at+.03,cue:'roar',size:home?1:.42});
  if(home)cues.push({time:at+3.2,cue:'chant',seconds:4.2,level:.2});
  else cues.push({time:at+.15,cue:'groan',size:.45});
 }else if(type==='shot_post'){
  const at=Number.isFinite(impactTime)?impactTime:6.4;
  cues.push({time:at,cue:'post'},{time:at+.05,cue:'groan',size:home?1:.55});
 }else if(type==='big_chance_saved'){
  const at=Number.isFinite(impactTime)?impactTime:6.4;
  cues.push({time:at+.02,cue:'groan',size:home?.95:.5},{time:at+1.2,cue:'applause',seconds:2.4,level:home?.3:.45});
 }else if(type==='big_chance_missed'){
  const at=Number.isFinite(impactTime)?impactTime:6.4,clear=event.keeperAction==='line_clear';
  cues.push({time:at+.05,cue:'groan',size:home?1.05:.5});
  if(clear)cues.push({time:at+.7,cue:'applause',seconds:2.2,level:home?.3:.5});
 }else if(type==='ball_won'){
  cues.push({time:actionTime+.1,cue:'applause',seconds:2,level:home?.42:.22});
 }
 return cues.sort((a,b)=>a.time-b.time);
}

// Drives FooteraSound for one 3D scene. Returns a no-op when sound is off.
export function createSceneSound(event,{sound=globalThis.FooteraSound,startAt=0,impactTime,goalArrival,actionTime,ceremonyCut,weather=null,log=null}={}){
 const noop={update(){},replay(){},dispose(){},cues:[]};
 if(!sound||!sound.enabled?.())return noop;
 const ceremony=event?.type==='ceremony';
 const cues=outcomeCues(event,{impactTime,goalArrival,actionTime,ceremonyCut});
 const fire=(name,...args)=>{if(log)log.push({name,args,time:lastTime});try{return sound[name]?.(...args)}catch(_){return null}};
 // Switched on mid-scene: cues that are already over stay silent.
 let lastTime=Number(startAt)||0,next=cues.filter(c=>c.time<(Number(startAt)||0)).length,bed=null,started=false,replayOn=false,peakUntil=-1,disposed=false;
 const kicks=createKickDetector();
 const rain=weather?.kind==='rain'?clamp(Number(weather.intensity)||.6,.2,1):0;
 function start(){
  if(started)return;started=true;
  if(log)log.push({name:'crowd',args:[{level:ceremony?.42:.32,rain}],time:lastTime});
  bed=sound.crowd?.({level:ceremony?.42:.32,rain})||null;
 }
 return{
  cues,
  // time: scene seconds; probe: {ball:[x,y,z], goal:[x,y,z]} or null.
  update(time,probe){
   if(disposed)return;lastTime=time;start();
   if(!replayOn){
    while(next<cues.length&&time>=cues[next].time){
     const c=cues[next++];
     if(c.cue==='net'||c.cue==='post')fire(c.cue);
     else if(c.cue==='roar'){if(c.size>0){fire('roar',c.size);peakUntil=time+3.4}else fire('applause',c.seconds||3,c.level||.5)}
     else if(c.cue==='groan')fire('groan',c.size);
     else if(c.cue==='applause')fire('applause',c.seconds,c.level);
     else if(c.cue==='chant')fire('chant',c.seconds,c.level);
     else if(c.cue==='whistle')fire('whistle',c.pattern);
    }
   }
   if(ceremony||!probe?.ball)return;
   const k=kicks.sample(time,probe.ball);
   // Replay touches are quieter: the commentary "camera" is far away.
   if(k)fire('kick',replayOn?k.strength*.55:k.strength);
   if(bed&&!replayOn){
    const goal=probe.goal||[0,0,-52.5],d=Math.hypot(probe.ball[0]-goal[0],probe.ball[2]-goal[2]);
    const lvl=time<peakUntil?.62:crowdExcitement(d);bed.level(lvl,.45);
    if(log)log.push({name:'level',args:[lvl],time});
   }
  },
  replay(on){
   if(disposed)return;replayOn=!!on;kicks.reset();
   if(log)log.push({name:'muffle',args:[replayOn],time:lastTime});
   bed?.muffle(replayOn);bed?.level(replayOn?.26:.4,.3);
  },
  dispose(){if(disposed)return;disposed=true;if(log)log.push({name:'stop',args:[],time:lastTime});bed?.stop(.7)}
 };
}
