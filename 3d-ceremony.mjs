/* V21.226 match ceremonies (Basti 2026-10-22): the walk-out before kick-off,
 * the final whistle (winners celebrate, losers go down, then handshakes) and
 * the goal replay camera. Presentation only: no match state, no RNG.
 * Field-local metres, ceremonies always use attack direction 1, so the
 * broadcast side (main stand, tunnel) is +x. Heading 0 faces -z. */
export const CEREMONY_VERSION='21.226-ceremonies';
export const CEREMONY_KINDS=Object.freeze(['kickoff','fulltime']);
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const smooth=v=>{const x=clamp(v);return x*x*(3-2*x)};
const mix=(a,b,t)=>a+(b-a)*t;
const angleMix=(a,b,t)=>a+Math.atan2(Math.sin(b-a),Math.cos(b-a))*t;
const facing=(from,to)=>Math.atan2(-(to[0]-from[0]),-(to[1]-from[1]));
export const FACE_CAMERA=-Math.PI/2;
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

// ---- final whistle: a ring of winners round G, each loser on the same ray.
export const FULLTIME_CENTRE=Object.freeze([9,-1]);
function ray(j){const a=j*Math.PI/4+.3,r=6.5+(j%3)*1.1;return{c:Math.cos(a),s:Math.sin(a),r}}
const at=(d,c,s)=>[FULLTIME_CENTRE[0]+d*c,FULLTIME_CENTRE[1]+d*s];
const LOSER_POSES=['kneel_down','hands_on_knees','hands_on_head','kneel_down'];
function between(a,b,t0,t1,time){const u=smooth((time-t0)/(t1-t0));return[mix(a[0],b[0],u),mix(a[1],b[1],u)]}
function fulltimeSpot(index,time,draw){
 if(index===16)return[FULLTIME_CENTRE[0]-12,FULLTIME_CENTRE[1]-4];
 const winner=index<8,j=winner?index:index-8,{c,s,r}=ray(j);
 if(!winner){const from=at(r,c,s),meet=at(r*.5+.42,c,s);return between(from,meet,4.9,7.2,time)}
 const start=[FULLTIME_CENTRE[0]+r*.62*Math.cos(Math.atan2(s,c)+.55),FULLTIME_CENTRE[1]+r*.62*Math.sin(Math.atan2(s,c)+.55)];
 const meet=at(r*.5-.42,c,s);
 if(draw)return between(start,meet,4.9,7.2,time);
 const huddle=between(start,at(1.25,c,s),0,2.2,time);
 return time<5.2?huddle:between(at(1.25,c,s),meet,5.2,7.2,time);
}
function fulltimeActor(index,time,draw){
 const p=fulltimeSpot(index,time,draw),before=fulltimeSpot(index,time-.05,draw),after=fulltimeSpot(index,time+.05,draw);
 const moving=Math.hypot(after[0]-before[0],after[1]-before[1])>.006;
 const winner=index<8,j=winner?index:index-8;
 if(index===16)return{x:p[0],z:p[1],heading:facing(p,FULLTIME_CENTRE)+Math.PI,pose:'kneel_down',s:time,weight:1};
 const partner=fulltimeSpot(winner?index+8:index-8,time,draw),centre=FULLTIME_CENTRE;
 let heading,pose=null,s=0,weight=1;
 if(moving)heading=Math.atan2(-(after[0]-before[0]),-(after[1]-before[1]));
 else if(time>=7)heading=facing(p,partner);
 else if(winner&&!draw)heading=facing(p,centre);
 else heading=facing(centre,p);
 if(time<4.9&&!(winner&&!draw&&time<1.6)){
  pose=draw?'hands_on_hips':winner?'cheer':LOSER_POSES[j%4];
  s=winner&&!draw?time-1.6:time;weight=1-smooth((time-(winner&&!draw?4.95:4.5))/.45);
 }else if(time>=6.9&&time<8.9){pose='handshake';s=time-6.9;weight=smooth((time-6.9)/.3)*(1-smooth((time-8.5)/.4))}
 else if(time>=8.6){pose='applause';s=time-8.6;weight=smooth((time-8.6)/.4)}
 return{x:p[0],z:p[1],heading,pose,s,weight};
}
export function ceremonyActor(kind,index,time,{draw=false}={}){
 return kind==='kickoff'?kickoffActor(index,time):fulltimeActor(index,time,draw);
}

// ---- cameras: calm TV shots, no zoom; one cut in the middle of each scene.
export const CEREMONY_CUT=Object.freeze({kickoff:4.4,fulltime:5});
export function ceremonyCamera(kind,time){
 if(kind==='kickoff'){
  if(time<CEREMONY_CUT.kickoff)return{position:[3.6-time*.22,1.72,0],target:[16,1.32,0],fov:38,phase:'walkout'};
  const z=mix(-9.6,9.2,smooth((time-CEREMONY_CUT.kickoff)/6));
  // Aimed below the line so the players stand above the match card.
  return{position:[21.5,2.9,z],target:[9,-.55,z*.94],fov:31,phase:'lineup'};
 }
 const [gx,gz]=FULLTIME_CENTRE;
 // Aimed a little below the players: the result card covers the lower third.
 if(time<CEREMONY_CUT.fulltime)return{position:[gx+15,3.6,gz-4+time*.4],target:[gx,-.4,gz],fov:30,phase:'final-whistle'};
 const u=time-CEREMONY_CUT.fulltime;
 return{position:[gx+16,3.4,gz+5-u*.5],target:[gx,-.3,gz],fov:32,phase:'handshakes'};
}

// ---- goal replay: high behind the goal, through the net, at half speed.
export const REPLAY_RATE=.55;
export function replayWindow(shotTime,goalArrival){return{from:shotTime-.9,to:goalArrival+.7}}
export function replayCamera(direction,shooter,ball){
 const d=direction===-1?-1:1,w=p=>[p[0]*d,p[1],p[2]*d];
 return{position:w([mix(shooter[0]*.25,ball[0]*.3,.5),5.6,-61]),target:w([mix(shooter[0],ball[0],.45),mix(.9,ball[1],.3),mix(shooter[1],-52.5,.3)]),fov:33,phase:'replay'};
}

