/* Footera V21.187 goal celebrations.
 * After the ball is in the net the scorer peels away towards the broadcast
 * camera and performs one of several authored celebrations. Everything is a
 * pure function of the seconds since the celebration began, so seeking,
 * replays and screenshots are deterministic. The scorer's procedural driver
 * joints carry the big shapes; the imported GLB follows them through the
 * existing retarget and foot IK and adds shoulders, head and hands.
 *
 * V21.187: smoother, less robotic arms. Poses settle with a slight springy
 * overshoot, forearms trail the upper arms, elbows never lock straight and
 * the whole body keeps breathing, swaying and shifting its weight.
 */
export const CELEBRATION_VERSION='21.226-ceremony-poses';
export const CELEBRATIONS=Object.freeze(['airplane','jump_spin','knee_slide','badge','fist_pump','arms_crossed','open_arms']);
// Celebrations only a star performs, never picked at random.
export const STAR_CELEBRATIONS=Object.freeze(['zen','cold','samba','mask']);
// Trademark celebrations of real stars, matched on the whole card name so a
// namesake (Ethan Mbappé, Jobe Bellingham) keeps a normal celebration. The
// jump spin with the wide landing is the famous Ronaldo jump.
const SIGNATURES=[[/^(cristiano( ronaldo)?|ronaldo|c\. ?ronaldo)$/,'jump_spin'],[/^(lionel )?messi$/,'badge'],
 [/^(kylian )?mbappe$/,'arms_crossed'],[/^(jude )?bellingham$/,'open_arms'],[/^(erling )?haaland$/,'zen'],
 [/^(cole )?palmer$/,'cold'],[/^(vini jr\.?|vinicius junior|vinicius jr\.?)$/,'samba'],[/^(viktor )?gyokeres$/,'mask']];
export function signatureCelebration(name=''){
 const key=String(name).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
 return key?(SIGNATURES.find(([pattern])=>pattern.test(key))?.[1]||null):null;
}
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,Number.isFinite(v)?v:0));
const smooth=x=>{x=clamp(x);return x*x*(3-2*x)};
const mix=(a,b,u)=>a+(b-a)*u;
const pulse=(s,a,b,c,d)=>smooth((s-a)/(b-a))*(1-smooth((s-c)/(d-c)));
// Soft under-damped ease: zero start velocity, ~4% overshoot, then settles.
const spring=(s,start,duration)=>{
 const x=Math.max(0,(s-start)/duration);
 return x>=3?1:1-Math.exp(-4*x)*(Math.cos(4*x)+Math.sin(4*x));
};
// Forearms and hands follow the upper arm a moment later (follow-through).
const FOREARM_LAG=.11;
// Motion preview (localStorage footera-3d-motion-capture=1): the scorer keeps
// his captured running arms until the gesture really starts, and the arms
// hold their pose with small, irregular life instead of steady flapping.
const NATURAL=(()=>{try{return globalThis.localStorage?.getItem('footera-3d-motion-capture')==='1'}catch(_){return false}})();
// [seconds into the celebration when the arms leave the run, blend seconds]
const GESTURE={airplane:[0,.5],jump_spin:[.85,.35],knee_slide:[.4,.35],badge:[1.1,.45],arms_crossed:[1,.4],
 open_arms:[.95,.45],zen:[1,.5],cold:[.95,.4],samba:[.9,.4],mask:[1.2,.4],fist_pump:[.9,.4]};
// Two incommensurate waves: alive, but never a metronome.
const drift=(s,f,phase=0)=>.6*Math.sin(s*f+phase)+.4*Math.sin(s*f*1.618+phase*2.3);

// avoid: the previous goal's celebration, so two goals in a row never repeat
// the same one (a star's trademark celebration always wins).
export function pickCelebration(event={},avoid=null){
 if(CELEBRATIONS.includes(event.celebration)||STAR_CELEBRATIONS.includes(event.celebration))return event.celebration;
 const signature=signatureCelebration(event.playerName);
 if(signature)return signature;
 const key=`${event.id??''}|${event.playerName??''}|${event.minute??''}`;
 let hash=2166136261;
 for(let i=0;i<key.length;i++){hash^=key.charCodeAt(i);hash=Math.imul(hash,16777619)>>>0}
 const kind=CELEBRATIONS[hash%CELEBRATIONS.length];
 return kind===avoid?CELEBRATIONS[(hash+1+(hash>>>8)%(CELEBRATIONS.length-1))%CELEBRATIONS.length]:kind;
}

// Metres travelled along the run-away line, s seconds after the start.
// Every route keeps a little drift so the scorer never snaps to a stand pose.
export function celebrationDistance(kind,s){
 s=Math.max(0,s);
 const ease=(t,d,len)=>{const u=clamp(t/d);return len*(1-(1-u)*(1-u))};
 if(kind==='airplane')return ease(s,3.6,9.5);
 if(kind==='jump_spin')return ease(s,1.55,6.2);
 // Sprint, then a decelerating slide on the knees.
 if(kind==='knee_slide')return s<1?4.6*s:4.6+ease(s-1,1.1,3.2);
 if(kind==='badge')return ease(s,1.8,6.4);
 if(kind==='arms_crossed')return ease(s,1.4,5.2);
 if(kind==='open_arms')return ease(s,1.7,6);
 if(kind==='zen')return ease(s,1.3,5.4);
 if(kind==='cold')return ease(s,1.3,5.6);
 // Dances on the spot after a short run, drifting a little with the steps.
 if(kind==='samba')return ease(s,1.2,4.8)+.25*smooth((s-1.2)/2.4);
 if(kind==='mask')return ease(s,1.4,5.8);
 return ease(s,1.5,5.6);
}

function blankPose(){
 return{armsOn:1,rig:[0,0,0],upper:[0,0,0],arms:[[0,0,0],[0,0,0]],elbows:[.35,.35],
  legs:[[0,0,0],[0,0,0]],knees:[0,0],ankles:[0,0],drop:0,lift:0,legs_w:0,
  head:[0,0],shrug:[0,0],open:[0,0]};
}
const now=blankPose(),late=blankPose();
function reset(t){
 t.rig.fill(0);t.upper.fill(0);t.head.fill(0);t.shrug.fill(0);t.open.fill(0);
 for(let i=0;i<2;i++){t.arms[i].fill(0);t.elbows[i]=.35;t.legs[i].fill(0);t.knees[i]=0;t.ankles[i]=0}
 t.drop=0;t.lift=0;t.legs_w=0;t.armsOn=1;
}
// Arm angles are player space: x>0 raises forwards, z<0 (left) / z>0 (right)
// raises sideways. Elbow x>0 flexes the forearm. Upper body and head x>0 lean
// back / look up.
function arms(t,left,right,elbowL,elbowR){
 t.arms[0][0]=left[0];t.arms[0][1]=left[1]||0;t.arms[0][2]=-left[2];
 t.arms[1][0]=right[0];t.arms[1][1]=right[1]||0;t.arms[1][2]=right[2];
 t.elbows[0]=elbowL;t.elbows[1]=elbowR;
}
// Soft, slightly bent standing legs with a slow weight shift between feet.
function looseStance(t,s,amount){
 const shift=Math.sin(s*1.9)*.05*amount;
 t.legs_w=Math.max(t.legs_w,amount);
 t.legs[0][0]=t.legs[1][0]=.12*amount;t.knees[0]=t.knees[1]=-.22*amount;t.ankles[0]=t.ankles[1]=.1*amount;
 t.legs[0][2]=-.08*amount+shift;t.legs[1][2]=.08*amount+shift;t.rig[2]+=shift*.6;
 t.drop=Math.max(t.drop,.025*amount);
}

function pose(t,kind,s){
 reset(t);
 // Breathing heave and a little life in the shoulders for every celebration.
 const breathe=Math.sin(s*2.4);
 t.upper[0]+=.035*breathe;t.shrug[0]=t.shrug[1]=.04+.03*breathe;
 if(kind==='airplane'){
  // Wings out and gently flapping, banking left and right like a plane.
  const out=spring(s,.05,.9),bank=Math.sin(s*2.4)*.26*out;
  const flapL=NATURAL?.35*drift(s,2.1):Math.sin(s*4.2),flapR=NATURAL?.35*drift(s,2.1,.7):Math.sin(s*4.2+.5);
  const wingL=mix(.15,1.42,out)+.10*flapL+bank*.45,wingR=mix(.15,1.42,out)+.10*flapR-bank*.45;
  arms(t,[-.12,0,wingL],[-.12,0,wingR],.32+.06*flapL,.32+.06*flapR);
  t.rig[2]+=bank;t.upper[2]=bank*.65;t.upper[0]+=.06;t.upper[1]=Math.sin(s*1.3)*.08;
  t.head=[.12,-bank*.4];t.shrug=[.12+.08*out,.12+.08*out];t.open=[1,1];
  if(s>2.6)looseStance(t,s,smooth((s-2.6)/.6));
 }else if(kind==='jump_spin'){
  const jump=pulse(s,1.45,1.62,1.95,2.12),air=clamp((s-1.5)/.5);
  t.lift=.52*Math.sin(Math.PI*air)*(s>1.5&&s<2?1:0);
  // Run in with pumping arms, half turn in the air, then the trademark wide
  // landing: arms swing down and out and settle with a bounce.
  t.rig[1]=Math.PI*smooth(air);
  const gather=spring(s,1.05,.5),land=spring(s,2.0,.7),pump=NATURAL?0:Math.sin(s*7)*(1-gather)*.35;
  const armX=mix(mix(.35+pump,1.25,gather),-.42,land),armZ=mix(mix(.35,.85,gather),.78,land);
  arms(t,[armX,0,armZ],[mix(mix(.35-pump,1.25,gather),-.42,land),0,armZ],mix(1.1,.38,land),mix(1.1,.38,land));
  t.upper[0]+=mix(-.12*gather,.24,land);t.head=[mix(.05,.28,land),0];
  t.shrug=[mix(.05,.22,gather)*(1-land)+.16*land,mix(.05,.22,gather)*(1-land)+.16*land];t.open=[land,land];
  t.legs_w=Math.max(jump,land);
  t.legs[0][0]=t.legs[1][0]=mix(.35,.16,land);
  t.knees[0]=t.knees[1]=mix(-.7,-.32,land);t.ankles[0]=t.ankles[1]=mix(0,.14,land);
  t.legs[0][2]=-.2*land;t.legs[1][2]=.2*land;t.drop=.05*land;
  if(s>2.8)looseStance(t,s,smooth((s-2.8)/.5));
 }else if(kind==='knee_slide'){
  const kneel=smooth((s-.9)/.3),raise=spring(s,.65,.8),scream=Math.sin(s*3.1);
  t.legs_w=kneel;t.drop=.47*kneel;
  t.legs[0][0]=t.legs[1][0]=.12;
  t.knees[0]=t.knees[1]=-1.55;t.ankles[0]=t.ankles[1]=.9;
  t.legs[0][2]=-.12;t.legs[1][2]=.12;
  // Lean back, fists shaking at the sky, screaming at the stand.
  t.upper[0]+=.30*kneel+.05*scream*kneel;t.upper[2]=.05*Math.sin(s*1.7);
  const shake=NATURAL?.05*Math.sin(s*9)*pulse(s,1.0,1.15,1.55,1.85):.07*Math.sin(s*9)*raise;
  arms(t,[mix(.3,.45,raise),0,mix(.4,2.15,raise)+shake],[mix(.3,.45,raise),0,mix(.4,2.15,raise)-shake],mix(.8,.75,raise)+.15*scream,mix(.8,.75,raise)+.15*scream);
  t.head=[.38*kneel,.12*Math.sin(s*1.2)];t.shrug=[.3*raise,.3*raise];
 }else if(kind==='badge'){
  // Stop, tap the club badge twice with the fist, then point both arms to
  // the sky and look up.
  const stop=spring(s,1.3,.6),sky=spring(s,2.3,.85),tapping=(1-smooth((s-2.3)/.15));
  const tap=Math.max(0,Math.sin(Math.max(0,s-1.65)*11))*.28*tapping*smooth((s-1.6)/.1);
  arms(t,[mix(mix(.25,.35,stop),2.75,sky),0,mix(.38,.32,sky)],
   [mix(mix(.25,.62+tap*.5,stop),2.85,sky),0,mix(mix(.38,.08,stop),.26,sky)],
   mix(.45,.36,sky),mix(mix(.45,2.2+tap,stop),.36,sky));
  t.upper[0]+=mix(-.06*stop,.22,sky);t.upper[1]=-.16*stop*(1-sky);
  t.head=[mix(-.1*stop,.5,sky),0];t.shrug=[.32*sky,.32*sky];t.open=[sky,sky];
  looseStance(t,s,stop);
 }else if(kind==='arms_crossed'){
  // Stop dead, fold the arms across the chest and stare the stand down,
  // chin up with a slow nod.
  const stop=spring(s,1.15,.55),fold=spring(s,1.35,.6),nod=Math.sin(s*1.6)*.05*fold;
  arms(t,[mix(.3,.95,fold),0,mix(.38,-.5,fold)],[mix(.3,.88,fold),0,mix(.38,-.42,fold)],mix(.5,2.05,fold),mix(.5,2.0,fold));
  t.upper[0]+=.12*stop;t.upper[1]=.06*stop;t.head=[.22*stop+nod,-.08*stop];
  t.shrug=[.14*fold,.14*fold];t.open=[0,0];
  looseStance(t,s,stop);
 }else if(kind==='open_arms'){
  // Arms spread wide, palms open to the fans, soaking it in.
  const stop=spring(s,1.4,.6),spread=spring(s,1.2,.8),sway=Math.sin(s*1.5)*.07*spread;
  arms(t,[mix(.3,.32,spread),0,mix(.38,1.18,spread)+sway],[mix(.3,.32,spread),0,mix(.38,1.18,spread)-sway],.32,.32);
  t.upper[0]+=.2*spread;t.upper[2]=sway*.5;t.head=[.3*spread,sway];
  t.shrug=[.2*spread,.2*spread];t.open=[spread,spread];
  looseStance(t,s,stop);
 }else if(kind==='zen'){
  // Haaland: stops, sits down cross-legged on the grass, hands resting on the
  // knees with open palms, back straight and eyes on the stand. Completely still.
  const sit=smooth((s-1.15)/.8),calm=spring(s,1.3,.9),still=1-.85*sit;
  t.upper[0]*=still;t.shrug[0]*=still;t.shrug[1]*=still;
  t.legs_w=sit;t.drop=.8*sit;
  t.legs[0][0]=t.legs[1][0]=1.25*sit;t.legs[0][2]=-1.05*sit;t.legs[1][2]=1.05*sit;
  t.legs[0][1]=.9*sit;t.legs[1][1]=-.9*sit;
  t.knees[0]=t.knees[1]=-2.45*sit;t.ankles[0]=t.ankles[1]=.5*sit;
  arms(t,[mix(.3,.5,calm),0,mix(.38,.62,calm)],[mix(.3,.5,calm),0,mix(.38,.62,calm)],mix(.5,.45,calm),mix(.5,.45,calm));
  t.upper[0]+=-.02*sit;t.head=[mix(.05,.08,sit),0];t.open=[calm,calm];
  // One deep breath in as he settles, shoulders rising and falling slowly.
  t.shrug=[.12*calm+.03*Math.sin(s*1.1),.12*calm+.03*Math.sin(s*1.1)];
 }else if(kind==='cold'){
  // Palmer: shoulders up, arms wrapped round the body, hands rubbing the
  // upper arms and the whole body shivering as if it were freezing.
  const stop=spring(s,1.1,.5),wrap=spring(s,1.2,.6),shiver=Math.sin(s*26)*wrap,rub=Math.sin(s*9)*wrap;
  arms(t,[mix(.3,.8,wrap)+.05*rub,0,mix(.38,-.62,wrap)],[mix(.3,.74,wrap)-.05*rub,0,mix(.38,-.56,wrap)],mix(.5,2.25,wrap)+.04*shiver,mix(.5,2.2,wrap)-.04*shiver);
  t.upper[0]+=-.1*wrap;t.upper[2]=.025*shiver;t.rig[2]+=.012*shiver;
  t.head=[-.12*wrap,.04*shiver];t.shrug=[.38*wrap+.03*shiver,.38*wrap-.03*shiver];t.open=[.3*wrap,.3*wrap];
  looseStance(t,s,stop);t.legs[0][2]+=.05*stop;t.legs[1][2]-=.05*stop;
 }else if(kind==='samba'){
  // Vini Jr.: a quick samba on the spot, hips swaying, stepping from foot to
  // foot with bent arms pumping in time.
  const on=spring(s,1.1,.5),beat=s*6.8,sway=Math.sin(beat/2)*on;
  const stepL=Math.max(0,Math.sin(beat))*on,stepR=Math.max(0,-Math.sin(beat))*on;
  t.legs_w=Math.max(t.legs_w,on);
  t.legs[0][0]=.12+.45*stepL;t.legs[1][0]=.12+.45*stepR;t.knees[0]=-.25-.75*stepL;t.knees[1]=-.25-.75*stepR;
  t.ankles[0]=.1+.3*stepL;t.ankles[1]=.1+.3*stepR;t.legs[0][2]=-.1+.08*sway;t.legs[1][2]=.1+.08*sway;
  t.rig[2]+=.13*sway;t.upper[2]=-.16*sway;t.upper[1]=.22*Math.sin(beat)*on;t.upper[0]+=-.05*on;t.drop=.06*on;
  arms(t,[mix(.3,.55,on)+(NATURAL?.3:.45)*Math.sin(beat)*on,0,mix(.38,.55,on)],[mix(.3,.55,on)-(NATURAL?.3:.45)*Math.sin(beat)*on,0,mix(.38,.55,on)],mix(.5,1.45,on),mix(.5,1.45,on));
  t.head=[.1*on+.05*Math.abs(Math.sin(beat))*on,-.15*sway];t.shrug=[.1*on+.08*stepL,.1*on+.08*stepR];t.open=[.6*on,.6*on];
 }else if(kind==='mask'){
  // Gyökeres: stops with the feet wide, raises both hands to the face and
  // laces the fingers into a mask round the eyes, chin down, staring out.
  const stop=spring(s,1.3,.55),mask=spring(s,1.45,.6);
  arms(t,[mix(.3,1.45,mask),0,mix(.38,-.28,mask)],[mix(.3,1.45,mask),0,mix(.38,-.28,mask)],mix(.5,2.15,mask),mix(.5,2.15,mask));
  t.upper[0]+=-.06*mask;t.head=[-.04*mask,0];t.shrug=[.26*mask,.26*mask];t.open=[.6*mask,.6*mask];
  looseStance(t,s,stop);t.legs[0][2]-=.08*stop;t.legs[1][2]+=.08*stop;t.drop+=.04*stop;
 }else if(kind==='hug_left'||kind==='hug_right'){
  // A teammate arriving beside the scorer: the near arm goes round his
  // shoulders, the other fist pumps, both bouncing with him.
  const wrap=spring(s,0,.5),bounce=Math.abs(Math.sin(s*5.5))*wrap*(NATURAL?.6:1);
  const pump=NATURAL?.22*(pulse(s,.15,.28,.36,.55)+pulse(s,.7,.83,.91,1.15))*wrap+.03*drift(s,3)*wrap:Math.sin(s*6.2)*.18*wrap;
  const around=[mix(.3,.36,wrap),0,mix(.38,1.22,wrap)],fist=[mix(.3,1.55,wrap)+pump,0,mix(.38,.35,wrap)];
  const nearLeft=kind==='hug_left';
  arms(t,nearLeft?around:fist,nearLeft?fist:around,nearLeft?mix(.5,1.0,wrap):mix(.5,1.6,wrap),nearLeft?mix(.5,1.6,wrap):mix(.5,1.0,wrap));
  t.upper[2]=(nearLeft?-.1:.1)*wrap;t.upper[0]+=.06*wrap;t.head=[.12*wrap,(nearLeft?-.25:.25)*wrap];
  t.shrug=nearLeft?[.3*wrap,.12*wrap]:[.12*wrap,.3*wrap];t.open=nearLeft?[.8*wrap,0]:[0,.8*wrap];
  looseStance(t,s,wrap);t.lift=.05*bounce;
 }else if(kind==='lineup'){
  // V21.226 walk-out: chest up, hands loosely behind the back for the line-up.
  arms(t,[-.2,0,.1],[-.2,0,.1],.5,.5);t.upper[0]+=.05;t.head=[.04,0];t.shrug=[.06,.06];
  looseStance(t,s,.6);
 }else if(kind==='cheer'){
  // Final whistle, winners: bouncing in the huddle with both fists up.
  const up=spring(s,0,.6),bounce=Math.abs(Math.sin(s*5.4)),pump=(NATURAL?.07:.18)*Math.sin(s*5.4)*up;
  arms(t,[mix(.3,.42,up),0,mix(.38,2.25,up)+pump],[mix(.3,.42,up),0,mix(.38,2.25,up)-pump],mix(.5,.8,up),mix(.5,.8,up));
  t.upper[0]+=.16*up;t.head=[.3*up,0];t.shrug=[.3*up,.3*up];t.open=[0,0];
  looseStance(t,s,up);t.lift=.16*bounce*up;
 }else if(kind==='kneel_down'){
  // Losers: down on both knees, hands on the thighs, head hanging.
  const kneel=smooth(s/.7),slump=spring(s,.4,.9);
  t.legs_w=kneel;t.drop=.47*kneel;t.legs[0][0]=t.legs[1][0]=.12;
  t.knees[0]=t.knees[1]=-1.55;t.ankles[0]=t.ankles[1]=.9;t.legs[0][2]=-.1;t.legs[1][2]=.1;
  arms(t,[.42*slump,0,.12],[.42*slump,0,.12],.55,.55);
  t.upper[0]+=-.32*slump;t.head=[-.42*slump,0];t.shrug=[.04,.04];
 }else if(kind==='hands_on_knees'){
  // Bent over, both hands propped on the knees, getting the breath back.
  const bend=spring(s,0,.8),breath=Math.sin(s*3.1)*.03*bend;
  t.legs_w=bend;t.drop=.1*bend;t.legs[0][0]=t.legs[1][0]=.42*bend;t.knees[0]=t.knees[1]=-.62*bend;
  t.ankles[0]=t.ankles[1]=.24*bend;t.legs[0][2]=-.12*bend;t.legs[1][2]=.12*bend;
  arms(t,[.78*bend,0,.14],[.78*bend,0,.14],.22,.22);
  t.upper[0]+=-.72*bend+breath;t.head=[.32*bend,0];t.shrug=[.16*bend+breath,.16*bend+breath];
 }else if(kind==='hands_on_head'){
  // Both hands on top of the head, staring at the grass.
  const up=spring(s,0,.7);
  arms(t,[mix(.3,1.9,up),0,mix(.38,1.0,up)],[mix(.3,1.9,up),0,mix(.38,1.0,up)],mix(.5,2.35,up),mix(.5,2.35,up));
  t.upper[0]+=-.06*up;t.head=[-.28*up,.1*Math.sin(s*.9)*up];t.shrug=[.22*up,.22*up];t.open=[.7*up,.7*up];
  looseStance(t,s,up);
 }else if(kind==='hands_on_hips'){
  // Tired after a draw: hands on the hips, a slow shake of the head.
  const on=spring(s,0,.7);
  arms(t,[-.08,0,mix(.38,.62,on)],[-.08,0,mix(.38,.62,on)],mix(.5,1.9,on),mix(.5,1.9,on));
  t.upper[0]+=-.04*on;t.head=[-.12*on,.16*Math.sin(s*1.4)*on];t.shrug=[.1*on,.1*on];
  looseStance(t,s,on);
 }else if(kind==='handshake'){
  // Right hand out to the opponent, a short firm shake, a nod.
  const reach=spring(s,0,.45),shake=Math.sin(s*13)*.07*pulse(s,.3,.45,1.1,1.3);
  arms(t,[.05,0,.12],[mix(.2,.66,reach)+shake,0,mix(.2,.06,reach)],.35,mix(.4,.55,reach));
  t.upper[0]+=-.07*reach;t.head=[-.08*reach+.05*Math.sin(s*4)*reach,0];t.shrug=[.05,.12*reach];t.open=[0,.9*reach];
  looseStance(t,s,reach);
 }else if(kind==='applause'){
  // Clapping: hands meet in front of the chest.
  const on=spring(s,0,.5),clap=Math.abs(Math.sin(s*7.2));
  arms(t,[mix(.2,.9,on),0,mix(.2,.04+.3*clap,on)],[mix(.2,.9,on),0,mix(.2,.04+.3*clap,on)],mix(.4,1.25,on),mix(.4,1.25,on));
  t.upper[0]+=.04*on;t.head=[.12*on,0];t.shrug=[.08*on,.08*on];t.open=[on,on];
  looseStance(t,s,on);
 }else{
  // Fist pump: plant, crouch and pull the right fist down twice, roaring.
  const stop=spring(s,1.1,.5),pump=Math.max(pulse(s,1.45,1.6,1.75,1.95),pulse(s,2.15,2.3,2.45,2.7));
  t.legs_w=Math.min(1,stop);t.drop=.08*stop;
  t.legs[0][0]=t.legs[1][0]=.3*stop;t.knees[0]=t.knees[1]=-.55*stop;t.ankles[0]=t.ankles[1]=.24*stop;
  t.legs[0][2]=-.15*stop;t.legs[1][2]=.15*stop;
  t.upper[0]+=-.24*stop-.1*pump;t.upper[1]=.1*stop;
  arms(t,[.35,0,mix(.35,.62,stop)],[mix(.4,1.5,stop*(1-pump*.85)),0,.3],mix(.7,1.25,stop),mix(1.0,2.15,pump));
  t.head=[.15*stop+.12*pump,.08*stop];t.shrug=[.12*stop,.12*stop+.18*pump];
 }
 const gesture=NATURAL&&GESTURE[kind];
 if(gesture)t.armsOn=smooth((s-gesture[0])/gesture[1]);
}

/* Writes the celebration on the scorer's driver joints after the normal gait
 * pose. Returns how much the arms/body are authored (mocap arms fade out by
 * this amount), how far the imported model's root drops (kneel) or lifts
 * (jump) in metres, and the shoulder shrug, head aim and open-hand amount for
 * the imported model's extra joints. */
// weight (V21.226) fades a pose back out to the locomotion underneath.
export function applyCelebrationPose(p,kind,s,out={},weight=1){
 pose(late,kind,s-FOREARM_LAG);
 pose(now,kind,s);
 const w=smooth(s/.55)*clamp(weight)*now.armsOn,legs=now.legs_w*clamp(weight);
 for(let i=0;i<2;i++){
  const arm=p.arms[i].rotation;
  arm.x=mix(arm.x,now.arms[i][0],w);arm.y=mix(arm.y,now.arms[i][1],w);arm.z=mix(arm.z,now.arms[i][2],w);
  p.elbows[i].rotation.x=mix(p.elbows[i].rotation.x,late.elbows[i],w);
  if(legs>0){
   const leg=p.legs[i].rotation;
   leg.x=mix(leg.x,now.legs[i][0],legs);leg.y+=now.legs[i][1]*legs;leg.z=mix(leg.z,now.legs[i][2],legs);
   p.knees[i].rotation.x=mix(p.knees[i].rotation.x,now.knees[i],legs);
   p.ankles[i].rotation.x=mix(p.ankles[i].rotation.x,now.ankles[i],legs);
  }
 }
 p.rig.rotation.y+=now.rig[1]*w;p.rig.rotation.z=mix(p.rig.rotation.z,now.rig[2],w);
 p.upper.rotation.x=mix(p.upper.rotation.x,now.upper[0],w);
 p.upper.rotation.y=mix(p.upper.rotation.y,now.upper[1],w);
 p.upper.rotation.z=mix(p.upper.rotation.z,now.upper[2],w);
 // Lower the hips onto the knees (or lift for the jump); feet follow via IK.
 const rootY=(now.lift-now.drop)*clamp(weight);
 p.rig.position.y=mix(p.rig.position.y,rootY,Math.max(w,legs));
 out.arms=w;out.legs=legs;out.rootY=rootY;out.kind=kind;
 out.head=[now.head[0]*w,now.head[1]*w];
 out.shrug=[now.shrug[0]*w,now.shrug[1]*w];
 // Hands open a beat after the arm moves, like the forearm.
 out.open=[late.open[0]*w,late.open[1]*w];
 return out;
}
