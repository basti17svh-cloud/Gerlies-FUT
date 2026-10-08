/* Footera Motion 2.0 – readable full-body reactions for broadcast-size footballers.
 * Additive to the connected football skeleton and Quaternius CC0 human clips.
 * No frame history, allocations, camera edits, ball edits or match decisions.
 */
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,Number.isFinite(v)?v:0));
const smooth=x=>{x=clamp(x);return x*x*(3-2*x)};
const span=(t,a,b)=>smooth((t-a)/(b-a));
const pulse=(t,a,b,c,d)=>span(t,a,b)*(1-span(t,c,d));
export const ATHLETIC_FLIGHT_VERSION='21.38.2-pilot';

// Timings tied to existing Footera sequence; local pelvis remains in the old
// event path, just the visual center-of-mass moves as the keeper pushes off.
export function divingBodyTrajectory(time,kind='goal',action='classic',side=1){
 const saved=kind==='big_chance_saved',low=action==='low_reflex';
 const rush=action==='rush_spread';
 const takeoff=pulse(time,5.54,5.90,6.68,7.09);
 const flight=pulse(time,5.85,6.18,6.78,7.31);
 const landing=pulse(time,6.78,7.14,7.88,8.55);
 const push=pulse(time,5.67,5.98,6.19,6.61);
 // A goal-bound strike beats the keeper: preserve the shorter reach.
 const reach=saved?(rush?.18:low?.26:action==='fingertip'?.30:.34):.22;
 const vertical=(low?.065:.14)*flight-(low?.025:.055)*landing;
 return{takeoff,flight,landing,push,
  lateral:Math.sign(side||1)*reach*(.3*takeoff+.7*flight),
  lift:vertical+.085*push,
  lean:Math.sign(side||1)*(.22*flight+.12*landing),
  arms:(.21*flight+.14*push)*(saved?1:.78)};
}
// A planted outside foot resists inertia; hips lead and shoulders counterturn.
// It affects the already-visible inverted winger run only, fading WELL before
// the fixed 5.4 second authored striking contact and simulation ball release.
export function invertedCutBodyTrajectory(time,sequence){
 const inverted=/^(?:inside|cut_inside|double_feint|near_post_cut)_(?:left|right)$/.test(sequence);
 if(!inverted)return{plant:0,redirect:0,side:0};
 const side=sequence.endsWith('right')?1:-1;
 const onset=sequence.startsWith('double_feint')?2.95:sequence.startsWith('near_post_cut')?3.13:sequence.startsWith('cut_inside')?2.5:2.67;
 const plant=pulse(time,onset-.32,onset+.23,onset+.54,onset+1.01);
 const redirect=pulse(time,onset-.01,onset+.48,onset+.96,onset+1.6);
 return{plant,redirect,side};
}
export function applyVisibleInvertedCut(p,time,sequence){
 const m=invertedCutBodyTrajectory(time,sequence);
 if(m.plant<.001&&m.redirect<.001)return m;
 const bank=m.side*(.30*m.plant+.085*m.redirect);
 p.rig.rotation.z+=bank*.46;
 p.upper.rotation.z+=bank*.64;
 p.upper.rotation.y+=-m.side*(.21*m.plant-.13*m.redirect);
 p.upper.rotation.x+=-.10*m.plant+.08*m.redirect;
 // Compress outside leg into ground, lift trailing leg into next stride.
 const outside=m.side>0?1:0,inside=1-outside;
 p.legs[outside].rotation.z+=-m.side*.16*m.plant;
 p.knees[outside].rotation.x-=.23*m.plant;
 p.ankles[outside].rotation.z+=-m.side*.075*m.plant;
 p.legs[inside].rotation.x-=.17*m.redirect;
 p.knees[inside].rotation.x-=.10*m.redirect;
 p.arms[outside].rotation.z+=m.side*.30*m.plant;
 p.arms[inside].rotation.z-=m.side*.29*m.plant;
 p.arms[outside].rotation.x+=.20*m.redirect;
 p.arms[inside].rotation.x-=.14*m.redirect;
 p.rig.position.y-=.038*m.plant;
 return m;
}
export function applyVisibleKeeperFlight(p,time,type,action,impactX){
 const side=Math.sign(impactX)||1;
 const m=divingBodyTrajectory(time,type,action,side);
 // Keep original goalkeeper pose/contact solver: only add additive COM motion.
 p.root.position.x+=m.lateral;
 p.root.position.y+=m.lift;
 p.shadow.position.y-=m.lift; // shadow remains glued to pitch
 p.rig.rotation.z+=m.lean;
 p.legs[0].rotation.x+=-.24*m.push+.34*m.flight;
 p.legs[1].rotation.x+=-.20*m.push-.39*m.flight;
 p.knees[0].rotation.x+=-.36*m.push+.21*m.flight-.18*m.landing;
 p.knees[1].rotation.x+=-.30*m.push-.23*m.flight-.26*m.landing;
 p.arms[0].rotation.z-=m.arms;
 p.arms[1].rotation.z+=m.arms;
 p.upper.rotation.x+=-.13*m.push+.10*m.flight+.19*m.landing;
 return m;
}
