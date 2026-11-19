/* V21.226 match ceremonies (Basti 2026-10-22): the walk-out before kick-off,
 * the final whistle (winners celebrate, losers go down, then handshakes) and
 * the goal replay camera. Presentation only: no match state, no RNG.
 * Field-local metres, ceremonies always use attack direction 1, so the
 * broadcast side (main stand, tunnel) is +x. Heading 0 faces -z. */
export const CEREMONY_VERSION='21.482-substitution';
// V21.444 'trophy': the cup presentation after a won tournament final.
// V21.484 'substitution': the change at the halfway line with the fourth official's board.
export const CEREMONY_KINDS=Object.freeze(['kickoff','fulltime','trophy','substitution']);
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
// ---- V21.484 substitution (Basti 2026-11-19: "Szenen beim Wechseln der Spieler").
// Play has stopped. The fourth official (actor 15, referee kit) stands at the
// touchline in front of the end of the dugout (Basti: "die Wechselzone an die
// Auswechselbank") and holds up the board (red: out, green: in).
// The substitute (actor 0) waits beside him, the player going off (actor 1)
// walks over, they slap hands and the new man jogs on while the other one
// heads to the bench, clapping to the fans. Everyone else waits on the pitch.
export const SUB_TIMES=Object.freeze({boardUp:.6,meet:5.15,clap:5.45,boardDown:7.4,cut:4.2,end:9.8});
export const SUB_OFFICIAL=Object.freeze([34.55,-3]);
// The substitute waits on the far side of the official and runs on that way;
// the player going off walks the other way to the bench, so they never cross.
// The player going off walks into the dugout (DUGOUT_SPOT, open towards the pitch).
const SUB_IN_WAIT=[34.1,-1.15],SUB_IN_MEET=[33.75,-1.62],SUB_OUT_MEET=[33.02,-2.2],SUB_IN_TO=[23.5,4.8],SUB_OUT_FROM=[25.2,-8.8],SUB_BENCH=[35.85,-7.25];
// In the substitution scene the manager stands at the far end of the dugout.
export const SUB_COACH_SPOT=Object.freeze([34.95,-9.7]);
export const SUB_BENCH_SEATS=Object.freeze([0,1,2,6,7]);
// Where the others wait while play is stopped: loosely spread, no line-up.
const SUB_WAITING=Object.freeze([null,null,[14,-12],[9,3],[18,10.5],[4,-6],[21,-1.5],[11,15],
 [16,-8.5],[7,-1],[12,9],[2,4],[19,2.5],[24,13],[6,-14],null,[1,47]]);
function walkTo(from,to,t0,t1,time){const u=smooth((time-t0)/(t1-t0));return[mix(from[0],to[0],u),mix(from[1],to[1],u)]}
// V21.487 Mehrfachwechsel (Basti: "4 Spieler gehen rein und 4 raus"): up to four
// pairs at once. Substitutes are actors 0,2,3,4, the players going off 1,5,6,7.
// The pairs stand in a row along the touchline; after the slap every
// substitute runs straight onto the pitch and the players going off walk in
// single file round the official into the dugout, filling it from the far end.
export const SUB_MAX=4;
export const SUB_IN_ACTORS=Object.freeze([0,2,3,4]),SUB_OUT_ACTORS=Object.freeze([1,5,6,7]);
const subCount=n=>Math.max(1,Math.min(SUB_MAX,Math.floor(Number(n)||1)));
const SUB_ROW=2.3,SUB_W=[33.5,-3.9],SUB_V=[35.4,-4.9];
const SUB_MULTI_SPOTS=[[35.9,-7.85],[35.85,-7],[35.8,-6.15],[35.75,-5.3]];
// With several players going off the substitutes on the bench keep to the far end.
export const SUB_BENCH_SEATS_MULTI=Object.freeze([0,1,2]);
export function subTimes(n=1){const c=subCount(n),T=SUB_TIMES;if(c===1)return T;
 return Object.freeze({...T,boardDown:T.boardDown+.3*(c-1),end:T.end+.7*(c-1)})}
function subPair(k,n){
 const c=subCount(n),T=subTimes(c);
 if(c===1)return{inWait:SUB_IN_WAIT,inMeet:SUB_IN_MEET,outMeet:SUB_OUT_MEET,inTo:SUB_IN_TO,outFrom:SUB_OUT_FROM,outPath:[SUB_OUT_MEET,SUB_BENCH],outStart:.15,meet:T.meet,clap:T.clap,end:T.end};
 const z=-2.2+SUB_ROW*k,outMeet=[33.02,z];
 return{inWait:[34.1,z+1.05],inMeet:[33.75,z+.6],outMeet,inTo:[24,z+SUB_ROW/2+.6],inPath:[[33.75,z+.6],[32.4,z+SUB_ROW/2],[24,z+SUB_ROW/2+.6]],outFrom:[25.2,-8.8+SUB_ROW*k],
  outPath:[outMeet,SUB_W,SUB_V,SUB_MULTI_SPOTS[k]],outStart:.6,meet:T.meet+.3*k,clap:T.clap+.3*k,end:T.end};
}
// A walk along a polyline: eased over the whole length, so it never jerks at a corner.
function subWalkPath(path,t0,t1,time){
 const lens=[];let total=0;for(let i=1;i<path.length;i++){const d=Math.hypot(path[i][0]-path[i-1][0],path[i][1]-path[i-1][1]);lens.push(d);total+=d}
 let s=smooth((time-t0)/(t1-t0))*total;
 for(let i=1;i<path.length;i++){const d=lens[i-1];if(s<=d||i===path.length-1){const u=d>0?Math.min(1,s/d):1;
  return{p:[mix(path[i-1][0],path[i][0],u),mix(path[i-1][1],path[i][1],u)],dir:facing(path[i-1],path[i])}}s-=d}
 return{p:path.at(-1),dir:0};
}
function substitutionActor(index,time,n=1){
 const c=subCount(n),T=subTimes(c);
 if(index===15)return{x:SUB_OFFICIAL[0],z:SUB_OFFICIAL[1],heading:Math.PI/2,pose:null,s:time,weight:0};
 const inK=SUB_IN_ACTORS.indexOf(index),outK=SUB_OUT_ACTORS.indexOf(index);
 if(inK>=0&&inK<c){const P=subPair(inK,c);
  // Bouncing on the spot, a step to his team-mate, then onto the pitch.
  const run=P.inPath&&time>=P.clap?subWalkPath(P.inPath,P.clap,P.end-.2,time):null;
  const p=run?run.p:time<P.clap?walkTo(P.inWait,P.inMeet,P.meet-.9,P.meet-.1,time):walkTo(P.inMeet,P.inTo,P.clap,P.end-.2,time);
  const heading=time<P.meet-.95?Math.PI/2-.3:time<P.clap+.1?facing(P.inMeet,P.outMeet):run?run.dir:facing(P.inMeet,P.inTo);
  const bounce=time<P.meet-1.1;
  return{x:p[0],z:p[1],heading,pose:bounce?'excited':null,s:time,weight:bounce?.55*smooth((P.meet-1.1-time)/.4):0};
 }
 if(outK>=0&&outK<c){const P=subPair(outK,c);
  let p,heading;
  if(time<P.clap){p=walkTo(P.outFrom,P.outMeet,0,P.meet-.05,time);heading=time<P.meet-.4?facing(P.outFrom,P.outMeet):facing(P.outMeet,P.inMeet)}
  else{const w=subWalkPath(P.outPath,P.clap+P.outStart,P.end,time);p=w.p;heading=time<P.clap+P.outStart?facing(P.outMeet,P.inMeet):w.dir}
  // Applause to the fans on the way off.
  const clap=smooth((time-P.clap-.9)/.5);
  return{x:p[0],z:p[1],heading,pose:clap>0?'waving':null,s:time-P.clap,weight:.7*clap};
 }
 const spot=SUB_WAITING[index]||[10,0],sway=.18*Math.sin(time*.55+index*1.7);
 return{x:spot[0]+sway,z:spot[1]+.4*Math.sin(time*.31+index),heading:facing(spot,SUB_OFFICIAL)+.4*Math.sin(index*2.3),pose:index===16?'hands_on_hips':null,s:time,weight:index===16?smooth(time/.6):0};
}
// The board goes up and comes down again; the hand slap at the meeting point.
export function subBoardRaise(time,n=1){const T=subTimes(n);return smooth((time-T.boardUp)/.5)*(1-smooth((time-T.boardDown)/.5))}
export function subHighFive(time,k=0,n=1){const P=subPair(k,n),u=(time-P.meet)/.55;return u<0||u>1?0:Math.sin(Math.PI*u)}
export function subHighFivePoint(k=0,n=1){const P=subPair(k,n);return[(P.inMeet[0]+P.outMeet[0])/2,(P.inMeet[1]+P.outMeet[1])/2]}
export const SUB_HIGH_FIVE=Object.freeze(subHighFivePoint(0,1));
export function ceremonyActor(kind,index,time,{draw=false,subs=1}={}){
 if(kind==='substitution')return substitutionActor(index,time,subs);
 if(kind==='trophy')return trophyActor(index,time);
 return kind==='kickoff'?kickoffActor(index,time):fulltimeActor(index,time,draw);
}

// ---- cameras: calm TV shots, no zoom; one cut in the middle of each scene.
// V21.406 (Basti: "vor dem Spiel soll man in einer Szene das Stadion sehen"):
// the stadium shot runs 4 s (V21.410, was 3.4), from high above the roof down into the bowl.
export const CEREMONY_ARENA_SHOT=4;
export const CEREMONY_CUT=Object.freeze({kickoff:6,fulltime:5,trophy:TROPHY_TIMES.cut,substitution:4.2});
export function ceremonyEnd(kind,{coach=false,subs=1}={}){return kind==='substitution'?subTimes(subs).end:kind==='trophy'?TROPHY_TIMES.end:kind==='kickoff'&&coach?COACH_SHOT.end:10.4}
// V21.470 (Basti 2026-11-17: "Der Trainer soll nach dem Einlaufen der Spieler kurz an der
// Auswechselbank eingeblendet werden und dann soll die Karte in dem Rahmen erscheinen"):
// after the line-up the picture cuts to the user's manager at the bench (main-stand
// touchline, +x), his Trainerkarte comes up in the action frame at COACH_SHOT.card.
export const COACH_SHOT=Object.freeze({start:10.4,card:11.2,end:15.4});
export const COACH_SPOT=Object.freeze([34.85,-6.4]);
export const DUGOUT_SPOT=Object.freeze([36.05,-7.4]);
// A slow push in from the pitch, a little from his left, aimed low: the card frame covers the lower third.
export function coachCamera(time){
 const u=smooth((time-COACH_SHOT.start)/(COACH_SHOT.end-COACH_SHOT.start)),[mx,mz]=COACH_SPOT;
 return{position:[mix(mx-5.6,mx-4.2,u),mix(1.8,1.6,u),mix(mz+2.9,mz+1.9,u)],target:[mx+.35,mix(.82,.95,u),mz-.35],fov:30,phase:'coach'};
}
const CEREMONY_END=10.4;
export function ceremonyCamera(kind,time,{subs=1}={}){
 if(kind==='kickoff'){
  // V21.382: the scene opens high in the corner of the floodlit arena.
  if(time<CEREMONY_ARENA_SHOT)return stadiumIntroCamera(time,CEREMONY_ARENA_SHOT);
  if(time<CEREMONY_CUT.kickoff)return{position:[3.6-time*.22,1.72,0],target:[16,1.32,0],fov:38,phase:'walkout'};
  const z=mix(-9.6,9.2,smooth((time-CEREMONY_CUT.kickoff)/(CEREMONY_END-CEREMONY_CUT.kickoff)));
  // Aimed below the line so the players stand above the match card.
  return{position:[21.5,2.9,z],target:[9,-.55,z*.94],fov:31,phase:'lineup'};
 }
 if(kind==='trophy')return trophyCamera(time);
 if(kind==='substitution')return substitutionCamera(time,subs);
 const [gx,gz]=FULLTIME_CENTRE;
 // V21.439: a wide TV picture of the whole scene first (aimed a little below
 // the players: the result card covers the lower third), then a low camera
 // in front of the winners walking to the main stand.
 if(time<CEREMONY_CUT.fulltime)return{position:[gx+22-time*.5,7-time*.25,gz-5+time*1.1],target:[gx-.5,-1.2,gz-1+time*.3],fov:34,phase:'final-whistle'};
 const u=time-CEREMONY_CUT.fulltime,[fx,fz]=FULLTIME_FANS,come=smooth(u/4.2);
 return{position:[fx+11.5-u*.3,2.2,fz+2.2-u*.4],target:[mix(fx-6,fx-1,come),mix(.2,.55,come),fz+.6-u*.2],fov:32,phase:'to-the-fans'};
}

// V21.484: first from the pitch over the player walking off towards the board,
// then low at the line for the hand slap, following the substitute onto the pitch.
function substitutionCamera(time,n=1){
 const c=subCount(n),T=subTimes(c),P=subPair(0,c);
 // V21.487 with several pairs the picture goes wider and moves along the row.
 const row=(c-1)*SUB_ROW,dz=row*.5,wide=(c-1)*1.6,low=c>1?.3:0;
 // From the pitch towards the bench: the official with the board in front of the dugout.
 if(time<T.cut){const u=smooth(time/T.cut);
  return{position:[mix(25,26.6,u)-row*.2,mix(3.4,2.9,u),mix(5.6,4.4,u)+dz+row*.25],target:[mix(33.6,34.2,u),1.2-low,mix(-4.9,-3.6,u)+dz*.8],fov:34+wide,phase:'substitution-board'}}
 // Lower, the hand slap; then the substitutes run past while the others walk into the dugout.
 const go=smooth((time-T.clap)/(T.end-.6-T.clap)),runner=time<P.clap?P.inMeet:walkTo(P.inMeet,P.inTo,P.clap,P.end-.2,time);
 // Aim between the substitute and the dugout so both stay in the picture.
 return{position:[mix(27.8,20.5,go),mix(1.9,2.6,go),mix(5.2,10.5,go)+dz*.7],target:[mix(33.4,mix(runner[0],35.5,.3),go),mix(1.35,1.1,go)-low,mix(-2.2+dz,mix(runner[1],-7,.3),go)],fov:mix(32,38,go)+wide,phase:'substitution'};
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

