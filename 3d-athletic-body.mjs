// Footera V21.391 "weniger steif": what a running body does above the legs.
// The captured jog keeps the chest upright and the arms close; real players
// lean into the run, turn the shoulders against the hips, pump the arms and
// shift their weight while they stand. Pure numbers from time, speed and the
// stride phase (deterministic, no state), added on top of the captured pose.
// Player space: x<0 leans forward, y>0 turns the right shoulder forward,
// z>0 tips to the player's left; arm pitch>0 swings the arm forward.
const clamp=(n,a=0,b=1)=>Math.max(a,Math.min(b,Number.isFinite(n)?n:0));
const smooth=(a,b,x)=>{x=clamp((x-a)/(b-a));return x*x*(3-2*x)};
export const ATHLETIC_BODY_VERSION='21.391-athletic-body';
export function athleticSeed(name=''){
 let h=2166136261;for(const c of String(name)){h^=c.codePointAt(0);h=Math.imul(h,16777619)}
 return ((h>>>0)%10007)/10007;
}
export function athleticBody(time=0,speed=0,stride=0,seed=0,out={}){
 speed=clamp(speed);
 const run=smooth(.12,.5,speed),sprint=smooth(.55,1,speed),rest=1-smooth(.03,.2,speed);
 // Left boot is furthest forward at stride 0 and under the body a little later.
 const forward=Math.cos(stride),stance=Math.sin(stride);
 const twist=(.11*run+.08*sprint)*forward,lean=-(.045*(1-rest)+.10*run+.13*sprint);
 const a=seed*6.283,slow=Math.sin(time*.55+a),slower=Math.sin(time*.31+a*1.7),breath=Math.sin(time*1.75+a*2.3);
 // Standing: breathing, weight from one leg to the other, a look around.
 const shift=rest*.034*slow,look=rest*(.13*slower+.05*Math.sin(time*.83+a*.6));
 out.pelvisYaw=-.42*twist;
 out.pelvisRoll=-.022*run*stance-shift*.7;
 out.spinePitch=lean+rest*.012*breath;
 out.spineYaw=twist;
 out.spineRoll=.034*run*stance+shift;
 // The head stays level and on the play while the chest works under it.
 out.headPitch=-lean*.55;
 out.headYaw=-.62*twist+look;
 out.headRoll=-.5*(.034*run*stance+shift);
 const swing=(.28*run+.22*sprint)*forward,flex=(.16*run+.1*sprint)*forward;
 out.armPitch=[-swing+rest*.02*slow,swing-rest*.02*slow];
 // The forearm closes as the arm comes forward and opens behind the body.
 out.elbow=[-flex,flex];
 out.shrug=rest*.01*breath;
 return out;
}
