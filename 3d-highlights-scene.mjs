import {sampleSkill,applySkillPose,applyFootedPose} from './3d-skill-actions.mjs?v=21303';
import {createMatchBallSurface,MATCH_BALL_NAME,MATCH_BALL_RADIUS} from './3d-match-ball.mjs?v=21270';
import {EXTENDED_SEQUENCES,extendedKind,extendedTiming,extendedSeconds,extendedPosition,extendedContact,extendedBall,extendedControl,extendedCamera,extendedSetPieceCamera,extendedPhase,poseExtendedActor} from './3d-extended-match.mjs?v=21303';
import {createHighlightPlayback} from './3d-playback-clock.mjs?v=21226';
import {createDefensiveUnit} from './3d-defensive-unit.mjs?v=21155';
import {drawPerimeterBoard} from './3d-advertising.mjs?v=21229';
import * as THREE from './vendor/three/three.module.min.js';
import {createStableCameraTrack} from './3d-camera-director.mjs?v=2196';
import {isFooteraPlayerModelReady,isFooteraMakeHumanModelReady,mountFooteraPlayerModel,prepareFooteraPlayerModel,prepareFooteraMakeHumanModel} from './3d-player-prototype.mjs?v=21303';
import {prepareFooteraHumanModel,isFooteraHumanModelReady,loadFooteraCrestImage,footeraCrestImageNow} from './3d-player-human.mjs?v=21296';
import {createGlbClipLayer} from './3d-glb-clip-blend.mjs?v=2175';
import {applyBroadcastLook} from './3d-broadcast-look.mjs?v=21296';
import {footeraHDWanted} from './3d-player-hd.mjs?v=21296';
import {pickCelebration,celebrationDistance,applyCelebrationPose} from './3d-goal-celebration.mjs?v=21301';
import {ceremonyKind,ceremonyActor,ceremonyCamera,CEREMONY_CUT,replayCamera,replayWindow,REPLAY_RATE} from './3d-ceremony.mjs?v=21252';
export {ceremonyKind,replayWindow,REPLAY_RATE};
import {applyFootwork,applyShotApproach} from './3d-footwork-dynamics.mjs?v=21301';
export {prepareFooteraPlayerModel,prepareFooteraMakeHumanModel,isFooteraPlayerModelReady,prepareFooteraHumanModel,isFooteraHumanModelReady,loadFooteraCrestImage};
// V21.193: phones below the LOW line and players who chose the previous model
// (localStorage footera-3d-player-model=quaternius) keep the Quaternius squad.
// HALLOWEEN 2026 (30.10. 19:00 to 06.11. 19:00 Berlin): night stadium, pumpkins and event boards.
// window.__FOOTERA_HALLOWEEN=true/false overrides the date for previews and QA.
export function halloweenNight(at=Date.now()){
 const forced=typeof window!=='undefined'?window.__FOOTERA_HALLOWEEN:undefined;
 if(typeof location!=='undefined'&&/[?&]halloween=1\b/.test(location.search))return true;
 if(typeof forced==='boolean')return forced;
 return at>=Date.parse('2026-10-30T19:00:00+01:00')&&at<Date.parse('2026-11-06T19:00:00+01:00');
}
export function footeraHumanPlayersWanted(){
 try{if(['quaternius','legacy'].includes(globalThis.localStorage?.getItem('footera-3d-player-model')))return false}catch(_){}
 const memory=globalThis.navigator?.deviceMemory||8,cores=globalThis.navigator?.hardwareConcurrency||8;
 return !(memory<4||cores<=4);
}
import {buildSkinnedFootballer,createFootballKitAtlas,createSkeletonMotion} from './3d-rigged-footballer.mjs?v=21269';
import {sampleMotionClip,blendLocomotionClips,motionClipBlend} from './3d-motion-clips.mjs?v=2136';
import {animateAthleticRun,animateFootballFinish,animateGoalkeeperDive} from './3d-football-animation.mjs?v=2174';
import {applyRunningMocap,applyKeeperMocap} from './3d-mocap-runtime.mjs?v=21208';
import {applyGoalkeeperMotion,sampleGoalkeeperMotion,GOALKEEPER_MOTION_VERSION} from './3d-goalkeeper-biomechanics.mjs?v=21114';
import {applyVisibleInvertedCut,applyVisibleKeeperFlight,applyContextualAttackerMotion} from './3d-action-motion.mjs?v=2142';
import {applySquadLocomotion} from './3d-squad-motion.mjs?v=2174';
import {applyLabMotion,footballTouchSample,applyFootballControl,applyFootballStrike,applyFootballReception,applyFootballDefender} from './3d-motion-lab.mjs?v=2157';
import {touchContinuity,applyTouchContinuity,applyDeliveryContinuity,applyFinishContinuity,applyDefenderContinuity,applyReceptionContinuity} from './3d-action-continuity.mjs?v=21159';
import {isMotion2Sequence,sampleWinger2,applyWinger2,sampleDefender2,applyDefender2} from './3d-motion-2.mjs?v=2147';
import {applyMotion23} from './3d-motion-transition.mjs?v=21208';
import {sampleDefensiveDuels,applyDefensiveDuels,applyFinishBalance} from './3d-motion-duels.mjs?v=2154';
import {isContactDemo,stagedDefenderPosition,stagedBallPosition,applyContactStage,SLIDE_CONTACT,BLOCK_CONTACT,CONTACT_MOTION_VERSION} from './3d-duel-contact.mjs?v=2157';
import {isTrackingAction,createTrackingTimeline,applyTrackingPose,DEFENDER_TRACKING_VERSION} from './3d-defender-tracking.mjs?v=21301';
import {sampleFlowRun,ATTACK_FLOW_VERSION} from './3d-attack-flow.mjs?v=2160';
import {hasAuthoredFinish,getPlay,PLAYBOOK_IDS,playPosition,playBall,playCarrier,playTouches,playPassWindows,playReception,DEFENSIVE_SCENES,defensePosition,defenseBall} from './3d-playbook.mjs?v=21303';

// Frozen presentation data only. No live match, result callbacks or simulation RNG.
export const DURATION=10.4;
// The previous goal's celebration (and its event), so consecutive goals never
// repeat the same one while a replay of the same goal keeps its own.
let celebrationMemory={key:null,kind:null};
export const SHOT_TIME=5.4;
export const IMPACT_TIME=6.65;
const SHOT_DRAG=.6;
// Pace at the end of the drag flight, per metre of flight, per second.
const SHOT_EXIT=SHOT_DRAG*Math.exp(-SHOT_DRAG)/(1-Math.exp(-SHOT_DRAG))/(IMPACT_TIME-SHOT_TIME);
const KEEPER_LINE=-50.6;
// Where the shot crosses the keeper's line, and how long it then needs, at
// its exit pace, to reach its real end point (net, post, wide or the line).
export function shotGate(contact,impact){
 const dist=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1],a[2]-b[2]);
 if(impact[2]>=KEEPER_LINE||contact[2]<=KEEPER_LINE)return{gate:impact,delay:0,speed:SHOT_EXIT*dist(impact,contact)};
 const u=(KEEPER_LINE-contact[2])/(impact[2]-contact[2]),gate=contact.map((v,i)=>v+(impact[i]-v)*u);
 // Short headers still arrive briskly instead of floating into the net.
 const speed=Math.max(14,SHOT_EXIT*dist(gate,contact));
 return{gate,delay:dist(impact,gate)/speed,speed};
}
// Scene time at which the shot really arrives (net, post, wide); the keeper's
// line is always crossed at IMPACT_TIME.
export function shotArrival(type,sequence='central',finish='normal',placement=null){
 const seq=normalizeSequence(sequence),style=normalizeFinish(finish);
 return IMPACT_TIME+shotGate(shotContact(seq,style,placement),shotImpact(type,seq,style,placement)).delay;
}
// V21.196 PlayStyle+ signature moments: when the badge and the gold
// ball trail show. A finisher's window runs into the strike; a creator's
// covers the last pass of the move.
// The last fast ball of the build-up before the shot: the decisive pass.
export function lastPassWindow(sequence){
 const seq=normalizeSequence(sequence);
 if(extendedKind(seq)||DEFENSIVE_SCENES.includes(seq))return null;
 let last=null,run=null,prev=ballPosition('goal',.25,seq);
 for(let t=.3;t<=SHOT_TIME-.2+1e-9;t+=.05){
  const p=ballPosition('goal',t,seq),fast=Math.hypot(p[0]-prev[0],p[2]-prev[2])/.05>9;prev=p;
  if(fast){if(run)run[1]=t;else run=[t-.05,t]}else if(run){last=run;run=null}
 }
 return run||last;
}
export function signatureWindow(event,sequence=event?.sequence){
 const sig=event?.signature;if(!sig||event.type==='ball_won')return null;
 if(sig.who==='creator'){const pass=lastPassWindow(sequence);return pass?{badge:[pass[0]-.8,pass[1]+.9],trail:[pass[0],pass[1]+.1]}:null}
 if(extendedKind(normalizeSequence(sequence)))return{badge:[SHOT_TIME-1.4,SHOT_TIME+.9],trail:[SHOT_TIME,IMPACT_TIME+.1]};
 return{badge:[SHOT_TIME-1.4,SHOT_TIME+.9],trail:[SHOT_TIME,Math.min(IMPACT_TIME+.4,shotArrival(event.type,sequence,event.finish,event.shotPlacement||null)+.1)]};
}
export const REVEAL_TIME=6.8;
export const PITCH=Object.freeze({width:68,length:105,goalWidth:7.32,goalHeight:2.44});
export const MIN_CAMERA_DISTANCE=34;
// Identical physical range for all broadcast phases and event types.
// V21.205 (Basti): 34 m instead of 40 m, so players read bigger on a phone.
export const BROADCAST_CAMERA_DISTANCE=34;
const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
const mix=(a,b,t)=>a+(b-a)*clamp(t);
// Shortest way round from angle a to b.
const angleMix=(a,b,t)=>a+Math.atan2(Math.sin(b-a),Math.cos(b-a))*clamp(t);
const smooth=x=>{x=clamp(x);return x*x*(3-2*x)};
const lerp=(a,b,t)=>a.map((v,i)=>mix(v,b[i],t));
// Private stateless visual noise, including textures/crowd. Never Math.random.
const hash=n=>{n=Math.imul(n^0x9e3779b9,0x85ebca6b);n^=n>>>13;n=Math.imul(n,0xc2b2ae35);return ((n^(n>>>16))>>>0)/4294967296};
export const worldPosition=(p,direction=1)=>[p[0]*direction,p[1],p[2]*direction];
export function kickPose(time){
 const t=time-SHOT_TIME;
 if(t<-.5)return{hip:0,knee:0};
 if(t<-.22)return{hip:mix(0,-.8,(t+.5)/.28),knee:mix(0,-.8,(t+.5)/.28)};
 if(t<=0)return{hip:mix(-.8,.75,(t+.22)/.22),knee:mix(-.8,-.05,(t+.22)/.22)};
 if(t<.18)return{hip:mix(.75,1.08,t/.18),knee:-.05};
 return{hip:mix(1.08,0,(t-.18)/.45),knee:mix(-.05,0,(t-.18)/.45)};
}
// V21.208 (Basti): a real overhead kick for the human squad. The striker turns
// his back to goal, leans back, takes off and turns over his pelvis so the
// kicking leg meets the ball above him at SHOT_TIME (scissor: the other leg
// swings up first), lands on his back and is up again before the celebration.
// pitch: backwards body turn (rad), lift: pelvis height change (m), back:
// pelvis shift towards goal (m), legs: [thigh, knee] per leg (1 = kicking).
export function bicycleKickPose(time){
 const weight=smooth((time-4.9)/.12)*(1-smooth((time-6.72)/.2));
 if(weight<=0)return null;
 const over=smooth((time-5.04)/.4),land=smooth((time-5.48)/.3),sit=smooth((time-6.08)/.36),stand=smooth((time-6.4)/.42);
 const pitch=mix(.32*smooth((time-4.92)/.14)+1.36*over-.2*land,.05,sit)*(1-stand);
 const lift=mix(.14*Math.sin(Math.PI*clamp((time-5.02)/.52))-.8*land,-.45,sit)*(1-stand);
 const back=mix(.5*over+.3*land,.5,sit)*(1-stand);
 const swing=smooth((time-5.16)/.26),follow=smooth((time-SHOT_TIME)/.2),scissor=smooth((time-5.0)/.2),drop=smooth((time-5.2)/.2);
 const kick=[mix(mix(-.3,.75,swing),1.05,follow),mix(mix(-1.1,-.12,swing),-.4,follow)];
 const other=[mix(mix(0,1.25,scissor),-.1,drop),mix(-.9,-.3,drop)];
 // Sit up into a crouch, then stand: never pivot upright from flat on the back.
 const legs=[[mix(other[0],.65,land),mix(other[1],-1.05,land)],[mix(kick[0],.45,land),mix(kick[1],-.7,land)]]
  .map(([thigh,knee])=>[mix(thigh,1.5,sit)*(1-stand),mix(knee,-2.1,sit)*(1-stand)]);
 return{weight,pitch,lift,back,legs,arms:mix(mix(1.15,.6,land),.3,sit)*(1-stand)};
}
export function shotFootPosition(time=SHOT_TIME){
 const {hip,knee}=kickPose(time);
 return [.105,.94-.43*Math.cos(hip)-.43*Math.cos(hip+knee)-.045,-37-.43*Math.sin(hip)-.43*Math.sin(hip+knee)-.24];
}
export const PLAY_SEQUENCES=Object.freeze(['central','one_two','through_ball','dribble','wing_left','wing_right','cutback_left','cutback_right',
'inside_left','inside_right','cut_inside_left','cut_inside_right','double_feint_left','double_feint_right','near_post_cut_left','near_post_cut_right','low_cross_left','low_cross_right','chip_one_on_one','chip_counter','halfspace_left','halfspace_right','counter_central','counter_left','counter_right','diagonal_switch','long_shot','one_on_one',
'early_cross_left','early_cross_right','far_post_left','far_post_right','near_post_left','near_post_right','volley_left','volley_right','second_ball','high_press','finesse_halfspace','power_drive','low_driven_duel','bicycle',...DEFENSIVE_SCENES,...PLAYBOOK_IDS,...EXTENDED_SEQUENCES]);
export function normalizeSequence(value){return PLAY_SEQUENCES.includes(String(value))?String(value):'central'}

const VARIANTS=Object.freeze({
 inside_left:{base:'dribble',lane:-8,swerve:3},inside_right:{base:'dribble',lane:8,swerve:-3},
 halfspace_left:{base:'central',lane:-5,swerve:1.2},halfspace_right:{base:'central',lane:5,swerve:-1.2},
 counter_central:{base:'through_ball',depth:7},counter_left:{base:'wing_left',lane:-2,depth:6},counter_right:{base:'wing_right',lane:2,depth:6},
 diagonal_switch:{base:'wing_right'},
 long_shot:{base:'central',finishZ:-29.5},one_on_one:{base:'through_ball',depth:2},
 early_cross_left:{base:'wing_left'},early_cross_right:{base:'wing_right'},
 far_post_left:{base:'wing_left',endX:1.45},far_post_right:{base:'wing_right',endX:-1.45},
 near_post_left:{base:'wing_left',endX:-1.45},near_post_right:{base:'wing_right',endX:1.45},
 volley_left:{base:'wing_left',endX:-.6},volley_right:{base:'wing_right',endX:.6},
 second_ball:{base:'central',lane:2.5,swerve:-1},high_press:{base:'through_ball',depth:-3},
 finesse_halfspace:{base:'central',lane:-4,swerve:2},power_drive:{base:'central',finishZ:-31.5},
 low_driven_duel:{base:'through_ball',depth:3},bicycle:{base:'wing_left',endX:-.5},
  low_cross_left:{base:'wing_left'},low_cross_right:{base:'wing_right'},
  chip_one_on_one:{base:'through_ball',depth:2},chip_counter:{base:'through_ball',depth:7}
});
const baseSequence=sequence=>VARIANTS[sequence]?.base||sequence;
const INVERTED_SEQUENCES=new Set(['inside_left','inside_right','cut_inside_left','cut_inside_right','double_feint_left','double_feint_right','near_post_cut_left','near_post_cut_right']);
// Authored football runs retain their story beats but no longer stop at every
// waypoint: shared Hermite tangents keep forward velocity through the cut.
const INVERTED_FLOW_NODES=Object.freeze({
 feint:[[0,24,-24],[1.45,19,-28],[2.65,22,-31],[3.90,15,-35.5],[SHOT_TIME,9,-39]],
 cut:[[0,25,-23],[2.05,23,-31],[3.2,18,-34],[4.2,12,-37],[SHOT_TIME,9,-39]],
 near:[[0,22,-22],[2.0,18,-29],[3.65,12,-35.5],[SHOT_TIME,9,-39]],
 inside:[[0,23,-24.5],[2.25,21,-30.5],[3.85,14,-35.6],[SHOT_TIME,9,-39]]
});
function invertedRunPosition(sequence,time){
 const side=sequenceSide(sequence);
 const nodes=sequence.startsWith('double_feint')?INVERTED_FLOW_NODES.feint:
  sequence.startsWith('cut_inside')?INVERTED_FLOW_NODES.cut:
  sequence.startsWith('near_post_cut')?INVERTED_FLOW_NODES.near:INVERTED_FLOW_NODES.inside;
 const [x,z]=sampleFlowRun(nodes,time,-1.45,-2.0);
 return[side*x,z];
}
const FINISH_TYPES=Object.freeze(['normal','header','finesse','power','low_driven','volley','bicycle','chip']);
export const normalizeFinish=finish=>FINISH_TYPES.includes(finish)?finish:'normal';
const contactFor=finish=>finish==='header'?[.03,1.83,-37.14]:finish==='volley'?[.11,1.05,-37.25]:finish==='bicycle'?[.1,1.53,-37.22]:shotFootPosition();
function variantShift(variant,time){
 const u=smooth(clamp(time/SHOT_TIME)),v=variant||{};
 return [mix(Number(v.lane||0),Number(v.endX||0),u)+Number(v.swerve||0)*Math.sin(u*Math.PI),
 Number(v.depth||0)*(1-u)+(v.finishZ?v.finishZ+37:0)*u];
}

const sequenceSide=sequence=>sequence.endsWith('_left')?-1:sequence.endsWith('_right')?1:1;
// Inverted winger does not teleport to the central striker position for the strike.
// The contact point follows the winger's final position and shooting direction.
export function shotContact(sequence='central',finish='normal',placement=null){
 const style=normalizeFinish(finish),base=contactFor(style),seq=normalizeSequence(sequence);
 if(extendedKind(seq))return extendedContact(seq,base);
 if(!INVERTED_SEQUENCES.has(seq)&&!hasAuthoredFinish(seq))return base;
 const [x,z]=hasAuthoredFinish(seq)?playPosition(0,SHOT_TIME,getPlay(seq)):invertedRunPosition(seq,SHOT_TIME),impact=shotImpact('goal',seq,style,placement);
 const heading=Math.atan2(x-impact[0],z-impact[2]),dx=base[0],dz=base[2]+37;
 return[x+Math.cos(heading)*dx-Math.sin(heading)*dz,base[1],
        z+Math.sin(heading)*dx+Math.cos(heading)*dz];
}
function movingBall(a,b,u,arc=0){const t=smooth(u),p=lerp(a,b,t);p[1]=mix(a[1],b[1],t)+arc*Math.sin(clamp(u)*Math.PI);return p}
// Grounded ball ahead of the runner rather than trailing a free world-space sine wave.
function carriedBall(index,time,sequence,lead=.56){
 const [x,z]=runPosition(index,time,sequence),prev=runPosition(index,Math.max(0,time-.055),sequence),next=runPosition(index,Math.min(DURATION,time+.055),sequence);
 const dx=next[0]-prev[0],dz=next[1]-prev[1],length=Math.hypot(dx,dz),ux=length>.00001?dx/length:0,uz=length>.00001?dz/length:-1;
 const speed=clamp(length/.11/5),cycle=time*(8.3+speed*1.15),advance=clamp(lead-.055,.43,.61)+.032*Math.sin(cycle),side=.066*Math.sin(cycle+.5);
 return[x+ux*advance-uz*side,.14,z+uz*advance+ux*side];
}
// Opening supply pass: a true first action before the future carrier starts dribbling.
const ENTRY_RELEASE=.42,ENTRY_RECEIVE=1.12;
// Every scripted crossing move now has a genuine opening phase: supply,
// reception, a visible wide 1-v-1, and only then the cross.
const wideLaunch=sequence=>sequence.startsWith('early_cross_')?3.20:sequence.startsWith('low_cross_')?3.24:3.65;
const wideFeint=time=>{
 const entering=smooth((time-1.43)/.48),breaking=smooth((time-2.50)/.78);
 return 1.85*entering*(1-breaking);
};
function entryPassBall(time,sequence,source,target){
 if(time>=ENTRY_RECEIVE)return null;
 if(time<ENTRY_RELEASE)return carriedBall(source,time,sequence,.50);
 return movingBall(carriedBall(source,ENTRY_RELEASE,sequence,.50),
  carriedBall(target,ENTRY_RECEIVE,sequence,.54),
  (time-ENTRY_RELEASE)/(ENTRY_RECEIVE-ENTRY_RELEASE),.22);
}
// Close-control windows only. The ball detaches for real passes, crosses and shots.
export function controlCarrier(time,sequence='central'){
 if(extendedKind(sequence))return extendedControl(time,sequence);
 const seq=normalizeSequence(sequence),base=baseSequence(seq);
 const plan=getPlay(seq);
 if(plan){
  const index=playCarrier(plan,time);
  if(index<0)return{index,weight:0};
  let weight=Math.min(.94,.75+smooth((time-.05)/.6)*.15);
  for(const touch of playTouches(plan)){
   if(touch.receiver===index&&time>=touch.arrival)weight*=smooth((time-touch.arrival)/.16);
   if(touch.passer===index&&time<touch.release)weight*=smooth((touch.release-time)/.14);
  }
  return{index,weight:weight*(1-smooth((time-5.01)/.14))};
 }
 if(DEFENSIVE_SCENES.includes(seq)){
  if(time<.65)return{index:1,weight:.88*(1-smooth((time-.47)/.18))};
  if(time<1.42)return{index:-1,weight:0};
  const release=seq==='defense_interception'||seq==='defense_press_recovery'?3.2:4.03;
  if(time<release)return{index:0,weight:.83*smooth((time-1.42)/.18)*(1-smooth((time-release+.18)/.18))};
  return time>4.4?{index:8,weight:smooth((time-(seq.startsWith('defense_slide_tackle')?5.8:4.4))/.23)*.9}:{index:-1,weight:0};
 }
 const wideEntry=(base.startsWith('wing_')||base.startsWith('cutback_'))&&seq!=='diagonal_switch';
 if((wideEntry||INVERTED_SEQUENCES.has(seq)||seq==='dribble')&&time<ENTRY_RECEIVE){
  if(time>=ENTRY_RELEASE)return{index:-1,weight:0};
  return{index:wideEntry?(sequenceSide(seq==='bicycle'?base:seq)<0?5:4):1,weight:.88};
 }
 let index=-1,start=0,end=0;
 if(INVERTED_SEQUENCES.has(seq)){index=0;end=SHOT_TIME-.24}
  else if(seq.startsWith('low_cross_')){index=1;end=wideLaunch(seq)}
  else if(seq==='diagonal_switch'){index=1;start=2.5;end=3.65}
 else if(seq.startsWith('early_cross_')){index=1;end=wideLaunch(seq)}
 else if(['wing_left','wing_right','cutback_left','cutback_right'].includes(base)){index=1;end=3.65}
 else if(base==='dribble'){index=0;end=SHOT_TIME-.24}
 else if(base==='through_ball'){
  if(time<2.35){index=1;end=2.35}
  else if(time>=4.65){index=0;start=4.65;end=SHOT_TIME-.24}
 }
 else if(base==='one_two'&&time>=4.65){index=0;start=4.65;end=SHOT_TIME-.24}
 else if(base==='central'&&seq!=='second_ball'){index=0;start=3.1;end=SHOT_TIME-.24}
 if(index<0||time<start||time>=end)return{index:-1,weight:0};
 return{index,weight:smooth((time-start)/.16)*(1-smooth((time-end+.23)/.23))};
}
// V21.297: the same owner for the body (arms, dribble stance) but eased at
// the entry pass, where the ball itself has to switch in one frame.
export function carrierPoseState(time,sequence='central'){
 const c=controlCarrier(time,sequence);
 if(c.weight<=0||extendedKind(sequence))return c;
 const seq=normalizeSequence(sequence),base=baseSequence(seq);
 const entry=((base.startsWith('wing_')||base.startsWith('cutback_'))&&seq!=='diagonal_switch')||INVERTED_SEQUENCES.has(seq)||seq==='dribble';
 if(!entry)return c;
 const ease=time<ENTRY_RELEASE?1-smooth((time-ENTRY_RELEASE+.14)/.14):smooth((time-ENTRY_RECEIVE)/.2);
 return{index:c.index,weight:c.weight*ease};
}
// V21.195: an equaliser or winner from the 88th minute on ('winner',
// 'equaliser' or null), for the bigger celebration and its own headline.
export function lateGoalDrama(event){
 if(event?.type!=='goal'||!(Number(event.minute)>=88))return null;
 const home=Number(event.scoreBeforeHome),away=Number(event.scoreBeforeAway);
 if(!Number.isFinite(home)||!Number.isFinite(away))return null;
 const lead=(event.team==='away'?away-home:home-away)+1;
 return lead===1?'winner':lead===0?'equaliser':null;
}
// V21.195: a miss shown as a goal-line clearance heads for the goal, and a
// defender standing on the line blocks it just in front of the net.
export function lineClearImpact(sequence='central',finish='normal',placement=null){
 const sign=Math.sign(shotImpact('big_chance_missed',sequence,finish,placement)[0])||1;
 return[sign*1.55,normalizeFinish(finish)==='low_driven'?.3:.62,-52.05];
}
// The simulated goal/save/miss stays unchanged; only the visual shot lane varies.
// Event-specific finishing direction stays cosmetic: the simulation determines
// whether the exact same kick results in a goal, save, post or miss.
export function shotImpact(type,sequence='central',finish='normal',placement=null){
 const seq=normalizeSequence(sequence),style=normalizeFinish(finish);
 const inverted=INVERTED_SEQUENCES.has(seq),near=inverted&&seq.startsWith('near_post_cut');
 const sign=placement?(placement.side===-1?-1:1):(inverted?(near?sequenceSide(seq):-sequenceSide(seq)):1);
 const zone=placement?.zone||'channel';
 const x=type==='big_chance_saved'?(placement?(zone==='corner'?2.86:zone==='inside'?1.42:2.15):2.52):
  type==='shot_post'?3.52:type==='big_chance_missed'?(placement?(zone==='corner'?6.05:zone==='inside'?4.45:5.1):5.1):
  placement?(zone==='corner'?3.13:zone==='inside'?1.12:2.24):inverted?(near?2.48:3.12):2.65;
 let y=type==='big_chance_saved'?1.14:type==='shot_post'?1.25:type==='big_chance_missed'?1.5:
  inverted&&style==='finesse'?1.62:1.08;
 if(placement&&type!=='shot_post')y=placement.height==='high'?2.06:placement.height==='low'?.48:1.18;
 if(style==='low_driven')y=type==='shot_post'?.42:.32;
 else if(style==='header')y=type==='shot_post'?1.25:placement?.height==='high'?2.02:1.38;
 else if(style==='power')y=type==='shot_post'?1.25:placement?.height==='high'?1.92:.83;
 else if(style==='chip')y=type==='shot_post'?1.25:1.64;
 if(type==='goal'&&placement?.style){
  // V21.204 goal variants (Basti): in off the bar, in off the inside of the
  // post, or a screamer into the top corner. Same goal, different picture.
  if(placement.style==='crossbar_in')return[sign*1.85,2.3,-52.55];
  if(placement.style==='post_in')return[sign*3.46,Math.min(y,1.5),-52.55];
  if(placement.style==='top_corner')return[sign*3.22,2.2,-54.25];
 }
 return[sign*x,y,type==='big_chance_saved'?-50.6:type==='shot_post'?-52.5:type==='big_chance_missed'?-53.4:-54.25];
}
export const GOAL_STYLES=Object.freeze(['crossbar_in','post_in','top_corner']);
// After hitting the bar or the post the ball still needs a moment to reach the net.
export function goalNetDelay(placement=null){return placement?.style==='crossbar_in'?.62:placement?.style==='post_in'?.3:0}
// Where the ball meets the back of the net (for the net ripple).
export function goalNetPoint(sequence='central',finish='normal',placement=null){
 const impact=shotImpact('goal',sequence,finish,placement);
 if(placement?.style==='crossbar_in')return[impact[0]*.9,.55,-54.05];
 if(placement?.style==='post_in')return[impact[0]*.55,impact[1]*.7+.1,-54.15];
 return impact;
}
export function ballPosition(type,time,sequence='central',finish='normal',keeperAction='classic',placement=null){
 const seq=normalizeSequence(sequence),variant=VARIANTS[seq],style=normalizeFinish(finish);
 if(extendedKind(seq)&&time<SHOT_TIME)return extendedBall(time,seq,shotContact(seq,style,placement));
 if(DEFENSIVE_SCENES.includes(seq))return defenseBall(time,seq);
 const plan=getPlay(seq);
 if(plan&&time<SHOT_TIME)return playBall(plan,time,shotContact(seq,style,placement));
 if(INVERTED_SEQUENCES.has(seq)&&time<SHOT_TIME){
  const entry=entryPassBall(time,seq,1,0);if(entry)return entry;
  const release=SHOT_TIME-.24,contact=shotContact(seq,style,placement);
  if(time<release)return carriedBall(0,time,seq,.53);
  return movingBall(carriedBall(0,release,seq,.53),contact,(time-release)/.24,.025);
 }
 if(variant&&!INVERTED_SEQUENCES.has(seq)){
  // A true diagonal pass starts at the opposite touchline and reaches the winger.
  if(seq==='diagonal_switch'&&time<3.65){
   if(time<2.5)return movingBall([-26,.25,-21],carriedBall(1,2.5,variant.base,.56),time/2.5,3.1);
   return carriedBall(1,time,variant.base,.56);
  }
  if(seq.startsWith('low_cross_')&&time<SHOT_TIME){
   const launch=wideLaunch(seq),last=SHOT_TIME-.2,contact=contactFor(style);
   const supply=entryPassBall(time,seq,sequenceSide(seq)<0?5:4,1);
   if(supply)return supply;
   if(time<launch)return carriedBall(1,time,seq,.54);
   const start=carriedBall(1,launch,variant.base,.54),end=[contact[0],.14,contact[2]+.43];
   return time<last?movingBall(start,end,(time-launch)/(last-launch),.1):movingBall(end,contact,(time-last)/.2,.035);
  }
  if(seq.startsWith('early_cross_')&&time<SHOT_TIME){
   const launch=wideLaunch(seq),last=SHOT_TIME-.2,contact=contactFor(style);
   const supply=entryPassBall(time,seq,sequenceSide(seq)<0?5:4,1);
   if(supply)return supply;
   if(time<launch)return carriedBall(1,time,seq,.56);
   const start=carriedBall(1,launch,variant.base,.56),end=[contact[0],contact[1],contact[2]+.45];
   return time<last?movingBall(start,end,(time-launch)/(last-launch),2.15):movingBall(end,contact,(time-last)/.2,.08);
  }
  // A blocked first ball drops for the attacker to finish the same simulation event.
  if(seq==='second_ball'&&time<SHOT_TIME){
   if(time<3.2)return ballPosition(type,time,variant.base,style);
   const start=ballPosition(type,3.2,variant.base,style),contact=contactFor(style);
   if(time<3.75)return movingBall(start,[3.2,.55,-33.4],(time-3.2)/.55,1.4);
   if(time<4.2)return movingBall([3.2,.55,-33.4],[1.9,.14,-35],(time-3.75)/.45,.08);
   return movingBall([1.9,.14,-35],contact,(time-4.2)/(SHOT_TIME-4.2),.12);
  }
  // Base-wing variants must start at their OWN provider's boot.
  // Shifting an inherited base ball without moving the provider leaves
  // counter/far-post openings behind the passer during the first touch.
  if(time<ENTRY_RECEIVE&&(variant.base.startsWith('wing_')||variant.base.startsWith('cutback_'))){
   const side=sequenceSide(seq==='bicycle'?variant.base:seq);
   return entryPassBall(time,seq,side<0?5:4,1);
  }
  const p=ballPosition(type,time,variant.base,style,keeperAction,placement),offset=variantShift(variant,Math.min(time,SHOT_TIME));
  const fade=time<=SHOT_TIME?1:1-clamp((time-SHOT_TIME)/(IMPACT_TIME-SHOT_TIME));
  if((variant.base.startsWith('wing_')||variant.base.startsWith('cutback_'))&&time<SHOT_TIME){
   const u=smooth(clamp(time/SHOT_TIME)),handoff=smooth((time-3.65)/(SHOT_TIME-3.65));
   p[0]+=mix(offset[0]*.78*(1-.22*u),offset[0],handoff);
   p[2]+=mix(Number(variant.depth||0)*.85*(1-u),offset[1],handoff);
  }else{p[0]+=offset[0]*fade;p[2]+=offset[1]*fade;}
  // Lane/depth variants must follow the real carrier during close control.
  const owned=controlCarrier(time,seq);
  if(owned.weight>0){
   const touch=carriedBall(owned.index,time,seq,.53);
   return lerp(p,touch,owned.weight);
  }
  return p;
 }
 const contact=shotContact(seq,style,placement);
 if(time<SHOT_TIME){
  if(seq==='wing_left'||seq==='wing_right'||seq==='cutback_left'||seq==='cutback_right'){
   const entry=entryPassBall(time,seq,sequenceSide(seq)<0?5:4,1);if(entry)return entry;
   const side=sequenceSide(seq),cutback=seq.startsWith('cutback');
   if(time<3.65)return carriedBall(1,time,seq,.56);
   const deliveryStart=carriedBall(1,3.65,seq,.56),aerial=['header','volley','bicycle'].includes(style),deliveryEnd=[contact[0],aerial?contact[1]:(cutback?.14:.35),contact[2]+.45];
   if(time<SHOT_TIME-.2)return movingBall(deliveryStart,deliveryEnd,(time-3.65)/(SHOT_TIME-.2-3.65),cutback?.08:2.15);
   return movingBall(deliveryEnd,contact,(time-(SHOT_TIME-.2))/.2,cutback?.02:.08)
  }
  if(seq==='one_two'){
   if(time<1.8)return movingBall([-12,.12,-22],[-2,.12,-29.6],time/1.8,.1);
   if(time<2.65)return movingBall([-2,.12,-29.6],[-8,.12,-32.6],(time-1.8)/.85,.08);
   if(time<4.65)return movingBall([-8,.12,-32.6],[-.4,.12,-36.25],(time-2.65)/2,.13);
   const received=movingBall([-.4,.12,-36.25],contact,(time-4.65)/(SHOT_TIME-4.65),.03),carry=controlCarrier(time,seq);
  return carry.weight>0?lerp(received,carriedBall(0,time,seq,.56),carry.weight):received
  }
  if(seq==='through_ball'){
   if(time<2.35)return carriedBall(1,time,seq,.52);
   if(time<4.65)return movingBall(carriedBall(1,2.35,seq,.52),[-.4,.14,-35.7],(time-2.35)/2.3,.18);
   const received=movingBall([-.4,.12,-35.7],contact,(time-4.65)/(SHOT_TIME-4.65),.025),carry=controlCarrier(time,seq);
  return carry.weight>0?lerp(received,carriedBall(0,time,seq,.56),carry.weight):received
  }
  if(seq==='dribble'){
   const entry=entryPassBall(time,seq,1,0);if(entry)return entry;
   const carryTime=Math.min(time,SHOT_TIME-.2),p=carriedBall(0,carryTime,seq,.58);
   if(time<SHOT_TIME-.2)return p;
   return movingBall(p,contact,(time-(SHOT_TIME-.2))/.2,.02)
  }
  // Central combination retained as one of several possible build-ups.
  if(time<2){const u=time/2;return movingBall([-13,.12,-21.6],[-10,.12,-28.6],u,0)}
  if(time<3.1)return movingBall([-10,.12,-28.6],[-1,.12,-32],(time-2)/1.1,.12);
  const carryTime=Math.min(time,SHOT_TIME-.24),carry=carriedBall(0,carryTime,seq,mix(.68,.56,clamp((carryTime-3.1)/(SHOT_TIME-3.1))));
  // Preserve the exact arriving pass position, then settle into the next
  // physical touch instead of jumping a quarter metre at the hand-off.
  if(time<3.36)return lerp([-1,.12,-32],carry,smooth((time-3.1)/.26));
  if(time<SHOT_TIME-.24)return carry;
  return movingBall(carry,contact,(time-(SHOT_TIME-.24))/.24,.02)
 }
 const lineClear=type==='big_chance_missed'&&keeperAction==='line_clear';
 const impact=lineClear?lineClearImpact(seq,style,placement):shotImpact(type,seq,style,placement);
 const t=clamp((time-SHOT_TIME)/(IMPACT_TIME-SHOT_TIME));
  // Air-drag flight: fast off the boot and still ~73% of mean speed at impact,
  // so the ball never crawls into the keeper. Keeper, net and HUD timing unchanged.
  const flight=(1-Math.exp(-SHOT_DRAG*t))/(1-Math.exp(-SHOT_DRAG));
 // V21.196: every shot reaches the keeper's line at the same moment and with
 // the same pace, so the speed never tells a goal from a save or a miss.
 // Shots that go on past the keeper keep that pace into the net or wide.
 const {gate,delay,speed}=shotGate(contact,impact);
 if(t<1){const p=lerp(contact,gate,flight),arc=seq==='extended_free_kick'?2.8:style==='power'?.18:style==='low_driven'?.1:style==='header'?.28:style==='volley'?.32:style==='bicycle'?.42:style==='chip'?3.3:.65;p[1]+=arc*Math.sin(flight*Math.PI);if(style==='finesse')p[0]+=(placement?.side||(INVERTED_SEQUENCES.has(seq)?sequenceSide(seq):1))*.72*Math.sin(flight*Math.PI);return p}
 if(delay>0){if(time<IMPACT_TIME+delay)return lerp(gate,impact,(time-IMPACT_TIME)/delay);time-=delay}
 if(type==='goal'&&placement?.style==='crossbar_in'){
  // Off the underside of the bar: down behind the line, one bounce, into the net.
  const s=time-IMPACT_TIME,[x]=impact,down=[x*1.02,.13,-53.02],net=goalNetPoint(seq,style,placement);
  if(s<.16){const u=s/.16;return[mix(x,down[0],u),mix(impact[1],down[1],u*u),mix(impact[2],down[2],u)]}
  if(s<.62){const u=(s-.16)/.46,p=lerp(down,net,u);p[1]=mix(down[1],net[1],u)+.7*Math.sin(Math.PI*u);return p}
  const u=smooth((s-.62)/.5),p=lerp(net,[net[0],.12,-53.8],u);return p;
 }
 if(type==='goal'&&placement?.style==='post_in'){
  // Off the inside of the post and across into the side netting.
  const s=time-IMPACT_TIME,net=goalNetPoint(seq,style,placement);
  if(s<.3)return lerp(impact,net,s/.3);
  const u=smooth((s-.3)/.5);return lerp(net,[net[0],.12,-53.85],u);
 }
 if(type==='goal'){const p=lerp(impact,[impact[0]*.94,.12,-53.75],(time-IMPACT_TIME)/.85);p[1]+=.12*Math.abs(Math.sin((time-IMPACT_TIME)*7));return p}
 if(type==='big_chance_saved'){
  // Parries spring off the glove and slow down instead of drifting at a constant pace.
  const u=1-Math.pow(1-clamp((time-IMPACT_TIME)/1.35),2.2),sign=Math.sign(impact[0])||1;
  // Distinct deflections all START at the identical saved-ball contact.
  const destinations={
   classic:[sign*7,.12,-46],fingertip:[sign*8,.14,-49.7],
   parry:[sign*7.6,.13,-47.2],low_reflex:[sign*4.5,.14,-44],
   rush_spread:[sign*5.3,.14,-45.2],high_reach:[sign*6.4,.14,-48.6]
  };
  const end=destinations[keeperAction]||destinations.classic,p=lerp(impact,end,u);
  p[1]+=(keeperAction==='high_reach'?.85:keeperAction==='fingertip'?.65:keeperAction==='low_reflex'?.18:.5)*Math.sin(u*Math.PI);
  return p
 }
 if(lineClear){
  // Hacked off the line by a defender, high and wide towards the touchline.
  const u=1-Math.pow(1-clamp((time-IMPACT_TIME)/1.5),2),sign=Math.sign(impact[0])||1,p=lerp(impact,[sign*15,.12,-41],u);
  p[1]+=2.6*Math.sin(u*Math.PI);return p;
 }
 if(type==='shot_post')return lerp(impact,[Math.sign(impact[0])*8,.12,-45],1-Math.pow(1-clamp((time-IMPACT_TIME)/1.35),2));
 // A miss keeps the speed it had at the goal line, then rolls out behind the goal.
 const s=Math.max(0,time-IMPACT_TIME),exit=speed/Math.max(.01,Math.hypot(impact[0]-contact[0],impact[1]-contact[1],impact[2]-contact[2]));
 const roll=(1-Math.exp(-1.1*s))/1.1,p=[impact[0]+(impact[0]-contact[0])*exit*roll,0,impact[2]+(impact[2]-contact[2])*exit*roll];
 const drop=smooth(s/.55);p[1]=mix(impact[1],.12,drop)+.18*(1-drop)*Math.abs(Math.sin(s*9));
 return p;
}
// Every camera is on the SAME world touchline. Only its target follows the attack.
// There is no event-dependent camera side, orbit, result zoom or celebration cut.
export function cameraState(direction,time,aspect=1.3,type='goal',sequence='central',finish='normal',keeperAction='classic',placement=null){
 if(extendedKind(sequence))return extendedCamera(sequence,time,direction,aspect,ballPosition(type,time,sequence,finish,keeperAction,placement));
 const seq=normalizeSequence(sequence),base=baseSequence(seq),bp=worldPosition(ballPosition(type,time,seq,finish,keeperAction,placement),direction),goal=worldPosition([0,.86,-51.25],direction);
 const portraitPad=Math.max(0,1.25-aspect)*8.5;
 let targetX=0,targetY=.82,targetZ=0,distance=50,fov=28,phase='build';
 const wide=base.startsWith('wing_')||base.startsWith('cutback_'),inverted=INVERTED_SEQUENCES.has(seq),deliveryAt=wideLaunch(seq);
 if(wide){
  // Keep the live winger, moving ball and box in one continuous TV frame.
  // Timing matches the actual carry (to 3.65 s), delivery (to 5.20 s) and finish.
  const finishAt=SHOT_TIME-.2;
  const carrierAt=sample=>{const p=runPosition(1,sample,seq);return worldPosition([p[0],.84,p[1]],direction)};
  const ballAt=sample=>worldPosition(ballPosition(type,sample,seq,finish,keeperAction,placement),direction);
  const buildTarget=sample=>{const c=carrierAt(sample),u=smooth(sample/deliveryAt),gw=.28+.08*u;
    if(seq==='diagonal_switch'){const b=ballAt(sample);return[mix(b[0],c[0],.14+.2*u),.80,mix(b[2],goal[2],.18+.08*u)]}
    return[mix(c[0],goal[0],gw),.80,mix(c[2],goal[2],.18+.08*u)]};
  const deliveryDesired=(sample,u)=>{const c=carrierAt(sample),b=ballAt(sample),mid=[mix(c[0],b[0],.48),.84,mix(c[2],b[2],.48)],gw=.10+.20*u;return[mix(mid[0],goal[0],gw),mix(.82,.90,u),mix(mid[2],goal[2],gw)]};
  const buildEnd=buildTarget(deliveryAt);
  if(time<deliveryAt){
   [targetX,targetY,targetZ]=buildTarget(time);distance=48.9+portraitPad*.65;fov=28.3;phase='build';
  }else if(time<finishAt){
   const u=smooth((time-deliveryAt)/(finishAt-deliveryAt)),desired=deliveryDesired(time,u),anchored=lerp(buildEnd,desired,u);
   [targetX,targetY,targetZ]=anchored;distance=mix(48.9+portraitPad*.65,46.8+portraitPad*.35,u);fov=mix(28.3,27.5,u);phase='delivery';
  }else{
   const deliveryEnd=deliveryDesired(finishAt,1),u=smooth((time-finishAt)/1.25),shooterLocal=runPosition(0,time,seq),shooter=worldPosition([shooterLocal[0],.88,shooterLocal[1]],direction),action=[mix(shooter[0],bp[0],.58),.92,mix(shooter[2],bp[2],.58)],desired=[mix(action[0],goal[0],.38),mix(.92,1.0,u),mix(action[2],goal[2],.38)],anchored=lerp(deliveryEnd,desired,u);
   [targetX,targetY,targetZ]=anchored;distance=mix(46.8+portraitPad*.35,MIN_CAMERA_DISTANCE+portraitPad*.22,u);fov=mix(27.5,26.0,u);phase='finish';
  }
 }else{
  const actorIndex=base==='one_two'&&time<3.0?1:0,actorLocal=runPosition(actorIndex,time,seq),actor=worldPosition([actorLocal[0],.84,actorLocal[1]],direction);
  const push=smooth((time-.8)/4.55),ballWeight=seq==='through_ball'?.72:seq==='dribble'?.76:seq==='one_two'?.62:.68;
  targetX=mix(actor[0],bp[0],ballWeight);
  targetZ=mix(actor[2],bp[2],ballWeight);
  const goalWeight=mix(seq==='through_ball'?.10:.06,.38,push);
  targetX=mix(targetX,goal[0],goalWeight);targetZ=mix(targetZ,goal[2],goalWeight);
  const startDistance=seq==='through_ball'?52.2:seq==='one_two'?51.6:seq==='dribble'?50.6:51.2;
  distance=mix(startDistance-3.5+portraitPad*.70+(inverted?1.2:0),MIN_CAMERA_DISTANCE+portraitPad*.22,push);
  fov=mix((seq==='through_ball'?28.0:27.8)+(inverted?1.1:0),26.0,push);
  targetY=mix(.76,.98,push);phase=time<3.2?'build':time<5.05?'delivery':'finish';
 }
 // A diagonal switch crosses the full pitch before reaching the near winger.
 // Keep the broadcast frame between the ball and the box: centering directly
 // on the near winger collapses the physical camera distance and crops runners.
 const authoredPlay=getPlay(seq);
 if(authoredPlay){
  // Follow the active first pass instead of zooming out to the eventual scorer.
  const touches=playTouches(authoredPlay),
   airborne=touches.find(pass=>time>=pass.release&&time<pass.arrival),
   owner=playCarrier(authoredPlay,time),
   receiver=airborne?.receiver??(owner>=0?owner:0),
   run=runPosition(receiver,time,seq),
   receiving=worldPosition([run[0],.84,run[1]],direction),
   anticipation=time<.35?0:airborne?.17:.09,
   towardsGoal=smooth((time-3.65)/2),
   ballFocusX=mix(bp[0],receiving[0],anticipation),
   ballFocusZ=mix(bp[2],receiving[2],anticipation);
  targetX=mix(ballFocusX,goal[0],mix(.17,.34,towardsGoal));
  targetZ=mix(ballFocusZ,goal[2],mix(.25,.32,towardsGoal));
  targetY=mix(.79,.96,towardsGoal);
  const push=smooth((time-.65)/4.55);
  distance=mix(46.5+portraitPad*.38,MIN_CAMERA_DISTANCE+portraitPad*.2,push);
  fov=mix(27.5,26.0,push);
  phase=time<1.15?'build':time<5.03?'delivery':'finish';
 }
 if(DEFENSIVE_SCENES.includes(seq)){
  // This is a BALL WIN, not another shot toward the former attacker's goal.
  const won=smooth((time-4.30)/.72),defender=defensePosition(8,time,seq);
  const recovered=worldPosition([defender[0],.85,defender[1]],direction);
  targetX=mix(bp[0],recovered[0],.18+.40*won);
  targetZ=mix(bp[2],recovered[2],.18+.38*won)+won*2.5*direction;
  targetY=.88;
  phase=time<1.42?'build':time<4.4?'press':'recovery';
 }
 if(seq==='diagonal_switch'){
  targetX=mix(targetX,goal[0],.46);
  fov+=3.4*(1-smooth((time-(SHOT_TIME-.2))/1.25));
 }
 // A small near-wing lens allowance keeps the *whole* goal roof in the frame,
 // not only its ground centre. Camera position/target/choreography stay intact.
 if(wide&&sequenceSide(seq)*direction>0)fov+=2.3*(1-smooth((time-(SHOT_TIME-.2))/1.25));
 // Track the ball with a fixed TV-side offset rather than an unrelated rail.
 // Far-wing, set-piece and finish positions remain exactly the same distance.
 distance=BROADCAST_CAMERA_DISTANCE;
 fov=Math.max(30.5,fov);
 const target=[targetX,targetY,targetZ],
  // V21.196: ball wins share the normal TV rail. Their old steep, tilted
  // angle gave away at once that nothing would come of the attack.
  rail=[39.3,27,5.8*direction],
  railSize=Math.hypot(...rail);
 const position=target.map((coordinate,axis)=>coordinate+rail[axis]*distance/railSize);
  // The goal must stay fully in the mobile picture even with a closer lens.
  // Widen ONLY enough to clear the roof; never zoom out or switch sides.
  if(wide||authoredPlay){
   const forward=target.map((v,i)=>v-position[i]),length=Math.hypot(...forward);
   const [fx,fy,fz]=forward.map(v=>v/length),rightLen=Math.hypot(fz,fx)||1;
   const right=[-fz/rightLen,0,fx/rightLen],up=[-right[2]*fy,right[2]*fx-right[0]*fz,right[0]*fy];
   let tan=Math.tan(fov*Math.PI/360);
   if(authoredPlay&&!wide){
    // Fit the ball into frame and only include goal corners near the shot.
    const authoredFinish=hasAuthoredFinish(seq),goalReveal=authoredFinish?smooth((time-2.8)/1.3):smooth((time-3.8)/1.5),
     essential=[{point:bp,weight:1},...[-3.72,3.72].flatMap(x=>(authoredFinish?[-52.5,-54.45]:[-52.5]).map(z=>({point:worldPosition([x,2.5,z],direction),weight:goalReveal})))];
    for(const {point,weight} of essential){
     const vx=point[0]-position[0],vy=point[1]-position[1],vz=point[2]-position[2],
      depth=vx*fx+vy*fy+vz*fz;
     if(depth<=1)continue;
     const need=Math.max(Math.abs(vx*right[0]+vz*right[2])/(Math.max(.68,aspect)*depth*.94),Math.abs(vx*up[0]+vy*up[1]+vz*up[2])/(depth*.94));
     tan=Math.max(tan,mix(Math.tan(fov*Math.PI/360),need,weight));
    }
    // Keep a minimum six active players legible alongside the ball. The
    // sixth-smallest projected requirement changes smoothly as runs unfold;
    // it never affects the match, camera side or HUD.
    const playerRequirements=[];
    for(let actor=0;actor<16;actor++){
     const route=runPosition(actor,time,seq),
      point=worldPosition([route[0],1.0,route[1]],direction),
      vx=point[0]-position[0],vy=point[1]-position[1],vz=point[2]-position[2],
      depth=vx*fx+vy*fy+vz*fz;
     if(depth<=1)continue;
     playerRequirements.push(Math.max(
      Math.abs(vx*right[0]+vz*right[2])/(Math.max(.68,aspect)*depth*.90),
      Math.abs(vx*up[0]+vy*up[1]+vz*up[2])/(depth*.90)));
    }
    playerRequirements.sort((a,b)=>a-b);
    if(playerRequirements.length>=6)tan=Math.max(tan,playerRequirements[5]);
   }
   for(const x of (wide?[-3.72,3.72]:[]))for(const z of [-52.5,-54.45]){
    const roof=worldPosition([x,2.5,z],direction),vx=roof[0]-position[0],vy=roof[1]-position[1],vz=roof[2]-position[2];
    const depth=vx*fx+vy*fy+vz*fz;
    if(depth<=1)continue;
    tan=Math.max(tan,Math.max(0,vx*up[0]+vy*up[1]+vz*up[2])/(depth*.96));
    if(time>=1.65){
     const coverage=smooth((time-1.65)/1.05);
     const required=Math.max(Math.abs(vx*right[0]+vz*right[2])/(Math.max(.65,aspect)*depth*.96),
      Math.abs(vx*up[0]+vy*up[1]+vz*up[2])/(depth*.96));
     tan=Math.max(tan,mix(tan,required,coverage));
    }
   }
   fov=Math.max(fov,2*Math.atan(tan)*180/Math.PI);
  }
  return{position,target,fov,distance,phase};
}
// Existing deliveries retain their giver through the kicking follow-through.
export function cameraDelivery(sequence){
 if(hasAuthoredFinish(sequence))return null;
 const plan=getPlay(sequence),base=baseSequence(sequence);
 if(plan){
  const crossing=['overlap','lowcross','cutback','nearpost'].includes(plan.family)||plan.family==='switch'&&plan.order.some(i=>i===4||i===5);
  return crossing?playTouches(plan).at(-1):null;
 }
 if(base.startsWith('wing_')||base.startsWith('cutback_'))return{passer:1,release:wideLaunch(sequence)};
 return null;
}
export function createBroadcastCameraTrack({direction=1,aspect=1.3,type='goal',sequence='central',finish='normal',keeperAction='classic',placement=null}={}){
 const delivery=cameraDelivery(sequence);
 const cameraAt=time=>{
  // Delay only the handover, then catch up smoothly. Actors and ball keep
  // their exact original clocks; no pan toward a cross before boot contact.
  const lag=delivery ? .28*smooth((time-delivery.release+.45)/.45)*(1-smooth((time-delivery.release-.2)/.8)):0;
  const frame=cameraState(direction,time-lag,aspect,type,sequence,finish,keeperAction,placement);
  if(delivery){
   frame.target[0]*=.85; // Maintain ground-height framing through the delivery.
   // Once the cross has left the foot, bring the box into frame by panning,
   // rather than widening the lens and filling the top with more stands.
   const boxShift=(-51.25*direction-frame.target[2])*.27*smooth((time-delivery.release-.3)/1.25);
   frame.target[2]+=boxShift;frame.position[2]+=boxShift;
   return keepInBroadcastFrame(keepCrosserInFrame(frame,delivery,time,direction,aspect,sequence),time,/^(wing|cutback)_/.test(sequence));
  }
  // The turnover counter composes its own pass-and-goal frame (counter test).
  if(extendedKind(sequence)&&extendedKind(sequence)!=='turnover_counter')return keepExtendedActionInFrame(frame,time,direction,aspect,worldPosition(ballPosition(type,time,sequence,finish,keeperAction,placement),direction));
  return DEFENSIVE_SCENES.includes(sequence)?frame:keepInBroadcastFrame(frame,time);
 };
 // V21.205: the closer 34 m camera glides (never zooms) to keep the ball, and
 // from the shot on the whole goal, inside a phone picture. Judged at the
 // final range and the narrowest lens, before the track smooths the pan.
 function keepInBroadcastFrame(frame,time,holdGoal=false){
  const gap=Math.hypot(...frame.position.map((v,i)=>v-frame.target[i]))||1,k=BROADCAST_CAMERA_DISTANCE/gap;
  const real={...frame,position:frame.position.map((v,i)=>frame.target[i]+(v-frame.target[i])*k)},lens=aspect<1.12?32:30.5;
  const ball=worldPosition(ballPosition(type,time,sequence,finish,keeperAction,placement),direction);
  let fit=glideToFit(real,[ball],ball,aspect,lens,.78,1);
  // A wide delivery also keeps the goal mouth in the picture (wide crosses).
  if(holdGoal){const mouth=worldPosition([0,0,-52.5],direction);fit=glideToFit(fit,[ball,mouth],[(ball[0]+mouth[0])/2,0,(ball[2]+mouth[2])/2],aspect,lens,.9,1)}
  const goal=smooth((time-SHOT_TIME+1.2)/1.0);
  if(goal>0){
   const points=[ball];for(const x of [-3.66,3.66])for(const z of [-52.5,-54.4])points.push(worldPosition([x,2.44,z],direction));
   const net=worldPosition([0,0,-53.4],direction);
   fit=glideToFit(fit,points,[(ball[0]+net[0])/2,0,(ball[2]+net[2])/2],aspect,lens,.9,goal);
  }
  const shift=fit.target.map((v,i)=>v-real.target[i]);
  // Where gliding alone cannot hold the ball and the goal, ask for a slightly
  // wider lens; the track keeps one lens for the whole highlight.
  let lensNeeded=frame.fov;
  if(goal>=1){
   const points=[ball];for(const x of [-3.66,3.66])for(const z of [-52.5,-54.4])points.push(worldPosition([x,2.44,z],direction));
   if(frameOverflow(fit,[0,0],aspect,points,lens,.86)>0){let lo=lens,hi=60;for(let i=0;i<12;i++){const m=(lo+hi)/2;frameOverflow(fit,[0,0],aspect,points,m,.86)>0?lo=m:hi=m}lensNeeded=Math.max(lensNeeded,hi)}
  }
  return{...frame,fov:lensNeeded,position:frame.position.map((v,i)=>v+shift[i]),target:frame.target.map((v,i)=>v+shift[i])};
 }
 // A single fitted lens for each highlight. The camera follows the ball,
 // without changing range at a pass, shot or goalkeeper action.
 const portrait=aspect<1.12,isExtended=!!extendedKind(sequence),counter=sequence==='extended_turnover_counter';
 const defending=DEFENSIVE_SCENES.includes(sequence);
 const sample=createStableCameraTrack(cameraAt,{duration:DURATION,
  sigma:isExtended||defending?.16:.34,focusSpeed:isExtended||defending?24:12,railSpeed:isExtended||defending?24:14,
  fovFloor:counter?(portrait?32:30.5):isExtended?(portrait?28.5:27.8):(portrait?32:30.5),
  fovCeiling:counter?(portrait?47:44):isExtended?(portrait?39:36):(portrait?42:40)});
 // Gaussian stabilization still controls the camera's entire travel. Restore
 // exact physical clearance after smoothing the camera and target separately.
 return time=>{
  const state=sample(time),gap=Math.hypot(...state.position.map((v,i)=>v-state.target[i]));
  const distance=BROADCAST_CAMERA_DISTANCE;
  const factor=distance/Math.max(.01,gap);
  const fov=state.fov;
  const framed={...state,fov,distance,
   position:state.position.map((v,i)=>state.target[i]+(v-state.target[i])*factor)};
  return framed;
 };
}
// The closer 34 m TV camera can drop a crosser on the near touchline below the
// bottom edge of a narrow phone (a long diagonal switch), and a fixed set-piece
// composition can leave the ball or the net outside a portrait phone frame.
// Glide camera and target together towards what must be seen, just enough to
// keep it inside the picture. Lens, distance and camera side are unchanged.
const CROSSER_EDGE=.82,frameCamera=new THREE.PerspectiveCamera(),frameProbe=new THREE.Vector3();
function frameOverflow(frame,shift,aspect,points,fov,edge){
 frameCamera.fov=fov;frameCamera.aspect=aspect;frameCamera.near=.1;frameCamera.far=250;
 frameCamera.position.set(frame.position[0]+shift[0],frame.position[1],frame.position[2]+shift[1]);
 frameCamera.lookAt(frame.target[0]+shift[0],frame.target[1],frame.target[2]+shift[1]);
 frameCamera.updateProjectionMatrix();frameCamera.updateMatrixWorld();
 let worst=0;
 for(const p of points){frameProbe.set(...p).project(frameCamera);worst=Math.max(worst,Math.abs(frameProbe.x),Math.abs(frameProbe.y))}
 return worst-edge;
}
// Smallest ground shift towards anchor that brings every point inside edge.
function glideToFit(frame,points,anchor,aspect,fov,edge,weight){
 if(weight<=0||frameOverflow(frame,[0,0],aspect,points,fov,edge)<=0)return frame;
 const toward=[anchor[0]-frame.target[0],anchor[2]-frame.target[2]];
 let low=0,high=1;
 for(let i=0;i<14;i++){const k=(low+high)/2;frameOverflow(frame,[toward[0]*k,toward[1]*k],aspect,points,fov,edge)>0?low=k:high=k}
 const k=high*weight,shift=[toward[0]*k,0,toward[1]*k];
 return{...frame,position:frame.position.map((v,i)=>v+shift[i]),target:frame.target.map((v,i)=>v+shift[i])};
}
function keepCrosserInFrame(frame,delivery,time,direction,aspect,sequence){
 // Hold him through the follow-through of the cross (about one second).
 const envelope=smooth((time-delivery.release+1.3)/.7)*(1-smooth((time-delivery.release-1.05)/.8));
 if(envelope<=0)return frame;
 const run=runPosition(delivery.passer,time,sequence),points=[0,1.8].map(y=>worldPosition([run[0],y,run[1]],direction));
 // Judge with the narrowest lens the stable track may pick for this screen.
 return glideToFit(frame,points,points[0],aspect,aspect<1.12?32:30.5,CROSSER_EDGE,envelope);
}
// Long highlights: the ball always, and from the shot on the whole goal too.
function keepExtendedActionInFrame(frame,time,direction,aspect,ball){
 const goal=smooth((time-SHOT_TIME)/.6),points=[ball];
 if(goal>0)for(const x of [-3.66,3.66])for(const z of [-52.5,-54.4])points.push(worldPosition([x,2.44,z],direction));
 const anchor=goal>0?[(ball[0]+0)/2,0,(ball[2]+worldPosition([0,0,-53.4],direction)[2])/2]:ball;
 return glideToFit(frame,points,anchor,aspect,aspect<1.12?28.5:27.8,.86,1);
}
const LABELS={goal:'TOR',big_chance_saved:'PARADE',big_chance_missed:'SCHUSS VORBEI',shot_post:'PFOSTEN'};
const hex=(value,fallback)=>/^#[a-f0-9]{6}$/i.test(value)?value:fallback;
export function kitColors(event){
 const validPattern=v=>['solid','stripes','hoops','diagonal','halves','sleeves','center','pinstripes','quarters','chevron','chestband','shoulders','sidepanels','reverse','doubleband','checkers','diamonds','fade','splitstripe','cuffs','volt','rift','prism','topo','velocity','deco','orbit'].includes(String(v))?String(v):'solid';
 const home={shirt:hex(event.homeColor,'#971d42'),shirtSecondary:hex(event.homeSecondary,event.homeColor||'#971d42'),pattern:validPattern(event.homePattern),shorts:hex(event.homeShorts,'#f3f4ee'),socks:hex(event.homeSocks,'#971d42')};
 let away={shirt:hex(event.awayColor,'#f2f3f4'),shirtSecondary:hex(event.awaySecondary,event.awayColor||'#f2f3f4'),pattern:validPattern(event.awayPattern),shorts:hex(event.awayShorts,'#172b49'),socks:hex(event.awaySocks,'#f2f3f4')};
 const h=new THREE.Color(home.shirt),a=new THREE.Color(away.shirt);
 // Never repaint a saved opponent kit. Generated opponents without an identity
 // still receive a contrast fallback so the configured user kit remains exact.
 if(Math.hypot(h.r-a.r,h.g-a.g,h.b-a.b)<.5&&!event.awayKitConfigured)away=(h.r+h.g+h.b)>1.2?{shirt:'#153564',shirtSecondary:'#d7e7ff',pattern:'solid',shorts:'#153564',socks:'#153564'}:{shirt:'#f7f3db',shirtSecondary:'#263940',pattern:'solid',shorts:'#f7f3db',socks:'#f7f3db'};
 const keeper=['#f4b52b','#10bda7','#bc63e8'].find(c=>{const k=new THREE.Color(c);return [h,new THREE.Color(away.shirt)].every(t=>Math.hypot(k.r-t.r,k.g-t.g,k.b-t.b)>.55)})||'#42e2ee';
 return{home,away,keeper};
}
export function crowdReactionState(type,attackTeam,supporterTeam,time){
 const supporter=supporterTeam==='home'||supporterTeam==='away'?supporterTeam:'neutral',attacking=supporter===attackTeam;
 // V21.226 ceremonies: the whole ground is up for the walk-out; at the final
 // whistle the winners' end celebrates and the losers' end goes quiet.
 if(type==='ceremony_kickoff')return{suspense:0,mood:supporter==='neutral'?.45:.85};
 if(type==='ceremony_fulltime'||type==='ceremony_draw')return{suspense:0,mood:supporter==='neutral'||type==='ceremony_draw'?.3:attacking?1:-.4};
 const suspense=smooth((time-(SHOT_TIME-.85))/.72)*(1-smooth((time-IMPACT_TIME)/.22));
 const after=smooth((time-IMPACT_TIME)/.38),fade=Math.max(.22,1-smooth((time-(DURATION-1.35))/1.1));
 let mood=0;
 if(supporter==='neutral')mood=type==='goal'?.34:type==='big_chance_saved'?.2:.12;
 else if(type==='goal')mood=attacking?1:-.55;
 else if(type==='big_chance_saved')mood=attacking?-.5:.78;
 else if(type==='shot_post')mood=attacking?-.68:.34;
 else mood=attacking?-.48:.28;
 return{suspense,mood:mood*after*fade};
}
function skinTone(name='',offset=0){const tones=['#ecc2a0','#dca17d','#bd7b59','#8d5a3e','#6d422e'];let n=offset;for(const c of name)n=(n*33+c.charCodeAt(0))>>>0;return tones[n%tones.length]}
// Player complexion must never be derived from names, nationality or scene RNG.
const PLAYER_SKIN_PALETTE=Object.freeze(['#f1d2b3','#dbad88','#c88f69','#a96d4b','#805035','#503326']);
export function resolvePlayerSkinTone(value){
 if(typeof value==='number'&&Number.isInteger(value)&&value>=1&&value<=6)return PLAYER_SKIN_PALETTE[value-1];
 if(typeof value==='string'){
  const v=value.trim().toLowerCase();
  if(/^[1-6]$/.test(v))return PLAYER_SKIN_PALETTE[Number(v)-1];
  if(/^#[0-9a-f]{6}$/.test(v))return v;
 }
 return PLAYER_SKIN_PALETTE[2];
}

// Root paths are independent of the result until the finish. Distances/time keep
// the carrying player, chasing line, support runs and ball in the same phase.
export const RUNS=Object.freeze([
 {role:'striker',team:'attack',from:[-2,-26],to:[0,-37]},
 {role:'passer',team:'attack',from:[-13,-20.9],to:[-10,-27.9]},
 {role:'runner-left',team:'attack',from:[-17,-31],to:[-11,-43]},
 {role:'runner-right',team:'attack',from:[13,-29],to:[9,-44]},
 {role:'far-wing',team:'attack',from:[26,-23],to:[23,-38]},
 {role:'overlap',team:'attack',from:[-26,-21],to:[-24,-34]},
 {role:'support',team:'attack',from:[4,-15],to:[3,-25]},
 {role:'cover',team:'attack',from:[17,-8],to:[15,-19]},
 {role:'centre-back',team:'defend',from:[2,-35],to:[1,-41]},
 {role:'left-back',team:'defend',from:[-14,-37],to:[-10,-45]},
 {role:'right-back',team:'defend',from:[12,-36],to:[8,-46]},
 {role:'cover-back',team:'defend',from:[-5,-40],to:[-3,-47]},
 {role:'midfield',team:'defend',from:[6,-26],to:[4,-34]},
 {role:'wide-midfield',team:'defend',from:[22,-27],to:[20,-38]},
 {role:'chaser',team:'defend',from:[-17,-25],to:[-14,-32]},
 {role:'second-line',team:'defend',from:[-7,-16],to:[-6,-27]}
]);
const ATTACKER_FLOW_NODES=Object.freeze({
 dribble:[[0,-7,-25.5],[SHOT_TIME*.35,-3,-29.525],[SHOT_TIME*.70,2.4,-33.55],[SHOT_TIME,0,-37]],
 wing:[[0,1,-26],[3.25,1,-31.2],[SHOT_TIME,0,-37]],
 one_two:[[0,-2,-26],[1.8,-2,-29.3],[2.65,-1,-30.6],[SHOT_TIME,0,-37]],
 through_ball:[[0,-2,-25.5],[2.35,-1.8,-29],[SHOT_TIME,0,-37]],
 central:[[0,-2,-26],[3.1,-1,-31.2],[SHOT_TIME,0,-37]]
});
export function runPosition(index,time,sequence='central'){
 if(extendedKind(sequence))return extendedPosition(index,time,sequence);
 const seq=normalizeSequence(sequence),variant=VARIANTS[seq];
 const plan=getPlay(seq);
 if(plan){const point=playPosition(index,time,plan);if(point)return point}
 if(DEFENSIVE_SCENES.includes(seq)){const point=defensePosition(index,time,seq);if(point)return point}
 if(INVERTED_SEQUENCES.has(seq)){
  if(index===0)return invertedRunPosition(seq,time);
  if(index===1){const side=sequenceSide(seq);return lerp([side*27,-25],[side*20,-41],smooth(time/6.8))}
  return runPosition(index,time,'dribble');
 }
 if(variant){
  const p=runPosition(index,time,variant.base),[dx,dz]=variantShift(variant,Math.min(time,SHOT_TIME));
  if(index===0){p[0]+=dx;p[1]+=dz}
  else if(index===1){const u=smooth(clamp(time/SHOT_TIME));p[0]+=dx*.78*(1-.22*u);p[1]+=Number(variant.depth||0)*.85*(1-u)}
  else if(index<8){const u=smooth(clamp(time/SHOT_TIME));p[0]+=dx*.15*(1-u)}
  return p;
 }
 const r=RUNS[index];
 if(index===0){
  // No zero-speed frames at authored intermediate nodes. Keep path contact
  // at exactly 5.4s and carry incoming momentum through the follow-through.
  const nodes=seq==='dribble'?ATTACKER_FLOW_NODES.dribble:
   seq.startsWith('wing_')||seq.startsWith('cutback_')?ATTACKER_FLOW_NODES.wing:
   seq==='one_two'?ATTACKER_FLOW_NODES.one_two:
   seq==='through_ball'?ATTACKER_FLOW_NODES.through_ball:ATTACKER_FLOW_NODES.central;
  return sampleFlowRun(nodes,time,.35,-1.9);
 }
 if(index===1){
  if(seq.startsWith('wing_')||seq.startsWith('cutback_')){
   const side=sequenceSide(seq),cutback=seq.startsWith('cutback'),wideStart=[side*23,-20.5],target=[side*(cutback?27:25.5),cutback?-48:-44.5];
   // The winger now runs predominantly forward along the touchline. This removes
   // the sideways skating caused by translating him from a central spawn.
   if(time<3.65){
    const p=lerp(wideStart,target,smooth(time/3.65));
    // Attack the marker's inside foot before accelerating down the line.
    // The feint decays before delivery so the ball never jumps on release.
    p[0]-=side*wideFeint(time);
    return p;
   }
   return lerp(target,[side*(cutback?26.2:24.8),target[1]-.8],smooth((time-3.65)/2.4))
  }
  if(seq==='one_two'){if(time<2.65)return lerp([-12,-22],[-8,-32.6],smooth(time/2.65));return lerp([-8,-32.6],[-5,-38],smooth((time-2.65)/3.7))}
  if(seq==='through_ball'){if(time<2.35)return lerp([-13,-21.5],[-9,-28.2],smooth(time/2.35));return lerp([-9,-28.2],[-7,-34],smooth((time-2.35)/4.2))}
  if(seq==='dribble')return lerp([-12,-23],[-8,-34],smooth(time/6.2));
  if(time<2)return lerp(r.from,r.to,smooth(time/2));return lerp(r.to,[-8,-35],smooth((time-2)/5.2))
 }
 // The fullback closes the flank, jockeys the feint, then trails the runner.
 // Maintain a real 2.5m gap: no body overlap or late defender teleport.
 if((seq.startsWith('wing_')||seq.startsWith('cutback_'))&&index===(sequenceSide(seq)<0?14:13)){
  const side=sequenceSide(seq),winger=runPosition(1,time,seq),
   close=smooth((time-.60)/.85),behind=smooth((time-2.50)/.65),
   pursuit=[winger[0]-side*2.55,winger[1]+mix(-2.35,1.65,behind)];
  return lerp([side*21.1,-27.4],pursuit,close);
 }
 // V21.297: the curves run on the eased clock too, so every runner comes
 // to rest at 6.9 s instead of stopping dead mid-stride (arms and legs popped).
 const u=smooth(clamp(time/6.9)),p=lerp(r.from,r.to,u),bend=(hash(index*73+11)-.5)*(r.team==='attack'?1.45:1.05)*Math.sin(u*Math.PI);
 if(seq.startsWith('wing_')||seq.startsWith('cutback_')){const side=sequenceSide(seq);if(r.team==='attack'&&[2,3,4,5].includes(index))p[0]+=side*(index%2?.8:1.6)*Math.sin(u*Math.PI)}
 p[0]+=bend;p[1]+=Math.sin(u*Math.PI*2+hash(index+91)*Math.PI)*.2*Math.sin(u*Math.PI);
 if(r.team==='defend'){const tracking=defenderTracking(index,time,seq);p[0]+=tracking.x;p[1]+=tracking.z;}
 return p;
}
// Action presets modify only goalkeeper animation, never saved/missed/goal outcomes.
export function keeperPose(type,time,finish='normal',sequence='central',keeperAction='classic',placement=null){
 const anticipation=smooth((time-SHOT_TIME-.18)/.22),dive=smooth((time-SHOT_TIME-.4)/.85),land=smooth((time-IMPACT_TIME-.12)/.85),recover=smooth((time-7.55)/1.45);
 const save=type==='big_chance_saved',low=finish==='low_driven',sign=Math.sign(shotImpact(type,sequence,finish,placement)[0])||1,rotation=sign*(1.13*dive+land*.35)*(1-recover),peak=low?.55:save?1.05:.8;
 // Takeoff, airborne extension, landing and recovery are separate phases. Contact
 // remains fixed by the authoritative event; recovery only improves presentation.

 let x=sign*mix(mix(.1,peak,dive),.35,recover),y=.5*Math.sin(dive*Math.PI/2)*(1-land),z=mix(-50.6,-50.2,recover),tilt=rotation;
 const active=smooth((time-4.65)/.85)*(1-smooth((time-7.55)/1.55));
 if(type==='big_chance_saved'){
  if(keeperAction==='fingertip'){x+=sign*.34*dive*(1-recover);y+=.14*active;tilt*=1.08}
  else if(keeperAction==='parry'){x+=sign*.15*active;tilt*=.92}
  else if(keeperAction==='low_reflex'){x+=sign*.30*active;y-=.24*active;tilt*=.42}
  else if(keeperAction==='rush_spread'){z+=1.15*smooth((time-3.3)/2.15)*(1-recover);x+=sign*.2*active;tilt*=.36}
  else if(keeperAction==='high_reach'){y+=.28*active;tilt*=.61}
 }
 return{x,y,z,tilt,anticipation,dive,land,recover,action:keeperAction};
}
// Smooth oval loft, reused by every instance of a given anatomical part.
// UVs project onto front/back so every club pattern keeps its intended shape.
export function athleticGeometry(rings,segments=14){
 const vertices=[],uv=[],indices=[],min=rings[0][0],height=rings[rings.length-1][0]-min;
 for(let j=0;j<rings.length;j++)for(let i=0;i<=segments;i++){
  const a=i/segments*Math.PI*2,[y,rx,rz]=rings[j];
  vertices.push(Math.sin(a)*rx,y,Math.cos(a)*rz+(rings[j][3]||0));uv.push((Math.sin(a)+1)/2,(y-min)/height);
  if(j&&i){const b=j*(segments+1)+i;indices.push(b,b-1,b-segments-2,b,b-segments-2,b-segments-1)}
 }
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeVertexNormals();return g;
}
export function stanceHeight(hipA,kneeA,hipB,kneeB){
 const sole=(hip,knee)=>.94-.43*Math.cos(hip)-.483*Math.cos(hip+knee)+.06*Math.sin(hip+knee);
 return -Math.min(sole(hipA,kneeA),sole(hipB,kneeB));
}
// The model's toes, face and chest point down local -Z. During support the foot
// travels towards +Z relative to the pelvis, cancelling forward root travel.
// Acceleration, lateral plant and counter-rotation are presentation-only.
// No frame history, result, simulation RNG or extra mesh allocations.
// V21.208: a walking pace already takes visible steps (was a glide below ~1 m/s).
export const locomotionEffort=speed=>smooth(clamp(speed)/.09);
export function locomotionDynamics(speed,turn,stride,acceleration=0,closeControl=false){
 const effort=locomotionEffort(speed),drive=clamp(acceleration,-1,1);
 const bank=clamp(turn*1.7,-.28,.28)*effort;
 const plant=smooth(Math.abs(turn)/.10)*effort;
 return{
  effort,bank,plant,
  forwardLean:-(.09+.12*clamp(speed)+.065*Math.max(0,drive))*effort,
  armSwing:closeControl?.45:.73,
  strideReach:closeControl?.87:1,
  shoulderTwist:Math.sin(stride)*.052*effort-bank*.23,
  hipDrop:.015*plant+.008*effort*(1+Math.cos(stride*2))
 };
}
// One complete left/right gait cycle follows travelled distance. Restrained reach
// prevents the overextended sprint lunge without increasing step frequency wildly.
// V21.297: jogging players got 3+ strides a second (tiny "Benny Hill"
// steps). Real jogging has a longer flight phase, so the support share
// drops most in mid speed; walking and the full sprint keep their values.
export const runningDuty=speed=>{speed=clamp(speed);return .60-.32*speed-.12*Math.sin(Math.PI*speed)};
export const runningStrideLength=speed=>2*(.15+.145*clamp(speed))/runningDuty(speed);
// Support-foot plant of a ground shot: the boot steps in (lift) beside the
// ball before SHOT_TIME, holds through contact, then steps out again.
export function plantFootSample(time){
 const weight=smooth((time-4.98)/.14)*(1-smooth((time-5.6)/.16));
 if(weight<=0)return null;
 const lift=.09*Math.sin(Math.PI*clamp((time-4.98)/.16))+.09*Math.sin(Math.PI*clamp((time-5.6)/.16));
 return{weight,lift};
}
export function runningLeg(phase,speed,out={}){
 speed=clamp(speed);const cycle=((phase/(Math.PI*2))%1+1)%1,duty=runningDuty(speed),reach=.15+.145*speed;
 const support=cycle<duty,u=support?cycle/duty:(cycle-duty)/(1-duty);
 // Match the support foot's velocity at BOTH ends of the recovery arc.
 // The old smoothstep stopped the foot abruptly at toe-off and landing.
 const recoveryTangent=2*reach*(1-duty)/duty;
 const z=support?mix(-reach,reach,u):mix(reach,-reach,smooth(u))+recoveryTangent*u*(1-u)*(1-2*u);
 // Zero vertical velocity at ground contact: no kick upwards on toe-off.
 const lift=support?0:Math.sin(Math.PI*u)**2*(.075+.11*speed);
 const hipHeight=.89-.06*speed,ankleHeight=.055+lift,down=hipHeight-ankleHeight;
 const distance=Math.min(.8599,Math.hypot(down,z)),bend=Math.acos(distance/.86);
 out.hip=Math.atan2(-z,down)+bend;out.knee=-2*bend;out.ankle=-out.hip-out.knee;
 out.z=z;out.y=ankleHeight;out.hipHeight=hipHeight;out.support=support;
 out.swingWeight=support?0:smooth(u/.18)*(1-smooth((u-.82)/.18));
 // V21.297: zero slope at lift-off and landing, full at mid-swing.
 out.swingShape=support?0:Math.sin(Math.PI*u)**2;return out;
}
// Include the existing finish/chase offsets when orienting and grounding actors.
// This changes no path or event; facing now follows the final displayed motion.
// Deterministic anticipation belongs to the visual layer, not match simulation.
export function defenderTracking(index,time,sequence='central'){
 if(index<8||index>=RUNS.length)return{x:0,z:0,pressure:0};
 const r=RUNS[index],base=lerp(r.from,r.to,smooth(clamp(time/6.9)));
 const ball=ballPosition('goal',Math.min(SHOT_TIME,Math.max(0,time)),sequence);
 const separation=Math.hypot(ball[0]-base[0],ball[2]-base[1]);
 const pressure=smooth((time-.35)/.85)*(1-smooth((time-5.50)/.95))*clamp((29-separation)/19);
 // Pressers step in; centre-backs hold cover instead of chasing every touch.
 const factor=[12,14,15].includes(index)?1:[8,11].includes(index)?.47:.72,dz=ball[2]-base[1];
 return{x:clamp((ball[0]-base[0])*.21,-2.45,2.45)*pressure*factor,
  z:clamp(dz*(dz<0?.19:.10),-1.85,1.15)*pressure*factor,pressure};
}
// Reusable, deterministic defensive animation windows. Attempts never touch the ball.
export function defensiveMotion(action,time,index,activeIndex=8,ballDistance=0){
 if(index!==activeIndex)return Object.freeze({kind:'cover',intensity:0,slide:0,jump:0,plant:0,recover:0});
 const windows={
  jockey:[2.1,5.65],close_down:[3.0,5.85],slide_attempt:[4.05,6.10],
  block_attempt:[4.55,6.1],lane_read:[1.85,3.22],aerial_challenge:[4.35,5.83]
 };
 const [start,end]=windows[action]||windows.jockey;
 // A timed tackle must also be close to the visible ball.
 // This prevents isolated falls when no attacker is in reach.
 const reach=action==='slide_attempt'?3.6:action==='block_attempt'?4.8:action==='aerial_challenge'?4.3:
  action==='lane_read'?7.5:action==='close_down'?8.0:12;
 const proximity=1-smooth((Math.max(0,Number(ballDistance)||0)-reach)/2);
 const intensity=smooth((time-start)/.38)*(1-smooth((time-end+.47)/.47))*proximity;
 const plant=smooth((time-start)/.24)*(1-smooth((time-start-.35)/.30))*proximity;
 const recover=smooth((time-(end-.40))/.43)*proximity;
 const slide=action==='slide_attempt'?intensity:0;
 const jump=action==='aerial_challenge'?.28*Math.sin(Math.PI*smooth((time-start)/(end-start)))*intensity:0;
 return Object.freeze({kind:action,intensity,slide,jump,plant,recover});
}
// Swing follows the visible pass release, without modifying the ball path.
export function passStrikePose(progress){
 const u=clamp(progress),swing=smooth((u-.22)/.30),follow=smooth((u-.50)/.5);
 const hip=mix(-.78,.84,swing)+.19*follow,knee=mix(-.70,-.12,swing);
 return{hip,knee,ankle:-hip-knee,follow};
}
export function playerPosition(index,time,type='goal',sequence='central',placement=null,finish='normal'){
 const p=runPosition(index,time,sequence);
 if(extendedKind(sequence))return p;
 if(DEFENSIVE_SCENES.includes(normalizeSequence(sequence)))return p;
 if(time>SHOT_TIME&&[8,9,10,11,12,14,15].includes(index))p[1]-=smooth((time-SHOT_TIME)/1.8)*(.35+hash(index+200)*.8);
 const plan=getPlay(normalizeSequence(sequence));
 if([2,3].includes(index)&&(!plan||!plan.order.includes(index))){
  // A free runner checks short, then accelerates back into his original lane.
  // Scheduled pass receivers retain their exact authored contact paths.
  const check=smooth((time-.7)/.8)*(1-smooth((time-2.15)/.95));
  p[0]+=(index===2?-1:1)*.85*check;p[1]+=.95*check;
 }
 if(time>REVEAL_TIME&&[0,2,3].includes(index)){
  if(type==='goal'&&index===0)p[1]-=Math.min(3,time-REVEAL_TIME)*.6;
  else if(type==='goal'||type==='shot_post'){
   // Support reacts to the visible outcome, without staging another shot.
   const anchor=runPosition(index,REVEAL_TIME,sequence),scorer=runPosition(0,REVEAL_TIME,sequence);
   const rebound=type==='shot_post'?ballPosition(type,IMPACT_TIME+.65,sequence,finish,'classic',placement):null;
   const target=rebound?[rebound[0],rebound[2]+1.8]:[scorer[0]+(index===2?-1.8:1.8),scorer[1]+1.2];
   const dx=target[0]-anchor[0],dz=target[1]-anchor[1],d=Math.hypot(dx,dz)||1;
   const travel=Math.min(type==='goal'?4.5:3,d)*smooth((time-REVEAL_TIME)/2.7);
   p[0]+=dx/d*travel;p[1]+=dz/d*travel;
  }
 }
 return p;
}
export function makeScene(renderer,event,weak=false,high=false,mobileStandard=false,baselineRig=false,pilotMotion=false,allowImported=true,modelVariant='quaternius'){
 const enhancedRigMotion=!baselineRig&&!(typeof window!=='undefined'&&window.__FOOTERA_V2137_BASELINE===true);
 const spooky=halloweenNight();
 const scene=new THREE.Scene();scene.background=new THREE.Color(spooky?'#0b0714':'#16262b');scene.fog=spooky?new THREE.Fog('#160c20',120,262):new THREE.Fog('#1b2d31',148,286);
 const camera=new THREE.PerspectiveCamera(28,1,.5,350);
 const resources=new Set(),track=o=>(resources.add(o),o);
 const direction=event.attackDirection===-1?-1:1,sequence=normalizeSequence(event.sequence),base=baseSequence(sequence),finish=normalizeFinish(event.finish),keeperAction=String(event.keeperAction||'classic'),defenderAction=String(event.defenderAction||'jockey'),defenderIndex=Number.isInteger(event.defenderIndex)&&event.defenderIndex>=8&&event.defenderIndex<16?event.defenderIndex:8;
 const extended=extendedKind(sequence);
 const placement=event.shotPlacement||null;
 const eventBallPosition=(type,time,seq=sequence,style=finish,action=keeperAction)=>ballPosition(type,time,seq,style,action,placement);
 const eventShotImpact=(type,seq=sequence,style=finish)=>shotImpact(type,seq,style,placement);
 const netArrival=shotArrival('goal',sequence,finish,placement)+goalNetDelay(placement),netPoint=goalNetPoint(sequence,finish,placement);
 const signature=event.motionDuelPreview===true?null:signatureWindow(event,sequence);
 const eventKeeperPose=(type,time,style=finish,seq=sequence,action=keeperAction)=>keeperPose(type,time,style,seq,action,placement);
 const eventCameraState=(dir,time,aspect=1.3,type=event.type,seq=sequence,style=finish,action=keeperAction)=>cameraState(dir,time,aspect,type,seq,style,action,placement);
 // All match-space objects, pitch markings and both goals share one transform.
 const field=new THREE.Group();field.rotation.y=direction===1?0:Math.PI;scene.add(field);
 // Isolated demonstration ONLY, not an authoritative match highlight.
 const labDuelPreview=pilotMotion!==null&&event.motionDuelPreview===true&&isContactDemo(defenderAction);
 const labTrackingPreview=pilotMotion!==null&&event.motionDuelPreview===true&&isTrackingAction(defenderAction);
 const labFocusedPreview=labDuelPreview||labTrackingPreview;
 const labBallAt=t=>eventBallPosition(event.type,t,sequence,finish,keeperAction);
 const trackingTimeline=labTrackingPreview?createTrackingTimeline(defenderAction,sequence,t=>playerPosition(0,t,event.type,sequence),DURATION):null;
 const defensiveUnit=labFocusedPreview||extended?null:createDefensiveUnit({
  positionAt:(i,t)=>playerPosition(i,t,event.type,sequence,placement,finish),ballAt:t=>eventBallPosition(event.type,t),
  defenderIndex,ballWon:event.type==='ball_won',duration:DURATION
 });
 const lineClearer=event.type==='big_chance_missed'&&keeperAction==='line_clear'&&!extended&&!labFocusedPreview?(()=>{
  const impact=lineClearImpact(sequence,finish,placement),spot=[impact[0]-Math.sign(impact[0])*.28,-51.72];
  const raw=i=>defensiveUnit?defensiveUnit.position(i,SHOT_TIME-1.1):playerPosition(i,SHOT_TIME-1.1,event.type,sequence,placement,finish);
  const pick=RUNS.map((r,i)=>r.team==='defend'&&i!==defenderIndex?{index:i,d:Math.hypot(raw(i)[0]-spot[0],raw(i)[1]-spot[1])}:null).filter(Boolean).sort((a,b)=>a.d-b.d)[0];
  return pick?{index:pick.index,spot}:null;
 })():null;
 // V21.185 goal celebration: after the ball is in the net the scorer peels
 // away towards the broadcast touchline. Field-local metres; the camera side
 // is local +x for direction 1 and -x for direction -1.
 // V21.195 drama: a late equaliser or winner (88th minute on) brings the
 // whole nearby team running to the scorer and its own headline.
 const lateDrama=lateGoalDrama(event);
 // V21.226: walk-out and final whistle reuse this stadium and squad.
 const ceremony=ceremonyKind(event),ceremonyDraw=event.result==='draw';
 const crowdType=ceremony?(ceremony==='fulltime'&&ceremonyDraw?'ceremony_draw':'ceremony_'+ceremony):event.type;
 const celebrationActive=event.type==='goal'&&!labFocusedPreview&&!DEFENSIVE_SCENES.includes(sequence);
 const CELEBRATION_START=IMPACT_TIME+.35,CELEBRATION_CUT=IMPACT_TIME+.6;
 const celebrationKey=`${event.matchId??''}|${event.id??''}|${event.minute??''}|${event.playerName??''}`;
 const celebrationKind=globalThis.__FOOTERA_QA_CELEBRATION||(celebrationKey===celebrationMemory.key?celebrationMemory.kind:pickCelebration(event,celebrationMemory.kind));
 if(celebrationActive&&celebrationKey!==celebrationMemory.key)celebrationMemory={key:celebrationKey,kind:celebrationKind};
 const celebrationRun=(()=>{const x=direction,z=.28,l=Math.hypot(x,z);return[x/l,z/l]})();
 function celebrationShift(time){
  if(!celebrationActive||time<=CELEBRATION_START)return 0;
  // V21.297: accelerate into the run-off over 0.4 s; the curves start at
  // full speed, which jerked the scorer from a walk into a sprint.
  const s=time-CELEBRATION_START,ramp=.4;
  return celebrationDistance(celebrationKind,s<ramp?s*s/(2*ramp):s-ramp/2);
 }
 // Facing along the run-away line for the whole celebration, even while
 // the scorer stands still (no snap back to his tactical facing).
 const celebrationHeading=Math.atan2(-celebrationRun[0],-celebrationRun[1]);
 function actorPosition(index,time,type=event.type,seq=sequence){
  const p=stagedPlayerPosition(index,time,type,seq);
  if(index!==0)return huggers.length?hugPosition(index,time,p):p;
  const d=celebrationShift(time);
  return d?[p[0]+celebrationRun[0]*d,p[1]+celebrationRun[1]*d]:p;
 }
 // V21.193: the two nearest teammates sprint to the scorer and hug him,
 // one on each side, a little behind so the close-up still sees his face.
 const HUG_START=CELEBRATION_START+.2;
 const huggers=celebrationActive?(()=>{
  // Measured to where the scorer will be, since he keeps running away.
  const s=actorPosition(0,HUG_START+2.6);
  return RUNS.map((r,i)=>{const p=stagedPlayerPosition(i,HUG_START);return{index:i,d:i&&r.team==='attack'?Math.hypot(p[0]-s[0],p[1]-s[1]):Infinity}})
   // V21.297: only teammates who can get there at a footballer's sprint;
   // 24 m in 2.4 s peaked at 15 m/s, with legs cycling twice too fast.
   .filter(h=>h.d<(lateDrama?21:18)).sort((a,b)=>a.d-b.d).slice(0,lateDrama?5:2)
   .map((h,slot)=>({index:h.index,slot,arrive:clamp(h.d/5.3,1.3,3.1),state:{arms:0,rootY:0}}));
 })():[];
 function hugWeight(index,time){
  const h=time>HUG_START?huggers.find(x=>x.index===index):null;
  return h?smooth((time-HUG_START)/h.arrive):0;
 }
 function hugPosition(index,time,p){
  const u=hugWeight(index,time);if(!u)return p;
  const h=huggers.find(x=>x.index===index),s=actorPosition(0,time),[rx,rz]=celebrationRun;
  // Slots 0/1 hug from the sides; a late-drama pile-up adds a ring behind him.
  const side=h.slot<2?(h.slot?-1:1):[-.75,.75,0][h.slot-2],back=h.slot<2?.14:h.slot<4?.72:1.05,wide=h.slot<2?.46:Math.abs(side)>0?.52:0;
  const sx=Math.sign(side)||0;
  return[mix(p[0],s[0]-rz*sx*wide-rx*back,u),mix(p[1],s[1]+rx*sx*wide-rz*back,u)];
 }
 // V21.200 (Basti): no zoom cameras in match scenes. Star finishes and
 // goal-line clearances stay in the normal TV picture; only the scorer
 // close-up after a goal and the set-piece TV angles remain.
 function stagedPlayerPosition(index,time,type=event.type,seq=sequence){
  if(ceremony){const a=ceremonyActor(ceremony,index,time,{draw:ceremonyDraw});return[a.x,a.z]}
  const original=defensiveUnit?defensiveUnit.position(index,time):playerPosition(index,time,type,seq,placement,finish);
  if(lineClearer&&index===lineClearer.index){
   // The covering defender sprints back onto the line and blocks the shot there.
   const u=smooth((time-(SHOT_TIME-1.1))/1.65);
   return u?[mix(original[0],lineClearer.spot[0],u),mix(original[1],lineClearer.spot[1],u)]:original;
  }
  if(index!==defenderIndex)return original;
  if(labDuelPreview)return stagedDefenderPosition(defenderAction,time,sequence,labBallAt,original);
  if(labTrackingPreview)return trackingTimeline.sample(time).position;
  return original;
 }
 try{
  const geometry=new Map(),materials=new Map(),staticBoxes=[];
  function geo(key,create){if(!geometry.has(key))geometry.set(key,track(create()));return geometry.get(key)}
  function mat(color,opts={}){const key=JSON.stringify([color,opts]);if(!materials.has(key))materials.set(key,track(opts.basic?new THREE.MeshBasicMaterial({color,...opts}):new THREE.MeshStandardMaterial({color,roughness:.85,...opts})));return materials.get(key)}
  function mesh(g,m,parent=field){const o=new THREE.Mesh(g,m);parent.add(o);return o}
  function box(w,h,d,color,x=0,y=0,z=0,parent=field){const o=mesh(geo('box',()=>new THREE.BoxGeometry(1,1,1)),mat(color),parent);o.scale.set(w,h,d);o.position.set(x,y,z);staticBoxes.push(o);return o}
  function cylinder(top,bottom,height,color,x,y,z,parent=field){const key=`c:${top}:${bottom}`;const o=mesh(geo(key,()=>new THREE.CylinderGeometry(top,bottom,1,10)),mat(color),parent);o.scale.y=height;o.position.set(x,y,z);return o}
  function ellipsoid(w,h,d,color,x,y,z,parent=field){const o=mesh(geo('sphere',()=>new THREE.SphereGeometry(1,12,10)),mat(color),parent);o.scale.set(w,h,d);o.position.set(x,y,z);return o}
  function canvasTexture(w,h,draw){const c=document.createElement('canvas');c.width=w;c.height=h;draw(c.getContext('2d'),w,h);const tex=track(new THREE.CanvasTexture(c));tex.colorSpace=THREE.SRGBColorSpace;return tex}
  // Small, deterministic cloth maps wrap a continuous athletic torso. Saved
  // colours/patterns remain the source; there are no floating pattern boxes.
  const shirtMaterials=new Map();
  function shirtMaterial(kit){
   const key=JSON.stringify(kit);if(shirtMaterials.has(key))return shirtMaterials.get(key);
   const map=canvasTexture(256,256,(ctx,w,h)=>{
    ctx.fillStyle=kit.shirt;ctx.fillRect(0,0,w,h);ctx.fillStyle=kit.shirtSecondary;
    const rect=(x,y,a,b)=>ctx.fillRect(x*w,y*h,a*w,b*h);
    if(!globalThis.FooteraKitArt?.paint(ctx,kit,w,h))switch(kit.pattern){
     case 'stripes':for(const x of [.19,.47,.75])rect(x,0,.08,1);break;
     case 'pinstripes':for(const x of [.16,.32,.48,.64,.8])rect(x,0,.022,1);break;
     case 'hoops':for(const y of [.18,.45,.72])rect(0,y,1,.09);break;
     case 'halves':rect(.5,0,.5,1);break;
     case 'quarters':rect(.5,0,.5,.5);rect(0,.5,.5,.5);break;
     case 'center':rect(.38,0,.24,1);break;
     case 'chestband':rect(0,.30,1,.19);break;
     case 'shoulders':rect(0,0,1,.20);break;
     case 'sidepanels':rect(0,0,.16,1);rect(.84,0,.16,1);break;
     case 'diagonal':ctx.beginPath();ctx.moveTo(0,h*.06);ctx.lineTo(w,h*.80);ctx.lineTo(w,h*.96);ctx.lineTo(0,h*.22);ctx.fill();break;
     case 'reverse':ctx.beginPath();ctx.moveTo(0,h*.80);ctx.lineTo(w,h*.06);ctx.lineTo(w,h*.22);ctx.lineTo(0,h*.96);ctx.fill();break;
     case 'doubleband':rect(0,.32,1,.10);rect(0,.48,1,.10);break;
     case 'checkers':for(let y=0;y<8;y++)for(let x=0;x<8;x++)if((x+y)%2)rect(x/8,y/8,1/8,1/8);break;
     case 'diamonds':for(let y=-1;y<6;y++)for(let x=-1;x<6;x++){ctx.beginPath();ctx.moveTo((x+.5)*w/5,y*h/5);ctx.lineTo((x+1)*w/5,(y+.5)*h/5);ctx.lineTo((x+.5)*w/5,(y+1)*h/5);ctx.lineTo(x*w/5,(y+.5)*h/5);ctx.fill()}break;
     case 'fade':{const gradient=ctx.createLinearGradient(0,0,0,h);gradient.addColorStop(0,kit.shirt);gradient.addColorStop(1,kit.shirtSecondary);ctx.fillStyle=gradient;ctx.fillRect(0,0,w,h);break}
     case 'splitstripe':rect(.34,0,.12,1);rect(.54,0,.12,1);break;
     case 'cuffs':rect(0,0,1,.10);rect(0,.92,1,.08);break;
     case 'chevron':ctx.beginPath();ctx.moveTo(0,h*.19);ctx.lineTo(w*.5,h*.43);ctx.lineTo(w,h*.19);ctx.lineTo(w,h*.32);ctx.lineTo(w*.5,h*.56);ctx.lineTo(0,h*.32);ctx.fill();break;
    }
    const shade=ctx.createLinearGradient(0,0,w,0);shade.addColorStop(0,'#00000035');shade.addColorStop(.28,'#ffffff08');shade.addColorStop(.65,'#ffffff04');shade.addColorStop(1,'#00000035');ctx.fillStyle=shade;ctx.fillRect(0,0,w,h);
    ctx.strokeStyle='#ffffff0a';ctx.lineWidth=1;for(let y=1;y<h;y+=3){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(w,y);ctx.stroke()}
    ctx.strokeStyle='#00000025';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(18,h);ctx.quadraticCurveTo(28,h*.72,12,h*.55);ctx.moveTo(w-18,h);ctx.quadraticCurveTo(w-30,h*.8,w-12,h*.62);ctx.stroke();
    ctx.strokeStyle=kit.shirtSecondary;ctx.lineWidth=8;ctx.beginPath();ctx.ellipse(w*.5,0,w*.14,h*.095,0,0,Math.PI);ctx.stroke();
   });map.anisotropy=Math.min(4,renderer.capabilities.getMaxAnisotropy());
   const material=track(new THREE.MeshStandardMaterial({map,roughness:.92,metalness:0}));shirtMaterials.set(key,material);return material;
  }
  const hemi=spooky?new THREE.HemisphereLight('#a596d6','#241a12',1.0):new THREE.HemisphereLight('#dce9f7','#31422a',1.3);scene.add(hemi);
  const sun=new THREE.DirectionalLight(spooky?'#ffe2c2':'#fff5df',spooky?2.7:2.75);sun.position.set(-35,65,10);sun.target.position.set(0,0,-28*direction);scene.add(sun,sun.target);sun.castShadow=!weak;
  sun.shadow.mapSize.set(high?2048:1024,high?2048:1024);Object.assign(sun.shadow.camera,{left:-38,right:38,top:38,bottom:-38,near:1,far:160});sun.shadow.bias=-.00018;sun.shadow.normalBias=.018;
  const fill=new THREE.DirectionalLight(spooky?'#a070ff':'#c6ddff',(weak?.24:.48)*(spooky?1.6:1));fill.position.set(40,18,-50);scene.add(fill);

  // One 1024px map covers the playing surface: visible mowing, broad soil/grass
  // variation and fine blade noise survive mip filtering without extra planes.
  const grass=canvasTexture(1024,1024,(ctx,w,h)=>{
   const pixels=ctx.createImageData(w,h),data=pixels.data;
   for(let y=0;y<h;y++)for(let x=0;x<w;x++){
    const wx=x/w*78-39,wz=(1-y/h)*119-59.5,inside=Math.abs(wx)<34&&Math.abs(wz)<52.5;
    const stripe=inside?(Math.floor((wz+52.5)/7.5)%2?5:-5):-9;
    const broad=Math.sin(x*.018+y*.011)*1.0+Math.sin(y*.053-x*.021)*1.1;
    const fibre=(hash(y*w+x)-.5)*10,tuft=(hash(Math.floor(x/5)+Math.floor(y/5)*211)-.5)*2.4;
    const wear=Math.exp(-((Math.abs(wz)-50.2)**2/6+wx*wx/22))*4;
    const n=stripe+broad+fibre+tuft-wear,i=(y*w+x)*4;
    data[i]=63+n*.67;data[i+1]=120+n;data[i+2]=38+n*.45;data[i+3]=255;
   }ctx.putImageData(pixels,0,0);
  });grass.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());
  const pitch=mesh(track(new THREE.PlaneGeometry(78,119)),track(new THREE.MeshStandardMaterial({map:grass,roughness:1,color:spooky?'#dcd8e6':'#ffffff'})));pitch.rotation.x=-Math.PI/2;pitch.position.y=-.025;pitch.receiveShadow=true;
  const contactTexture=canvasTexture(64,64,(ctx,w,h)=>{const gradient=ctx.createRadialGradient(w/2,h/2,0,w/2,h/2,w/2);gradient.addColorStop(0,'rgba(5,12,4,.6)');gradient.addColorStop(.3,'rgba(5,12,4,.35)');gradient.addColorStop(1,'rgba(5,12,4,0)');ctx.fillStyle=gradient;ctx.fillRect(0,0,w,h)});
  const contactMaterial=track(new THREE.MeshBasicMaterial({map:contactTexture,transparent:true,opacity:weak?.80:.58,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1}));
  // Surface ribbons; LOW widens them slightly to survive its subpixel sampling.
  const markings=[],markingCenters=[];
  function line(points,width=weak?.20:.12){for(let i=1;i<points.length;i++){const a=points[i-1],b=points[i],dx=b[0]-a[0],dz=b[1]-a[1],l=Math.hypot(dx,dz),nx=-dz/l*width/2,nz=dx/l*width/2;const p=[a[0]+nx,.018,a[1]+nz,a[0]-nx,.018,a[1]-nz,b[0]+nx,.018,b[1]+nz,b[0]-nx,.018,b[1]-nz];markings.push(...p.slice(0,9),...p.slice(3,6),...p.slice(9,12),...p.slice(6,9));if(weak)markingCenters.push(a[0],.020,a[1],b[0],.020,b[1])}}
  function arc(cx,cz,r,start=0,end=Math.PI*2){const pts=[];for(let i=0;i<=80;i++){const a=mix(start,end,i/80);pts.push([cx+Math.cos(a)*r,cz+Math.sin(a)*r])}line(pts)}
  line([[-34,-52.5],[34,-52.5],[34,52.5],[-34,52.5],[-34,-52.5]]);line([[-34,0],[34,0]]);arc(0,0,9.15);arc(0,0,.12);
  for(const sign of [-1,1]){
   line([[-20.16,52.5*sign],[-20.16,36*sign],[20.16,36*sign],[20.16,52.5*sign]]);
   line([[-9.16,52.5*sign],[-9.16,47*sign],[9.16,47*sign],[9.16,52.5*sign]]);
   arc(0,41.5*sign,.14);const pts=[];for(let i=0;i<=40;i++){const a=.645+(Math.PI-1.29)*i/40;pts.push([Math.cos(a)*9.15,sign*(41.5-Math.sin(a)*9.15)])}line(pts);
   for(const x of [-34,34]){const cx=x<0?0:Math.PI/2;arc(x,52.5*sign,1,sign<0?cx:Math.PI+cx,sign<0?cx+Math.PI/2:Math.PI*1.5+cx);cylinder(.025,.025,1.65,'#f4e4c5',x,.82,52.5*sign);box(.4,.3,.03,'#c11d3f',x+.2,1.5,52.5*sign)}
  }
  const mg=track(new THREE.BufferGeometry());mg.setAttribute('position',new THREE.Float32BufferAttribute(markings,3));mg.computeVertexNormals();mesh(mg,track(new THREE.MeshBasicMaterial({color:'#eff1db',side:THREE.DoubleSide})));
  // LOW has no MSAA: a one-pixel centreline keeps distant ribbons continuous
  // when their projected width falls below one sample. One shared draw call.
  if(weak){const edges=track(new THREE.BufferGeometry());edges.setAttribute('position',new THREE.Float32BufferAttribute(markingCenters,3));field.add(new THREE.LineSegments(edges,track(new THREE.LineBasicMaterial({color:'#eff1db'}))))}
  function goal(z,sign){
   const g=new THREE.Group();field.add(g);g.position.z=z;g.rotation.y=sign===-1?0:Math.PI;
   const posts=mat('#f7faf7'),uprights=[];for(const x of [-3.66,3.66]){const p=mesh(geo('post',()=>new THREE.CylinderGeometry(.06,.06,2.5,12)),posts,g);p.position.set(x,1.22,0);p.castShadow=!weak;uprights.push(p)}
   const bar=mesh(geo('bar',()=>new THREE.CylinderGeometry(.06,.06,7.44,12)),posts,g);bar.position.y=2.44;bar.rotation.z=Math.PI/2;bar.castShadow=!weak;
   const net=[],seg=(a,b)=>net.push(...a,...b);
   for(let x=-3.66;x<=3.67;x+=.244){seg([x,0,-1.9],[x,2.44,-1.9]);seg([x,2.44,-1.9],[x,2.44,0])}
   for(let y=0;y<=2.45;y+=.2033){seg([-3.66,y,-1.9],[3.66,y,-1.9]);for(const x of [-3.66,3.66])seg([x,y,-1.9],[x,y,0])}
   for(let z=-1.9;z<=.001;z+=.2375){for(const x of [-3.66,3.66])seg([x,0,z],[x,2.44,z]);seg([-3.66,2.44,z],[3.66,2.44,z])}
   // Ground frame, rear stanchions and tension stays make the net a volume.
   const frame=[];for(const x of [-3.66,3.66]){frame.push(x,.045,0,x,.045,-1.95,x,.045,-1.95,x,2.47,-1.95,x,2.47,-1.95,x,2.44,0)}
   frame.push(-3.66,.045,-1.95,3.66,.045,-1.95);
   const fg=track(new THREE.BufferGeometry());fg.setAttribute('position',new THREE.Float32BufferAttribute(frame,3));g.add(new THREE.LineSegments(fg,track(new THREE.LineBasicMaterial({color:'#e2e5db'}))));
   const ng=track(new THREE.BufferGeometry());ng.setAttribute('position',new THREE.Float32BufferAttribute(net,3));const base=new Float32Array(net);
   const nm=track(new THREE.LineBasicMaterial({color:'#edf0e7',transparent:true,opacity:weak?.46:.56,depthWrite:false}));g.add(new THREE.LineSegments(ng,nm));
   return{geometry:ng,base,bar,uprights};
  }
  const net=goal(-52.5,-1);goal(52.5,1);

  // V21.18 — broadcast crowd/stadium pass. Humans stay instanced and deterministic;
  // darker tiering, irregular spacing and segmented flags add depth without extra per-fan draw calls.
  box(100,.1,143,'#172126',0,-.15,0,scene);
  const crowdKits=kitColors(event),crowd=[],crowdRows=weak?8:mobileStandard?10:high?12:12,sideCols=weak?94:mobileStandard?144:high?204:170,endCols=weak?64:mobileStandard?102:high?148:120;
  const sideSupporter=z=>z<-22?'home':z>22?'away':'neutral';
  for(const side of [-1,1]){
   for(let row=0;row<12;row++){
    box(2.0,.64,119,row%2?'#172126':'#202c31',side*(39.3+row*1.42),.52+row*.72,0,scene);
    box(79,.64,2.0,row%2?'#172126':'#202c31',0,.52+row*.72,side*(59.4+row*1.42),scene);
    if(row<crowdRows){
     for(let col=0;col<sideCols;col++){
      const z=-56+col*(112/Math.max(1,sideCols-1));
      if(col%28>1)crowd.push({x:side*(39.3+row*1.42),y:1.13+row*.72,z,team:sideSupporter(z),row,zone:'side'});
     }
     for(let col=0;col<endCols;col++)if(col%26>1)crowd.push({x:-37+col*(74/Math.max(1,endCols-1)),y:1.13+row*.72,z:side*(59.4+row*1.42),team:side<0?'home':'away',row,zone:'end'});
    }
   }
   box(5,.3,122,'#132025',side*57,10.2,0,scene);box(112,.3,7,'#132025',0,10.2,side*80,scene);
   box(6,.35,126,'#0f191d',side*59,12.15,0,scene);box(118,.35,8,'#0f191d',0,12.15,side*82,scene);
   box(.16,.72,116,'#738184',side*38.25,1.02,0,scene);box(76,.72,.16,'#738184',0,1.02,side*58.25,scene);
   for(let z=-56;z<=56;z+=14)box(.16,8.5,.16,'#748285',side*57,5,z,scene);
  }
  // Rounded corner terraces connect the existing stands instead of leaving
  // a black rectangular void. Geometry shares the static stadium batches.
  for(const sx of [-1,1])for(const sz of [-1,1])for(let row=0;row<12;row++){
   const radius=2.3+row*1.42,count=8;
   for(let col=0;col<count;col++){
    const angle=(col+.5)/count*Math.PI/2,x=sx*(37+Math.cos(angle)*radius),z=sz*(57.1+Math.sin(angle)*radius);
    const terrace=box(radius*Math.PI/(2*count)+.20,.64,2,row%2?'#172126':'#202c31',x,.52+row*.72,z,scene);terrace.rotation.y=-sx*sz*angle-Math.PI/2;
    if(row<crowdRows){const slots=weak?1:Math.max(1,Math.round(radius*.16));for(let n=0;n<slots;n++){
     const a=(col+(n+.5)/slots)/count*Math.PI/2;
     crowd.push({x:sx*(37+Math.cos(a)*radius),y:1.13+row*.72,z:sz*(57.1+Math.sin(a)*radius),team:sz<0?'home':'away',row,zone:'corner'});
    }}
   }
  }
  // Concrete aisles and a recessed concourse break up the dark tier bands.
  for(const side of [-1,1]){
   for(let row=0;row<12;row++){
    for(let col=0;col<sideCols;col+=28)box(1.5,.06,1.1,'#738184',side*(39.3+row*1.42),.88+row*.72,-56+(col+.5)*112/(sideCols-1),scene);
    for(let col=0;col<endCols;col+=26)box(1.1,.06,1.5,'#738184',-37+(col+.5)*74/(endCols-1),.88+row*.72,side*(59.4+row*1.42),scene);
   }
   box(2,.14,119,'#202c31',side*55.9,9.55,0,scene);box(79,.14,2,'#202c31',0,9.55,side*76.1,scene);
  }
  const animatedShare=weak?.22:mobileStandard?.44:high?.76:.62;
  const crowdSpecs=crowd.map((p,i)=>({...p,x:p.x+(p.zone==='end'?(hash(i*89+7)-.5)*.46:(hash(i*89+7)-.5)*.12),z:p.z+(p.zone==='side'?(hash(i*97+11)-.5)*.46:(hash(i*97+11)-.5)*.12),index:i,phase:hash(i*29+3)*Math.PI*2,loop:Math.floor(hash(i*31+9)*3),height:1.25+hash(i*37+5)*.38,width:.94+hash(i*41+7)*.28,depth:.96+hash(i*43+11)*.18,lift:hash(i*47+13)*.13,animated:hash(i*53+17)<animatedShare}));
  const crowdStaticSpecs=crowdSpecs.filter(x=>!x.animated),crowdDynamicSpecs=crowdSpecs.filter(x=>x.animated);
  const crowdDummy=new THREE.Object3D(),crowdColor=new THREE.Color(),crowdArmAxis=new THREE.Vector3(0,1,0),crowdArmDirection=new THREE.Vector3(),neutralFanPalette=['#313a3d','#65717a','#ddd9cf','#8e6f58'],crowdPantsPalette=['#1c252b','#2c3842','#41484d','#32445d','#54473f'];
  function fanPalette(team){
   const kit=team==='home'?crowdKits.home:team==='away'?crowdKits.away:null;
   return kit?[kit.shirt,kit.shirt,kit.shirtSecondary,'#e4e1d8','#26343a','#52616a','#a39485','#d2c8b5','#343c49']:neutralFanPalette;
  }
  function crowdGroup(specs,dynamic){
   // Human TV silhouettes: broader torso, separate head, arms and legs. All parts remain instanced.
   const torso=new THREE.InstancedMesh(geo('crowd-torso-human',()=>athleticGeometry([[-.295,.19,.12],[.10,.24,.14],[.255,.22,.12],[.295,.075,.07]],6)),mat('#ffffff'),specs.length);
   const head=new THREE.InstancedMesh(geo('crowd-head-human',()=>{const g=new THREE.SphereGeometry(.123,7,6),p=g.attributes.position,c=[];for(let i=0;i<p.count;i++){const shade=p.getY(i)>.056?.18:1;c.push(shade,shade,shade)}g.setAttribute('color',new THREE.Float32BufferAttribute(c,3));return g}),mat('#ffffff',{vertexColors:true}),specs.length);
   const arms=new THREE.InstancedMesh(geo('crowd-arm-human',()=>new THREE.CylinderGeometry(.055,.047,.48,6)),mat('#ffffff'),specs.length*2);
   const legs=new THREE.InstancedMesh(geo('crowd-leg-human',()=>new THREE.CylinderGeometry(.064,.052,.50,6)),mat('#ffffff'),specs.length*2);
   for(const mesh of [torso,head,arms,legs]){mesh.instanceMatrix.setUsage(dynamic?THREE.DynamicDrawUsage:THREE.StaticDrawUsage);mesh.frustumCulled=false;scene.add(mesh);track(mesh)}
   return{torso,head,arms,legs,specs,dynamic};
  }
  const crowdStatic=crowdGroup(crowdStaticSpecs,false),crowdDynamic=crowdGroup(crowdDynamicSpecs,true);
  function writeCrowdFan(spec,i,group,time=0,paint=false){
   const reaction=group.dynamic?crowdReactionState(crowdType,event.team,spec.team,time):{suspense:0,mood:0};
   const positive=Math.max(0,reaction.mood),negative=Math.max(0,-reaction.mood),wave=group.dynamic?Math.sin(time*(1.35+spec.loop*.41)+spec.phase):0;
   const cheerBeat=group.dynamic?Math.abs(Math.sin(time*(4.25+spec.loop*.55)+spec.phase)):0;
   const jump=cheerBeat*positive*.34,bob=wave*.045+jump+reaction.suspense*.055;
   const bodyY=spec.y-.25+.64*spec.height+bob,lean=wave*.055+negative*.09,yaw=Math.atan2(-spec.x,-spec.z),lx=Math.cos(yaw),lz=-Math.sin(yaw);
   crowdDummy.position.set(spec.x,bodyY,spec.z);crowdDummy.rotation.set(0,yaw,lean);crowdDummy.scale.set(spec.width,spec.height,spec.depth);crowdDummy.updateMatrix();group.torso.setMatrixAt(i,crowdDummy.matrix);
   crowdDummy.position.set(spec.x,bodyY+.33*spec.height,spec.z);crowdDummy.rotation.set(0,yaw,lean*.45);crowdDummy.scale.set(.95+.08*spec.width,.95+.06*spec.height,.95);crowdDummy.updateMatrix();group.head.setMatrixAt(i,crowdDummy.matrix);
   const despair=negative;
   const idleRaise=spec.loop===2?.20+.18*(wave+1):spec.loop===1?.08+.12*(wave+1):.025;
   const raise=clamp(reaction.suspense*.42+positive*1.05+despair*.62+idleRaise);
   const shoulderY=bodyY+.1*spec.height;
   for(const side of [-1,1]){
    const armIndex=i*2+(side>0?1:0);
    // Keep each arm attached to its shoulder while resting, clapping or cheering.
    // Static spectators also have distinct relaxed poses, without extra draw calls.
    const angle=mix(.10,2.50,raise),bend=spec.loop===1?.58:spec.loop===2?.32:.08;
    const ax=side*Math.sin(angle),ay=-Math.cos(angle)*Math.cos(bend),az=Math.cos(angle)*Math.sin(bend),half=.24*spec.height;
    const dx=ax*lx+az*Math.sin(yaw),dz=ax*lz+az*Math.cos(yaw);
    crowdDummy.position.set(spec.x+side*.22*spec.width*lx+dx*half,shoulderY+ay*half,spec.z+side*.22*spec.width*lz+dz*half);
    crowdArmDirection.set(dx,ay,dz);crowdDummy.quaternion.setFromUnitVectors(crowdArmAxis,crowdArmDirection);
    crowdDummy.scale.set(.92,spec.height,.92);crowdDummy.updateMatrix();group.arms.setMatrixAt(armIndex,crowdDummy.matrix);

    const legIndex=i*2+(side>0?1:0),stance=.035+hash(spec.index*71+(side>0?29:13))*.055;
    crowdDummy.position.set(spec.x+side*(.085+.018*spec.width)*lx,bodyY-.365*spec.height,spec.z+side*(.085+.018*spec.width)*lz+(hash(spec.index*73+legIndex)-.5)*.035);
    crowdDummy.rotation.set(0,yaw,side*stance+wave*.012);
    crowdDummy.scale.set(.9,spec.height*(.9+hash(spec.index*79+legIndex)*.08),.9);crowdDummy.updateMatrix();group.legs.setMatrixAt(legIndex,crowdDummy.matrix);
   }
   if(paint){
    const palette=fanPalette(spec.team),shirt=palette[Math.floor(hash(spec.index*59+23)*palette.length)],skin=skinTone('supporter',spec.index),pants=crowdPantsPalette[Math.floor(hash(spec.index*83+31)*crowdPantsPalette.length)];
    const shade=.90+hash(spec.index*101+3)*.10-Math.min(11,spec.row)*.012;
    group.torso.setColorAt(i,crowdColor.set(shirt).multiplyScalar(shade));group.head.setColorAt(i,crowdColor.set(skin).multiplyScalar(shade));
    const sleeves=hash(spec.index*103+5)>.45?shirt:skin;
    group.arms.setColorAt(i*2,crowdColor.set(sleeves).multiplyScalar(shade));group.arms.setColorAt(i*2+1,crowdColor.set(sleeves).multiplyScalar(shade));
    group.legs.setColorAt(i*2,crowdColor.set(pants));group.legs.setColorAt(i*2+1,crowdColor.set(pants));
   }
  }
  function initCrowdGroup(group){
   group.specs.forEach((spec,i)=>writeCrowdFan(spec,i,group,0,true));
   for(const mesh of [group.torso,group.head,group.arms,group.legs]){mesh.instanceMatrix.needsUpdate=true;if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true}
  }
  initCrowdGroup(crowdStatic);initCrowdGroup(crowdDynamic);

  const flagCount=weak?6:mobileStandard?12:high?22:16,flagSegments=3,flagSpecs=Array.from({length:flagCount},(_,i)=>{
   const team=i<Math.ceil(flagCount*.62)?'home':'away',side=team==='home'?-1:1,row=i%4,scale=1.05+hash(i+331)*1.38;
   return{team,x:-30+(i%7)*10+hash(i+311)*2.6,y:2.05+row*.78,z:side*(59.9+row*1.42),phase:hash(i+317)*Math.PI*2,scale};
  });
  const flagPole=new THREE.InstancedMesh(geo('crowd-flag-pole',()=>new THREE.CylinderGeometry(.03,.03,1,6)),mat('#d5d9d5'),flagSpecs.length);
  const flagCloth=new THREE.InstancedMesh(geo('crowd-flag-cloth-segment',()=>new THREE.PlaneGeometry(.72,1.08,2,2)),mat('#ffffff',{side:THREE.DoubleSide}),flagSpecs.length*flagSegments);
  flagPole.frustumCulled=flagCloth.frustumCulled=false;flagCloth.instanceMatrix.setUsage(THREE.DynamicDrawUsage);scene.add(flagPole,flagCloth);track(flagPole);track(flagCloth);
  function writeFlag(spec,i,time=0,paint=false){
   crowdDummy.position.set(spec.x,spec.y,spec.z);crowdDummy.rotation.set(0,0,0);crowdDummy.scale.set(1,1.75+spec.scale*.72,1);crowdDummy.updateMatrix();flagPole.setMatrixAt(i,crowdDummy.matrix);
   const reaction=crowdReactionState(crowdType,event.team,spec.team,time),baseWave=time*(2.25+spec.scale*.42)+spec.phase,amp=.12+reaction.suspense*.13+Math.max(0,reaction.mood)*.34;
   for(let segment=0;segment<flagSegments;segment++){
    const index=i*flagSegments+segment,wave=Math.sin(baseWave+segment*.72),previous=Math.sin(baseWave+(segment-1)*.72),bend=(wave-previous)*amp;
    crowdDummy.position.set(spec.x+(.38+segment*.62)*spec.scale+wave*amp*(.18+.12*segment),spec.y+.56+.36*spec.scale+Math.abs(wave)*amp*.09,spec.z-(spec.team==='home'?-1:1)*(.03+segment*.012));
    crowdDummy.rotation.set(0,spec.team==='home'?0:Math.PI,wave*amp*.78+bend*.42);crowdDummy.scale.set(spec.scale,1+Math.abs(wave)*.07,spec.scale);crowdDummy.updateMatrix();flagCloth.setMatrixAt(index,crowdDummy.matrix);
    if(paint){const kit=spec.team==='home'?crowdKits.home:crowdKits.away,colour=i%3===0?(segment===1?kit.shirt:kit.shirtSecondary):kit.shirt;flagCloth.setColorAt(index,crowdColor.set(colour))}
   }
  }
  flagSpecs.forEach((spec,i)=>writeFlag(spec,i,0,true));flagPole.instanceMatrix.needsUpdate=true;flagCloth.instanceMatrix.needsUpdate=true;if(flagCloth.instanceColor)flagCloth.instanceColor.needsUpdate=true;

  function supporterBanner(kit,z){
   const tex=canvasTexture(512,96,(ctx,w,h)=>{ctx.fillStyle=kit.shirt;ctx.fillRect(0,0,w,h);ctx.fillStyle=kit.shirtSecondary;ctx.fillRect(0,0,w*.14,h);ctx.fillRect(w*.86,0,w*.14,h);ctx.fillStyle='#ffffff';ctx.globalAlpha=.94;ctx.textAlign='center';ctx.font='italic 900 46px system-ui';ctx.fillText('FOOTERA',w/2,55);ctx.globalAlpha=.8;ctx.font='800 15px system-ui';ctx.fillText('BUILD YOUR ERA',w/2,78)});
   // Rail-level only: banners never sit across the supporter bodies.
   const banner=mesh(track(new THREE.PlaneGeometry(12,.72)),track(new THREE.MeshBasicMaterial({map:tex,side:THREE.DoubleSide})),scene);banner.position.set(0,.62,z);banner.rotation.y=z<0?0:Math.PI;return banner;
  }
  const supporterBanners=[supporterBanner(crowdKits.home,-58.15),supporterBanner(crowdKits.away,58.15)];
  // V21.226 (Basti): flares and smoke in the scoring team's stands after a
  // goal; on big nights (Champions) a tifo over the main stand at the walk-out.
  // Scene space: the far stand is world -x, the attacked goal's end -z*direction.
  const bigNight=ceremony==='kickoff'&&event.bigMatch===true;
  const pyro=(()=>{
   if(event.type!=='goal'&&!bigNight)return null;
   const fanKit=event.team==='away'?crowdKits.away:crowdKits.home;
   const glow=canvasTexture(64,64,(ctx,w,h)=>{const g=ctx.createRadialGradient(w/2,h/2,0,w/2,h/2,w/2);g.addColorStop(0,'rgba(255,250,225,1)');g.addColorStop(.18,'rgba(255,170,90,.95)');g.addColorStop(.45,'rgba(255,60,25,.42)');g.addColorStop(1,'rgba(255,40,10,0)');ctx.fillStyle=g;ctx.fillRect(0,0,w,h)});
   const puff=canvasTexture(64,64,(ctx,w,h)=>{const g=ctx.createRadialGradient(w/2,h/2,0,w/2,h/2,w/2);g.addColorStop(0,'rgba(255,255,255,.9)');g.addColorStop(.55,'rgba(255,255,255,.42)');g.addColorStop(1,'rgba(255,255,255,0)');ctx.fillStyle=g;ctx.fillRect(0,0,w,h)});
   const flareMaterial=track(new THREE.SpriteMaterial({map:glow,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,toneMapped:false}));
   const smokeColour=new THREE.Color(fanKit.shirt).lerp(new THREE.Color('#9aa1a3'),.55);
   const smokeMaterial=track(new THREE.SpriteMaterial({map:puff,color:smokeColour,transparent:true,opacity:.34,depthWrite:false}));
   const scorerAt=actorPosition(0,IMPACT_TIME+1.6),scorerWorld=event.type==='goal'?worldPosition([scorerAt[0],0,scorerAt[1]],direction):[0,0,0];
   const spots=[];
   // Goals: the far stand behind the scorer's close-up. Walk-out: the main
   // stand the players walk towards, seen behind them in the opening shot.
   const side=event.type==='goal'?-1:1;
   for(let k=0;k<(weak?5:8);k++){
    const row=2+Math.floor(hash(k*13+7)*6),z=clamp(scorerWorld[2]+(k/(weak?4:7)-.5)*26+(hash(k*17+3)-.5)*2.4,-54,54);
    spots.push([side*(39.3+row*1.42),1.13+row*.72+1.55,z]);
   }
   if(event.type==='goal')for(let k=0;k<(weak?3:5);k++){
    const row=2+Math.floor(hash(k*19+5)*5);
    spots.push([-18+k*9+(hash(k*23+1)-.5)*3,1.13+row*.72+1.55,-direction*(59.4+row*1.42)]);
   }
   const items=spots.map((at,k)=>{
    const flare=new THREE.Sprite(flareMaterial);flare.position.set(...at);flare.renderOrder=12;scene.add(flare);
    const smoke=[0,1].map(n=>{const sprite=new THREE.Sprite(smokeMaterial);sprite.renderOrder=11;scene.add(sprite);return sprite});
    return{at,flare,smoke,start:(event.type==='goal'?netArrival+.25:0)+hash(k*29+11)*.9,phase:hash(k*31+5)*6.3};
   });
   function update(time){
    for(const item of items){
     const on=time>=item.start,u=time-item.start;item.flare.visible=on;
     for(const sprite of item.smoke)sprite.visible=on;
     if(!on)continue;
     const flicker=.82+.18*Math.sin(u*31+item.phase)*Math.sin(u*17.3+item.phase*2);
     item.flare.scale.setScalar(1.8*smooth(u/.3)*flicker);
     item.smoke.forEach((sprite,n)=>{const age=(u+n*1.6)%3.2,grow=age/3.2;
      sprite.position.set(item.at[0]+Math.sign(item.at[0])*grow*1.2,item.at[1]+.4+grow*3.4,item.at[2]+Math.sin(item.phase+grow*2)*.5);
      sprite.scale.setScalar(1.6+grow*4.4);sprite.material.opacity=.46;});
    }
   }
   update(-1);return{update};
  })();
  const tifo=bigNight?(()=>{
   const kit=crowdKits.home,club=String(event.homeName||'FOOTERA').toUpperCase();
   const tex=canvasTexture(1024,320,(ctx,w,h)=>{
    for(let i=0;i<12;i++){ctx.fillStyle=i%2?kit.shirtSecondary:kit.shirt;ctx.fillRect(i*w/12,0,w/12+1,h)}
    ctx.fillStyle='#00000030';ctx.fillRect(0,h*.30,w,h*.38);
    // The walk-out shot sees about the middle third of the stand: keep the text there.
    ctx.fillStyle='#ffffff';ctx.textAlign='center';ctx.textBaseline='middle';
    let size=92;ctx.font=`italic 900 ${size}px system-ui`;while(size>34&&ctx.measureText(club).width>w*.36){size-=4;ctx.font=`italic 900 ${size}px system-ui`}
    ctx.fillText(club,w/2,h*.49);ctx.font='800 26px system-ui';ctx.globalAlpha=.92;ctx.fillText('BUILD YOUR ERA',w/2,h*.62);ctx.fillText('★ ★ ★',w/2,h*.22);
   });
   const slope=Math.atan(.72/1.42),plane=mesh(track(new THREE.PlaneGeometry(58,17.6)),track(new THREE.MeshBasicMaterial({map:tex,side:THREE.DoubleSide,toneMapped:false,color:'#d8d8d8'})),scene);
   // Over the main stand, behind the tunnel: the backdrop of the walk-out shot.
   plane.rotation.set(-slope,-Math.PI/2,0,'YXZ');plane.position.set(47.1,6.7,0);return plane;
  })():null;
  let lastCrowdUpdate=-1,crowdDetailReduced=false;
  function updateCrowd(time,force=false){
   if(crowdDetailReduced)return;
   const cadence=weak?.18:mobileStandard?.11:.085;if(!force&&lastCrowdUpdate>=0&&time>=lastCrowdUpdate&&time-lastCrowdUpdate<cadence)return;lastCrowdUpdate=time;
   crowdDynamic.specs.forEach((spec,i)=>writeCrowdFan(spec,i,crowdDynamic,time,false));
   for(const mesh of [crowdDynamic.torso,crowdDynamic.head,crowdDynamic.arms,crowdDynamic.legs])mesh.instanceMatrix.needsUpdate=true;
   flagSpecs.forEach((spec,i)=>writeFlag(spec,i,time,false));flagCloth.instanceMatrix.needsUpdate=true;
  }
  // Two shared high-contrast textures; anisotropic mip filtering
  // keeps the touchline text stable at acute camera angles without shimmer.
  const adKinds=spooky?['footera','halloween','instagram']:['footera','instagram'];
  const adMaterials=adKinds.map(kind=>{
   const tex=canvasTexture(2048,256,(ctx,w,h)=>drawPerimeterBoard(ctx,w,h,kind));
   tex.anisotropy=Math.min(16,renderer.capabilities.getMaxAnisotropy());
   tex.minFilter=THREE.LinearMipmapLinearFilter;tex.magFilter=THREE.LinearFilter;
   return track(new THREE.MeshBasicMaterial({map:tex,toneMapped:false}));
  });
  // Load the actual transparent Footera shield from the existing app icon.
  // Repaint only the Footera map; the Instagram map stays fully vector-sharp.
  const boardLogo=new Image();boardLogo.decoding='async';
  boardLogo.onload=()=>{
   const boardMap=adMaterials[0].map,canvas=boardMap?.image;
   if(!canvas||!boardLogo.naturalWidth)return;
   drawPerimeterBoard(canvas.getContext('2d'),canvas.width,canvas.height,'footera',boardLogo);
   boardMap.needsUpdate=true;
  };
  boardLogo.src=new URL('./icon-512.png',import.meta.url).href;
  const adgeo=geo('ad',()=>new THREE.PlaneGeometry(12.96,1.5));
  function advertisingPanel(x,z,rotation,index){
   const backing=box(13.04,1.58,.16,'#10191c',x,.84,z,scene);backing.rotation.y=rotation;
   const ad=mesh(adgeo,adMaterials[index%adMaterials.length],scene);
   ad.position.set(x+Math.sin(rotation)*.085,.84,z+Math.cos(rotation)*.085);
   ad.rotation.y=rotation;staticBoxes.push(ad);
  }
  for(const side of [-1,1]){
   for(let z=-45.5,i=0;z<=45.5;z+=13,i++)advertisingPanel(side*37,z,-side*Math.PI/2,i);
   for(let x=-26,i=0;x<=26;x+=13,i++)advertisingPanel(x,side*57,side===-1?0:Math.PI,i+(side===-1?1:0));
   for(const z of [-61,61]){box(.35,20,.35,'#7d8b8c',side*47,10,z,scene);const lights=box(5,1.1,.25,'#f1f4de',side*47,19.3,z,scene);lights.rotation.y=-side*.5}
  }
  // Halloween night: carved jack-o'-lanterns in front of the boards, a blood moon over the far stand.
  if(spooky){
   const faceTex=canvasTexture(128,128,(ctx,w,h)=>{
    const g=ctx.createRadialGradient(w/2,h/2,4,w/2,h/2,w/2);g.addColorStop(0,'#fff2a0');g.addColorStop(1,'#ffb020');ctx.fillStyle=g;
    for(const s of [-1,1]){ctx.beginPath();ctx.moveTo(w/2+s*10,h*.46);ctx.lineTo(w/2+s*24,h*.22);ctx.lineTo(w/2+s*38,h*.46);ctx.fill()}
    ctx.beginPath();ctx.moveTo(w*.18,h*.58);ctx.lineTo(w*.32,h*.66);ctx.lineTo(w*.42,h*.58);ctx.lineTo(w*.5,h*.68);ctx.lineTo(w*.58,h*.58);ctx.lineTo(w*.68,h*.66);ctx.lineTo(w*.82,h*.58);ctx.lineTo(w*.66,h*.84);ctx.lineTo(w*.34,h*.84);ctx.fill();
   });
   const faceMat=track(new THREE.MeshBasicMaterial({map:faceTex,transparent:true,toneMapped:false,depthWrite:false}));
   const bodyMat=track(new THREE.MeshStandardMaterial({color:'#f07015',roughness:.62,emissive:'#ff4a00',emissiveIntensity:.28}));
   const stemMat=mat('#3d5a12');
   const bodyGeo=geo('pumpkin',()=>{const g=new THREE.SphereGeometry(.5,weak?10:16,weak?8:12),p=g.attributes.position;for(let i=0;i<p.count;i++){const x=p.getX(i),z=p.getZ(i),a=Math.atan2(z,x),rib=1-.06*Math.abs(Math.cos(a*4));p.setXYZ(i,x*rib,p.getY(i)*.74,z*rib)}g.computeVertexNormals();return g});
   const faceGeo=geo('pumpkin-face',()=>new THREE.PlaneGeometry(.62,.5));
   const stemGeo=geo('pumpkin-stem',()=>new THREE.CylinderGeometry(.045,.07,.2,6));
   const glowTex=canvasTexture(64,64,(ctx,w,h)=>{const g=ctx.createRadialGradient(w/2,h/2,0,w/2,h/2,w/2);g.addColorStop(0,'rgba(255,140,40,.55)');g.addColorStop(1,'rgba(255,90,0,0)');ctx.fillStyle=g;ctx.fillRect(0,0,w,h)});
   const glowMat=track(new THREE.SpriteMaterial({map:glowTex,transparent:true,depthWrite:false,toneMapped:false,blending:THREE.AdditiveBlending}));
   function pumpkin(x,z,face,scale=1){
    const root=new THREE.Group();root.position.set(x,.36*scale,z);root.rotation.y=face;root.scale.setScalar(scale);scene.add(root);
    root.add(new THREE.Mesh(bodyGeo,bodyMat));
    const f=new THREE.Mesh(faceGeo,faceMat);f.position.set(0,.02,.38);root.add(f);
    const st=new THREE.Mesh(stemGeo,stemMat);st.position.set(0,.43,0);st.rotation.z=.2;root.add(st);
    const glow=new THREE.Sprite(glowMat);glow.scale.set(2.4,2.4,1);glow.position.set(0,.05,.5);root.add(glow);
   }
   for(const side of [-1,1]){
    for(let z=-52,i=0;z<=52;z+=6.5,i++)if(i%2===0)pumpkin(side*35.9,z+(hash(i*7+side)-.5)*1.2,-side*Math.PI/2+(hash(i*11)-.5)*.5,.85+hash(i*5+3)*.4);
    for(let x=-30,i=0;x<=30;x+=7.5,i++)pumpkin(x+(hash(i*13)-.5),side*55.8,side<0?0:Math.PI,.85+hash(i*3+side)*.35);
   }
   const moonTex=canvasTexture(256,256,(ctx,w,h)=>{const g=ctx.createRadialGradient(w*.5,h*.5,w*.18,w*.5,h*.5,w*.5);g.addColorStop(0,'rgba(255,214,150,1)');g.addColorStop(.36,'rgba(255,140,50,1)');g.addColorStop(.4,'rgba(255,110,30,.45)');g.addColorStop(1,'rgba(255,80,0,0)');ctx.fillStyle=g;ctx.fillRect(0,0,w,h);ctx.fillStyle='rgba(150,60,20,.22)';for(const [x,y,r] of [[.42,.44,.05],[.56,.55,.035],[.47,.6,.03],[.58,.4,.025]]){ctx.beginPath();ctx.arc(w*x,h*y,w*r,0,Math.PI*2);ctx.fill()}});
   const moon=new THREE.Sprite(track(new THREE.SpriteMaterial({map:moonTex,transparent:true,depthWrite:false,fog:false,toneMapped:false})));moon.scale.set(70,70,1);moon.position.set(-150,62,-40);scene.add(moon);
  }
  // Player draw calls are batched below. Each bone retains its own articulation.
  const batches=new Map(),parts=[];
  function part(g,m,parent,x=0,y=0,z=0,sx=1,sy=1,sz=1){const node=new THREE.Object3D();node.position.set(x,y,z);node.scale.set(sx,sy,sz);parent.add(node);const key=g.uuid+':'+m.uuid;if(!batches.has(key))batches.set(key,{g,m,nodes:[]});batches.get(key).nodes.push(node);parts.push(node);return node}
  function bodyPart(top,bottom,height,color,parent,x,y,z,sx=1,sz=1){return part(geo(`body:${top}:${bottom}`,()=>new THREE.CylinderGeometry(top,bottom,1,weak?8:high?14:12)),mat(color),parent,x,y,z,sx,height,sz)}
  function bodyPartMaterial(top,bottom,height,material,parent,x,y,z,sx=1,sz=1){return part(geo(`body:${top}:${bottom}`,()=>new THREE.CylinderGeometry(top,bottom,1,weak?8:high?14:12)),material,parent,x,y,z,sx,height,sz)}
  function rounded(w,h,d,color,parent,x,y,z){return part(geo('sphere',()=>new THREE.SphereGeometry(1,weak?10:high?18:16,weak?8:high?14:12)),mat(color),parent,x,y,z,w,h,d)}
  function roundedMaterial(w,h,d,material,parent,x,y,z){return part(geo('sphere',()=>new THREE.SphereGeometry(1,weak?10:high?18:16,weak?8:high?14:12)),material,parent,x,y,z,w,h,d)}
  // Oval cross-sections describe chest, waist, jaw and muscles with smooth
  // normals. Shared geometry is instanced, keeping the existing joint hierarchy.
  function anatomy(key,rings){return geo(key,()=>athleticGeometry(rings,weak?10:high?18:14))}
  function player(kit,name,keeper=false,modern=false,shirtNumber=0,lead=false,skinValue=null){
   const Joint=modern?THREE.Bone:THREE.Group;
   const root=new THREE.Group(),rig=new Joint(),upper=new Joint(),chest=new Joint();
   const motion=modern?new THREE.Bone():null;
   root.name=keeper?'FooteraKeeperRoot':lead?'FooteraScorerRoot':'';field.add(root);root.add(rig);rig.add(upper);upper.position.y=1;
   if(motion){upper.add(motion);motion.add(chest)}else upper.add(chest);
   chest.position.y=-1;
   const skin=resolvePlayerSkinTone(skinValue),variant=Array.from(name).reduce((n,c)=>n+c.charCodeAt(0),0),hair=['#201b17','#382820','#574032','#826444'][variant%4],shirt=shirtMaterial(kit),sleeve=mat(['sleeves','shoulders'].includes(kit.pattern)?kit.shirtSecondary:kit.shirt,{roughness:.92});
   if(!keeper)chest.scale.x=.97+(variant%4)*.025;
   if(!modern)part(anatomy('athletic-shirt',[[1.00,.163,.105],[1.035,.174,.114],[1.09,.166,.108],[1.18,.171,.119],[1.28,.194,.14],[1.36,.219,.144],[1.43,.238,.126],[1.47,.229,.105],[1.51,.168,.08],[1.535,.071,.065]]),shirt,chest);
   if(!modern)part(anatomy('athletic-pelvis',[[.86,.142,.099],[.94,.173,.127],[1.015,.168,.107],[1.03,.161,.105]]),mat(kit.shorts,{roughness:.96}),rig);
   bodyPart(.058,.066,.112,skin,chest,0,1.576,0);
   bodyPartMaterial(.073,.074,.028,mat(kit.shirtSecondary,{roughness:1}),chest,0,1.537,0,1,.94);
   part(anatomy('athletic-head-v2',[[1.616,.032,.042,-.006],[1.638,.054,.062,-.010],
    [1.663,.068,.077,-.013],[1.695,.082,.088,-.012],[1.725,.090,.094,-.009],
    [1.755,.092,.093,-.003],[1.783,.081,.084,.002],[1.808,.061,.069,.006],
    [1.834,.023,.031,.006]]),mat(skin),chest,0,0,-.010);
   // Jaw and cheekbone loft replaces the toy-like ball head. Hair follows
   // the scalp and facial elements are batched with existing instances.
   part(anatomy('athletic-hair-v2',[[1.771,.087,.081,.024],[1.790,.084,.089,.010],
    [1.812,.067,.072,.006],[1.836,.027,.036,.005],[1.845,.008,.010,.004]]),
    mat(hair,{roughness:1}),chest,0,0,-.005);
   rounded(.015,.028,.014,skin,chest,0,1.710,-.110);
   rounded(.012,.010,.009,skin,chest,0,1.688,-.122);
   for(const side of [-1,1]){
    rounded(.010,.007,.004,'#2b2927',chest,side*.035,1.738,-.103);
    rounded(.027,.006,.007,hair,chest,side*.037,1.761,-.099);
    rounded(.015,.026,.013,skin,chest,side*.090,1.722,-.014);
   }
   rounded(.068,.047,.017,hair,chest,0,1.769,.084);
   const arms=[],elbows=[],legs=[],knees=[],ankles=[],gloves=[],feet=[];
   for(const side of [-1,1]){
    const arm=new Joint();arm.position.set(side*.224,1.45,0);chest.add(arm);arms.push(arm);
    if(!modern)roundedMaterial(.075,.091,.085,sleeve,arm,0,-.035,0);
    if(!modern)bodyPartMaterial(.075,.062,.17,sleeve,arm,0,-.098,0);
    if(!modern)bodyPartMaterial(.064,.063,.023,mat(kit.shirtSecondary,{roughness:1}),arm,0,-.184,0);
    if(!modern)part(anatomy('athletic-upper-arm',[[-.325,.043,.045],[-.25,.053,.056],[-.17,.061,.058],[-.14,.060,.058]]),mat(skin),arm);
    const elbow=new Joint();elbow.position.y=-.32;arm.add(elbow);elbows.push(elbow);
    if(!modern)part(anatomy('athletic-forearm',[[-.28,.029,.033],[-.22,.033,.04],[-.08,.049,.049],[0,.043,.045]]),mat(skin),elbow);
    gloves.push(rounded(keeper?.052:.033,.061,.031,keeper?'#f3f4e9':skin,elbow,0,-.31,-.006));
    const leg=new Joint();leg.position.set(side*.108,.94,0);rig.add(leg);legs.push(leg);
    if(!modern)part(anatomy('athletic-shorts',[[-.19,.097,.092],[-.12,.103,.106],[.055,.098,.102]]),mat(kit.shorts,{roughness:.96}),leg);
    if(!modern)part(anatomy('athletic-thigh',[[-.435,.052,.06],[-.38,.061,.067],[-.25,.081,.081],[-.16,.085,.082]]),mat(skin),leg);
    const knee=new Joint();knee.position.y=-.43;leg.add(knee);knees.push(knee);
    if(!modern)rounded(.052,.05,.057,skin,knee,0,-.004,0);
    if(!modern)part(anatomy('athletic-sock',[[-.39,.032,.039],[-.31,.035,.042],[-.17,.059,.064],[-.07,.056,.055],[-.045,.050,.050]]),mat(kit.socks,{roughness:1}),knee);
    const ankle=new Joint();ankle.position.y=-.43;knee.add(ankle);ankles.push(ankle);
    const boot=['#e4e1cb','#ed763b','#172025','#a6c24a'][variant%4];
    feet.push(rounded(.057,.041,.139,boot,ankle,0,0,-.073));
    feet.push(rounded(.058,.011,.141,'#101716',ankle,0,-.035,-.073));
    rounded(.031,.009,.053,'#e4e6df',ankle,0,.037,-.093);
    bodyPartMaterial(.051,.052,.027,mat(kit.shirtSecondary,{roughness:1}),knee,0,-.062,0,1,1.04);
   }
   const shadow=part(geo('contact-plane',()=>new THREE.PlaneGeometry(1,1)),contactMaterial,root,0,.022,0,1.4,1.05,1);shadow.rotation.x=-Math.PI/2;
   const skinned=modern?buildSkinnedFootballer(THREE,root,
    {rig,upper,motion,chest,arms,elbows,legs,knees,ankles},
    [shirt,mat(kit.shorts,{roughness:.96}),mat(skin),mat(kit.socks,{roughness:1}),sleeve],weak?8:high?16:12,shirtNumber,kit):null;
   if(skinned){track(skinned.geometry);track(skinned.atlasTexture);track(skinned.atlasMaterial)}
   const skeletonMotion=modern&&lead?createSkeletonMotion(THREE,motion,keeper?'keeper':'striker',finish,DURATION):null;
   return{root,rig,upper,arms,elbows,legs,knees,ankles,gloves,feet,shadow,skinned,skeletonMotion,
    gait:[{},{}],footworkState:{feet:[{},{}]},mocapFrame:new Float32Array(33),motionClips:{out:{},scratch:{},action:{}}};
  }
  const kits=kitColors(event),attackKit=event.team==='away'?kits.away:kits.home,defendKit=event.team==='away'?kits.home:kits.away;
  // V21.67: actual skinned football anatomy for ALL 16 field players in
  // STANDARD/HIGH. LOW preserves a limited 8-player subset for mobile FPS;
  // other actors continue to use their existing safe instanced silhouettes.
  const priority=[0,1,defenderIndex,2,8,3,9,4,10,5,11,6,12,7,13,14,15];
  const uniquePriority=priority.filter((v,i)=>priority.indexOf(v)===i);
  const detailedActors=new Set(weak?uniquePriority.slice(0,8):uniquePriority);
  const defaultNumbers=[9,10,7,11,18,21,6,8,4,5,3,2,14,17,15,20];
  const squadNumbers=defaultNumbers.map((fb,i)=>{const n=Number(event.shirtNumbers?.[i]);return Number.isInteger(n)&&n>=1&&n<=99?n:fb});
  const keeperNumber=Number(event.keeperShirtNumber);
  const squadNames=RUNS.map((r,i)=>ceremony&&event.squadNames?.[i]?event.squadNames[i]:i===0?event.playerName:i===defenderIndex&&event.defenderName?event.defenderName:'footballer '+i);
  const players=RUNS.map((r,i)=>player(r.team==='attack'?attackKit:defendKit,
   squadNames[i],false,detailedActors.has(i),squadNumbers[i],i===0,event.playerSkinTones?.[i]));
  const keeper=player({shirt:kits.keeper,shirtSecondary:kits.keeper,pattern:'solid',shorts:kits.keeper,socks:kits.keeper},event.keeperName||'goalkeeper',true,true,Number.isInteger(keeperNumber)&&keeperNumber>=1&&keeperNumber<=99?keeperNumber:1,true,event.keeperSkinTone);
  const buildKeeper=extended==='keeper_buildout'?player({shirt:'#e8b545',shirtSecondary:'#e8b545',pattern:'solid',shorts:'#273a37',socks:'#e8b545'},event.buildKeeperName||'Aufbau-Torwart',true,true,1,false,event.buildKeeperSkinTone):null;
  // Use a single CC0 source and one skeleton clone for EACH visible player.
  // Original animation drivers and pre-kickoff home/away kit selection remain authoritative.
  const humanSquad=allowImported&&!baselineRig&&modelVariant==='human'&&isFooteraHumanModelReady();
  const squadVariant=humanSquad?'human':'quaternius';
  const allQuaternius=humanSquad||allowImported&&!baselineRig&&modelVariant==='quaternius'&&isFooteraPlayerModelReady();
  // Real names only on real players; the club crest on the scoring team's chest.
  const squadCrest=footeraCrestImageNow(event.teamCrestHTML),opponentCrest=ceremony?footeraCrestImageNow(event.defendCrestHTML):null;
  const humanLook=(i,number,skinTone)=>({number,skinTone:resolvePlayerSkinTone(skinTone),custom:event.playerLooks?.[i]||null,
   shirtName:/^footballer /.test(squadNames[i]||'')?'':undefined,crest:RUNS[i]?.team==='attack'?squadCrest:opponentCrest});
  const importedPlayers=new Array(players.length).fill(null);
  let importedPlayer=null,importedKeeper=null;
  const fallbackKitAtlases=new Map();
  function lowKitAtlas(kit,shirtNumber,skinValue=null){
   const key=JSON.stringify([kit,shirtNumber,resolvePlayerSkinTone(skinValue)]);
   if(!fallbackKitAtlases.has(key)){
    const atlas=createFootballKitAtlas(THREE,[shirtMaterial(kit),
     mat(kit.shorts,{roughness:.96}),mat(resolvePlayerSkinTone(skinValue)),
     mat(kit.socks,{roughness:1}),mat(['sleeves','shoulders'].includes(kit.pattern)?kit.shirtSecondary:kit.shirt,{roughness:.92})],8,shirtNumber,kit);
    track(atlas.texture);track(atlas.material);fallbackKitAtlases.set(key,atlas.texture);
   }
   return fallbackKitAtlases.get(key);
  }
  function hideOriginal(actor,retainGloves=false){
   if(actor.skinned)actor.skinned.model.visible=false;
   for(const batch of batches.values())for(const node of batch.nodes){
    if(node===actor.shadow||(retainGloves&&actor.gloves.includes(node)))continue;
    for(let parent=node;parent;parent=parent.parent)
     if(parent===actor.root){node.userData.hideForFooteraPrototype=true;break}
   }
  }
  if(allowImported&&!baselineRig&&(modelVariant==='human'?humanSquad:modelVariant==='makehuman'?isFooteraMakeHumanModelReady():isFooteraPlayerModelReady())){
   const staged=[];
   try{
    if(allQuaternius){
     for(let i=0;i<players.length;i++){
      const actor=players[i],kit=RUNS[i].team==='attack'?attackKit:defendKit;
      const name=humanSquad?squadNames[i]:i===0?event.playerName:'footballer '+i;
      const glb=mountFooteraPlayerModel(actor.root,actor,kit,name,!weak&&(i===0||i===defenderIndex||humanSquad&&footeraHDWanted()&&huggers.some(h=>h.index===i)),
       squadVariant,actor.skinned||humanSquad?null:lowKitAtlas(kit,squadNumbers[i],event.playerSkinTones?.[i]),
       humanLook(i,squadNumbers[i],event.playerSkinTones?.[i]));
      if(!glb)throw new Error('GLB unavailable on field player '+i);
      importedPlayers[i]=glb;staged.push(glb);
     }
     const keeperKit={shirt:kits.keeper,shirtSecondary:kits.keeper,pattern:'solid',shorts:kits.keeper,socks:kits.keeper};
     importedKeeper=mountFooteraPlayerModel(keeper.root,keeper,keeperKit,event.keeperName||'Goalkeeper',
      !weak,squadVariant,null,{number:Number.isInteger(keeperNumber)&&keeperNumber>=1&&keeperNumber<=99?keeperNumber:1,
       skinTone:resolvePlayerSkinTone(event.keeperSkinTone),shirtName:event.keeperName?undefined:'',boots:'#111417',custom:event.keeperLook||null});
     if(!importedKeeper)throw new Error('GLB unavailable on goalkeeper');
     staged.push(importedKeeper);
     players.forEach(p=>hideOriginal(p));
     hideOriginal(keeper,true); // preserve existing glove contact meshes
    }else{
     const glb=mountFooteraPlayerModel(players[0].root,players[0],attackKit,event.playerName,!weak,modelVariant);
     if(!glb)throw new Error('Diagnostic GLB unavailable');
     importedPlayers[0]=glb;staged.push(glb);hideOriginal(players[0]);
    }
    importedPlayer=importedPlayers[0];
   }catch(error){
    console.warn('Footera GLB squad fallback:',error);
    for(const glb of staged)glb.dispose();
    importedPlayers.fill(null);importedKeeper=null;importedPlayer=null;
    for(const actor of [...players,keeper])if(actor.skinned)actor.skinned.model.visible=true;
    for(const batch of batches.values())for(const node of batch.nodes)
     delete node.userData.hideForFooteraPrototype;
   }
  }
  // V21.184: broadcast light and fabric only where the real GLB squad is shown.
  if(importedPlayer&&!weak)track(applyBroadcastLook(scene,renderer,{high}));
  if(spooky)renderer.toneMappingExposure=1.06;
  // Motion 2.2 shapes first touch, mirrored cuts and finesse preparation.
  const motion2Active=pilotMotion&&isMotion2Sequence(sequence,finish);
  const motion2CutAnchor=motion2Active?runPosition(0,3.08,sequence):null;
  const motion2ShotAnchor=motion2Active?runPosition(0,5.30,sequence):null;
  const ballSurface=createMatchBallSurface(THREE,{size:weak?512:high?2048:1024,anisotropy:Math.min(high?8:4,renderer.capabilities.getMaxAnisotropy()),track});
  const ball=mesh(geo('ball',()=>new THREE.SphereGeometry(1,weak?16:high?32:24,weak?12:high?24:18)),ballSurface.material);
  ball.name=MATCH_BALL_NAME;ball.scale.setScalar(MATCH_BALL_RADIUS);ball.position.set(0,.13,0);ball.castShadow=!weak;
  // A restrained ground cue keeps the real-size ball readable on a phone.
  const ballRing=mesh(geo('ball-ring',()=>new THREE.RingGeometry(.27,.38,24)),track(new THREE.MeshBasicMaterial({color:'#ffffff',transparent:true,opacity:.5,side:THREE.DoubleSide,depthWrite:false})));ballRing.rotation.x=-Math.PI/2;
  const ballShadow=mesh(geo('ball-shadow',()=>new THREE.CircleGeometry(.22,high?24:16)),track(new THREE.MeshBasicMaterial({color:'#071107',transparent:true,opacity:.28,depthWrite:false,side:THREE.DoubleSide})));ballShadow.rotation.x=-Math.PI/2;ballShadow.position.y=.019;
  // PlayStyle+ signature: a gold trail of fading dots behind the ball.
  const trail=signature?Array.from({length:22},(_,i)=>{const dot=mesh(geo('signature-trail',()=>new THREE.SphereGeometry(.085,10,8)),track(new THREE.MeshBasicMaterial({color:'#ffd35a',transparent:true,opacity:.3*(1-i/22),depthWrite:false,blending:THREE.AdditiveBlending})));dot.scale.setScalar((event.signature.who==='creator'?1.6:1)*(1-i/30));dot.visible=false;return dot}):[];
  // V21.200 PlayStyle+ (Basti): instead of a banner a small glowing icon
  // lights up above the player, like in EA FC.
  const signatureIcon=signature?(()=>{
   const tex=canvasTexture(128,128,(g,w,h)=>{
    const glow=g.createRadialGradient(w/2,h/2,8,w/2,h/2,w/2);glow.addColorStop(0,'rgba(255,211,90,.75)');glow.addColorStop(.55,'rgba(255,190,60,.32)');glow.addColorStop(1,'rgba(255,190,60,0)');
    g.fillStyle=glow;g.fillRect(0,0,w,h);
    g.beginPath();g.arc(w/2,h/2,34,0,Math.PI*2);g.fillStyle='rgba(40,28,6,.88)';g.fill();g.lineWidth=4;g.strokeStyle='#ffd35a';g.stroke();
   });
   const body=globalThis.FooteraPlayStyles?.iconBody?.(event.signature.id)||'<path d="m12 3 1.7 5.3H19l-4.3 3.1 1.7 5.3-4.4-3.2-4.4 3.2 1.7-5.3L5 8.3h5.3Z"/>';
   if(typeof Image!=='undefined'){
    const img=new Image();
    img.onload=()=>{const c=tex.image,g=c.getContext('2d');g.drawImage(img,40,40,48,48);tex.needsUpdate=true};
    img.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="96" height="96" fill="none" stroke="#ffe8a3" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">'+body+'</svg>');
   }
   const sprite=new THREE.Sprite(track(new THREE.SpriteMaterial({map:tex,transparent:true,depthTest:false,depthWrite:false})));
   sprite.renderOrder=30;sprite.visible=false;sprite.userData.owner=event.signature.who==='creator'?-1:0;scene.add(sprite);
   return sprite;
  })():null;
  for(const batch of batches.values()){batch.mesh=new THREE.InstancedMesh(batch.g,batch.m,batch.nodes.length);batch.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);batch.mesh.castShadow=!weak&&!batch.m.transparent;batch.mesh.receiveShadow=!weak&&!batch.m.transparent;batch.mesh.frustumCulled=false;scene.add(batch.mesh);track(batch.mesh)}
  // Merge stadium structures by material into static instance batches as well.
  scene.updateMatrixWorld(true);
  const staticGroups=new Map();
  for(const o of staticBoxes){const key=o.material.uuid;if(!staticGroups.has(key))staticGroups.set(key,[]);staticGroups.get(key).push(o)}
  for(const nodes of staticGroups.values()){const batch=new THREE.InstancedMesh(nodes[0].geometry,nodes[0].material,nodes.length);nodes.forEach((o,i)=>{batch.setMatrixAt(i,o.matrixWorld);o.removeFromParent()});scene.add(batch);track(batch)}
  function resetPose(p){p.rig.position.set(0,0,0);p.rig.rotation.set(0,0,0);p.upper.rotation.set(0,0,0);for(let i=0;i<2;i++){p.arms[i].rotation.set(0,0,0);p.elbows[i].rotation.set(0,0,0);p.legs[i].rotation.set(0,0,0);p.knees[i].rotation.set(0,0,0);p.ankles[i].rotation.set(0,0,0)}}
  function pose(p,x,z,time,speed,heading=0,turn=0,stride=time*9.6,acceleration=0,controlWeight=0,ballDistance=99){
   resetPose(p);p.root.position.set(x,0,z);p.root.rotation.y=heading;
   const closeControl=controlWeight>.3;
   const d=locomotionDynamics(speed,turn,stride,acceleration,closeControl),motion=d.effort;
   const c=blendLocomotionClips(speed,turn,stride,controlWeight,p.motionClips.out,p.motionClips.scratch);
   for(let i=0;i<2;i++){
    const g=runningLeg(stride+i*Math.PI,speed,p.gait[i]),side=i?1:-1,brace=1-.74*g.swingWeight;
    // Keep the IK stride authoritative. Clip reach adds nuance, not a second lunge.
    // V21.208: compact reach only shapes the swing; a planted boot never slides.
    p.legs[i].rotation.x=g.hip*motion*mix(1,d.strideReach*Math.min(1.045,c.reach),g.swingWeight);
    p.knees[i].rotation.x=g.knee*motion;
    p.ankles[i].rotation.x=g.ankle*motion;
    // A support leg braces during a cut while the free leg pushes through.
    p.legs[i].rotation.z+=side*d.plant*.10*brace-d.bank*.32*brace;
    p.ankles[i].rotation.z+=d.bank*.30*brace;
    p.arms[i].rotation.x=-g.hip*d.armSwing*motion+(i?1:-1)*c.arm*motion;
    p.arms[i].rotation.z=side*(.13+.08*speed+c.spread*motion)+d.bank*.18;
    p.elbows[i].rotation.x=.58+.39*speed+(closeControl?.14:0);
   }
   p.rig.position.y=mix(-.007,p.gait[0].hipHeight-.94,motion)-d.hipDrop+c.bounce*motion;
   p.upper.rotation.x=d.forwardLean+c.pitch*motion;
   p.upper.rotation.y=d.shoulderTwist+c.yaw*motion+clamp(turn*.65,-.13,.13);
   p.upper.rotation.z=d.bank*.73+c.roll*motion+Math.sin(stride)*.016*motion;
   p.rig.rotation.z=d.bank*.24+c.roll*.08*motion;
   p.shadow.rotation.z=heading;
   // Keep the tackling defender on natural running legs until the dedicated
   // support-foot plant begins. Otherwise its feint/jockey clip crouches and
   // twists the player well before the tackle (the visible pre-stumble).
   const isolatedSlide=labDuelPreview&&defenderAction==='slide_attempt'&&p===players[defenderIndex];
   const isolatedDefender=(event.type==='ball_won'&&p===players[defenderIndex])||isolatedSlide||(pilotMotion&&p===players[defenderIndex]&&isTrackingAction(defenderAction));
   if(pilotMotion&&!isolatedDefender&&(p===players[0]||p===players[1]||p===players[2]||p===players[3]||p===players[4]||p===players[defenderIndex])){
    const role=p===players[0]?'attacker':p===players[defenderIndex]?'defender':p===players[1]?'provider':'support';
    // A cutting attacker cannot have TWO independent pose controllers.
    // The planted-foot run stays authoritative; Motion 2 alone authors
    // the feint, cut and shot preparation for these finesse sequences.
    if(!(motion2Active&&p===players[0]))
     applyLabMotion(p,role,time,sequence,speed,turn,stride,acceleration,ballDistance);
    // V21.208: the swinging boot touches the ball; the planted one stays put.
    if(controlWeight>.001){applyFootballControl(p,stride+Math.PI,controlWeight,sequence);applyTouchContinuity(p,stride+Math.PI,controlWeight,p===players[0]?event.playerStyles:event.creatorStyles)}
   }else if(enhancedRigMotion&&p.skinned&&p===players[0]&&!isolatedDefender){animateAthleticRun(p,speed,turn,stride,acceleration,controlWeight);applyRunningMocap(p,time,speed,stride);if(p===players[0])applyVisibleInvertedCut(p,time,sequence)}
   // Also pose the existing instanced winger: no extra skeleton/draw call.
   if(enhancedRigMotion&&(p===players[0]||p===players[1])&&!pilotMotion)
    applyContextualAttackerMotion(p,time,sequence,p===players[1]?1:0);
  }
  // Arc-length gait avoids sliding or a phase jump when the runner accelerates.
  // Tables are built once; playback only reads two floats per actor.
  // V21.208: steps follow the path actually shown (actorPosition) and the
  // effort-scaled reach of pose(), so planted boots stop sliding when slow.
  // V21.297: the standing facing is the summed travel over +-0.4 s (a small
  // shuffle no longer spins the body round), read with interpolation.
  const steps=new Float32Array(322);
  function smoothFacing(table){
   const raw=Float32Array.from(table);
   for(let j=0;j<=160;j++){let x=0,z=0;for(let k=Math.max(1,j-6);k<=Math.min(160,j+6);k++){x+=steps[k*2];z+=steps[k*2+1]}
    table[j]=Math.hypot(x,z)>.02?Math.atan2(-x,-z):j?table[j-1]:raw[0]}
  }
  const facingAt=(index,time)=>{const x=clamp(time/DURATION)*160,j=Math.min(159,Math.floor(x));return angleMix(facingTables[index][j],facingTables[index][j+1],x-j)};
  const gaitSamples=160,facingTables=RUNS.map(()=>new Float32Array(161)),gaitTables=RUNS.map((_,index)=>{const a=new Float32Array(gaitSamples+1),dt=DURATION/gaitSamples;let previous=stagedPlayerPosition(index,0,event.type,sequence),shownPrevious=actorPosition(index,0);for(let j=1;j<=gaitSamples;j++){const next=stagedPlayerPosition(index,j*dt,event.type,sequence),distance=Math.hypot(next[0]-previous[0],next[1]-previous[1]),shown=actorPosition(index,j*dt),travel=Math.hypot(shown[0]-shownPrevious[0],shown[1]-shownPrevious[1]),speed=clamp(travel/dt/6.5*(extended&&j*dt<SHOT_TIME?5.4/extendedTiming(sequence).shot:1)),strideLength=runningStrideLength(speed)*Math.max(.12,locomotionEffort(speed));a[j]=a[j-1]+travel*Math.PI*2/strideLength;shownPrevious=shown;facingTables[index][j]=distance>.00001?Math.atan2(-(next[0]-previous[0]),-(next[1]-previous[1])):facingTables[index][j-1];if(j===1)facingTables[index][0]=facingTables[index][j];steps[j*2]=next[0]-previous[0];steps[j*2+1]=next[1]-previous[1];previous=next}smoothFacing(facingTables[index]);return a});
  // Huggers leave their authored run: keep the legs cycling with the real
  // distance they cover on the way to the scorer.
  const hugStrides=new Map();
  function hugStride(index,time){
   let table=hugStrides.get(index);
   if(!table){table=new Float32Array(65);const dt=(DURATION-HUG_START)/64;let prev=actorPosition(index,HUG_START);table[0]=gaitPhase(index,HUG_START);
    for(let j=1;j<=64;j++){const next=actorPosition(index,HUG_START+j*dt),distance=Math.hypot(next[0]-prev[0],next[1]-prev[1]);table[j]=table[j-1]+distance*Math.PI*2/runningStrideLength(clamp(distance/dt/6.5));prev=next}
    hugStrides.set(index,table)}
   const at=clamp((time-HUG_START)/(DURATION-HUG_START))*64,lo=Math.min(63,Math.floor(at));
   return mix(table[lo],table[lo+1],at-lo);
  }
  function gaitPhase(index,time){const at=clamp(time/DURATION)*gaitSamples,lo=Math.min(gaitSamples-1,Math.floor(at));return mix(gaitTables[index][lo],gaitTables[index][lo+1],at-lo)+index*2.399}
  // Distance-based ball roll: the football no longer spins at a constant
  // unrelated speed during stops, turns or high-speed forward carries.
  const ballRollSamples=208,ballRollPath=new Float32Array(ballRollSamples+1);
  {let previous=eventBallPosition(event.type,0,sequence,finish,keeperAction);
   for(let i=1;i<=ballRollSamples;i++){
    const t=i*DURATION/ballRollSamples,next=eventBallPosition(event.type,t,sequence,finish,keeperAction);
    const travelled=Math.hypot(next[0]-previous[0],next[2]-previous[2]);
    ballRollPath[i]=ballRollPath[i-1]+(t<=SHOT_TIME?travelled/.14:4*DURATION/ballRollSamples);
    previous=next;
   }
  }
  function ballRollAt(time){const x=clamp(time/DURATION)*ballRollSamples,i=Math.min(ballRollSamples-1,Math.floor(x));return mix(ballRollPath[i],ballRollPath[i+1],x-i)}
  const hiddenPrototypeMatrix=new THREE.Matrix4().makeScale(0,0,0);
  const camTarget=new THREE.Vector3(),broadcastTracks=new Map();
  const broadcastFor=aspect=>{
   const key=Math.round(aspect*100)/100;
   if(!broadcastTracks.has(key)){
    broadcastTracks.set(key,createBroadcastCameraTrack({direction,aspect:key,type:event.type,sequence,finish,keeperAction,placement}));
   }
   return broadcastTracks.get(key);
  };
  const celebrationAnchor=new THREE.Vector3(),celebrationState={arms:0,rootY:0,kind:celebrationKind};
  let lastCameraTime=null,currentCameraPhase='build',renderTime=0,motion23Sample=null,duelSample=null,balanceSample=null,contactPose=null,trackingPose=null;
  // Aim an arm's local -Y axis at a field-space interception point.
  function aimArm(arm,point){
   arm.parent.updateWorldMatrix(true,false);
   const end=arm.parent.worldToLocal(new THREE.Vector3(...worldPosition(point,direction))),start=arm.position.clone();
   const delta=end.clone().sub(start),length=clamp(delta.length(),.0101,.6299),axis=delta.normalize();
   const bend=new THREE.Vector3(0,0,1).cross(axis).normalize();
   const along=(.32*.32-.31*.31+length*length)/(2*length);
   const joint=start.clone().addScaledVector(axis,along).addScaledVector(bend,Math.sqrt(Math.max(0,.32*.32-along*along)));
   arm.quaternion.setFromUnitVectors(new THREE.Vector3(0,-1,0),joint.clone().sub(start).normalize());
   const elbow=keeper.elbows[keeper.arms.indexOf(arm)];
   const lower=end.clone().sub(joint).normalize().applyQuaternion(arm.quaternion.clone().invert());
   elbow.quaternion.setFromUnitVectors(new THREE.Vector3(0,-1,0),lower);
  }
  const keeperGuidePoint=new THREE.Vector3();
  const keeperContactWorld=new THREE.Vector3();
  // For close-control, guide the rendered ball between the actual ANIMATED
  // boot toes. Flight paths remain independent when the foot releases it.
  function bootGuidedBall(original,time){
   if(extended)return original;
   const state=controlCarrier(time,sequence);
   if(state.weight<=0)return original;
   const p=players[state.index];
   // Explicit update is necessary because the ball is positioned BEFORE render.
   p.root.updateWorldMatrix(true,true);
   const current=stagedPlayerPosition(state.index,time,event.type,sequence),
    before=stagedPlayerPosition(state.index,Math.max(0,time-.05),event.type,sequence),
    after=stagedPlayerPosition(state.index,Math.min(DURATION,time+.05),event.type,sequence),
    vx=after[0]-before[0],vz=after[1]-before[1],length=Math.hypot(vx,vz),
    fx=length>.00001?vx/length:0,fz=length>.00001?vz/length:-1;
   const desiredX=current[0]+fx*.49,desiredZ=current[1]+fz*.49;
   const toes=[];
   for(let j=0;j<2;j++){
    const toe=field.worldToLocal(p.ankles[j].localToWorld(new THREE.Vector3(0,0,-.27))),
     x=toe.x+fx*.19,z=toe.z+fz*.19;
    toes.push({x,z,d:Math.hypot(x-desiredX,z-desiredZ)});
   }
   // Continuous foot-to-foot weighting avoids a pop when the leading boot
   // changes halfway through a step. No frame history or simulation RNG.
   const touch=footballTouchSample(gaitPhase(state.index,time),state.weight,sequence),
    continuity=pilotMotion?touchContinuity(gaitPhase(state.index,time),state.weight,state.index===0?event.playerStyles:event.creatorStyles):null;
   const leftWeight=smooth(.5+(toes[1].d-toes[0].d)*1.1),
    touchingWeight=mix(leftWeight,touch.foot===0?1:0,touch.contact*.52),
    toeX=mix(toes[1].x,toes[0].x,touchingWeight),
    toeZ=mix(toes[1].z,toes[0].z,touchingWeight);
   const dx=toeX-current[0],dz=toeZ-current[1],
    forward=clamp(dx*fx+dz*fz,.33-.10*touch.contact,.65-.11*touch.contact),side=clamp(dx*(-fz)+dz*fx,-.22,.22),
    drive=continuity?.lead||0,blend=state.weight*.94*(1-(sampleSkill(sequence,time)?.weight||0));
   return[mix(original[0],current[0]+fx*(forward+drive)-fz*side,blend),.14,
    mix(original[2],current[1]+fz*(forward+drive)+fx*side,blend)];
  }
  // Reused render-only sample; no new GPU objects during frames.
  let clipEnabled=true;
  try{clipEnabled=window.localStorage?.getItem('footera-3d-motion-source')!=='procedural'}catch(_){}
  const importedMotionFrame={speed:0,turn:0,acceleration:0,control:0,stride:0,sequence,finish,clipEnabled};
  const squadMotionFrames=players.map(()=>({...importedMotionFrame}));
  const keeperMotionFrame={...importedMotionFrame,role:'keeper',clipEnabled:false};
  // Two existing skinned actors can share the verified CC0 sampler without
  // cloning heavy GLB geometry. LOW permits just one additional participant.
  // These parts are purely cosmetic: no root translation, gait/IK or ball touch.
  const capturedParticipantIndices=importedPlayer&&clipEnabled&&!baselineRig
   ?(weak?[defenderIndex]:[1,defenderIndex].filter((id,i,a)=>a.indexOf(id)===i&&detailedActors.has(id))):[];
  const capturedInputs=new Map(capturedParticipantIndices.map(id=>[id,
   {speed:0,turn:0,acceleration:0,control:0,stride:0,sequence,finish}]));
  const sampleParticipantClip=capturedParticipantIndices.length?createGlbClipLayer():null;
  let capturedParticipantActive=0;
  // V21.226 ceremonies: walk-out and final whistle. Locomotion, footwork and
  // the GLB squad as in play; authored poses for line-up, joy and despair.
  const ceremonyStates=ceremony?[...players,keeper].map(()=>({arms:0,rootY:0})):[];
  const keeperCeremonyStride=ceremony?(()=>{const table=new Float32Array(105);let prev=ceremonyActor(ceremony,16,0,{draw:ceremonyDraw});
   for(let j=1;j<=104;j++){const next=ceremonyActor(ceremony,16,j*DURATION/104,{draw:ceremonyDraw}),d=Math.hypot(next.x-prev.x,next.z-prev.z);table[j]=table[j-1]+d*Math.PI*2/runningStrideLength(clamp(d/(DURATION/104)/6.5));prev=next}
   return t=>{const x=clamp(t/DURATION)*104,i=Math.min(103,Math.floor(x));return mix(table[i],table[i+1],x-i)}})():null;
  function poseCeremonyActor(p,index,time,frame){
   const a=ceremonyActor(ceremony,index,time,{draw:ceremonyDraw}),b=ceremonyActor(ceremony,index,Math.max(0,time-.05),{draw:ceremonyDraw}),c=ceremonyActor(ceremony,index,time+.05,{draw:ceremonyDraw});
   const speed=clamp(Math.hypot(c.x-b.x,c.z-b.z)/(time<.05?.05:.1)/6.5),keeperActor=index===16;
   const stride=keeperActor?keeperCeremonyStride(time):gaitPhase(index,time);
   pose(p,a.x,a.z,time,speed,a.heading,0,stride,0,0,99);
   if(enhancedRigMotion&&!keeperActor&&index)applySquadLocomotion(p,index,time,speed,0,stride,0,99);
   if(enhancedRigMotion)applyFootwork(p,time,speed,0,0,stride,1);
   const state=ceremonyStates[index];
   frame.speed=speed;frame.turn=0;frame.acceleration=0;frame.control=0;frame.stride=stride;frame.grounded=true;
   if(a.pose&&a.weight>.002){
    applyCelebrationPose(p,a.pose,a.s,state,a.weight);
    frame.celebrate=state.arms;frame.rootY=state.rootY;frame.celebration=state;
   }else{frame.celebrate=0;frame.rootY=null;frame.celebration=null}
  }
  function updateCeremony(time){
   players.forEach((p,i)=>poseCeremonyActor(p,i,time,i===0?importedMotionFrame:squadMotionFrames[i]));
   poseCeremonyActor(keeper,16,time,keeperMotionFrame);
   ball.visible=ceremony==='kickoff';ballRing.visible=false;ballShadow.visible=ball.visible;
   ball.position.set(0,.11,0);ballShadow.position.set(0,.019,0);ballShadow.scale.setScalar(1);
   importedPlayer?.animate(time,importedMotionFrame);
   for(let i=1;i<importedPlayers.length;i++)importedPlayers[i]?.animate(time,squadMotionFrames[i]);
   importedKeeper?.animate(time,keeperMotionFrame);
   updateCrowd(time);pyro?.update(time);
   const cam=ceremonyCamera(ceremony,time);currentCameraPhase=cam.phase;
   camera.position.set(...worldPosition(cam.position,direction));camTarget.set(...worldPosition(cam.target,direction));camera.fov=cam.fov;
   lastCameraTime=time;
   camera.updateProjectionMatrix();camera.lookAt(camTarget);camera.updateMatrixWorld();
   scene.updateMatrixWorld(true);
   for(const batch of batches.values()){batch.nodes.forEach((node,i)=>batch.mesh.setMatrixAt(i,node.userData.hideForFooteraPrototype?hiddenPrototypeMatrix:node.matrixWorld));batch.mesh.instanceMatrix.needsUpdate=true}
   renderer.render(scene,camera);
  }
  // V21.296: the two side huggers lay an arm round the scorer, the
  // hand on his far shoulder (the GLB solves the arm with two-bone IK).
  const embraceFar=new THREE.Vector3(),embraceNeck=new THREE.Vector3(),embraceOther=new THREE.Vector3(),embraceHome=new THREE.Vector3();
  function embraceScorer(){
   const scorer=importedPlayer?.model;
   for(const h of huggers){
    const frame=squadMotionFrames[h.index];if(!frame)continue;
    const on=frame.celebration&&h.slot<2&&scorer?smooth((frame.celebration.arms-.55)/.4):0;
    if(on<=0){frame.embrace=null;continue}
    const left=scorer.getObjectByName('upperarm_l'),right=scorer.getObjectByName('upperarm_r'),neck=scorer.getObjectByName('neck_01');
    if(!left||!right||!neck){frame.embrace=null;continue}
    players[h.index].root.getWorldPosition(embraceHome);
    left.getWorldPosition(embraceFar);right.getWorldPosition(embraceOther);neck.getWorldPosition(embraceNeck);
    if(embraceOther.distanceToSquared(embraceHome)>embraceFar.distanceToSquared(embraceHome))embraceFar.copy(embraceOther);
    const embrace=frame.embrace||(frame.embrace={target:new THREE.Vector3(),weight:0});
    embrace.target.copy(embraceFar).lerp(embraceNeck,.3);embrace.target.y+=.04;embrace.weight=on;
   }
  }
  function update(time,{replay=false}={}){
   renderTime=time;
   if(ceremony){updateCeremony(time);return}
   // Seek rather than increment mixer clocks: stable on skip, replay and
   // deterministic screenshots. No impact on match outcome/timeline.
   if(players[0].skeletonMotion)players[0].skeletonMotion.mixer.setTime(time);
   if(keeper.skeletonMotion)keeper.skeletonMotion.mixer.setTime(0);
   const authoredTouches=getPlay(sequence)?playTouches(getPlay(sequence)):null;
   // Every member of a combination can now absorb the incoming ball.
   // Previously only attacker 0/1 had a reception motion in these sequences.
   const carrierState=carrierPoseState(time,sequence),carrierIndex=carrierState.index;
   const defensiveBall=eventBallPosition(event.type,Math.min(time,SHOT_TIME),sequence,finish,keeperAction);
   motion23Sample=null;duelSample=null;balanceSample=null;contactPose=null;trackingPose=null;
   players.forEach((p,i)=>{const [x,z]=actorPosition(i,time,event.type,sequence),prev=actorPosition(i,Math.max(0,time-.02),event.type,sequence),next=actorPosition(i,time+.02,event.type,sequence),vx=next[0]-prev[0],vz=next[1]-prev[1],speed=clamp(Math.hypot(vx,vz)/.26),moving=speed>.002;
    const back=actorPosition(i,Math.max(0,time-.13),event.type,sequence),ahead=actorPosition(i,Math.min(DURATION,time+.13),event.type,sequence);
    // V21.297: ease from the (smoothed) standing facing into the running
    // direction as the player gets going, instead of switching at a speed
    // threshold, and turn into the celebration line instead of snapping round.
    const standing=facingAt(i,time);
    const celebrating=!celebrationActive?0:i===0?smooth((time-CELEBRATION_START)/.35):smooth((hugWeight(i,time)-.4)/.35);
    const heading=angleMix(moving?angleMix(standing,Math.atan2(-vx,-vz),smooth((speed-.0005)/.003)):standing,celebrationHeading,celebrating);
    const ax=x-back[0],az=z-back[1],bx=ahead[0]-x,bz=ahead[1]-z;
    const turn=Math.hypot(ax,az)*Math.hypot(bx,bz)>.0001?clamp(Math.atan2(ax*bz-az*bx,ax*bx+az*bz)*.45,-.14,.14):0;
    const beforeSpeed=Math.hypot(ax,az)/.13,afterSpeed=Math.hypot(bx,bz)/.13;
    const acceleration=clamp((afterSpeed-beforeSpeed)/4,-1,1);
    const cleanContactPreview=labDuelPreview&&i===defenderIndex;
    const winningDefender=event.type==='ball_won'&&i===defenderIndex;
    const singleTrackingMotion=pilotMotion&&!winningDefender&&i===defenderIndex&&isTrackingAction(defenderAction);
    const controlWeight=carrierIndex===i?carrierState.weight:0;
    const stride=hugWeight(i,time)?hugStride(i,time):gaitPhase(i,time);
    const frame=squadMotionFrames[i];
    frame.speed=speed;frame.turn=turn;frame.acceleration=acceleration;
    frame.control=controlWeight;frame.stride=stride;
    if(i===0){importedMotionFrame.speed=speed;importedMotionFrame.turn=turn;
     importedMotionFrame.acceleration=acceleration;importedMotionFrame.control=controlWeight;
     importedMotionFrame.stride=stride}
    const capture=capturedInputs.get(i);
    if(capture){capture.speed=speed;capture.turn=turn;capture.acceleration=acceleration;
     capture.control=controlWeight;capture.stride=stride}
    pose(p,x,z,time,speed,heading,turn,stride,acceleration,controlWeight,Math.hypot(defensiveBall[0]-x,defensiveBall[2]-z));
    // Make every surrounding instanced athlete readable without new draw calls.
    if(enhancedRigMotion&&i!==0&&!(pilotMotion&&i>=1&&i<=4))
     applySquadLocomotion(p,i,time,speed,turn,stride,acceleration,Math.hypot(defensiveBall[0]-x,defensiveBall[2]-z));
    if(pilotMotion&&!authoredTouches&&i<2&&time<SHOT_TIME-.25)applyFootballReception(p,i,time,sequence,Math.hypot(defensiveBall[0]-x,defensiveBall[2]-z));
    // Add bracing and release motions without moving roots, ball or match events.
    if(pilotMotion&&i<8){
     const role=i===0?'carrier':i===1?'provider':'support';
     const transition=applyMotion23(p,time,speed,turn,stride,acceleration,sequence,role,i===0?event.playerStyles:i===1?event.creatorStyles:[]);
     if(i===0)motion23Sample=transition;
    }
    if(i>=8&&time<SHOT_TIME+.4&&!cleanContactPreview&&!singleTrackingMotion){const brace=defenderTracking(i,time,sequence).pressure;
     p.upper.rotation.y+=clamp((eventBallPosition(event.type,time,sequence,finish)[0]-x)*.018,-.13,.13)*brace;
     p.arms[0].rotation.z-=.16*brace;p.arms[1].rotation.z+=.16*brace;
    }
    // The real defender's style determines a visible attempt, not an outcome.
    const motion=defensiveMotion(defenderAction,time,i,defenderIndex,Math.hypot(defensiveBall[0]-x,defensiveBall[2]-z)),a=motion.intensity;
    if(a>.001&&!singleTrackingMotion&&!winningDefender){
     if(motion.kind==='jockey'){
      p.upper.rotation.y+=.18*a*Math.sin(time*5);p.upper.rotation.x+=.07*a;
      p.legs[0].rotation.z+=.15*a;p.legs[1].rotation.z-=.15*a;
      p.arms[0].rotation.z-=.29*a;p.arms[1].rotation.z+=.29*a;
     }else if(motion.kind==='close_down'){
      p.upper.rotation.x+=.24*a;p.arms[0].rotation.x-=.38*a;p.arms[1].rotation.x+=.28*a;
      p.rig.rotation.y+=.12*a;
     }else if(motion.kind==='slide_attempt'&&!pilotMotion){
      // Legacy slide is used only if the modern full-body contact pose is off.
      p.rig.position.y-=.14*a+.045*motion.plant;
      p.rig.rotation.x-=.40*a+.15*motion.plant;
      p.rig.rotation.z+=.17*a;
      p.legs[0].rotation.x-=1.05*a;p.knees[0].rotation.x+=.23*a;
      p.legs[1].rotation.x+=.43*a;p.knees[1].rotation.x-=.82*a;
      p.upper.rotation.x+=.16*motion.recover;
      p.arms[0].rotation.z-=.67*a;p.arms[1].rotation.z+=.52*a;
     }else if(motion.kind==='block_attempt'&&!pilotMotion){
      // Pilot uses one grounded contact pose; legacy rotation opposed it.
      p.upper.rotation.x+=.30*a;p.legs[1].rotation.x-=.85*a;
      p.knees[1].rotation.x+=.28*a;
      p.arms[0].rotation.z-=.38*a;p.arms[1].rotation.z+=.52*a;
     }else if(motion.kind==='lane_read'){
      p.upper.rotation.y+=.27*a;p.rig.rotation.y-=.15*a;
      p.legs[1].rotation.x-=.64*a;p.knees[1].rotation.x+=.2*a;
      p.arms[0].rotation.x-=.35*a;
     }else if(motion.kind==='aerial_challenge'){
      p.rig.position.y+=motion.jump;p.upper.rotation.x-=.19*a;
      p.arms[0].rotation.z-=.95*a;p.arms[1].rotation.z+=.95*a;
      p.legs[0].rotation.x+=.25*a;p.legs[1].rotation.x-=.24*a;
     }
    }
    if(pilotMotion&&i>=8&&!winningDefender&&!cleanContactPreview&&!singleTrackingMotion){const range=Math.hypot(defensiveBall[0]-x,defensiveBall[2]-z);applyFootballDefender(p,time,range,i===defenderIndex?defenderAction:'jockey',sequence);applyDefenderContinuity(p,time,range,sequence,event.defenderStyles)}
    if(motion2Active&&i===defenderIndex&&!cleanContactPreview&&!singleTrackingMotion)applyDefender2(p,time,Math.hypot(defensiveBall[0]-x,defensiveBall[2]-z),sequence);
    if(pilotMotion&&i===defenderIndex&&!winningDefender){
     const dist=Math.hypot(defensiveBall[0]-x,defensiveBall[2]-z);
     duelSample=cleanContactPreview||singleTrackingMotion
      ?sampleDefensiveDuels(time,dist,defenderAction,sequence,event.defenderStyles)
      :applyDefensiveDuels(p,time,dist,defenderAction,sequence,event.defenderStyles);
     if(singleTrackingMotion){
      const attacker=stagedPlayerPosition(0,time,event.type,sequence);
      const targetHeading=Math.atan2(-(attacker[0]-x),-(attacker[1]-z));
      trackingPose=applyTrackingPose(p,defenderAction,time,speed,heading,targetHeading);
     }
     if(isContactDemo(defenderAction))contactPose=applyContactStage(p,defenderAction,
      labDuelPreview?time:defenderAction==='slide_attempt'?time-.8:time,labDuelPreview,
      Math.max(0,1-dist/8));
    }
    // V21.77 final grounded stance pass. On the already-authored joint rig,
    // not on player roots or the ball. A tackle wins over locomotion footwork.
    // Run it after contextual gait but before the one-shot pass/kick contact.
    if(enhancedRigMotion){
     const guard=(1-(i===defenderIndex?.90*a:0))*(1-.40*controlWeight);
     applyFootwork(p,time,speed,turn,acceleration,stride,guard);
    }
    // One contact pose at the actual possession change, then a complete recovery.
    if(winningDefender){
     if(sequence.startsWith('defense_slide_tackle'))contactPose=applyContactStage(p,'slide_attempt',time-(4.4-SLIDE_CONTACT),true,1);
     else{
      const touch=smooth((time-4.12)/.25)*(1-smooth((time-4.48)/.34));
      p.legs[1].rotation.x=mix(p.legs[1].rotation.x,-.62,touch);
      p.knees[1].rotation.x=mix(p.knees[1].rotation.x,-.12,touch);
      p.ankles[1].rotation.x=mix(p.ankles[1].rotation.x,.74,touch);
      p.upper.rotation.x+=.12*touch;p.arms[0].rotation.z-=.35*touch;p.arms[1].rotation.z+=.35*touch;
     }
    }
    // Do not stack a sprint torso lean over the laboratory slide run-up.
    if(cleanContactPreview&&defenderAction==='slide_attempt'&&time<3.12){
     p.upper.rotation.x=clamp(p.upper.rotation.x,-.20,.20);p.rig.rotation.x=0;
    }
    if(pilotMotion&&authoredTouches&&i<8&&time<SHOT_TIME-.25){
     const plan=getPlay(sequence),reception=playReception(plan,i,time);
     if(reception){
      const from=playPosition(reception.touch.passer,reception.touch.release,plan);
      applyReceptionContinuity(p,reception,Math.atan2(x-from[0],z-from[1]),heading);
     }
    }
   });
   capturedParticipantActive=0;
   for(const index of capturedParticipantIndices){
    const p=players[index],clip=sampleParticipantClip(time,capturedInputs.get(index));
    if(clip.weight<.005)continue;
    // Preserve a defending player's jockey/tackle choreography, especially
    // during a block or slide. No lower-body channels are touched.
    const defense=index===defenderIndex;
    const brace=defense?defensiveMotion(defenderAction,time,index,defenderIndex,
     Math.hypot(defensiveBall[0]-p.root.position.x,defensiveBall[2]-p.root.position.z)).intensity:0;
    const gain=(defense&&event.type==='ball_won'?0:defense?.65:1)*(1-.90*brace);
    if(gain<.05)continue;
    p.upper.rotation.x+=clip.torsoPitch*.65*gain;
    p.upper.rotation.z+=clip.torsoRoll*.65*gain;
    p.arms[0].rotation.x+=clip.leftArmPitch*gain;
    p.arms[1].rotation.x+=clip.rightArmPitch*gain;
    p.arms[0].rotation.z+=clip.leftArmRoll*.6*gain;
    p.arms[1].rotation.z+=clip.rightArmRoll*.6*gain;
    p.elbows[0].rotation.x+=clip.leftElbow*gain;
    p.elbows[1].rotation.x+=clip.rightElbow*gain;
    capturedParticipantActive++;
   }
   const striker=players[0];
   // V21.78 planted shot preparation; fully released before the canonical kick.
   if(event.type!=='ball_won')applyShotApproach(striker,time,finish,sequence);
   if(event.type!=='ball_won'&&time>=4.9&&time<=6.05){const k=kickPose(time),blend=smooth((time-4.9)/.25)*(1-smooth((time-5.7)/.35));
    if(INVERTED_SEQUENCES.has(sequence)||hasAuthoredFinish(sequence)||extended){
     const [sx,sz]=runPosition(0,SHOT_TIME,sequence),aim=eventShotImpact(event.type,sequence,finish);
     const shotHeading=Math.atan2(sx-aim[0],sz-aim[2]);
     striker.root.rotation.y=mix(striker.root.rotation.y,shotHeading,blend);
    }else striker.root.rotation.y*=1-blend;
    striker.legs[1].rotation.x=mix(striker.legs[1].rotation.x,k.hip,blend);striker.knees[1].rotation.x=mix(striker.knees[1].rotation.x,k.knee,blend);striker.ankles[1].rotation.x*=1-blend;
    striker.legs[0].rotation.x*=1-blend;striker.knees[0].rotation.x*=1-blend;striker.ankles[0].rotation.x*=1-blend;striker.upper.rotation.x*=1-blend;striker.upper.rotation.y*=1-blend;striker.upper.rotation.z*=1-blend;striker.rig.position.y*=1-blend;striker.arms[0].rotation.z=mix(striker.arms[0].rotation.z,-.45,blend);striker.arms[1].rotation.z=mix(striker.arms[1].rotation.z,.65,blend);
     // V21.297: every finish cross-fades with the run (no = value*blend,
     // which threw the running pose away on the first and last frame).
     if(finish==='header'){
      const jump=Math.sin(Math.PI*smooth((time-4.9)/.92))*blend;
      striker.rig.position.y+=.20*jump;striker.legs[0].rotation.x+=-.38*blend;striker.legs[1].rotation.x=mix(striker.legs[1].rotation.x,.36,blend);
      striker.knees[0].rotation.x+=-.55*blend;striker.knees[1].rotation.x=mix(striker.knees[1].rotation.x,-.48,blend);
      striker.upper.rotation.x+=mix(-.26,.33,smooth((time-5.16)/.34))*blend;
     }else if(finish==='volley'){
      const lift=smooth((time-4.96)/.37),follow=smooth((time-SHOT_TIME)/.26);
      striker.rig.position.y+=.07*Math.sin(Math.PI*smooth((time-5.0)/.7))*blend;
      striker.legs[1].rotation.x=mix(striker.legs[1].rotation.x,mix(-.38,1.42,lift)*(1-.24*follow),blend);
      striker.knees[1].rotation.x=mix(striker.knees[1].rotation.x,mix(-.82,-.24,lift),blend);
      striker.ankles[1].rotation.x+=-.18*blend;striker.upper.rotation.x+=-.29*blend;
     }else if(finish==='bicycle'){
      const flip=smooth((time-5.03)/.65);striker.rig.position.y+=.32*Math.sin(Math.PI*flip)*blend;
      striker.rig.rotation.x=mix(striker.rig.rotation.x,-Math.PI*.84*flip,blend);striker.legs[1].rotation.x=mix(striker.legs[1].rotation.x,1.50,blend);striker.legs[0].rotation.x+=-.9*blend;
     }else if(finish==='power'){
      striker.legs[1].rotation.x*=1+.15*blend;striker.upper.rotation.x+=-.25*blend;
     }else if(finish==='low_driven'){
      striker.legs[1].rotation.x*=1-.28*blend;striker.upper.rotation.x+=.17*blend;
     }else if(finish==='finesse'){
      const side=INVERTED_SEQUENCES.has(sequence)?sequenceSide(sequence):1;
      // The planted leg, striking ankle and upper body rotate around the ball:
      // a visible curved-foot finish rather than a scaled-down power strike.
      striker.legs[0].rotation.x+=-.10*blend;
      striker.legs[1].rotation.x*=1-.16*blend;
      striker.legs[1].rotation.z-=side*.18*blend;
      striker.ankles[1].rotation.z+=side*.29*blend;
      striker.upper.rotation.y+=side*.25*blend;
      striker.upper.rotation.z+=-side*.22*blend;
      striker.arms[0].rotation.x+=.18*blend;
     }
    // Authored one-shot clips run over the common 5.4 s foot-contact.
    const actionName=['normal','finesse','power','low_driven','header','volley','bicycle'].includes(finish)?finish:'normal';
    const shotClip=sampleMotionClip(actionName,(time-4.9)/1.15,striker.motionClips.action);
    const shotWeight=motionClipBlend(time,4.9,6.05,.16);
    striker.upper.rotation.x+=shotClip.pitch*shotWeight;
    striker.upper.rotation.y+=shotClip.yaw*shotWeight;
    striker.upper.rotation.z+=shotClip.roll*shotWeight;
    striker.arms[0].rotation.z-=shotClip.spread*shotWeight;
    striker.arms[1].rotation.z+=shotClip.spread*shotWeight;
    striker.arms[0].rotation.x+=shotClip.arm*shotWeight;
    striker.arms[1].rotation.x-=shotClip.arm*shotWeight;
    striker.legs[1].rotation.x+=shotClip.kick*shotWeight*.42;
    striker.knees[1].rotation.x+=shotClip.knee*shotWeight*.38;
    striker.ankles[1].rotation.z+=shotClip.ankle*shotWeight*.5;
    striker.rig.position.y+=shotClip.bounce*shotWeight;
    if(enhancedRigMotion)animateFootballFinish(striker,time,finish,sequence);
   }
   // V21.297: the strike's load starts at 4.73 s and the follow-through runs
   // to 6.07 s; inside the 4.9-6.05 s gate above both snapped on and off.
   if(pilotMotion&&event.type!=='ball_won'&&time>=4.7&&time<=6.15){applyFootballStrike(striker,time,finish,sequence);applyFinishContinuity(striker,time,finish,event.playerStyles)}
   // Final rig pass preserves canonical striker boot impact and ball trajectory.
   if(motion2Active)applyWinger2(striker,time,sequence,finish,motion2CutAnchor,motion2ShotAnchor,event.playerStyles);
   // 2.6: rebalance after the kick; never change the canonical 5.4s contact.
   if(pilotMotion)balanceSample=applyFinishBalance(striker,time,finish);
   const authoredPassWindows=getPlay(sequence)?playPassWindows(getPlay(sequence)):DEFENSIVE_SCENES.includes(sequence)?[
    {actor:1,start:.41,end:.90},
    ...(['defense_interception','defense_press_recovery'].includes(sequence)?[{actor:0,start:2.96,end:3.45}]:[])
   ]:null;
   const scriptedWing=(base.startsWith('wing_')||base.startsWith('cutback_'))&&sequence!=='diagonal_switch';
   const deliveryWindow=scriptedWing?[[wideLaunch(sequence)-.24,wideLaunch(sequence)+.25]]:[];
   const openingPass=scriptedWing?[{actor:sequenceSide(sequence==='bicycle'?base:sequence)<0?5:4,start:ENTRY_RELEASE-.24,end:ENTRY_RELEASE+.30}]:[];
   const passWindows=authoredPassWindows|| (INVERTED_SEQUENCES.has(sequence)?[]:sequence==='diagonal_switch'?[[-.24,.25],[3.41,3.9]]:scriptedWing?[...openingPass,...deliveryWindow]:base==='one_two'?[[1.56,2.05],[2.41,2.9]]:base==='through_ball'?[[2.11,2.6]]:base==='dribble'?[]:[[1.76,2.25]]);
   for(const window of passWindows){
    const [from,to]=Array.isArray(window)?window:[window.start,window.end];
    if(time<from||time>to)continue;
    const passer=window.actor!==undefined?players[window.actor]:(sequence==='diagonal_switch'&&from<1?players[5]:players[1]),u=clamp((time-from)/(to-from)),kick=passStrikePose(u);
    // V21.297: blend into and out of the pass instead of snapping the leg
    // to the wind-up on the first frame and back to the run on the last.
    const w=smooth(u/.2)*(1-smooth((u-.78)/.22));
    passer.legs[1].rotation.x=mix(passer.legs[1].rotation.x,kick.hip,w);passer.knees[1].rotation.x=mix(passer.knees[1].rotation.x,kick.knee,w);passer.ankles[1].rotation.x=mix(passer.ankles[1].rotation.x,kick.ankle,w);
    passer.rig.rotation.x=mix(passer.rig.rotation.x,-.085*(1-kick.follow),w);passer.rig.rotation.y=mix(passer.rig.rotation.y,.10*Math.sin(u*Math.PI),w);
    passer.arms[0].rotation.z=mix(passer.arms[0].rotation.z,-.38,w);passer.arms[1].rotation.z=mix(passer.arms[1].rotation.z,.55,w);
    if(pilotMotion)applyDeliveryContinuity(passer,u,sequence,event.creatorStyles);
    const passerIndex=players.indexOf(passer),finalPasser=getPlay(sequence)?playTouches(getPlay(sequence)).at(-1)?.passer:1,foot=passerIndex===finalPasser?(event.creatorFoot||event.playerFeet?.[passerIndex]):event.playerFeet?.[passerIndex];
    applyFootedPose(passer,time,foot,from,to);
   }
   // The saved result in a sandbox contact demo is NOT a goalkeeper save or goal.
   const kp=labDuelPreview||event.type==='ball_won'?{x:0,y:0,z:-50.6,tilt:0,anticipation:0,dive:0,land:0,recover:0}:
    eventKeeperPose(event.type,time,finish,sequence,keeperAction);
   pose(keeper,kp.x,kp.z,time,.12,Math.PI);
   // The keeper has ONE biomechanical pose owner. Legacy additive dive,
   // random-looking captured jumps and whole-body tilting must not fight it.
   // All sample times are absolute and deterministic; the match score and
   // ball trajectory continue to come exclusively from the simulator.
   keeper.root.rotation.y=Math.PI;
   const impact=eventShotImpact(event.type,sequence,finish);
   if(labDuelPreview||event.type==='ball_won'){
    keeper.root.position.y=0;
    keeper.shadow.position.y=.022;
    keeper.rig.rotation.z=0;
   }else{
    applyGoalkeeperMotion(keeper,time,kp,event.type,keeperAction,impact[0],impact[1]);
    // A loaded knee bend lowers the hips; it must not lift both boots off turf.
    // Release the support constraint for flight, restore it as the keeper rises.
    const support=Math.max(1-smooth((time-5.79)/.32),smooth((time-8.68)/.50));
    if(support>.001){
     let sole=Infinity;
     for(const ankle of keeper.ankles){ankle.getWorldPosition(keeperContactWorld);field.worldToLocal(keeperContactWorld);sole=Math.min(sole,keeperContactWorld.y)}
     keeper.root.position.y-=(sole-.07)*support;
     keeper.shadow.position.y=.022-keeper.root.position.y;
    }
    // Only an actual SAVE gets contact IK. One hand reaches the ball;
    // the other braces just behind it instead of two stiff parallel arms.
    const saved=event.type==='big_chance_saved',side=Math.sign(impact[0])||1;
    const lead=side>0?0:1,other=1-lead;
    const toContact=smooth((time-6.22)/.26)*(1-smooth((time-6.80)/.24));
    const guide=(index,point,weight)=>{
      // Blend the endpoint, not two arm quaternions: their shortest rotation
      // can switch sides mid-reach and jerk the whole keeper via contact IK.
      keeper.gloves[index].getWorldPosition(keeperGuidePoint);
      field.worldToLocal(keeperGuidePoint);
      aimArm(keeper.arms[index],[mix(keeperGuidePoint.x,point[0],weight),
       mix(keeperGuidePoint.y,point[1],weight),mix(keeperGuidePoint.z,point[2],weight)]);
    };
    if(saved&&toContact>.001){
     guide(lead,[impact[0],impact[1],-50.6],toContact);
    }
    // Read the ACTUAL animated glove position, not a guessed reach length.
    // Blend the center-of-mass toward that interception over the whole leap.
    // A save is never shown with a one-metre gap between glove and ball.
    // Field-local coordinates work identically after either half-time rotation.
    const catchWeight=smooth((time-5.91)/.65)*(1-smooth((time-6.79)/.43));
    if(saved&&catchWeight>.001){
     keeper.root.updateWorldMatrix(true,true);
     keeper.gloves[lead].getWorldPosition(keeperContactWorld);
     field.worldToLocal(keeperContactWorld);
     keeper.root.position.x+=(impact[0]-keeperContactWorld.x)*catchWeight;
     keeper.root.position.y=Math.max(0,keeper.root.position.y+(impact[1]-keeperContactWorld.y)*catchWeight);
     keeper.root.position.z+=(impact[2]-keeperContactWorld.z)*catchWeight;
     keeper.shadow.position.y=.022-keeper.root.position.y;
    }
    // Aim the supporting hand after root interception correction, otherwise
    // that correction lifts the second hand away from the ball as well.
    if(saved&&toContact>.001)
     guide(other,[impact[0]-side*.33,Math.max(.22,impact[1]-.24),-50.49],toContact*.92);
    // Brace against the turf during landing and the first part of getting up.
    // Targets stay in field space, so neither hand passes through the grass.
    const brace=smooth((time-6.82)/.35)*(1-smooth((time-8.48)/.55));
    if(brace>.001){
     guide(lead,[keeper.root.position.x+side*1.24,.10,keeper.root.position.z+.28],brace);
     guide(other,[keeper.root.position.x+side*1.57,.16,keeper.root.position.z-.16],brace);
    }
   }
   const skillPose=event.type!=='ball_won'?applySkillPose(players[0],time,sequence):null;
   importedMotionFrame.skillWeight=skillPose?.weight||0;
   const guidedBall=bootGuidedBall(eventBallPosition(event.type,time,sequence,finish,keeperAction),time);
   const labContact=labDuelPreview?(defenderAction==='slide_attempt'?SLIDE_CONTACT:BLOCK_CONTACT):Infinity;
   const bp=labDuelPreview&&time>=labContact?stagedBallPosition(defenderAction,time,sequence,labBallAt):guidedBall;
   ball.position.set(...bp);ball.rotation.x=ballRollAt(time);ball.rotation.z=.075*Math.sin(time*5);
   ballRing.position.set(bp[0],.025,bp[2]);ballRing.visible=time<IMPACT_TIME+.12;ballRing.material.opacity=time<SHOT_TIME?.25:.18;
   if(trail.length){const [from,to]=signature.trail;trail.forEach((dot,i)=>{const t=time-i*.012;dot.visible=t>=from&&time<=to;if(dot.visible)dot.position.set(...(i?eventBallPosition(event.type,t):bp))})}
   if(signatureIcon){
    const [from,to]=signature.badge,on=time>=from&&time<to;signatureIcon.visible=on;
    if(on){
     // The creator is whoever has the ball when the icon lights up.
     if(signatureIcon.userData.owner<0){const b=ball.getWorldPosition(new THREE.Vector3());let best=Infinity;players.forEach((p,i)=>{if(RUNS[i]?.team!=='attack')return;const d=p.root.getWorldPosition(new THREE.Vector3()).distanceTo(b);if(d<best){best=d;signatureIcon.userData.owner=i}});if(signatureIcon.userData.owner<0)signatureIcon.userData.owner=0}
     const head=players[signatureIcon.userData.owner].root.getWorldPosition(new THREE.Vector3());
     signatureIcon.position.set(head.x,head.y+2.45,head.z);
     signatureIcon.material.opacity=smooth((time-from)/.25)*(1-smooth((time-to+.3)/.3));
     signatureIcon.scale.setScalar(1.35*(1+.07*Math.sin(time*9)));
    }
   }
   const shadowScale=clamp(1-bp[1]/3,.42,1);ballShadow.position.set(bp[0],.019,bp[2]);ballShadow.scale.setScalar(shadowScale);ballShadow.material.opacity=.12+.18*shadowScale;
   const reaction=smooth((time-IMPACT_TIME)/.72);
   if(event.type==='goal'&&!labDuelPreview&&time>REVEAL_TIME){const t=time-REVEAL_TIME,up=smooth(t/.35);for(const i of [0,2,3]){const p=players[i];p.arms[0].rotation.z=mix(p.arms[0].rotation.z,-1.75,up);p.arms[1].rotation.z=mix(p.arms[1].rotation.z,1.75,up)}for(const i of [8,9,10,11]){const p=players[i];p.rig.rotation.x=.045*reaction;p.arms[0].rotation.z=-.18*reaction;p.arms[1].rotation.z=.18*reaction}}
   else if(reaction>.05){const lift=event.type==='big_chance_saved'?1.05:event.type==='shot_post'?.82:.58;striker.arms[0].rotation.z=mix(striker.arms[0].rotation.z,-lift,reaction);striker.arms[1].rotation.z=mix(striker.arms[1].rotation.z,lift,reaction);striker.rig.rotation.x=-.03*reaction}
   const positions=net.geometry.attributes.position;
   // The woodwork rattles when a goal goes in off the bar or the post.
   if(event.type==='goal'&&placement?.style&&placement.style!=='top_corner'){
    const t=time-(netArrival-goalNetDelay(placement)),shake=t>0&&t<1.2?Math.sin(t*46)*Math.exp(-t*4.5):0;
    if(placement.style==='crossbar_in')net.bar.position.y=2.44+.035*shake;
    else{const post=net.uprights[(Math.sign(eventShotImpact('goal')[0])||1)>0?1:0];post.position.x=Math.sign(post.position.x)*3.66+.03*shake}
   }
   if(event.type==='goal'&&!labDuelPreview&&time>=netArrival&&time<netArrival+1.5){const t=time-netArrival;for(let i=0;i<positions.count;i++){const x=net.base[i*3],y=net.base[i*3+1],z=net.base[i*3+2],netY=netPoint[1],netX=netPoint[0],influence=Math.exp(-((x-netX)**2+(y-netY)**2)*.8)*(z<-1?1:0);positions.array[i*3+2]=z-Math.sin(t*16)*Math.exp(-t*3)*.28*influence}positions.needsUpdate=true}
   if(extended){
    // Keep the same grounded gait as ordinary play; never disable the GLB
    // locomotion while moving sixteen footballers across the pitch.
    const timing=extendedTiming(sequence),physical=extendedSeconds(sequence,time),rate=time<SHOT_TIME?5.4/timing.shot:1;
    // Header/volley/bicycle still need their explicitly authored airborne
   // strike, unlike running or waiting actors.
   importedMotionFrame.grounded=time<4.9||!['header','volley','bicycle'].includes(finish);
   importedMotionFrame.clipEnabled=clipEnabled;
    players.forEach((p,i)=>{
     // V21.195: scorer and hugging teammates celebrate like in open play.
     if(i===0&&time>=4.9||hugWeight(i,time)>0)return;
     const point=extendedPosition(i,time,sequence),before=extendedPosition(i,Math.max(0,time-.02),sequence),after=extendedPosition(i,time+.02,sequence);
     const dx=after[0]-before[0],dz=after[1]-before[1],speed=clamp(Math.hypot(dx,dz)/.04*rate/6.5);
     const wall=extended==='free_kick'&&i>=8&&i<=11&&physical<8.6;
     const heading=wall?Math.PI:extended==='throw_in'&&i===1&&physical<3.5?Math.PI/2:
      Math.hypot(dx,dz)>.001?Math.atan2(-dx,-dz):p.root.rotation.y;
     const stride=gaitPhase(i,time),control=carrierIndex===i?carrierState.weight:0;
     pose(p,point[0],point[1],time,speed,heading,0,stride,0,control,Math.hypot(defensiveBall[0]-point[0],defensiveBall[2]-point[1]));
     // Plant the boots unless an actual jump is authored below.
     p.rig.position.y=clamp(p.rig.position.y,-.055,.020);
     poseExtendedActor(p,i,time,sequence);
     const frame=squadMotionFrames[i];frame.speed=speed;frame.control=control;
     frame.stride=stride;frame.clipEnabled=clipEnabled;
     frame.grounded=!(wall&&physical>=7.85&&physical<=8.55);
     if(i===0){importedMotionFrame.speed=speed;importedMotionFrame.control=control;importedMotionFrame.stride=stride}
    });
    if(buildKeeper){resetPose(buildKeeper);const pos=extendedPosition(16,time,sequence);buildKeeper.root.position.set(pos[0],0,pos[1]);poseExtendedActor(buildKeeper,16,time,sequence);}
   }
   if(event.type==='ball_won'){
    importedMotionFrame.grounded=true;
    for(const frame of squadMotionFrames)frame.grounded=true;
   }
   // Authored goal celebration on the scorer's driver; the GLB follows it.
   importedMotionFrame.celebrate=0;importedMotionFrame.rootY=null;celebrationState.rootY=0;
   if(celebrationActive&&time>CELEBRATION_START){
    applyCelebrationPose(players[0],celebrationKind,time-CELEBRATION_START,celebrationState);
    importedMotionFrame.celebrate=celebrationState.arms;importedMotionFrame.rootY=celebrationState.rootY;importedMotionFrame.celebration=celebrationState;
   }
   for(const h of huggers){
    const frame=squadMotionFrames[h.index],u=hugWeight(h.index,time);
    if(u>.8){
     applyCelebrationPose(players[h.index],h.slot%2?'hug_right':'hug_left',time-HUG_START-h.arrive*.8,h.state);
     frame.celebrate=h.state.arms;frame.rootY=h.state.rootY;frame.celebration=h.state;
    }else{frame.celebrate=0;frame.rootY=null;frame.celebration=null}
   }
   // V21.208: the overhead kick turns the scorer's back to goal until he is up.
   const bike=finish==='bicycle'&&event.type!=='ball_won'&&!extended?bicycleKickPose(time):null;
   importedMotionFrame.acrobatic=bike;
   if(bike){
    const [sx,sz]=runPosition(0,SHOT_TIME,sequence),aim=eventShotImpact(event.type,sequence,finish),away=Math.atan2(sx-aim[0],sz-aim[2])+Math.PI;
    const from=players[0].root.rotation.y,turn=Math.atan2(Math.sin(away-from),Math.cos(away-from));
    players[0].root.rotation.y=from+turn*bike.weight;
   }
   // V21.208 (Basti): the support boot is planted beside the ball and stays
   // there while the body runs over it; it used to glide along with the hips.
   const plant=event.type!=='ball_won'&&!['header','volley','bicycle'].includes(finish)?plantFootSample(time):null;
   if(plant){const p=players[0],h=p.root.rotation.y,fx=-Math.sin(h),fz=-Math.cos(h),rx=Math.cos(h),rz=-Math.sin(h);
    const [ax,az]=actorPosition(0,SHOT_TIME,event.type,sequence),spot=[ax-.108*rx+.05*fx,az-.108*rz+.05*fz];
    const hx=p.root.position.x-.108*rx,hz=p.root.position.z-.108*rz,dx=spot[0]-hx,dz=spot[1]-hz;
    const ahead=dx*fx+dz*fz,aside=dx*rx+dz*rz,down=.94+p.rig.position.y-(.055+plant.lift);
    const reach=Math.min(.8599,Math.hypot(ahead,down)),bend=Math.acos(reach/.86),hip=Math.atan2(ahead,down)+bend,w=plant.weight;
    p.legs[0].rotation.x=mix(p.legs[0].rotation.x,hip,w);p.knees[0].rotation.x=mix(p.knees[0].rotation.x,-2*bend,w);
    p.ankles[0].rotation.x=mix(p.ankles[0].rotation.x,2*bend-hip,w);p.legs[0].rotation.z=mix(p.legs[0].rotation.z,Math.atan2(aside,down),w);
   }
   if(event.type!=='ball_won'&&!['header','bicycle'].includes(finish)){
    const w=applyFootedPose(players[0],time,event.shotFoot);
    // Keep the left striking boot on the SAME authoritative ball contact.
    const h=players[0].root.rotation.y;players[0].root.position.x+=.21*Math.cos(h)*w;players[0].root.position.z-=.21*Math.sin(h)*w;
    importedMotionFrame.footActionWeight=w;
   }
   importedPlayer?.animate(time,importedMotionFrame);
   embraceScorer();
   for(let i=1;i<importedPlayers.length;i++)importedPlayers[i]?.animate(time,squadMotionFrames[i]);
   importedKeeper?.animate(time,keeperMotionFrame);
   updateCrowd(time);pyro?.update(time);
   // Extended match scenes must use the exact same stable broadcast track.
   const cam=labFocusedPreview?eventCameraState(direction,time,camera.aspect,event.type,sequence,finish,keeperAction):(extended&&extendedSetPieceCamera(sequence,time,direction,camera.aspect,eventBallPosition(event.type,time)))||broadcastFor(camera.aspect)(time);
   currentCameraPhase=cam.phase;
   if(labFocusedPreview){
    const focus=stagedPlayerPosition(defenderIndex,time,event.type,sequence);
    const attacker=labTrackingPreview?stagedPlayerPosition(0,time,event.type,sequence):focus;
    const tx=mix(cam.target[0],(focus[0]+attacker[0])*.5,labTrackingPreview?.96:.73);
    const tz=mix(cam.target[2],(focus[1]+attacker[1])*.5,labTrackingPreview?.96:.73),ty=.88,zoom=labTrackingPreview?.70:.58;
    const position=[tx+(cam.position[0]-cam.target[0])*zoom,ty+(cam.position[1]-cam.target[1])*zoom,tz+(cam.position[2]-cam.target[2])*zoom];
    const target=[tx,ty,tz],desiredFov=cam.fov*(labTrackingPreview?.86:.78);
    const delta=lastCameraTime===null?0:time-lastCameraTime,snap=lastCameraTime===null||delta<0||delta>.5;
    const follow=snap?1:1-Math.exp(-Math.max(0,delta)*10);
    camera.position.lerp(new THREE.Vector3(...position),follow);
    camTarget.lerp(new THREE.Vector3(...target),follow);
    camera.fov=mix(camera.fov,desiredFov,follow);
   }else{
    camera.position.set(...cam.position);camTarget.set(...cam.target);camera.fov=cam.fov;
   }
   if(celebrationActive&&time>=CELEBRATION_CUT&&!replay){
    // TV close-up: cut to a camera ahead of the scorer on the broadcast side,
    // drifting slowly as he runs towards it.
    const root=players[0].root.getWorldPosition(celebrationAnchor),k=direction;
    // V21.191: a real close-up. Head and chest stay above the result card,
    // with a slow push-in (6.0 m to 5.1 m) instead of a static medium shot.
    const runX=celebrationRun[0]*k,runZ=celebrationRun[1]*k,since=time-CELEBRATION_CUT,drift=since*.3;
    const pu=clamp(since/2.6),push=pu*pu*pu*(pu*(pu*6-15)+10),near=lateDrama?mix(7.2,6.2,push):mix(6,5.1,push),side=mix(1.1,.75,push)-drift*.3;
    const lift=celebrationState.rootY*.75;
    camera.position.set(root.x+runX*near-runZ*side,root.y+1.5+lift*.5,root.z+runZ*near+runX*side);
    // V21.195 (Basti): further back and aimed lower, so the whole celebration
    // stays in the upper part of the picture above the result card.
    camTarget.set(root.x,root.y+.6+lift,root.z);camera.fov=30;
   }
   if(replay){
    // V21.226 replay: the same seconds again from high behind the goal.
    const shooter=actorPosition(0,SHOT_TIME),cam=replayCamera(direction,shooter,bp);
    camera.position.set(...cam.position);camTarget.set(...cam.target);camera.fov=cam.fov;currentCameraPhase='replay';
   }
   // Preview QA only: a portrait camera on one player's head.
   const qaCam=globalThis.__FOOTERA_QA_PORTRAIT;
   if(qaCam&&players[qaCam.index??0]){const head=importedPlayers[qaCam.index??0]?.model?.getObjectByName('Head')||null,p=new THREE.Vector3();
    if(head)head.getWorldPosition(p);else players[qaCam.index??0].root.getWorldPosition(p).add(new THREE.Vector3(0,1.65,0));
    const yaw=players[qaCam.index??0].root.getWorldQuaternion(new THREE.Quaternion()),f=new THREE.Vector3(0,0,-1).applyQuaternion(yaw);
    camera.position.set(p.x+f.x*qaCam.dist+(qaCam.side||0)*f.z,p.y+(qaCam.up||0),p.z+f.z*qaCam.dist-(qaCam.side||0)*f.x);camTarget.set(p.x,p.y+(qaCam.aim||0),p.z);camera.fov=qaCam.fov||24}
   lastCameraTime=time;
   camera.updateProjectionMatrix();camera.lookAt(camTarget);camera.updateMatrixWorld();
   scene.updateMatrixWorld(true);
   for(const batch of batches.values()){batch.nodes.forEach((node,i)=>batch.mesh.setMatrixAt(i,node.userData.hideForFooteraPrototype?hiddenPrototypeMatrix:node.matrixWorld));batch.mesh.instanceMatrix.needsUpdate=true}
   renderer.render(scene,camera);
  }
  function reduceQuality(){
   // Spend the performance budget on the match and readable pitch-side boards.
   // Reduce only spectator geometry and stop all crowd/flag animation work.
   crowdDetailReduced=true;
   for(const group of [crowdStatic,crowdDynamic]){
    const count=Math.floor(group.specs.length*.35);
    group.torso.count=group.head.count=count;
    group.arms.count=group.legs.count=count*2;
   }
   flagPole.visible=flagCloth.visible=false;
   supporterBanners.forEach(x=>x.visible=false);
  }
  function resize(width,height){camera.aspect=width/height;camera.updateProjectionMatrix();renderer.setSize(width,height,false)}
  function dispose(){
   boardLogo.onload=null;
   for(const glb of importedPlayers)glb?.dispose();
   importedKeeper?.dispose();
   for(const actor of [...players,keeper])if(actor.skeletonMotion){
    actor.skeletonMotion.mixer.stopAllAction();actor.skeletonMotion.mixer.uncacheRoot(actor.skeletonMotion.mixer.getRoot());
   }
   for(const resource of resources){try{resource.dispose?.()}catch(_){}}
   scene.clear()
  }
  function inspect(){
   const project=p=>p.clone().project(camera),visible=players.filter(p=>{const q=project(p.root.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0,1,0)));return Math.abs(q.x)<.98&&Math.abs(q.y)<.98&&q.z<1}).length;
   const ballWorld=ball.getWorldPosition(new THREE.Vector3()),control=controlCarrier(renderTime,sequence),goalWorld=new THREE.Vector3(...worldPosition([0,.4,-52.5],direction)),wingerWorld=players[1].root.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0,.9,0)),runnerWorld=players[2].root.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0,.9,0));
   const ballScreen=project(ballWorld),goalScreen=project(goalWorld),wingerScreen=project(wingerWorld),runnerScreen=project(runnerWorld),sampleMatrix=new THREE.Matrix4(),samplePosition=new THREE.Vector3(),flagPosition=new THREE.Vector3();
   if(crowdDynamic.specs.length){crowdDynamic.torso.getMatrixAt(0,sampleMatrix);samplePosition.setFromMatrixPosition(sampleMatrix)}
   if(flagCloth.count){flagCloth.getMatrixAt(0,sampleMatrix);flagPosition.setFromMatrixPosition(sampleMatrix)}
   const supportFootClearance=players.map(p=>Math.min(...p.feet.map(f=>{const m=f.matrixWorld.elements;return m[13]-Math.hypot(m[1],m[5],m[9])})));
   const facing=players.map((p,index)=>{const before=stagedPlayerPosition(index,Math.max(0,renderTime-.02),event.type,sequence),after=stagedPlayerPosition(index,renderTime+.02,event.type,sequence),front=new THREE.Vector3(0,0,-1).transformDirection(p.upper.matrixWorld),toe=new THREE.Vector3(0,0,-1).transformDirection(p.ankles[0].matrixWorld);return{index,forward:[front.x,front.z],toe:[toe.x,toe.z],velocity:[(after[0]-before[0])*direction,(after[1]-before[1])*direction]}});
   const defenderPos=stagedPlayerPosition(defenderIndex,renderTime,event.type,sequence),attackerPos=stagedPlayerPosition(0,renderTime,event.type,sequence);
   const defenderRoute=labTrackingPreview?trackingTimeline.sample(renderTime):null;
   const runnerBefore=stagedPlayerPosition(0,Math.max(0,renderTime-.016),event.type,sequence),runnerAfter=stagedPlayerPosition(0,Math.min(DURATION,renderTime+.016),event.type,sequence);
   const runnerDt=Math.max(.001,Math.min(DURATION,renderTime+.016)-Math.max(0,renderTime-.016));
   return{skillAction:sampleSkill(sequence,renderTime),shotFoot:event.shotFoot||'',strikeFeet:players[0].ankles.map(a=>field.worldToLocal(a.getWorldPosition(new THREE.Vector3())).toArray()),strikerRoot:players[0].root.position.toArray(),
    extendedPhase:extendedPhase(sequence,renderTime,event.team,event.type),buildKeeperPosition:buildKeeper?.root.position.toArray()||null,contactMotionVersion:CONTACT_MOTION_VERSION,attackFlowVersion:ATTACK_FLOW_VERSION,
    attackFlowSpeed:Math.hypot(runnerAfter[0]-runnerBefore[0],runnerAfter[1]-runnerBefore[1])/runnerDt,defenderTrackingVersion:DEFENDER_TRACKING_VERSION,
    trackingPreview:labTrackingPreview,trackingAction:labTrackingPreview?defenderAction:'none',
    trackingPhase:defenderRoute?.phase||trackingPose?.phase||'inactive',
    trackingGap:Math.hypot(defenderPos[0]-attackerPos[0],defenderPos[1]-attackerPos[1]),
    trackingClosing:defenderRoute?.closing||0,
    trackingSpeed:defenderRoute?.speed||0,trackingReaction:defenderRoute?.reaction||0,
    trackingVelocity:defenderRoute?.velocity||[0,0],
    trackingPoseLean:players[defenderIndex].upper.rotation.x,
    trackingDefenderPosition:defenderPos,trackingAttackerPosition:attackerPos,
    contactMotionVersionLegacy:CONTACT_MOTION_VERSION,motionLab:pilotMotion,motionDuelPreview:labDuelPreview,
    contactAction:labDuelPreview?defenderAction:'none',
    contactTilt:contactPose?.torsoTilt||0,contactExtension:contactPose?.extension||0,
    contactBodyLean:players[defenderIndex].upper.rotation.x,
    contactPelvisLean:players[defenderIndex].rig.rotation.x,
    contactArmSpread:Math.max(Math.abs(players[defenderIndex].arms[0].rotation.z),Math.abs(players[defenderIndex].arms[1].rotation.z)),
    contactBallDistance:Math.hypot(ball.position.x-players[defenderIndex].root.position.x,ball.position.z-players[defenderIndex].root.position.z),
    contactBallDeflected:labDuelPreview&&renderTime>(defenderAction==='slide_attempt'?SLIDE_CONTACT:BLOCK_CONTACT)+.10,
    motionDuels:pilotMotion,motionDuelPhase:duelSample?.phase||'inactive',
    motionDuelShuffle:duelSample?.shuffle||0,motionDuelBlock:duelSample?.block||0,
    motionDuelRecovery:duelSample?.recovery||0,motionDuelNear:duelSample?.near||0,
    motionFinishBalance:balanceSample?.load||0,
    goalkeeperMotionVersion:GOALKEEPER_MOTION_VERSION,
    goalkeeperBiomechanics:sampleGoalkeeperMotion(renderTime,event.type,keeperAction,eventShotImpact(event.type,sequence,finish)[0],eventShotImpact(event.type,sequence,finish)[1]),
    motion23:pilotMotion,motion23Phase:motion23Sample?.phase||'inactive',
    motion23Cushion:motion23Sample?.cushion||0,motion23Brake:motion23Sample?.brake||0,motion23Launch:motion23Sample?.launch||0,
    motion2:motion2Active,motion2Side:motion2Active?sampleWinger2(renderTime,sequence,finish).side:0,motion2Feint:motion2Active?sampleWinger2(renderTime,sequence,finish).fake:0,motion2Touch:motion2Active?sampleWinger2(renderTime,sequence,finish,event.playerStyles).touch:0,motion2Aim:motion2Active?sampleWinger2(renderTime,sequence,finish,event.playerStyles).aim:0,motion2Stage:motion2Active?sampleWinger2(renderTime,sequence,finish).phase:'inactive',motion2Defender:motion2Active?sampleDefender2(renderTime,Math.hypot(players[defenderIndex].root.position.x-players[0].root.position.x,players[defenderIndex].root.position.z-players[0].root.position.z),sequence).phase:'inactive',motion2CutBoot:motion2Active?players[0].ankles[sequence.endsWith('_left')?0:1].getWorldPosition(new THREE.Vector3()).toArray():null,motion2PlantBoot:motion2Active?players[0].ankles[0].getWorldPosition(new THREE.Vector3()).toArray():null,labActors:pilotMotion?['attacker','provider','support','support','support','defender']:[],squadMotion:players.map(p=>[p.upper.rotation.x,p.upper.rotation.y,p.upper.rotation.z,p.rig.rotation.z,p.arms[0].rotation.x,p.arms[1].rotation.x,p.knees[0].rotation.x,p.knees[1].rotation.x]),motionPose:{wingerYaw:players[1].upper.rotation.y,wingerRoll:players[1].upper.rotation.z,strikerPitch:players[0].upper.rotation.x,strikerYaw:players[0].upper.rotation.y,strikerRoll:players[0].upper.rotation.z,strikerKickHip:players[0].legs[1].rotation.x,strikerKickKnee:players[0].knees[1].rotation.x,strikerAnkle:players[0].ankles[1].rotation.z,keeperPitch:keeper.upper.rotation.x,keeperKnee:keeper.knees[0].rotation.x,keeperTakeoff:keeper.legs[0].rotation.x},riggedActors:players.filter(p=>!!p.skinned).length+(keeper.skinned?1:0),
     playerModelTier:allQuaternius&&importedKeeper?(humanSquad?'human-entire-squad':'quaternius-entire-squad'):weak?'low-hybrid':'full-squad',
     importedSquadCount:importedPlayers.filter(Boolean).length,
      importedHairStyles:importedPlayers.filter(Boolean).map(p=>p.hairStyle),
     importedKeeper:!!importedKeeper,
     importedHomeCount:importedPlayers.filter((p,i)=>p&&RUNS[i].team===(event.team==='away'?'defend':'attack')).length,
     importedAwayCount:importedPlayers.filter((p,i)=>p&&RUNS[i].team===(event.team==='away'?'attack':'defend')).length,
     kickoffKitSnapshot:{home:{...kits.home},away:{...kits.away},goalkeeper:kits.keeper},
     importedFootballer:!!importedPlayer,importedVariant:importedPlayer?.variant||'legacy',importedPbr:!!importedPlayer?.surfaceDetail,
     importedVertices:importedPlayer?.vertexCount||0,
     importedBones:importedPlayer?.boneCount||0,
      importedMotion:importedPlayer?.inspectMotion()||null,
      groundedFootwork:{weight:players[0].footworkState.weight||0,sprint:players[0].footworkState.sprint||0,
       armDrive:players[0].footworkState.armDrive||0,turnBank:players[0].footworkState.bank||0,
       brake:players[0].footworkState.brake||0,
       burst:players[0].footworkState.burst||0,leftSupport:!!players[0].footworkState.feet[0].support,
       leftToeLift:players[0].footworkState.feet[0].anklePitch||0,
       rightToeLift:players[0].footworkState.feet[1].anklePitch||0},
      capturedMotionEnabled:!!(importedPlayer&&clipEnabled),
      capturedContext:{enabled:capturedParticipantIndices.length>0,indices:[...capturedParticipantIndices],activeCount:capturedParticipantActive},
    riggedBones:players[0].skinned?.bones||0,
    riggedVertices:players[0].skinned?.vertexCount||0,
    skeletonClip:players[0].skeletonMotion?.clip.name||'',
    defensiveRoles:defensiveUnit?.roles||null,playerPositions:players.map(p=>[p.root.position.x,p.root.position.z]),defenderAction,keeperAction,defenderIndex,defenderMotion:defensiveMotion(defenderAction,renderTime,defenderIndex,defenderIndex),keeperReaction:eventKeeperPose(event.type,renderTime,finish,sequence,keeperAction),facing,supportFootClearance,controlCarrier:control.index,controlWeight:control.weight,ballToCarrier:control.index<0||!players[control.index]?null:Math.hypot(ball.position.x-players[control.index].root.position.x,ball.position.z-players[control.index].root.position.z),direction,sequence,finish,cameraPhase:currentCameraPhase,cameraShot:celebrationActive&&renderTime>=CELEBRATION_CUT?'scorer-close-up':extended&&extendedSetPieceCamera(sequence,renderTime,direction,camera.aspect,eventBallPosition(event.type,renderTime))?'set-piece':'broadcast',camera:camera.position.toArray(),cameraTarget:camTarget.toArray(),cameraDistance:camera.position.distanceTo(camTarget),visibleFieldPlayers:visible,fieldPlayers:players.length,drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles,quality:weak?'low':high?'high':'standard',crowdFans:crowdStatic.torso.count+crowdDynamic.torso.count,crowdAnimated:crowdDetailReduced?0:crowdDynamic.torso.count,crowdFlags:flagPole.visible?flagPole.count:0,crowdSampleY:samplePosition.y,flagSample:flagPosition.toArray(),goalScreenX:goalScreen.x,shooterScreenX:project(players[0].root.getWorldPosition(new THREE.Vector3())).x,goalScreen:goalScreen.toArray(),deliveryFrameScreen:cameraDelivery(sequence)?[0,1.8].map(y=>project(players[cameraDelivery(sequence).passer].root.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0,y,0))).toArray()):[],goalFrameScreen:[-3.66,3.66].flatMap(x=>[-52.5,-54.4].map(z=>project(new THREE.Vector3(...worldPosition([x,2.44,z],direction))).toArray())),ballScreen:ballScreen.toArray(),wingerScreen:wingerScreen.toArray(),runnerScreen:runnerScreen.toArray(),gloves:keeper.gloves.map(g=>g.getWorldPosition(new THREE.Vector3()).toArray()),ball:ballWorld.toArray()};
  }
  return{update,resize,dispose,inspect,reduceQuality};
 }catch(error){for(const resource of resources){try{resource.dispose?.()}catch(_){}}scene.clear();throw error}
}
export function play(event,signal){
 return new Promise(resolve=>{
  // V21.246: online friendlies bring their own stage (FooteraHighlights.stage).
  const host=globalThis.FooteraHighlights?.stage?.()||document.getElementById('matchLiveStage');
  const stageFrame=host?.closest('#match,#onlineMatch')||document.getElementById('match');
  if(!host||signal.aborted||document.hidden){resolve('skipped');return}
  let renderer,world,observer,raf,timer,done=false,last=0,slowFrames=0,frames=0,verySlowFrames=0,impactSent=false;
  const previousFocus=document.activeElement;
  const layer=document.createElement('div');layer.className='fh3d';layer.setAttribute('data-defense-action',event.defenderAction||'jockey');layer.setAttribute('data-keeper-action',event.keeperAction||'classic');layer.setAttribute('role','region');layer.setAttribute('aria-label','Footera 3D-Highlight');
  const canvas=document.createElement('canvas');canvas.setAttribute('aria-label','3D-Fußballszene');layer.append(canvas);
  const top=document.createElement('div');top.className='fh3d-top';
  const brand=document.createElement('span');brand.className='fh3d-brand';brand.textContent='FOOTERA';const ceremony=ceremonyKind(event);
  const sub=document.createElement('small');sub.textContent=ceremony==='kickoff'?'LIVE · ANPFIFF':ceremony==='fulltime'?'LIVE · ABPFIFF':`LIVE · ${event.minute}'`;brand.append(sub);
  // Always visible while the imported prototype is under assessment.
  // Query parameters can disappear when Android opens an installed PWA, so
  // never gate the actual diagnostic on location.search.
  const modelDiagnostic=typeof location!=='undefined'&&new URLSearchParams(location.search).get('footera-model-debug')==='1';
  const modelStatus=document.createElement('span');
  modelStatus.className='fh3d-model-status';
  modelStatus.setAttribute('data-footera-model-diagnostic','');
  modelStatus.textContent='MODELL PRÜFEN';
  const skip=document.createElement('button');skip.type='button';skip.className='fh3d-skip';skip.textContent='Überspringen';top.append(brand,modelStatus,skip);layer.append(top);
  const hud=document.createElement('div');hud.className=`fh3d-hud fh3d-hud-${event.type}${ceremony?' fh3d-hud-'+ceremony:''}`;hud.setAttribute('aria-live','polite');
  const card=document.createElement('div');card.className='fh3d-player-card';
  if(event.playerCardHTML)card.innerHTML=event.playerCardHTML;
  else{
   const placeholder=document.createElement('div');placeholder.className='fh3d-identity-fallback';
   placeholder.textContent=event.type==='big_chance_saved'?event.keeperName||'Torwart':event.type==='ball_won'?event.defenderName||'Verteidiger':event.playerName||'Spieler';
   card.append(placeholder);
  }
  const mark=document.createElement('span');mark.className='fh3d-mark';mark.textContent='F';mark.setAttribute('aria-hidden','true');
  const copy=document.createElement('div');copy.className='fh3d-copy';
  const headline=document.createElement('span');headline.className='fh3d-headline';
  const name=document.createElement('strong');name.className='fh3d-name';
  const detail=document.createElement('span');detail.className='fh3d-event';copy.append(headline,name,detail);
  const minute=document.createElement('b');minute.className='fh3d-minute';minute.textContent=`${event.minute}'`;
  const crest=document.createElement('div');crest.className='fh3d-team-crest';if(event.teamCrestHTML)crest.innerHTML=event.teamCrestHTML;
  const meta=document.createElement('div');meta.className='fh3d-goal-meta';meta.append(minute,crest);
  if(ceremony){
   // Both crests side by side; the final whistle shows the score between them.
   meta.textContent='';const pair=document.createElement('div');pair.className='fh3d-ceremony-crests';
   const homeCrest=document.createElement('div');homeCrest.className='fh3d-team-crest';homeCrest.innerHTML=event.teamCrestHTML||'';
   const awayCrest=document.createElement('div');awayCrest.className='fh3d-team-crest';awayCrest.innerHTML=event.defendCrestHTML||'';
   if(event.team==='away')pair.append(awayCrest,homeCrest);else pair.append(homeCrest,awayCrest);meta.append(pair);
  }
  hud.append(card,mark,copy,meta);layer.append(hud);
  // V21.226 replay: a FOOTERA wipe in and out and a small WIEDERHOLUNG tag.
  const replayEligible=event.type==='goal'&&event.replay!==false&&!ceremony;
  const wipe=document.createElement('div');wipe.className='fh3d-wipe';wipe.setAttribute('aria-hidden','true');wipe.innerHTML='<b>F</b>';
  const replayTag=document.createElement('span');replayTag.className='fh3d-replay-tag';replayTag.textContent='WIEDERHOLUNG';
  if(replayEligible)layer.append(wipe,replayTag);
  const goalArrival=shotArrival('goal',event.sequence,event.finish,event.shotPlacement||null)+goalNetDelay(event.shotPlacement||null);
  host.append(layer);
  function finish(result){
   if(done)return;done=true;cancelAnimationFrame(raf);clearTimeout(timer);observer?.disconnect();signal.removeEventListener('abort',onAbort);canvas.removeEventListener('webglcontextlost',onLost);window.removeEventListener('keydown',onKey);
   try{world?.dispose();renderer?.dispose();renderer?.forceContextLoss()}catch(_){}
   const focused=layer.contains(document.activeElement);stageFrame?.classList.remove('highlight3d-active');layer.remove();if(focused&&previousFocus?.isConnected)previousFocus.focus({preventScroll:true});resolve(result);
  }
  function onAbort(){finish('skipped')}
  function onLost(e){e.preventDefault();finish('fallback')}
  function onKey(e){if(e.key==='Escape'){e.preventDefault();finish('skipped')}}
  skip.addEventListener('click',()=>finish('skipped'));signal.addEventListener('abort',onAbort,{once:true});canvas.addEventListener('webglcontextlost',onLost);window.addEventListener('keydown',onKey);
  // Browser tests on a software renderer (1-2 fps) keep wall-clock pace and
  // skip the very-slow 2D fallback; real phones keep both safety nets.
  const realtimeTest=!!globalThis.FOOTERA_TEST_REALTIME_3D;
  const playback=createHighlightPlayback(event,DURATION,realtimeTest?{maxFrameMs:2000}:undefined);
  const replayRange=replayEligible?replayWindow(SHOT_TIME,goalArrival):null,WIPE=.32;
  const replaySeconds=replayRange?(replayRange.to-replayRange.from)/REPLAY_RATE+WIPE*2:0;
  let replayState=null;
  timer=setTimeout(()=>finish('fallback'),Math.max(realtimeTest?180000:30000,(playback.totalSeconds+replaySeconds)*1000+12000));
  try{
   const memory=navigator.deviceMemory||8,cores=navigator.hardwareConcurrency||8,dpr=devicePixelRatio||1,mobile=innerWidth<=600||matchMedia?.('(pointer:coarse)')?.matches===true,
    // V21.185: Chrome reports 6 GB phones as deviceMemory 4. Only 2-3 GB or
    // four-core devices stay on LOW; the slow-frame watchdog still protects them.
    weak=memory<4||cores<=4,mobileStandard=mobile&&!weak,high=!mobile&&!weak&&memory>=8&&cores>=8&&dpr>=1.5;let quality=weak?'low':high?'high':'standard';
   // Edge smoothing on every tier: without it pitch lines and stands looked pixelated.
   renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:weak?'low-power':'high-performance',failIfMajorPerformanceCaveat:true});
   renderer.setPixelRatio(Math.min(dpr,weak?1.3:mobileStandard?2:high?2.25:1.7));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.0;renderer.shadowMap.enabled=!weak;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
   // V21.42 rollout: fluid motion is standard on capable devices.
   // Low-spec phones keep the established instanced route; QA/users can force
   // legacy without affecting results: localStorage footera-3d-motion-mode=legacy.
   let fluidMotion=!weak;
   try{if(window.localStorage?.getItem('footera-3d-motion-mode')==='legacy')fluidMotion=false}catch(_){}
   if(typeof window!=='undefined'&&window.__FOOTERA_FORCE_LEGACY_MOTION===true)fluidMotion=false;
   let forceLegacyModel=false;
   try{forceLegacyModel=window.localStorage?.getItem('footera-3d-player-model')==='legacy'}catch(_){}
   // V21.193: the MakeHuman-based human squad where the phone can carry it;
   // otherwise (or until its file has loaded) the verified Quaternius squad.
   const modelVariant=!weak&&footeraHumanPlayersWanted()&&isFooteraHumanModelReady()?'human':'quaternius';
   world=makeScene(renderer,event,weak,high,mobileStandard,false,fluidMotion,!forceLegacyModel,modelVariant);
   layer.dataset.motion=fluidMotion?'fluid':'legacy';
   const modelInfo=world.inspect();
   const imported=!!modelInfo.importedFootballer;
   layer.dataset.playerModel=imported?'glb':'legacy';
   layer.dataset.playerModelVariant=imported?modelVariant:'legacy';
   layer.dataset.playerModelReason=imported?'loaded':forceLegacyModel?'user-disabled':isFooteraPlayerModelReady()?'mount-failed':'not-ready';
   modelStatus.dataset.modelStatus=imported?'glb':'legacy';
   modelStatus.textContent=imported?'GLB AKTIV':forceLegacyModel?'ALT · MANUELL':weak?'ALT · LOW':'ALTES MODELL';
   modelStatus.dataset.motionCaption=modelInfo.capturedMotionEnabled?'CC0 BEREIT':'CC0 AUS';
   layer.dataset.capturedMotion=modelInfo.capturedMotionEnabled?'ready':'off';
   // Optional extra device information; the main badge always shows.
   if(modelDiagnostic)modelStatus.title=`3D ${modelInfo.importedVertices||0} vertices · ${modelInfo.importedBones||0} bones · RAM ${memory} · CPU ${cores}`;
   const resize=()=>{const r=canvas.getBoundingClientRect();world.resize(Math.max(1,r.width),Math.max(1,r.height))};resize();observer=new ResizeObserver(resize);observer.observe(layer);
   function replayFrame(now){
    const r=replayState;
    if(r.last!==undefined)r.elapsed+=Math.max(0,Math.min(realtimeTest?2000:100,now-r.last))/1000;r.last=now;
    hud.classList.remove('visible');
    if(r.elapsed>=WIPE){
     if(!r.on){r.on=true;layer.classList.add('fh3d-replay-on')}
     const time=Math.min(replayRange.to,replayRange.from+(r.elapsed-WIPE)*REPLAY_RATE);
     if(!r.out||r.elapsed-r.out<WIPE){world.update(time,{replay:true});layer.dataset.playbackTime=time.toFixed(3)}
     if(time>=replayRange.to&&!r.out){r.out=r.elapsed;layer.classList.remove('fh3d-wipe-in');void wipe.offsetWidth;layer.classList.add('fh3d-wipe-out')}
     if(r.out&&r.elapsed-r.out>=WIPE){finish('played');return}
    }
    raf=requestAnimationFrame(frame);
   }
   function frame(now){
    if(done)return;
    try{
     if(replayState){replayFrame(now);return}
     const sample=playback.tick(now);
     if(last&&now-last>45)slowFrames++;if(last&&now-last>250)verySlowFrames++;last=now;frames++;
     if(frames>=24&&verySlowFrames/frames>.65&&!realtimeTest){finish('fallback');return}
     if(frames===40&&slowFrames>14){quality='adaptive';world.reduceQuality()}
     const displayTime=sample.time;
     world.update(displayTime);
     if(!layer.classList.contains('fh3d-ready')){
      playback.presented(performance.now());
      last=0;
      layer.classList.add('fh3d-ready');
      stageFrame?.classList.add('highlight3d-active');
     }
     // Bounded diagnostics: reflect actual sampled poses, not GLB load state.
     // Once per ~20 frames avoids inspecting an entire football scene per RAF.
     if(frames%20===1){
      const state=world.inspect(),clip=state.importedMotion;
      const active=!!clip&&clip.capturedSource==='Quaternius CC0'&&clip.capturedWeight>.015;
      const count=(active?1:0)+(state.capturedContext?.activeCount||0);
      const off=!state.capturedMotionEnabled||!clip||clip.capturedSource!=='Quaternius CC0';
      layer.dataset.capturedMotion=off?'off':count?'active':'ready';
      modelStatus.dataset.motionCaption=off?'CC0 AUS':count?`CC0 AKTIV · ${count}`:'CC0 BEREIT';
      layer.dataset.capturedActors=String(count);
     }
     if(event.type==='goal'&&!impactSent&&displayTime>=goalArrival){impactSent=true;document.dispatchEvent(new CustomEvent('footera-highlight-impact',{detail:{id:event.id,type:event.type}}))}
     layer.dataset.playbackTime=displayTime.toFixed(3);
     layer.dataset.period=String(event.period);layer.dataset.direction=String(event.attackDirection);layer.dataset.quality=quality;
     // The result card never comes before the ball is actually in the net.
     const revealAt=ceremony==='kickoff'?CEREMONY_CUT.kickoff+.5:ceremony?.8:event.type==='goal'?Math.max(REVEAL_TIME,goalArrival+.05):REVEAL_TIME;
     if(displayTime>=revealAt&&!name.textContent){
      if(ceremony==='kickoff'){headline.textContent=event.competition||'ANPFIFF';name.textContent=`${event.homeName||'Heim'} – ${event.awayName||'Gast'}`;detail.textContent='Die Teams laufen ein'}
      else if(ceremony){headline.textContent='ABPFIFF';name.textContent=`${event.homeName||'Heim'} ${event.homeScore??0} : ${event.awayScore??0} ${event.awayName||'Gast'}`;detail.textContent=event.result==='draw'?'Unentschieden':`Sieg für ${event.team==='away'?event.awayName||'Gast':event.homeName||'Heim'}`}
      else if(event.type==='goal'){const late=lateGoalDrama(event);headline.textContent=late?'SPÄTES TOR':'TOR';name.textContent=event.playerName;detail.textContent=late==='winner'?`Siegtreffer in der ${Math.round(event.minute)}. Minute`:late==='equaliser'?`Ausgleich in der ${Math.round(event.minute)}. Minute`:event.teamName?`für ${event.teamName}`:'TOR'}
      else if(event.type==='big_chance_saved'){headline.textContent='PARADE';name.textContent=event.keeperName||'TORWART';detail.textContent=`Schuss von ${event.playerName}${({fingertip:' · Fingerspitzen',parry:' · Abgewehrt',low_reflex:' · Reflexparade',rush_spread:' · Herausgelaufen',high_reach:' · Hoch abgewehrt'})[event.keeperAction]||''}`}
      else if(event.type==='ball_won'){headline.textContent=event.defenseKind==='interception'?'ABGEFANGEN':'BALLGEWINN';name.textContent=event.defenderName||'VERTEIDIGER';detail.textContent=event.defenseKind==='interception'?'Pass von '+event.playerName+' abgefangen':'Zweikampf gegen '+event.playerName+' gewonnen'}
      else if(event.type==='shot_post'){headline.textContent='PFOSTEN';name.textContent=event.playerName;detail.textContent='Ganz knapp'}
      else if(event.keeperAction==='line_clear'){headline.textContent='GEKLÄRT';name.textContent=event.playerName;detail.textContent='Auf der Linie geklärt'}
      else{headline.textContent='VORBEI';name.textContent=event.playerName;detail.textContent='Chance vergeben'}
     }
     hud.classList.toggle('visible',displayTime>=revealAt&&displayTime<DURATION-.2);
     if(sample.done){
      if(!replayEligible){finish('played');return}
      replayState={elapsed:0,last:now};layer.classList.add('fh3d-wipe-in');layer.dataset.replay='1';
     }
     raf=requestAnimationFrame(frame);
    }catch(_){finish('fallback')}
   }
   raf=requestAnimationFrame(frame);
  }catch(_){finish('fallback')}
 });
}
