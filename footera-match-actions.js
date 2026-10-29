/* Footera V21.303: simulation-owned attacks. No rendering, timers or hidden RNG.
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
 const style=(row,...ids)=>{let value=0;for(const s of row?.styles||[])if(ids.includes(s.id))value=Math.max(value,s.plus?1.6:1);return value;};
 // Keep one relevant effect per phase; overlapping traits never multiply unboundedly.
 const bonus=(row,...ids)=>style(row,...ids)>1?13:style(row,...ids)>0?6:0;
 const affinity=(row,...ids)=>style(row,...ids)>1?1.85:style(row,...ids)>0?1.30:1;
 function squadAffinity(rows,kind){
  const eligible=rows.filter(r=>!['GK','TW','TH'].includes(String(r.slot||r.base?.position||'').toUpperCase()));
  if(!eligible.length)return 1;
  const scores=eligible.map(r=>{
   const skill=kind==='distance'?shotSkill(r,{actionKind:kind}):kind==='cross'?shotSkill(r,{finish:'header'}):kind==='dribble'?duelSkill(r,kind):buildSkill(r,kind);
   const ids=kind==='distance'?['power-shot','finesse-shot']:kind==='cross'?['aerial','power-header']:kind==='dribble'?['technical','trickster','rapid']:kind==='through'?['incisive-pass','through-ball']:kind==='switch'?['long-ball-pass']:kind==='cutback'?['pinged-pass']:['tiki-taka'];
   return clamp(Math.pow(skill/75,2),.3,1.65)*affinity(r,...ids);
  }).sort((a,b)=>b-a).slice(0,3);
  return clamp(scores.reduce((a,b)=>a+b,0)/scores.length,.3,2.4);
 }
 const SKILL_LEVELS=Object.freeze({'body-feint':1,'stepover':2,'ball-roll':2,'drag-back':2,'roulette':3,'heel-to-heel':3,'croqueta':4,'berbatov':4,'elastico':5,'reverse-elastico':5});
 function playerTraits(row){
  const base=row?.base||row||{},stars=v=>Number.isInteger(Number(v))&&Number(v)>=1&&Number(v)<=5?Number(v):0;
  const raw=String(base.preferredFoot??'').trim().toLowerCase();
  return {skillMoves:stars(base.skillMoves),weakFoot:stars(base.weakFoot),preferredFoot:/^(right|rechts|r|1)$/.test(raw)?'Right':/^(left|links|l|2)$/.test(raw)?'Left':''};
 }
 function footFactor(row,actualFoot){
  const t=playerTraits(row);
  if(!t.preferredFoot||!t.weakFoot||!['Left','Right'].includes(actualFoot)||actualFoot===t.preferredFoot)return 1;
  return [1,.50,.64,.78,.90,1][t.weakFoot];
 }
 function actionFoot(row,kind,roll=.5){
  const t=playerTraits(row);if(!t.preferredFoot)return '';
  // Neither left nor right is universally better: the opportunity may demand either boot.
  const weak=clamp(roll,0,1)<(kind==='through'?.34:kind==='cross'?.30:.26);
  return weak?(t.preferredFoot==='Left'?'Right':'Left'):t.preferredFoot;
 }
 function skillFor(row,kind,roll=.5){
  const stars=playerTraits(row).skillMoves;if(kind!=='dribble'||!stars)return '';
  const specialist=style(row,'technical','trickster');
  const rate=specialist>1?.90:specialist>0?.78:.62;
  if(roll>=rate)return '';
  const options=Object.entries(SKILL_LEVELS).filter(([,min])=>min<=stars);
  return options[Math.min(options.length-1,Math.floor(clamp(roll/rate,0,.99999)*options.length))][0];
 }
 function tactics(raw={}){
  const t={};for(const k of ['width','depth','pressing','dribbling','crossing','longShots'])t[k]=clamp(raw[k]??50,0,100);
  t.buildUp=['fast','patient'].includes(raw.buildUp)?raw.buildUp:'balanced';
  t.attackFocus=['wide','inside'].includes(raw.attackFocus)?raw.attackFocus:'balanced';return t;
 }
 function attackWeights(raw={},creator=null,rows=[]){
  const t=tactics(raw),scale=k=>.35+t[k]/100*1.3;
  const wide=t.attackFocus==='wide'?1.9:t.attackFocus==='inside'?.50:1;
  const weights={
   combination:32*(t.buildUp==='patient'?1.9:t.buildUp==='fast'?.60:1)*(1.35-t.dribbling/140)*(t.attackFocus==='inside'?1.35:1)*affinity(creator,'tiki-taka'),
   through:22*(t.buildUp==='fast'?2.0:t.buildUp==='patient'?.65:1)*affinity(creator,'incisive-pass','through-ball'),
   dribble:16*scale('dribbling')*(t.attackFocus==='inside'?1.25:1),
   cross:14*scale('crossing')*wide*(.7+t.width/100*.6)*affinity(creator,'long-ball-pass'),
   cutback:10*wide*(.7+t.width/100*.6)*(1.45-t.crossing/140),
   distance:8*scale('longShots'),
   switch:8*(t.buildUp==='patient'?1.3:1)*(.6+t.width/100*.8)*affinity(creator,'long-ball-pass')
  };
  for(const kind of Object.keys(weights))weights[kind]*=squadAffinity(rows,kind);
  return weights;
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
  return fit*position*affinity(row,...(kind==='cross'?['aerial','power-header']:kind==='distance'?['power-shot','finesse-shot']:kind==='dribble'?['technical','rapid']:['first-touch']));
 }
 function finishFor(row,kind,roll){
  if(kind==='cross')return style(row,'acrobatic')>0&&roll<(style(row,'acrobatic')>1?.55:.30)?'volley':'header';
  if(kind==='distance')return style(row,'finesse-shot')>style(row,'power-shot')?'finesse':'power';
  if(kind==='through'&&style(row,'chip-shot')&&roll<(style(row,'chip-shot')>1?.55:.30))return'chip';
  if(style(row,'finesse-shot')&&roll<(style(row,'finesse-shot')>1?.65:.40))return'finesse';
  if(style(row,'low-driven-shot')&&roll<(style(row,'low-driven-shot')>1?.85:.60))return'low_driven';
  return'normal';
 }
 function buildSkill(row,kind,context={}){
  const passing=kind==='cross'?detail(row,['crossing'],stat(row,'pas')):kind==='switch'?detail(row,['longPassing','long_passing'],stat(row,'pas')):detail(row,['shortPassing','short_passing'],stat(row,'pas'));
  const ids=kind==='cross'?['long-ball-pass']:kind==='through'?['incisive-pass','through-ball']:kind==='switch'?['long-ball-pass']:kind==='cutback'?['pinged-pass']:['tiki-taka','press-proven','flair'];
  return (passing*.75+stat(row,'dri')*.25+bonus(row,...ids))*(.65+.35*footFactor(row,context.creatorFoot));
 }
 function restartBuildSkill(row,kind,scene,keeper,context={}){
  const base=buildSkill(row,kind,context);
  if(scene==='keeper_buildout')return base*.8+stat(keeper,'pas')*.2+bonus(keeper,'far-throw');
  if(scene==='throw_in')return base+bonus(row,'long-throw');
  if(scene==='corner')return base+bonus(row,'dead-ball');
  return base;
 }
 function duelSkill(row,kind,context={}){
  if(kind==='cross'){
   const height=clamp(row?.base?.height??180,155,210);
   return shotSkill(row,{finish:'header'})*.6+stat(row,'phy')*.4+(height-180)*.12+bonus(row,'aerial');
  }
  const value=kind==='distance'?stat(row,'dri')*.55+stat(row,'phy')*.45:kind==='through'?stat(row,'pac')*.65+stat(row,'dri')*.35:stat(row,'dri')*.55+stat(row,'pac')*.25+stat(row,'phy')*.2;
  const stars=playerTraits(row).skillMoves,skillFactor=kind==='dribble'&&stars?[1,.90,.96,1.03,1.09,1.15][stars]:1;
  const legal=!context.skillMove||!SKILL_LEVELS[context.skillMove]||stars>=SKILL_LEVELS[context.skillMove];
  return (value+bonus(row,...(kind==='through'?['rapid','quick-step','first-touch']:kind==='dribble'?['technical','trickster','press-proven']:['first-touch','press-proven'])))*skillFactor*(legal?1:.65);
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
   build:clamp(power*.004+chemistry*.0008,-.10,.10),
   duel:clamp(power*.0035+chemistry*.0007,-.10,.10),
   xg:clamp(power*.0008+chemistry*.00016,-.022,.022)
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
  const creative=shot.tightLateGame&&['finesse','volley','bicycle','chip'].includes(shot.finish)?(style(row,'gamechanger')>1?.18:style(row,'gamechanger')>0?.08:0):0;
  const outside=shot.finish==='normal'&&['dribble','cutback'].includes(shot.actionKind)?(style(row,'trivela')>1?.18:style(row,'trivela')>0?.08:0):0;
  const technique=(style(row,...relevant)>1?1.40:style(row,...relevant)>0?1.16:1)+creative+outside;
  const gk=keeper?stat(keeper,'pac')*.27+stat(keeper,'dri')*.45+stat(keeper,'phy')*.28:78;
  const gkStyle=style(keeper,...(shot.finish==='header'?['cross-claimer']:distance?['far-reach']:shot.actionKind==='through'?['rush-out','footwork']:['footwork','deflector']));
  const keeperFactor=clamp(1-(gk-78)*.009,.80,1.20)*(gkStyle>1?.80:gkStyle>0?.91:1);
  const block=shot.creationType==='penalty'||shot.creationType==='freekick'?1:style(defender,'block')>1?.82:style(defender,'block')>0?.92:1;
  // No flat minimum finishing multiplier: 40 SHO must remain weak even at high OVR.
  return clamp(xg*Math.pow(skill/75,distance?3:2)*fresh*technique*keeperFactor*block*(shot.finish==='header'?1:footFactor(row,shot.shotFoot)),.001,shot.creationType==='penalty'?.94:.70);
 }
 function staminaMultiplier(raw={},row=null){
  const t=tactics(raw);return (1+(t.pressing-50)*.004+(t.depth-50)*.001+(t.buildUp==='fast'?.06:0))*(style(row,'relentless')>1?.82:style(row,'relentless')>0?.92:1);
 }
 const api={SKILL_LEVELS,playerTraits,footFactor,actionFoot,skillFor,tactics,attackWeights,pick,shotSkill,attackerWeight,finishFor,buildSkill,restartBuildSkill,duelSkill,defendSkill,matchupBalance,chanceQuality,goalChance,staminaMultiplier};
 root.FooteraMatchActions=Object.freeze(api);if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);
