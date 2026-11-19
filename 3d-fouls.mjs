/* Footera V21.479 Fouls (Basti 2026-11-19: "Fouls ... nicht für ein Foul nur
 * 1 Szene ... Mehrere Aktionen und verschiedene Positionen mit dem
 * anschließenden Freistoß. Mal am 16er mal 20 Meter entfernt mal an der
 * Außenlinie mit einer Flanke").
 *
 * A foul scene is a ball_won scene: the attacker dribbles at the defence, a
 * defender stops him illegally, the attacker goes down, the referee whistles,
 * comes over and (sometimes) shows a card. The free kick or penalty that
 * follows is its own scene; the zone of the foul decides where it is taken.
 *
 * Sequence: 'defense_foul_<kind>_<zone>[_wide]', '_wide' mirrors the scene.
 * Local frame as every other scene: the attacked goal is at z -52.5, x is
 * left (-) / right (+). Pure functions of time, no RNG, presentation only.
 */
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const smooth=v=>{v=clamp(v);return v*v*(3-2*v)};
const easeOut=v=>{v=clamp(v);return 1-(1-v)*(1-v)};
const mix=(a,b,u)=>a+(b-a)*u;
const add=(a,b,k=1)=>[a[0]+b[0]*k,a[1]+b[1]*k];
const lerp2=(a,b,u)=>[mix(a[0],b[0],u),mix(a[1],b[1],u)];

// Late slide, a leg stuck out from the side, a slide from behind,
// a shirt pull while running alongside, a push in the back.
export const FOUL_KINDS=Object.freeze(['slide','trip','behind','pull','push']);
// Where the attacker goes down. restart/variant = what follows.
export const FOUL_ZONES=Object.freeze({
 arc:Object.freeze({spot:[-1.5,-35.4],from:[-7,-23],restart:'free_kick',variant:'arc'}),       // 16er-Kante, ~17 m
 center:Object.freeze({spot:[0,-29.5],from:[-5.5,-18],restart:'free_kick',variant:''}),         // zentral, ~23 m
 side:Object.freeze({spot:[-9.5,-31],from:[-17,-20.5],restart:'free_kick',variant:'side'}),     // halblinks, ~23 m
 far:Object.freeze({spot:[-3,-23.2],from:[-10,-12],restart:'free_kick',variant:'far'}),         // ~29 m
 corner:Object.freeze({spot:[-15,-35],from:[-22.5,-24],restart:'free_kick',variant:'edge'}),    // Strafraumecke
 flank:Object.freeze({spot:[-29,-38],from:[-30.5,-24.5],restart:'free_kick',variant:'cross'}),  // an der Außenlinie: Flanke
 box:Object.freeze({spot:[-7,-44],from:[-14.5,-33],restart:'penalty',variant:''})               // im Strafraum: Elfmeter
});
export const FOUL_ZONE_IDS=Object.freeze(Object.keys(FOUL_ZONES));
export const FOUL_SCENES=Object.freeze(FOUL_KINDS.flatMap(k=>FOUL_ZONE_IDS.flatMap(z=>['defense_foul_'+k+'_'+z,'defense_foul_'+k+'_'+z+'_wide'])));
const FOUL_SET=new Set(FOUL_SCENES);
export const isFoulScene=seq=>FOUL_SET.has(String(seq));
export function parseFoul(seq){
 if(!isFoulScene(seq))return null;
 const parts=String(seq).slice(13).split('_'),mirror=parts.at(-1)==='wide';if(mirror)parts.pop();
 return{kind:parts[0],zone:parts[1],mirror};
}
export const foulSequence=(kind,zone,mirror=false)=>{const s='defense_foul_'+kind+'_'+zone+(mirror?'_wide':'');return isFoulScene(s)?s:null};
// The fouler goes to ground in these two.
export const isSlideFoul=seq=>/^defense_foul_(slide|behind)_/.test(String(seq));
export const FOUL_CONTACT=4.4;
// Referee: whistle just after contact, then he comes over; the card goes up.
export const FOUL_TIMES=Object.freeze({contact:4.4,whistle:4.62,arrive:6.3,card:6.55,cardDown:8.7,end:10.4});
export const REFEREE_ACTOR=15;
export const REFEREE_KIT=Object.freeze({shirt:'#17191d',shirtSecondary:'#d8ff3e',pattern:'solid',shorts:'#111316',socks:'#111316'});

const geometryCache=new Map();
function geometry(zone){
 if(geometryCache.has(zone))return geometryCache.get(zone);
 const z=FOUL_ZONES[zone];if(!z)return null;
 const S=z.spot,C0=z.from,dx=S[0]-C0[0],dz=S[1]-C0[1],l=Math.hypot(dx,dz),d=[dx/l,dz/l];
 // Perpendicular towards the middle of the pitch (+x on the left half).
 let n=[-d[1],d[0]];if(n[0]<0)n=[-n[0],-n[1]];
 // The ball runs .45 m ahead of the attacker and a little to his outside.
 const A1=add(add(S,d,-.45),n,-.15);
 const P0=add(add(C0,n,7),d,-5.5),P1=add(P0,d,3.2);
 const g={S,C0,d,n,l,A1,P0,P1};geometryCache.set(zone,g);return g;
}
// Dribbling pace: accelerate over the first quarter, then a steady run INTO
// the foul (never a stop just before the contact).
function runShare(u){const a=.25;u=clamp(u);return(u<a?u*u/(2*a):u-a/2)/(1-a/2)}
function attackerAt(g,t){
 if(t<=FOUL_CONTACT)return lerp2(g.C0,g.A1,runShare(t/FOUL_CONTACT));
 // Taken out: he tumbles on along his run and lies there.
 return add(g.A1,g.d,1.7*easeOut((t-FOUL_CONTACT)/.95));
}
// Where the fouler is relative to the attacker: at the start and at contact.
const OFFSETS={
 slide:{start:[5.5,5.5],contact:[-.1,.95],after:.95},
 trip:{start:[6,3],contact:[.3,.75],after:1.3},
 behind:{start:[-9,2.5],contact:[-1.15,.42],after:1.1},
 pull:{start:[-7.5,2.2],contact:[-.45,.82],after:1.5},
 push:{start:[-6.8,1.2],contact:[-.95,.18],after:1.4}
};
const rel=(g,o)=>[g.d[0]*o[0]+g.n[0]*o[1],g.d[1]*o[0]+g.n[1]*o[1]];
function foulerAt(g,kind,t){
 const o=OFFSETS[kind]||OFFSETS.trip;
 if(t<=FOUL_CONTACT){
  // He moves with the attacker and closes the gap; shirt pull and push hold
  // on to him for the last metres (the offset is reached early).
  const close=kind==='pull'||kind==='push'?smooth(t/3.5):smooth(t/FOUL_CONTACT);
  const a=attackerAt(g,t),off=lerp2(rel(g,o.start),rel(g,o.contact),close);
  return add(a,off);
 }
 const c=add(g.A1,rel(g,o.contact)),stop=add(c,g.d,o.after*easeOut((t-FOUL_CONTACT)/.9));
 // Then he walks a couple of steps towards the referee to protest.
 const ref=refereeAt(g,FOUL_TIMES.arrive),walk=smooth((t-6.1)/1.6);
 const to=[ref[0]-stop[0],ref[1]-stop[1]],len=Math.hypot(...to)||1,step=Math.min(2.4,Math.max(0,len-2));
 return add(stop,[to[0]/len,to[1]/len],step*walk);
}
function refereeAt(g,t){
 // Behind the play on the inside, then he hurries to the spot of the foul.
 const R0=add(add(g.S,g.d,-15),g.n,11),R1=add(add(g.S,g.d,-9),g.n,8.5),R2=add(add(g.S,g.d,-1.2),g.n,4.6);
 if(t<=FOUL_CONTACT)return lerp2(R0,R1,smooth(t/FOUL_CONTACT));
 return lerp2(R1,R2,smooth((t-FOUL_TIMES.whistle+.15)/(FOUL_TIMES.arrive-FOUL_TIMES.whistle+.15)));
}
function defenderLine(g,j,t){
 // The rest of the back line holds its shape, then a few come over.
 const base=[-21+j*6,-40+(j%3)*4];
 // Keep them clear of the attacker's lane and the fouler.
 for(let k=0;k<=8;k++){
  const u=k/8,p=lerp2(add(g.C0,g.d,-2),add(g.A1,g.d,3),u),dx=base[0]-p[0],dz=base[1]-p[1],dd=Math.hypot(dx,dz);
  if(dd<4.2){const s=dd>.01?[dx/dd,dz/dd]:[g.n[0],g.n[1]];base[0]=p[0]+s[0]*4.2;base[1]=p[1]+s[1]*4.2}
 }
 base[0]=clamp(base[0],-33,33);base[1]=clamp(base[1],-50.5,-8);
 const drift=smooth((t-4.9)/2.6)*(j%2?.28:.16),to=g.S,dx=to[0]-base[0],dz=to[1]-base[1],d=Math.hypot(dx,dz);
 const go=Math.max(0,d-5.5)*drift;
 return[base[0]+dx/(d||1)*go,base[1]+dz/(d||1)*go];
}
const orient=(p,mirror)=>mirror?[-p[0],p[1]]:p;
export function foulPosition(index,time,seq){
 const f=parseFoul(seq);if(!f)return null;const g=geometry(f.zone),t=clamp(time,0,10.4);
 if(index===0)return orient(attackerAt(g,t),f.mirror);
 if(index===1)return orient(lerp2(g.P0,g.P1,smooth(t/3.15)),f.mirror);
 if(index===8)return orient(foulerAt(g,f.kind,t),f.mirror);
 if(index===REFEREE_ACTOR)return orient(refereeAt(g,t),f.mirror);
 if(index>=9&&index<=14)return orient(defenderLine(g,index-9,t),f.mirror);
 return null;
}
// Attackers 2-7 keep their usual runs, but stop once the whistle has gone.
export function foulSettleTime(time){
 if(time<=FOUL_TIMES.whistle)return time;
 // Same pace at the whistle, then they ease up over about a second.
 const k=1.1;return FOUL_TIMES.whistle+k*(1-Math.exp(-(time-FOUL_TIMES.whistle)/k));
}
export function foulBall(time,seq){
 const f=parseFoul(seq);if(!f)return null;const g=geometry(f.zone),t=clamp(time,0,10.4);
 const lead=a=>add(add(a,g.d,.45),g.n,.15);
 const release=.65,receive=1.42;let p;
 if(t<release){const q=lerp2(g.P0,g.P1,smooth(t/3.15));p=[...add(q,g.d,.45),0];}
 else if(t<receive){
  const q=lerp2(g.P0,g.P1,smooth(release/3.15)),from=add(q,g.d,.45),to=lead(attackerAt(g,receive)),u=(t-release)/(receive-release);
  p=[...lerp2(from,to,u),.28*Math.sin(Math.PI*u)];
 }else if(t<=FOUL_CONTACT){
  // Close control: a touch every stride pushes the ball a little ahead.
  const a=attackerAt(g,t),touch=.22*Math.abs(Math.sin(Math.PI*(t-receive)*1.55));
  p=[...add(lead(a),g.d,touch),0];
 }else{
  // Knocked loose: it runs on away from the fouler and stops.
  const away=[g.d[0]-g.n[0]*.38,g.d[1]-g.n[1]*.38],l=Math.hypot(...away),run=f.kind==='pull'||f.kind==='push'?2.4:3.4;
  const start=lead(g.A1);p=[...add(start,[away[0]/l,away[1]/l],run*easeOut((t-FOUL_CONTACT)/1.35)),0];
 }
 const out=[p[0],.14+p[2],p[1]];if(f.mirror)out[0]=-out[0];return out;
}
// Where the camera should look: the duel, then the spot of the foul.
export function foulFocus(time,seq){
 const f=parseFoul(seq);if(!f)return null;const g=geometry(f.zone);
 const a=attackerAt(g,Math.min(time,FOUL_CONTACT)),settle=smooth((time-FOUL_CONTACT)/1.6);
 const spot=add(add(g.S,g.n,1.6),g.d,-.6),p=lerp2(a,spot,settle);
 return orient(p,f.mirror);
}
// The card close-up: referee and fouler in one picture.
export function foulCloseUp(time,seq){
 const f=parseFoul(seq);if(!f)return null;const g=geometry(f.zone);
 const ref=refereeAt(g,time),foul=foulerAt(g,f.kind,time);
 return{referee:orient(ref,f.mirror),fouler:orient(foul,f.mirror),mid:orient(lerp2(ref,foul,.5),f.mirror)};
}
// The fall: Mixamo trip at the contact, a moment longer on the turf.
export const FOUL_FALL=Object.freeze({contact:FOUL_CONTACT,hold:.9});
// Arm targets (local scene metres, before mirroring) for the shirt pull and the push.
export function foulGrab(time,seq){
 const f=parseFoul(seq);if(!f||!['pull','push'].includes(f.kind))return null;
 const from=f.kind==='pull'?3.15:3.85,to=f.kind==='pull'?4.55:4.5;
 const w=smooth((time-from)/.3)*(1-smooth((time-to)/.25));if(w<=.001)return null;
 const g=geometry(f.zone),a=attackerAt(g,time);
 // Pull: the near side of his shirt at the shoulder blade; push: the middle of his back.
 const p=f.kind==='pull'?add(add(a,g.n,.2),g.d,-.12):add(a,g.d,-.18);
 return{target:[...orient(p,f.mirror)],height:f.kind==='pull'?1.32:1.28,weight:w,both:f.kind==='push'};
}
// Card colour from the event; up from FOUL_TIMES.card to cardDown.
export function cardRaise(time){return smooth((time-FOUL_TIMES.card)/.35)*(1-smooth((time-FOUL_TIMES.cardDown)/.4))}
// The referee's whistle arm and pointing gesture (free kick: towards the goal; penalty: to the spot).
export function refereeSignal(time){return smooth((time-FOUL_TIMES.whistle)/.25)*(1-smooth((time-FOUL_TIMES.whistle-1.1)/.4))}
