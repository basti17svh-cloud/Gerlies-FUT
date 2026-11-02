/*
 * Footera V21.341 — Cinematic Matchday: 36 authored attack stories.
 * These are PRESENTATION scripts. They never decide possession, scores,
 * assists, saves or the match RNG. The simulator owns every outcome.
 * Routes, passes, motion accents and the 5.4s boot contact share one clock.
 */
const definitions=[
 // Six coordinated passing attacks with individually timed return lanes.
 ['pivot_diamond_escape_left','combination',9,'normal','short',[6,7,4,3,0],'long',[-5,-40],'pivot'],
 ['double_wall_fivepass_right','combination',9,'low_driven','short',[7,2,6,3,7,0],'long',[3,-42],'heel'],
 ['false_nine_scoop_link','combination',8,'finesse','loft',[6,0,7,3,0],'long',[-2,-39],'trap'],
 ['six_touch_rondo_finish','combination',10,'normal','short',[7,6,3,1,7,0],'long',[4,-41],'pivot'],
 ['vertical_ladder_left','combination',9,'power','through',[4,6,1,3,0],'medium',[-6,-38],'burst'],
 ['tempo_break_right','combination',9,'normal','short',[5,7,2,3,0],'medium',[5,-42],'trap'],
 // The through-ball sequences hold real staggered runs and offside-safe lanes.
 ['blindside_seam_left','through',10,'low_driven','through',[7,6,1,3,0],'medium',[-8,-44],'burst'],
 ['backheel_split_right','through',9,'normal','through',[5,2,3,7,0],'medium',[7,-43],'heel'],
 ['crossfield_channel_ball','through',8,'chip','loft',[4,6,7,2,0],'long',[10,-40],'trap'],
 ['centerback_draw_then_slip','through',9,'normal','through',[6,3,7,0],'medium',[1,-45],'pivot'],
 ['press_break_diagonal','through',9,'low_driven','through',[7,3,2,6,0],'medium',[-4,-40],'burst'],
 ['last_man_reverse_run','through',9,'chip','through',[6,1,7,3,0],'medium',[-6,-43],'pivot'],
 // Third-man support, underlaps, wide deliveries and late far-post arrivals.
 ['underlap_scissor_left','overlap',9,'normal','driven',[6,1,4,3,0],'long',[-4,-43],'cut'],
 ['touchline_flyby_right','overlap',9,'low_driven','driven',[7,2,5,0],'medium',[3,-47],'burst'],
 ['wide_third_man_cross','overlap',9,'header','cross',[6,3,2,5,0],'long',[-5,-47],'trap'],
 ['backpost_late_arrival','lowcross',9,'volley','cross',[7,5,2,3,0],'medium',[6,-46],'cut'],
 ['overlap_double_exchange','overlap',10,'normal','driven',[6,1,4,1,0],'long',[-2,-45],'heel'],
 ['wing_decoy_switch','switch',8,'header','loft',[7,2,6,1,4,0],'long',[-7,-46],'pivot'],
 // The striker takes possession EARLY so visible skills precede the finish.
 ['stutter_then_burst_left','dribble',10,'normal','short',[6,1,0],'medium',[-7,-41],'feint'],
 ['inside_out_lane_cut_right','dribble',10,'finesse','short',[7,2,0],'medium',[6,-41],'cut'],
 ['shield_spin_release','dribble',9,'power','short',[6,3,0],'medium',[-2,-39],'pivot'],
 ['nutmeg_exit_channel','dribble',9,'low_driven','short',[7,3,0],'medium',[5,-43],'burst'],
 ['double_body_fake_left','dribble',10,'finesse','short',[6,1,3,0],'medium',[-6,-39],'feint'],
 ['heel_hook_escape_right','dribble',9,'normal','short',[7,2,3,0],'medium',[8,-41],'heel'],
 // Late runners receive real square passes rather than an instant shot cut.
 ['byline_stop_and_pull','cutback',9,'normal','driven',[6,1,4,0],'medium',[-1,-41],'trap'],
 ['box_edge_late_trailer','cutback',9,'power','driven',[7,2,3,6,0],'long',[4,-34],'burst'],
 ['low_square_dummy','cutback',9,'low_driven','driven',[6,3,1,0],'medium',[-4,-46],'feint'],
 ['corner_drag_curl','cutback',9,'finesse','driven',[7,2,5,0],'medium',[7,-39],'cut'],
 ['first_time_setback','cutback',9,'volley','driven',[6,1,3,7,0],'long',[-3,-37],'heel'],
 ['two_wave_pullback','cutback',10,'normal','driven',[7,3,2,5,0],'long',[2,-43],'pivot'],
 // Distance shots vary by incoming setup, shooting foot/lane and run-through.
 ['halfspace_set_and_drive','distance',10,'power','short',[6,3,7,0],'medium',[-5,-29],'trap'],
 ['long_switch_to_rocket','distance',9,'power','loft',[7,5,6,0],'long',[7,-31],'pivot'],
 ['sprint_stop_screamer','distance',9,'power','short',[6,1,0],'medium',[-9,-32],'cut'],
 ['edge_halfvolley_left','distance',9,'volley','loft',[7,3,6,0],'medium',[-3,-32],'trap'],
 ['trailing_midfielder_hit','distance',9,'power','short',[6,7,3,0],'medium',[2,-30],'burst'],
 ['reverse_layoff_curler','distance',9,'finesse','short',[7,2,3,6,0],'long',[6,-34],'heel']
];
export const CINEMATIC_SCENE_IDS=Object.freeze(definitions.map(d=>d[0]));
export const SCENARIO_CATALOG=Object.freeze(definitions.map(d=>Object.freeze([d[0],d[1],d[2],d[3],d[4],Object.freeze([...d[5]]),d[6]])));
export const SCENARIO_CREATORS=Object.freeze(Object.fromEntries(definitions.map(d=>[d[0],d[5].at(-2)])));
const STARTS=[[-1,-22],[-21,-21],[21,-21],[-3,-20],[-28,-18],[28,-18],[-11,-17],[11,-17]];
const FINALS=[[0,-40],[-17,-39],[17,-39],[-1,-35],[-23,-45],[23,-45],[-7,-32],[7,-32]];
const round=x=>Math.round(x*1000)/1000;
const hash=s=>{let h=2166136261;for(const c of s)h=Math.imul(h^c.charCodeAt(0),16777619);return h>>>0};
const smooth=x=>{x=Math.max(0,Math.min(1,x));return x*x*(3-2*x)};
const clocks={
 2:[[.46,1.05],[1.42,2.18]],
 3:[[.38,1.05],[1.65,2.38],[3.77,4.79]],
 4:[[.38,1.01],[1.38,2.07],[2.47,3.22],[3.77,4.79]],
 5:[[.36,.88],[1.14,1.67],[1.96,2.51],[2.82,3.43],[3.87,4.79]],
 6:[[.33,.75],[.92,1.37],[1.55,2.00],[2.20,2.66],[2.86,3.38],[3.88,4.80]]
};
const dribbleClocks={
 2:[[.37,.95],[1.31,2.15]],
 3:[[.29,.75],[.92,1.42],[1.66,2.34]]
};
function makeStory(d){
 const [id,family,,,delivery,order,,[sx,sz],cue]=d,seed=hash(id);
 const side=id.endsWith('_left')?-1:id.endsWith('_right')?1:((seed&1)?1:-1);
 const routes={};
 // All involved players (and two decoy runners) receive continuous cubic tracks.
 const involved=new Set([0,...order,3,side<0?2:1]);
 for(const actor of involved){
  const start=STARTS[actor],goal=FINALS[actor];
  if(actor===0){
   const startX=round(sx+side*(family==='dribble'?6.5:4.1)+(seed%3-1)*1.35);
   const startZ=family==='distance'?sz+11.5:sz+17.5;
   const feint=family==='dribble'?side*4.2:side*1.35;
   routes[actor]=[[0,round(startX),round(startZ)],
    [1.28,round(startX-side*.9),round(startZ-3.3)],
    [2.60,round(sx+feint),round(sz+(family==='dribble'?11.4:10.2))],
    [3.64,round(sx-side*(family==='dribble'?2.1:1.2)),round(sz+5.9)],
    [4.65,round(sx+side*.65),round(sz+1.95)],
    [5.4,sx,sz]];
  }else{
   const sequenceIndex=order.indexOf(actor),receiverLast=order.lastIndexOf(actor),
    extra=(seed>>>((actor%4)*4))%7-3,wide=actor===4||actor===5;
   const goX=goal[0]+side*(extra*.65)+side*(family==='switch'?2.5:0);
   const goZ=goal[1]+(family==='distance'?6:0)+(wide?1.5:0);
   const push=sequenceIndex<0?1.5:0;
   routes[actor]=[[0,round(start[0]+extra*.22),round(start[1]+(actor%3)*.55)],
    [1.24,round(start[0]+(goX-start[0])*.25+side*(actor%2?1:-1)*1.1),round(start[1]+(goZ-start[1])*.26+push)],
    [2.78,round(start[0]+(goX-start[0])*.58-side*1.1),round(start[1]+(goZ-start[1])*.57)],
    [4.34,round(goX+side*(receiverLast>=0?.8:1.2)),round(goZ+2.6)],
    [5.4,round(goX),round(goZ)]];
  }
 }
 // Leave the last .6s free for striker control, the plant, then real shot.
 // A dribble has a 2.9s solo possession window and visibly bends its route.
 const beats=(family==='dribble'?dribbleClocks[order.length-1]:clocks[order.length-1]);
 if(!beats)throw new Error('Unsupported cinematic pass sequence: '+id);
 // Optional elevated switch, cross and lob deliveries follow existing playBall arcs.
 return Object.freeze({routes:Object.freeze(routes),beats:Object.freeze(beats.map(pair=>Object.freeze([...pair]))),direct:false,cue,side,delivery});
}
export const SCENARIO_STORIES=Object.freeze(Object.fromEntries(definitions.map(d=>[d[0],makeStory(d)])));
const clamp=x=>Math.max(0,Math.min(1,x));
/* Tiny additive joints — never repositions the ball, boots or player root. */
export function applyScenarioPose(actor,sequence,index,time){
 const story=SCENARIO_STORIES[sequence];if(!actor||!story)return 0;
 const plan=definitions.find(d=>d[0]===sequence);
 const carrier=plan[1]==='dribble'?0:plan[5].at(-2);
 if(index!==carrier)return 0;
 const begin=plan[1]==='dribble'?2.40:1.55,end=plan[1]==='dribble'?3.55:2.75;
 const w=smooth((time-begin)/.24)*(1-smooth((time-(end-.25))/.25));
 if(w<=0)return 0;
 const side=story.side,phase=(time-begin)/(end-begin),pulse=Math.sin(Math.PI*clamp(phase));
 switch(story.cue){
  case 'feint':
   actor.upper.rotation.z+=side*.21*w*Math.cos(phase*Math.PI*2);
   actor.legs[0].rotation.z-=side*.17*pulse*w;actor.arms[1].rotation.z+=side*.22*w;break;
  case 'cut':
   actor.upper.rotation.y+=side*.29*w;actor.rig.rotation.z+=side*.045*w;
   actor.knees[1].rotation.x-=.21*pulse*w;break;
  case 'pivot':
   actor.upper.rotation.y-=side*.32*w;actor.upper.rotation.z+=side*.12*w;
   actor.arms[0].rotation.z-=.28*w;actor.arms[1].rotation.z+=.28*w;break;
  case 'heel':
   actor.legs[1].rotation.x-=.29*pulse*w;actor.ankles[1].rotation.z+=side*.37*w;
   actor.upper.rotation.y+=side*.16*w;break;
  case 'burst':
   actor.upper.rotation.x-=.19*w;actor.arms[0].rotation.x+=.25*pulse*w;
   actor.arms[1].rotation.x-=.25*pulse*w;break;
  case 'trap':
   actor.knees[1].rotation.x-=.23*pulse*w;actor.ankles[1].rotation.x+=.28*pulse*w;
   actor.upper.rotation.x+=.13*w;break;
 }
 return w;
}
