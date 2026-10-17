/* Footera V21.160: simulation-owned attacks. No rendering, timers or hidden RNG.
 * Card values remain the fallback when genuine individual attributes are absent.
 * All chances are probabilities; PlayStyles improve a relevant action, not OVR.
 */
(function(root){
 'use strict';
 const clamp=(v,a,b)=>Math.max(a,Math.min(b,Number.isFinite(Number(v))?Number(v):a));
 const stat=(row,key,fallback=70)=>clamp(row?.attrs?.[key]??row?.base?.[key]??fallback,1,99);
 const detail=(row,keys,fallback)=>{
  for(const source of [row?.base?.attributes,row?.base?.subStats,row?.base])for(const key of keys){
   const v=source?.[key];if(v!==null&&v!==undefined&&v!==''&&Number.isFinite(Number(v)))return clamp(v,1,99);
  }
  return fallback;
 };
 const style=(row,...ids)=>Math.max(0,...(row?.styles||[]).filter(s=>ids.includes(s.id)).map(s=>s.plus?1.6:1));
 const bonus=(row,...ids)=>Math.min(7,style(row,...ids)*4);
 function tactics(raw={}){
  const t={};for(const k of ['width','depth','pressing','dribbling','crossing','longShots'])t[k]=clamp(raw[k]??50,0,100);
  t.buildUp=['fast','patient'].includes(raw.buildUp)?raw.buildUp:'balanced';
  t.attackFocus=['wide','inside'].includes(raw.attackFocus)?raw.attackFocus:'balanced';return t;
 }
 function attackWeights(raw={},creator=null){
  const t=tactics(raw),scale=k=>.35+t[k]/100*1.3;
  const wide=t.attackFocus==='wide'?1.9:t.attackFocus==='inside'?.50:1;
  return{
   combination:32*(t.buildUp==='patient'?1.9:t.buildUp==='fast'?.60:1)*(1.35-t.dribbling/140)*(t.attackFocus==='inside'?1.35:1)*(1+.12*style(creator,'tiki-taka')),
   through:22*(t.buildUp==='fast'?2.0:t.buildUp==='patient'?.65:1)*(1+.15*style(creator,'incisive-pass','through-ball')),
   dribble:16*scale('dribbling')*(t.attackFocus==='inside'?1.25:1),
   cross:14*scale('crossing')*wide*(.7+t.width/100*.6)*(1+.12*style(creator,'long-ball-pass')),
   cutback:10*wide*(.7+t.width/100*.6)*(1.45-t.crossing/140),
   distance:8*scale('longShots'),
   switch:8*(t.buildUp==='patient'?1.3:1)*(.6+t.width/100*.8)*(1+.12*style(creator,'long-ball-pass'))
  };
 }
 function pick(weights,roll){
  const rows=Object.entries(weights).filter(([,w])=>w>0);let n=clamp(roll,0,.999999999)*rows.reduce((s,[,w])=>s+w,0);
  return rows.find(([,w])=>(n-=w)<0)?.[0]||rows[0]?.[0]||'combination';
 }
 function shotSkill(row,shot={}){
  const sho=stat(row,'sho'),phy=stat(row,'phy'),dri=stat(row,'dri');
  if(shot.finish==='header')return detail(row,['headingAccuracy','heading_accuracy','heading'],sho*.52+stat(row,'def')*.28+phy*.20)*.60+detail(row,['jumping','jump'],phy)*.25+detail(row,['strength'],phy)*.15;
  if(shot.actionKind==='distance')return detail(row,['longShots','long_shots'],sho)*.80+detail(row,['shotPower','shot_power'],sho)*.20;
  if(shot.finish==='volley'||shot.finish==='bicycle')return detail(row,['volleys'],sho)*.85+dri*.15;
  if(shot.creationType==='penalty')return detail(row,['penalties'],sho);
  if(shot.creationType==='freekick')return detail(row,['freeKickAccuracy','free_kick_accuracy'],sho*.7+stat(row,'pas')*.3);
  return detail(row,['finishing'],sho);
 }
 function attackerWeight(row,kind){
  const finish=kind==='cross'?'header':'normal',skill=shotSkill(row,{actionKind:kind,finish}),slot=row.slot||row.base?.position;
  const fit=Math.pow(Math.max(.1,skill/75),kind==='distance'?2.8:1.5);
  const position=kind==='distance'?(/^(CM|CAM|CDM)$/.test(slot)?1.5:slot==='CB'?.28:1):kind==='cross'?(slot==='CB'?1.5:row.ctx?.role==='Target Forward'?1.35:1):1;
  return fit*position*(1+.12*style(row,...(kind==='cross'?['aerial','power-header']:kind==='distance'?['power-shot','finesse-shot']:kind==='dribble'?['technical','rapid']:['first-touch'])));
 }
 function finishFor(row,kind,roll){
  if(kind==='cross')return style(row,'acrobatic')>0&&roll<.20?'volley':'header';
  if(kind==='distance')return style(row,'finesse-shot')>style(row,'power-shot')?'finesse':'power';
  if(kind==='through'&&style(row,'chip-shot')&&roll<.25)return'chip';
  if(style(row,'finesse-shot')&&roll<.35)return'finesse';
  if(style(row,'low-driven-shot')&&roll<.55)return'low_driven';
  return'normal';
 }
 function buildSkill(row,kind){
  const passing=kind==='cross'?detail(row,['crossing'],stat(row,'pas')):kind==='switch'?detail(row,['longPassing','long_passing'],stat(row,'pas')):detail(row,['shortPassing','short_passing'],stat(row,'pas'));
  const ids=kind==='cross'?['long-ball-pass']:kind==='through'?['incisive-pass','through-ball']:kind==='switch'?['long-ball-pass']:kind==='cutback'?['pinged-pass']:['tiki-taka','press-proven','flair'];
  return passing*.75+stat(row,'dri')*.25+bonus(row,...ids);
 }
 function restartBuildSkill(row,kind,scene,keeper){
  const base=buildSkill(row,kind);
  if(scene==='keeper_buildout')return base*.8+stat(keeper,'pas')*.2+bonus(keeper,'far-throw');
  if(scene==='throw_in')return base+bonus(row,'long-throw');
  if(scene==='corner')return base+bonus(row,'dead-ball');
  return base;
 }
 function duelSkill(row,kind){
  if(kind==='cross'){
   const height=clamp(row?.base?.height??180,155,210);
   return shotSkill(row,{finish:'header'})*.6+stat(row,'phy')*.4+(height-180)*.12+bonus(row,'aerial');
  }
  const value=kind==='distance'?stat(row,'dri')*.55+stat(row,'phy')*.45:kind==='through'?stat(row,'pac')*.65+stat(row,'dri')*.35:stat(row,'dri')*.55+stat(row,'pac')*.25+stat(row,'phy')*.2;
  return value+bonus(row,...(kind==='through'?['rapid','quick-step','first-touch']:kind==='dribble'?['technical','trickster','press-proven']:['first-touch','press-proven']));
 }
 function defendSkill(row,kind,phase){
  if(kind==='cross'&&phase==='duel')return stat(row,'def')*.45+stat(row,'phy')*.55+(clamp(row?.base?.height??180,155,210)-180)*.12+bonus(row,'aerial','bruiser');
  return stat(row,'def')*.60+stat(row,'phy')*.20+stat(row,'pac')*.20+bonus(row,...(phase==='build'?['intercept']:['anticipate','jockey','slide-tackle','bruiser','enforcer']));
 }
 // A rating/chemistry advantage must create sustained pressure, not merely
 // a marginal shot modifier. Symmetric and bounded: strong underdogs can win,
 // individual attributes and PlayStyles still decide the actual chances.
 function matchupBalance(sidePower,opponentPower,sideChem=0,opponentChem=0){
  const power=clamp(Number(sidePower)-Number(opponentPower),-25,25);
  const chemistry=clamp(Number(sideChem)-Number(opponentChem),-33,33);
  return{
   possession:clamp(power*1.05+chemistry*.085,-16,16),
   build:clamp(power*.006+chemistry*.0008,-.14,.14),
   duel:clamp(power*.0055+chemistry*.0007,-.14,.14),
   xg:clamp(power*.0012+chemistry*.00016,-.028,.028)
  };
 }
 function chanceQuality(base,shot,opponentTactics={}){
  if(shot.creationType==='penalty')return .75;
  if(shot.creationType==='freekick')return .075;
  const t=tactics(opponentTactics),f={distance:.44,cross:.86,cutback:1.13,through:1.12,combination:1.06,dribble:1,switch:1}[shot.actionKind]||1;
  const exposed=shot.actionKind==='through'?1+(t.depth-50)*.003+(t.pressing-50)*.001:1;
  return clamp(base*f*exposed,shot.actionKind==='distance'?.025:.04,shot.actionKind==='distance'?.16:.52);
 }
 function goalChance(xg,row,shot={},keeper=null,defender=null){
  const skill=shotSkill(row,shot),distance=shot.actionKind==='distance',fresh=.90+clamp(row?.fitness??100,35,100)*.001;
  const relevant=shot.creationType==='freekick'?['dead-ball']:shot.finish==='header'?['power-header']:shot.finish==='volley'||shot.finish==='bicycle'?['acrobatic']:shot.finish==='finesse'?['finesse-shot','trivela']:shot.finish==='power'?['power-shot']:shot.finish==='chip'?['chip-shot']:shot.finish==='low_driven'?['low-driven-shot']:[];
  const creative=shot.tightLateGame&&['finesse','volley','bicycle','chip'].includes(shot.finish)?style(row,'gamechanger')*.04:0;
  const outside=shot.finish==='normal'&&['dribble','cutback'].includes(shot.actionKind)?style(row,'trivela')*.04:0;
  const technique=1+style(row,...relevant)*.08+creative+outside;
  const gk=keeper?stat(keeper,'pac')*.27+stat(keeper,'dri')*.45+stat(keeper,'phy')*.28:78;
  const gkStyle=style(keeper,...(shot.finish==='header'?['cross-claimer']:distance?['far-reach']:shot.actionKind==='through'?['rush-out','footwork']:['footwork','deflector']));
  const keeperFactor=clamp(1-(gk-78)*.009,.80,1.20)*(1-gkStyle*.045);
  const block=shot.creationType==='penalty'||shot.creationType==='freekick'?1:1-style(defender,'block')*.035;
  // No flat minimum finishing multiplier: 40 SHO must remain weak even at high OVR.
  return clamp(xg*Math.pow(skill/75,distance?3:2)*fresh*technique*keeperFactor*block,.001,shot.creationType==='penalty'?.94:.70);
 }
 function staminaMultiplier(raw={},row=null){
  const t=tactics(raw);return (1+(t.pressing-50)*.004+(t.depth-50)*.001+(t.buildUp==='fast'?.06:0))*(1-style(row,'relentless')*.065);
 }
 const api={tactics,attackWeights,pick,shotSkill,attackerWeight,finishFor,buildSkill,restartBuildSkill,duelSkill,defendSkill,matchupBalance,chanceQuality,goalChance,staminaMultiplier};
 root.FooteraMatchActions=Object.freeze(api);if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);
