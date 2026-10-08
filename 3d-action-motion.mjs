/* Footera Motion 2.0 – readable full-body reactions for broadcast-size footballers.
 * Additive to the connected football skeleton and Quaternius CC0 human clips.
 * No frame history, allocations, camera edits, ball edits or match decisions.
 */
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,Number.isFinite(v)?v:0));
const smooth=x=>{x=clamp(x);return x*x*(3-2*x)};
const span=(t,a,b)=>smooth((t-a)/(b-a));
const pulse=(t,a,b,c,d)=>span(t,a,b)*(1-span(t,c,d));
export const ATHLETIC_FLIGHT_VERSION='21.40-contextual-attack';

// Timings tied to existing Footera sequence; local pelvis remains in the old
// event path, just the visual center-of-mass moves as the keeper pushes off.
export function divingBodyTrajectory(time,kind='goal',action='classic',side=1){
 const saved=kind==='big_chance_saved',low=action==='low_reflex';
 const rush=action==='rush_spread';
 const takeoff=pulse(time,5.54,5.90,6.68,7.09);
 const flight=pulse(time,5.85,6.18,6.78,7.31);
 const landing=pulse(time,6.78,7.14,7.88,8.55);
 const push=pulse(time,5.67,5.98,6.19,6.61);
 // Post-save grounded asymmetric rise; begins after the confirmed ball impact.
 const recover=kind==='big_chance_saved'?pulse(time,7.82,8.13,8.55,9.08):0;
 // A goal-bound strike beats the keeper: preserve the shorter reach.
 const reach=saved?(rush?.18:low?.26:action==='fingertip'?.30:.34):.22;
 const vertical=(low?.065:.14)*flight-(low?.025:.055)*landing;
 return{takeoff,flight,landing,push,recover,
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
 if(!inverted)return{plant:0,redirect:0,feint:0,side:0};
 const side=sequence.endsWith('right')?1:-1;
 const onset=sequence.startsWith('double_feint')?2.95:sequence.startsWith('near_post_cut')?3.13:sequence.startsWith('cut_inside')?2.5:2.67;
 const plant=pulse(time,onset-.32,onset+.23,onset+.54,onset+1.01);
 const redirect=pulse(time,onset-.01,onset+.48,onset+.96,onset+1.6);
 // A double-feint has its own opposite first body check before planting.
 const feint=sequence.startsWith('double_feint')?pulse(time,1.87,2.16,2.48,2.77):0;
 return{plant,redirect,feint,side};
}
export function applyVisibleInvertedCut(p,time,sequence){
 const m=invertedCutBodyTrajectory(time,sequence);
 if(m.plant<.001&&m.redirect<.001&&m.feint<.001)return m;
 const bank=m.side*(.30*m.plant+.085*m.redirect);
 p.rig.rotation.z+=bank*.46-m.side*.12*m.feint;
 p.upper.rotation.z+=bank*.64-m.side*.26*m.feint;
 p.rig.rotation.y+=m.side*.16*m.feint;
 p.upper.rotation.y+=-m.side*(.21*m.plant-.13*m.redirect)+m.side*.27*m.feint;
 p.upper.rotation.x+=-.10*m.plant+.08*m.redirect;
 // Compress outside leg into ground, lift trailing leg into next stride.
 const outside=m.side>0?1:0,inside=1-outside;
 p.legs[outside].rotation.z+=-m.side*.16*m.plant;
 p.knees[outside].rotation.x-=.23*m.plant;
 p.knees[inside].rotation.x-=.20*m.feint;
 p.ankles[outside].rotation.z+=-m.side*.075*m.plant;
 p.legs[inside].rotation.x-=.17*m.redirect;
 p.knees[inside].rotation.x-=.10*m.redirect;
 p.arms[outside].rotation.z+=m.side*(.30*m.plant-.19*m.feint);
 p.arms[inside].rotation.z-=m.side*.29*m.plant;
 p.arms[outside].rotation.x+=.20*m.redirect;
 p.arms[inside].rotation.x-=.14*m.redirect;
 p.rig.position.y-=.038*m.plant+.012*m.feint;
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
 p.upper.rotation.x+=-.13*m.push+.10*m.flight+.19*m.landing-.08*m.recover;
 p.upper.rotation.y+=Math.sign(impactX||1)*.12*m.recover;
 p.knees[0].rotation.x-=.20*m.recover;
 p.legs[1].rotation.x+=.16*m.recover;
 p.arms[0].rotation.z-=.13*m.recover;
 p.arms[1].rotation.z+=.13*m.recover;
 return m;
}

/*
 * Sequence-specific body language for the *existing* action pathways.
 * Athlete joints move, never the match-authoritative ball, root route or goal.
 * All phases fade before the 5.4s shot / before a wide 3.41s pass release.
 */
export function contextualAttackTrajectory(time,sequence='central',role=0){
 const t=Number.isFinite(time)?time:0;
 const left=sequence.endsWith('_left'),right=sequence.endsWith('_right');
 const side=left?-1:right?1:1;
 let step=0,reverse=0,drive=0,kind='none';
 if(role===1){
  const wide=/^(?:wing|cutback|early_cross|low_cross|near_post|far_post|volley)_(?:left|right)$/.test(sequence);
  if(wide){
   kind=sequence.startsWith('cutback')?'cutback':'wing';
   step=pulse(t,1.84,2.24,2.58,2.93);
   reverse=pulse(t,2.61,2.88,3.04,3.36);
   drive=pulse(t,.82,1.25,2.23,2.74);
  }
 }else if(role===0){
  if(sequence==='dribble'){
   kind='dribble';
   step=pulse(t,1.65,1.96,2.47,2.82);
   reverse=pulse(t,2.72,3.03,3.56,3.94);
   drive=pulse(t,3.66,3.98,4.37,4.83);
  }else if(sequence==='one_two'){
   kind='one_two';step=pulse(t,2.19,2.54,2.89,3.18);
   reverse=pulse(t,3.04,3.34,3.72,4.02);
   drive=pulse(t,3.20,3.59,4.22,4.79);
  }else if(['through_ball','one_on_one','low_driven_duel','counter_central','counter_left','counter_right','chip_one_on_one','chip_counter','high_press'].includes(sequence)){
   kind='burst';
   step=pulse(t,2.38,2.75,3.08,3.49);
   drive=pulse(t,3.02,3.47,4.20,4.79);
  }else if(['halfspace_left','halfspace_right','finesse_halfspace','second_ball','long_shot','power_drive'].includes(sequence)){
   kind='setup';
   step=pulse(t,2.57,2.95,3.39,3.73);
   reverse=pulse(t,3.55,3.89,4.21,4.71);
  }
 }
 return{kind,side,step,reverse,drive};
}
export function applyContextualAttackerMotion(p,time,sequence,role=0){
 const m=contextualAttackTrajectory(time,sequence,role);
 if(m.step<.001&&m.reverse<.001&&m.drive<.001)return m;
 const s=m.side,first=s>0?1:0,other=1-first;
 // Two opposing planted steps, shoulder counter-rotation and push-off.
 p.rig.rotation.z+=s*(.12*m.step-.09*m.reverse);
 p.upper.rotation.z+=s*(.25*m.step-.22*m.reverse+.07*m.drive);
 p.upper.rotation.y+=s*(.22*m.step-.24*m.reverse);
 p.upper.rotation.x+=-.08*m.step+.09*m.reverse-.14*m.drive;
 p.legs[first].rotation.z-=s*.15*m.step;
 p.knees[first].rotation.x-=.24*m.step;
 p.ankles[first].rotation.z-=s*.075*m.step;
 p.legs[other].rotation.z+=s*.12*m.reverse;
 p.knees[other].rotation.x-=.21*m.reverse;
 p.legs[other].rotation.x-=.15*m.drive;
 p.ankles[other].rotation.x+=.12*m.drive;
 p.arms[first].rotation.z+=s*(.21*m.step-.13*m.reverse);
 p.arms[other].rotation.z-=s*(.19*m.step-.16*m.reverse);
 p.arms[first].rotation.x-=.20*m.drive;
 p.arms[other].rotation.x+=.16*m.drive;
 p.rig.position.y-=.015*m.step+.012*m.reverse;
 return m;
}
