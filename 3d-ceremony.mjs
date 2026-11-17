/* V21.226 match ceremonies (Basti 2026-10-22): the walk-out before kick-off,
 * the final whistle (winners celebrate, losers go down, then handshakes) and
 * the goal replay camera. Presentation only: no match state, no RNG.
 * Field-local metres, ceremonies always use attack direction 1, so the
 * broadcast side (main stand, tunnel) is +x. Heading 0 faces -z. */
export const CEREMONY_VERSION='21.444-trophy';
// V21.444 'trophy': the cup presentation after a won tournament final.
export const CEREMONY_KINDS=Object.freeze(['kickoff','fulltime','trophy']);
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const smooth=v=>{const x=clamp(v);return x*x*(3-2*x)};
const mix=(a,b,t)=>a+(b-a)*t;
const angleMix=(a,b,t)=>a+Math.atan2(Math.sin(b-a),Math.cos(b-a))*t;
const facing=(from,to)=>Math.atan2(-(to[0]-from[0]),-(to[1]-from[1]));
export const FACE_CAMERA=-Math.PI/2;
import {stadiumIntroCamera} from './3d-stadium.mjs?v=21459';
export function ceremonyKind(event){return CEREMONY_KINDS.includes(event?.ceremony)?event.ceremony:''}

// ---- walk-out: two columns come off the main-stand side, turn at the
// halfway line and form one line each, facing the main stand.
const WALK={start:14,corner:9,radius:1,lane:.9,firstSlot:2.3,spacing:1.15,gap:1.25,speed:2};
function walkPath(s,sign){
 const {start,corner,radius:r,lane}=WALK,l1=start-(corner+r),arc=Math.PI*r/2;
 if(s<l1)return[start-s,sign*lane];
 if(s<l1+arc){const a=(s-l1)/r;return[corner+r-r*Math.sin(a),sign*(lane+r-r*Math.cos(a))]}
 return[corner,sign*(lane+r+(s-l1-arc))];
}
// Column order: home = attackers 0..7; away = goalkeeper (16), then 8..15.
function walkSlot(index){
 const home=index<8,k=home?index:index===16?0:index-7,n=home?8:9,sign=home?-1:1;
 const {start,corner,radius:r,lane,firstSlot,spacing,gap}=WALK;
 const along=(start-(corner+r))+Math.PI*r/2,slot=firstSlot+(n-1-k)*spacing;
 const from=-k*gap,to=along+slot-(lane+r);
 return{sign,from,distance:to-from};
}
// Walk at constant pace, then a soft one-metre stop.
function arrive(distance,speed,time){
 const d=speed*time;
 if(d<=distance-1)return d;
 const u=clamp((d-(distance-1))/2);return distance-1+(1-(1-u)*(1-u));
}
export function kickoffArrival(index){const {distance}=walkSlot(index);return(distance+1)/WALK.speed}
function kickoffActor(index,time){
 const slot=walkSlot(index),at=t=>walkPath(slot.from+arrive(slot.distance,WALK.speed,Math.max(0,t)),slot.sign);
 const p=at(time),before=at(time-.05),after=at(time+.05);
 const moving=Math.hypot(after[0]-before[0],after[1]-before[1])>.004;
 const travel=moving?Math.atan2(-(after[0]-before[0]),-(after[1]-before[1])):(slot.sign<0?0:Math.PI);
 const done=kickoffArrival(index),turn=smooth((time-done+.7)/.9);
 return{x:p[0],z:p[1],heading:angleMix(travel,FACE_CAMERA,turn),pose:turn>.4?'lineup':null,s:time-done+.3,weight:smooth((time-done+.3)/.6)};
}

// ---- final whistle. V21.439 (Basti: "Dieses rumhampeln in der Mitte nervt
// mich"): no more ring of bouncing winners round one spot. Like on TV the
// players are spread over the pitch where the whistle caught them and coast
// to a stop. Each winner reacts his own way with real captured motion
// (Mixamo), the losers drop their heads, then every pair walks together for
// one handshake, and the teams head off: winners to the main stand to thank
// their fans, losers slowly to their own end.
// [winner spot, loser offset from him, the way he was jogging]
const FULLTIME_PAIRS=Object.freeze([
 [[3,-2],[-2.4,1.7],.4],[[-3,-6],[-2.1,2.3],2.3],[[8,2.5],[-2.6,-1.9],-.9],[[-5,2],[-2.2,2.5],1.4],
 [[10,-7],[-2.5,2],-.2],[[.5,6],[-2.8,-1.5],3],[[4.5,-10],[-2.6,-2],-2.4],[[-6.5,-9],[-2.5,-2.2],1.9]]);
export const FULLTIME_CENTRE=Object.freeze([2,-2]);
// Where the winners line up in front of the main stand to thank their fans.
export const FULLTIME_FANS=Object.freeze([15,-2]);
// What each winner does at the whistle (captured clips; procedural fallbacks
// in 3d-goal-celebration.mjs) and each loser's reaction (one sits down).
export const FULLTIME_JOY=Object.freeze(['victory','cheering','pump','excited','rallying','waving','victory','cheering']);
export const FULLTIME_DESPAIR=Object.freeze(['hands_on_hips','hands_on_head','hands_on_knees','kneel_down','hands_on_head','hands_on_hips','hands_on_knees','hands_on_hips']);
export const FULLTIME_TIMES=Object.freeze({coast:1,coastLen:1.3,meet:2.9,shake:3.8,shakeEnd:5,leave:5,jog:3.1,walkOff:1.05});
const FT=FULLTIME_TIMES;
const lerp2=(a,b,u)=>[mix(a[0],b[0],u),mix(a[1],b[1],u)];
function pairSpots(j){
 const [w,o,dir]=FULLTIME_PAIRS[j],l=[w[0]+o[0],w[1]+o[1]],m=[(w[0]+l[0])/2,(w[1]+l[1])/2],d=Math.hypot(o[0],o[1]);
 return{w,l,dir,meetW:[m[0]-o[0]/d*.42,m[1]-o[1]/d*.42],meetL:[m[0]+o[0]/d*.42,m[1]+o[1]/d*.42]};
}
// Winners' places in the line, ordered by where they come from (no crossing).
const FAN_SLOT=(()=>{const order=[...Array(8).keys()].sort((a,b)=>pairSpots(a).meetW[1]-pairSpots(b).meetW[1]);const slot=[];order.forEach((j,k)=>{slot[j]=k});return slot})();
function fanSpot(j){const k=FAN_SLOT[j];return[FULLTIME_FANS[0]-(k%2)*.9,FULLTIME_FANS[1]+(k-3.5)*1.3]}
// Walks with a soft start and stop (eased), at most ~1.7 m/s.
function walk(a,b,t0,t1,time){return lerp2(a,b,smooth((time-t0)/(t1-t0)))}
// A steady jog/walk at `speed` from a to b: 0.5 s to get going, soft stop.
function travel(a,b,t0,speed,time){
 const L=Math.hypot(b[0]-a[0],b[1]-a[1]);if(L<1e-6)return a.slice();
 const t=Math.max(0,time-t0),d=t<.5?speed*t*t:speed*(t-.25);
 return lerp2(a,b,arrive(L,1,d)/L);
}
function fulltimeSpot(index,time,draw){
 if(index===16){
  // The beaten keeper walks slowly out of his area, hands on the hips.
  return walk([-15,-23],[-17.5,-16],.6,10.4,time);
 }
 const winner=index<8,j=winner?index:index-8,p=pairSpots(j),home=winner?p.w:p.l,meet=winner?p.meetW:p.meetL;
 if(time>FT.leave){
  // Winners (after a draw: the home side) jog over to the main stand (+x),
  // the others walk slowly towards their own end.
  return winner?travel(meet,fanSpot(j),FT.leave,FT.jog,time):travel(meet,[meet[0]-5.5,meet[1]*.92],FT.leave+.2,FT.walkOff,time);
 }
 if(time>FT.meet)return walk(home,meet,FT.meet,FT.shake,time);
 // Coasting to a stop from a jog along his running line.
 const dir=winner?p.dir:p.dir+.5,u=clamp(time/FT.coast),back=FT.coastLen*(1-u)*(1-u);
 return[home[0]-Math.sin(dir)*back,home[1]-Math.cos(dir)*back];
}
function fulltimeActor(index,time,draw){
 const p=fulltimeSpot(index,time,draw),before=fulltimeSpot(index,time-.05,draw),after=fulltimeSpot(index,time+.05,draw);
 const moving=Math.hypot(after[0]-before[0],after[1]-before[1])>.006;
 const winner=index<8,j=winner?index:index-8;
 const travelHeading=moving?Math.atan2(-(after[0]-before[0]),-(after[1]-before[1])):null;
 if(index===16)return{x:p[0],z:p[1],heading:travelHeading??0,pose:'hands_on_hips',s:time,weight:smooth((time-.8)/.6)};
 const partner=fulltimeSpot(winner?index+8:index-8,time,draw);
 let heading;
 if(time>=FT.meet-.2&&time<FT.leave+.15)heading=facing(p,partner);
 else if(travelHeading!==null)heading=travelHeading;
 else if(time>=FT.leave)heading=winner?FACE_CAMERA:-FACE_CAMERA;
 else heading=winner&&!draw?FACE_CAMERA:facing(p,FULLTIME_CENTRE)+Math.PI;
 // A moving player turns into his walk, a stopped one to his fans.
 if(time>=FT.leave&&travelHeading!==null){const arrived=fulltimeSpot(index,time+.6,draw),left=Math.hypot(arrived[0]-p[0],arrived[1]-p[1]);
  heading=angleMix(winner?FACE_CAMERA:-FACE_CAMERA,travelHeading,smooth(left/.6))}
 let pose=null,s=0,weight=0;
 const react0=winner?.3+(j*.23)%.45:.2+(j*.17)%.35,react1=FT.meet-.1;
 if(time<FT.meet+.3){
  pose=draw?(j%3===1?'applause':'hands_on_hips'):winner?FULLTIME_JOY[j]:FULLTIME_DESPAIR[j];
  s=time-react0;weight=smooth((time-react0)/.45)*(1-smooth((time-react1)/.4));
 }else if(time>=FT.shake-.15&&time<FT.shakeEnd+.1){
  pose='handshake';s=time-(FT.shake-.15);weight=smooth(s/.3)*(1-smooth((time-(FT.shakeEnd-.35))/.4));
 }else if(time>=FT.leave+.4){
  // Applauding the fans; winners once they stand in front of the stand.
  const there=winner?1-smooth((Math.hypot(...(([a,b])=>[a-p[0],b-p[1]])(fanSpot(j)))-.4)/1.2):1;
  pose=winner&&!draw&&j%4===2?'waving':'applause';s=time-(FT.leave+.4);
  weight=winner?there:.65*smooth((time-(FT.leave+1.6))/.8);
 }
 return{x:p[0],z:p[1],heading,pose:weight>0?pose:null,s,weight};
}
// ---- V21.444 Pokalübergabe (surprise 2026-11-16): after a won cup final
// the beaten side forms a guard of honour, the winners jog through it to the
// winners' stage in front of the main stand (+x) and line up before the
// backdrop. The captain comes last, takes the cup off its pedestal, turns to
// the cameras and lifts it: confetti, fountains, fireworks, the team jumps.
// Actors 0-7 = winners (0 = captain), 8-15 + keeper (16) = the guard.
export const TROPHY_LANE=20.7;
export const TROPHY_LINE=19.45;
export const TROPHY_BACKDROP=18.55;
export const TROPHY_PEDESTAL=Object.freeze([20.7,.2]);
export const TROPHY_CAPTAIN_SPOT=Object.freeze([20.7,-.42]);
// Line slots for teammates 1-7 in the order they arrive (farthest first).
const TROPHY_SLOTS=Object.freeze([5.2,3.9,2.6,1.3,-1.3,-2.6,-3.9]);
const TROPHY_SPEED=2.8;
export const TROPHY_TIMES=Object.freeze({grab:6.55,turn:7.35,lift:8.45,cut:4.6,close:8.4,end:13.9});
const TR=TROPHY_TIMES;
function trophyStart(index){
 // The column: teammates in arrival order, the captain 1.6 m behind the last.
 return index===0?-9-6*1.05-1.6:-9-(index-1)*1.05;
}
// [lane point where he leaves the lane, final spot]
function trophyRoute(index){
 if(index===0)return[TROPHY_CAPTAIN_SPOT,TROPHY_CAPTAIN_SPOT];
 const z=TROPHY_SLOTS[index-1];return[[TROPHY_LANE,z-1.6],[TROPHY_LINE,z]];
}
function polyTravel(points,speed,time){
 const t=Math.max(0,time),d=t<.5?speed*t*t:speed*(t-.25);
 let total=0;const legs=[];for(let i=1;i<points.length;i++){const l=Math.hypot(points[i][0]-points[i-1][0],points[i][1]-points[i-1][1]);legs.push(l);total+=l}
 let left=arrive(total,1,d);
 for(let i=1;i<points.length;i++){const l=legs[i-1];if(left<=l||i===points.length-1){const u=l>1e-6?Math.min(1,left/l):1;return lerp2(points[i-1],points[i],u)}left-=l}
 return points[points.length-1].slice();
}
function trophySpot(index,time){
 if(index>=8){
  // The guard of honour: two rows either side of the lane, the keeper at the end.
  const j=index-8,x=index===16?TROPHY_LANE+1.6:j%2?TROPHY_LANE-1.6:TROPHY_LANE+1.6,z=index===16?-14:-6-Math.floor(j/2)*2;
  return[x,z];
 }
 const [leave,spot]=trophyRoute(index),start=[TROPHY_LANE,trophyStart(index)];
 return polyTravel(index===0?[start,spot]:[start,leave,spot],TROPHY_SPEED,time);
}
export function trophyArrival(index){
 const [leave,spot]=trophyRoute(index),z0=trophyStart(index);
 const L=index===0?Math.abs(spot[1]-z0):Math.abs(leave[1]-z0)+Math.hypot(spot[0]-leave[0],spot[1]-leave[1]);
 return(L+1)/TROPHY_SPEED+.25;
}
// The jump each teammate does when the cup goes up (captured clips).
export const TROPHY_JOY=Object.freeze(['excited','cheering','rallying','pump','excited','cheering','rallying']);
function trophyActor(index,time){
 const p=trophySpot(index,time),before=trophySpot(index,time-.05),after=trophySpot(index,time+.05);
 const moving=Math.hypot(after[0]-before[0],after[1]-before[1])>.006;
 const travelHeading=moving?Math.atan2(-(after[0]-before[0]),-(after[1]-before[1])):null;
 if(index>=8){
  // Applauding the winners through, turned to the lane.
  const heading=facing(p,[TROPHY_LANE,p[1]+1.2]);
  return{x:p[0],z:p[1],heading,pose:'applause',s:time+index*.13,weight:smooth((time-.15-(index%3)*.1)/.5)};
 }
 if(index===0){
  // Walks up the lane (+z), takes the cup, turns to the cameras, lifts it.
  const stand=Math.PI,heading=time<TR.turn?(travelHeading??stand):angleMix(stand,FACE_CAMERA,smooth((time-TR.turn)/.7));
  const s=time-TR.grab;
  return{x:p[0],z:p[1],heading,pose:s>-.3?'trophy_lift':null,s,weight:s>-.3?smooth((s+.3)/.3):0};
 }
 const done=trophyArrival(index),turn=smooth((time-done+.4)/.8);
 const heading=travelHeading!==null&&turn<1?angleMix(travelHeading,FACE_CAMERA,turn):FACE_CAMERA;
 const joy=time-(TR.lift+.12+(index%3)*.09);
 if(joy>0)return{x:p[0],z:p[1],heading,pose:TROPHY_JOY[(index-1)%TROPHY_JOY.length],s:joy,weight:smooth(joy/.35)};
 // Clapping the captain up to the cup once in line.
 return{x:p[0],z:p[1],heading,pose:'applause',s:time-done,weight:smooth((time-done)/.6)*.9};
}
// Where the cup is: 0 = on the pedestal, 1 = in the captain's hands.
export function trophyGrip(time){return smooth((time-TR.grab-.42)/.22)}
export function ceremonyActor(kind,index,time,{draw=false}={}){
 if(kind==='trophy')return trophyActor(index,time);
 return kind==='kickoff'?kickoffActor(index,time):fulltimeActor(index,time,draw);
}

// ---- cameras: calm TV shots, no zoom; one cut in the middle of each scene.
// V21.406 (Basti: "vor dem Spiel soll man in einer Szene das Stadion sehen"):
// the stadium shot runs 4 s (V21.410, was 3.4), from high above the roof down into the bowl.
export const CEREMONY_ARENA_SHOT=4;
export const CEREMONY_CUT=Object.freeze({kickoff:6,fulltime:5,trophy:TROPHY_TIMES.cut});
export function ceremonyEnd(kind){return kind==='trophy'?TROPHY_TIMES.end:10.4}
const CEREMONY_END=10.4;
export function ceremonyCamera(kind,time){
 if(kind==='kickoff'){
  // V21.382: the scene opens high in the corner of the floodlit arena.
  if(time<CEREMONY_ARENA_SHOT)return stadiumIntroCamera(time,CEREMONY_ARENA_SHOT);
  if(time<CEREMONY_CUT.kickoff)return{position:[3.6-time*.22,1.72,0],target:[16,1.32,0],fov:38,phase:'walkout'};
  const z=mix(-9.6,9.2,smooth((time-CEREMONY_CUT.kickoff)/(CEREMONY_END-CEREMONY_CUT.kickoff)));
  // Aimed below the line so the players stand above the match card.
  return{position:[21.5,2.9,z],target:[9,-.55,z*.94],fov:31,phase:'lineup'};
 }
 if(kind==='trophy')return trophyCamera(time);
 const [gx,gz]=FULLTIME_CENTRE;
 // V21.439: a wide TV picture of the whole scene first (aimed a little below
 // the players: the result card covers the lower third), then a low camera
 // in front of the winners walking to the main stand.
 if(time<CEREMONY_CUT.fulltime)return{position:[gx+22-time*.5,7-time*.25,gz-5+time*1.1],target:[gx-.5,-1.2,gz-1+time*.3],fov:34,phase:'final-whistle'};
 const u=time-CEREMONY_CUT.fulltime,[fx,fz]=FULLTIME_FANS,come=smooth(u/4.2);
 return{position:[fx+11.5-u*.3,2.2,fz+2.2-u*.4],target:[mix(fx-6,fx-1,come),mix(.2,.55,come),fz+.6-u*.2],fov:32,phase:'to-the-fans'};
}

// V21.444 cup presentation: low in front of the stage down the guard of
// honour, then the whole team before the backdrop, then a slow low arc round
// the captain as the cup goes up (aimed high: the result card sits below).
function trophyCamera(time){
 if(time<TR.cut){const u=smooth(time/TR.cut);
  return{position:[29.2-u*.8,2.3,mix(-13.5,-5.5,u)],target:[TROPHY_LANE-.4,1.1,mix(-10.5,-2.5,u)],fov:38,phase:'guard-of-honour'}}
 if(time<TR.close){const u=smooth((time-TR.cut)/(TR.close-TR.cut));
  return{position:[29.6-u*1.4,2.35-u*.2,mix(-1.6,-.6,u)],target:[mix(19.4,20.2,u),mix(1.35,1.7,u),mix(-.6,-.3,u)],fov:38,phase:'winners-stage'}}
 const u=time-TR.close,a=mix(-.5,.3,smooth(u/(TR.end-TR.close))),[cx,cz]=TROPHY_CAPTAIN_SPOT,r=mix(6.2,5.4,smooth(u/3));
 return{position:[cx+Math.cos(a)*r,mix(1.05,1.35,smooth(u/4)),cz+Math.sin(a)*r],target:[cx-.8,mix(1.75,2.1,smooth(u/1.2)),cz+Math.sin(a)*.5],fov:46,phase:'trophy-lift'};
}

// ---- goal replay: high behind the goal, through the net, at half speed.
export const REPLAY_RATE=.55;
export function replayWindow(shotTime,goalArrival){return{from:shotTime-.9,to:goalArrival+.7}}
export function replayCamera(direction,shooter,ball){
 const d=direction===-1?-1:1,w=p=>[p[0]*d,p[1],p[2]*d];
 return{position:w([mix(shooter[0]*.25,ball[0]*.3,.5),5.6,-61]),target:w([mix(shooter[0],ball[0],.45),mix(.9,ball[1],.3),mix(shooter[1],-52.5,.3)]),fov:33,phase:'replay'};
}

