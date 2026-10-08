/* Footera Motion 2.0 V21.41 — expressive full-squad locomotion on instanced actors.
 * These athletes already have a joint hierarchy, driven as instanced meshes.
 * No new meshes, skinned actors, GPU draw calls, RNG or animation allocations.
 * Animation-only: never move ball, player route, keeper, result or clock.
 */
const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,Number.isFinite(x)?x:0));
const smooth=x=>{x=clamp(x);return x*x*(3-2*x)};
export const SQUAD_MOTION_VERSION='21.41-full-squad';

// Called after base gait, before contextual defending; existing foot IK remains authoritative.
export function applySquadLocomotion(p,index,time,speed,turn,stride,acceleration,ballDistance=99){
 const v=clamp(speed),movement=smooth(v/.34),sprint=smooth((v-.27)/.55);
 const idle=1-smooth(v/.18),push=clamp(acceleration),brake=clamp(-acceleration);
 const bank=clamp(turn*5.5,-.75,.75)*movement;
 const scan=Math.sin(time*(.86+(index%5)*.067)+index*1.13);
 // Only nearby defenders jockey for the ball. No synchronized squad crouching.
 const close=index>=8?smooth((12-clamp(ballDistance,0,99))/9)*smooth((time-1.5)/.85)*(1-smooth((time-5.26)/.65)):0;
 // Counterturn, shoulder movement, acceleration and braking remain readable
 // from the broadcast camera, without changing the global athlete route.
 p.upper.rotation.x+=-.13*sprint*movement-.073*push*movement+.11*brake*movement+.025*Math.sin(stride)*movement+.018*idle*Math.sin(time*1.35+index);
 p.upper.rotation.y+=bank*.32+scan*.085*idle+.065*Math.cos(stride)*movement-.12*close*Math.sin(time*1.7+index*.3);
 p.upper.rotation.z+=bank*.31+Math.sin(stride)*.092*movement+.07*close*scan;
 p.rig.rotation.z+=bank*.17+Math.sin(stride)*.037*movement;
 p.rig.rotation.y-=bank*.10+Math.cos(stride)*.024*movement;
 for(let i=0;i<2;i++){
  const side=i?1:-1,footWave=Math.sin(stride+i*Math.PI);
  const airborne=p.gait[i].support?0:1;
  // Support boot retains the original IK angle; only the free leg flexes.
  p.legs[i].rotation.x+=footWave*(.09+.07*sprint)*movement*airborne;
  p.knees[i].rotation.x-=airborne*(.13+.17*sprint)*movement+close*.075;
  p.ankles[i].rotation.x+=airborne*.13*movement;
  p.legs[i].rotation.z+=side*(close*.095+brake*.07*movement)+bank*.12*airborne;
  p.arms[i].rotation.x+=-side*Math.sin(stride)*(.22+.22*sprint)*movement+side*Math.cos(stride)*.075*movement+idle*.04*scan;
  p.arms[i].rotation.z+=side*(.09*movement+.17*close+.11*brake*movement);
  p.elbows[i].rotation.x+=.12*movement+.13*sprint+.10*close;
 }
}
