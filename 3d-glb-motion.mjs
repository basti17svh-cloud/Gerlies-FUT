/* Footera V21.72: deterministic secondary body motion for the imported GLB.
 * Display only; match state, ball flight, contact and camera remain authoritative.
 * Seek-safe at arbitrary timestamps, no randomness, no frame history.
 */
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,Number.isFinite(v)?v:0));
const smooth=v=>{v=clamp(v);return v*v*(3-2*v)};
const pulse=(t,a,b,c,d)=>smooth((t-a)/(b-a))*(1-smooth((t-c)/(d-c)));
export const GLB_MOTION_VERSION='21.72';
export function sampleGlbBodyMotion(time=0,input={},out={}){
 const t=clamp(time,0,10.4),effort=smooth(clamp(input.speed||0)),turn=clamp(input.turn||0,-.14,.14),
   acceleration=clamp(input.acceleration||0,-1,1),control=smooth(clamp(input.control||0)),
   stride=Number.isFinite(input.stride)?input.stride:0,
   sequence=String(input.sequence||'central'),finish=String(input.finish||'normal'),
   side=sequence.endsWith('_left')?-1:1,
   cutting=/^(?:inside|cut_inside|double_feint|near_post_cut)_/.test(sequence),
   cut=cutting?pulse(t,2.73,2.98,3.23,3.69):0,
   gather=pulse(t,4.75,5.01,5.20,5.45),follow=pulse(t,5.42,5.63,5.94,6.33),
   shot=pulse(t,4.78,5.06,5.85,6.24),
   running=effort*(1-.90*shot),swing=Math.sin(stride),counter=Math.cos(stride),
   lean=clamp(-.065*running*(1+.4*Math.max(acceleration,0))+.045*running*Math.max(-acceleration,0),-.13,.08),
   bank=clamp(turn*.62,-.09,.09)*running,curl=finish==='finesse'?1:0;
 out.running=running;out.cut=cut;out.shot=shot;out.gather=gather;out.follow=follow;
 out.pelvisPitch=lean*.34;out.pelvisYaw=bank*.48+side*.105*cut;
 out.pelvisRoll=bank*.36+side*.035*cut;
 out.spinePitch=lean+.035*gather-.045*follow;
 out.spineYaw=-bank*.63+side*(-.12*cut+.105*curl*gather-.075*follow)+counter*.045*running*(1-.65*control);
 out.spineRoll=bank*.9+side*(-.075*cut+.055*gather+.065*follow)+swing*.012*running;
 out.headYaw=clamp(-out.spineYaw*.47+side*.055*curl*gather,-.22,.22);
 out.headPitch=clamp(.022*running-.035*gather+.03*follow,-.07,.07);
 out.headRoll=clamp(-out.spineRoll*.25,-.07,.07);
 out.armSwing=counter*.10*running*(1-.50*control);
 out.armBrace=.055*cut+.08*gather+.05*follow;
 out.kneeCushion=.032*running*(1-Math.max(0,acceleration))*(1-shot);
 out.leftToeLift=Math.max(0,swing)*.075*running*(1-shot);
 out.rightToeLift=Math.max(0,-swing)*.075*running*(1-shot);
 out.bob=Math.cos(stride*2)*.008*running*(1-shot);
 return out;
}
