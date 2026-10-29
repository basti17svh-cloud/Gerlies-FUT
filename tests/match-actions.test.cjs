const test=require('node:test'),assert=require('node:assert/strict');
const A=require('../footera-match-actions.js'),H=require('../3d-highlights.js');
const player=(stats={},styles=[])=>({attrs:{pac:75,sho:75,pas:75,dri:75,def:75,phy:75,ovr:90,...stats},base:{height:180},fitness:100,styles});
const shot={actionKind:'distance',finish:'power'};
test('40 SHO remains a weak distance shooter at 99 OVR, unlike 90 SHO',()=>{
 const weak=player({sho:40,ovr:99}),strong=player({sho:90,ovr:80});
 const xg=A.chanceQuality(.18,shot),low=A.goalChance(xg,weak,shot),high=A.goalChance(xg,strong,shot);
 assert.ok(low<.015&&low>0);assert.ok(high>low*10&&high<.20);
 assert.equal(low,A.goalChance(xg,player({sho:40,ovr:50}),shot));
 assert.ok(A.attackerWeight(weak,'distance')<A.attackerWeight(strong,'distance')*.15);
});
test('heading uses aerial attributes; explicit substats override card fallback',()=>{
 const defender=player({sho:40,def:90,phy:94}),small=player({sho:75,def:30,phy:40});
 assert.ok(A.shotSkill(defender,{finish:'header'})>A.shotSkill(small,{finish:'header'}));
 defender.base.subStats={longShots:30,shotPower:50,headingAccuracy:95,jumping:96,strength:94};
 assert.ok(A.shotSkill(defender,{finish:'header'})>94);assert.equal(A.shotSkill(defender,shot),34);
});
test('relevant PlayStyles and Plus improve the action without erasing weak stats',()=>{
 const plain=player(),normal=player({},[{id:'power-shot'}]),plus=player({},[{id:'power-shot',plus:true}]);
 assert.ok(A.goalChance(.08,plus,shot)>A.goalChance(.08,normal,shot));
 assert.ok(A.goalChance(.08,normal,shot)>A.goalChance(.08,plain,shot));
 assert.equal(A.goalChance(.08,player({},[{id:'power-header',plus:true}]),shot),A.goalChance(.08,plain,shot));
 assert.ok(A.goalChance(.08,player({sho:40},plus.styles),shot)<A.goalChance(.08,player({sho:90}),shot));
 assert.ok(A.buildSkill(player({},[{id:'incisive-pass',plus:true}]),'through')>A.buildSkill(plain,'through'));
 assert.ok(A.duelSkill(player({},[{id:'technical'}]),'dribble')>A.duelSkill(plain,'dribble'));
 assert.ok(A.defendSkill(player({},[{id:'intercept'}]),'through','build')>A.defendSkill(plain,'through','build'));
 assert.ok(A.goalChance(.08,plain,shot,player({},[{id:'far-reach'}]))<A.goalChance(.08,plain,shot,plain));
 assert.ok(A.goalChance(.08,plain,shot,null,player({},[{id:'block'}]))<A.goalChance(.08,plain,shot));
});
test('tactical preferences change attack distribution and pressing has a stamina/exposure cost',()=>{
 const freq=t=>{const counts={};for(let i=0;i<10000;i++){const k=A.pick(A.attackWeights(t),(i+.5)/10000);counts[k]=(counts[k]||0)+1}return counts};
 assert.ok(freq({longShots:100}).distance>freq({longShots:0}).distance*3);
 assert.ok(freq({crossing:100,attackFocus:'wide',width:100}).cross>freq({crossing:0,attackFocus:'inside',width:0}).cross*5);
 assert.ok(freq({dribbling:100}).dribble>freq({dribbling:0}).dribble*3);
 assert.ok(freq({buildUp:'patient'}).combination>freq({buildUp:'fast'}).combination*2);
 assert.ok(freq({buildUp:'fast'}).through>freq({buildUp:'patient'}).through*2);
 assert.ok(A.staminaMultiplier({pressing:100,depth:100})>A.staminaMultiplier({pressing:0,depth:0}));
 assert.ok(A.staminaMultiplier({},player({},[{id:'relentless'}]))<A.staminaMultiplier({},player()));
 assert.ok(A.chanceQuality(.2,{actionKind:'through'},{depth:100,pressing:100})>A.chanceQuality(.2,{actionKind:'through'},{depth:0,pressing:0}));
});
test('3D respects the simulated finish and attack type for goals, saves and misses',()=>{
 for(const type of ['goal','big_chance_saved','big_chance_missed','shot_post'])for(const kind of ['distance','cross','through','dribble','combination','switch','cutback'])for(let i=0;i<80;i++){
  const finish=kind==='cross'?(i%2?'header':'volley'):kind==='distance'?'power':kind==='through'&&i%2?'chip':'normal';
  const event={type,id:String(i),actionKind:kind,finish,creatorName:'Creator',playerStyles:[{id:'finesse-shot',plus:true}]};
  const visual=H.choosePresentation(event);
  assert.equal(visual.finish,finish);
  // V21.195 star moments: a screamer, a volley or a solo feint may show instead.
  if(kind==='distance')assert.ok(['layoff_distance','switch_distance_left','edge_pullback_right','long_shot','power_drive','edge_rocket','recycle_rocket_left','recycle_curler_right','halfvolley_drive','first_touch_layoff_rocket'].includes(visual.sequence),visual.sequence);
  else if(kind==='cross')assert.match(visual.sequence,finish==='header'?/header|high|clipped/:/volley/);
  else if(kind==='dribble')assert.ok(visual.family===kind||/^double_feint_(left|right)$/.test(visual.sequence),visual.sequence);
  else assert.equal(visual.family,kind);
  assert.equal(H.snapshot({...event,...visual}).actionKind,kind);
 }
});

test('V21.302: specialist attacks and signature finishes separate normal and Plus',()=>{
 const team=styles=>Array.from({length:10},()=>player({},styles));
 const frequency=(kind,rows)=>{const weights=A.attackWeights({},null,rows);return weights[kind]/Object.values(weights).reduce((a,b)=>a+b,0)};
 for(const [kind,id] of [['distance','power-shot'],['dribble','technical'],['cross','aerial'],['through','incisive-pass']]){
  const plain=frequency(kind,team([])),normal=frequency(kind,team([{id}])),plus=frequency(kind,team([{id,plus:true}]));
  assert.ok(plus>normal*1.15&&normal>plain*1.10,`${kind}: ${plain}, ${normal}, ${plus}`);
 }
 const weak=team([]).map(r=>({...r,attrs:{...r.attrs,sho:40}})),strong=team([]).map(r=>({...r,attrs:{...r.attrs,sho:90}}));
 assert.ok(frequency('distance',strong)>frequency('distance',weak)*2,'shot selection follows shooting, independent of OVR');
 for(const [kind,id,finish] of [['through','chip-shot','chip'],['cross','acrobatic','volley'],['combination','finesse-shot','finesse'],['combination','low-driven-shot','low_driven']]){
  const count=plus=>Array.from({length:1000},(_,i)=>A.finishFor(player({},[{id,plus}]),kind,(i+.5)/1000)).filter(f=>f===finish).length;
  assert.ok(count(true)>count(false)*1.35,id);
 }
});

test('V21.302: relevant Plus has a material effect with bounded, non-stacking advantages',()=>{
 const make=(id,plus)=>player({},[{id,plus}]);
 const plain=A.goalChance(.10,player(),shot),normal=A.goalChance(.10,make('power-shot',false),shot),plus=A.goalChance(.10,make('power-shot',true),shot);
 assert.ok(normal>plain*1.15&&plus>normal*1.20);
 for(const [fn,kind,id,phase] of [['buildSkill','through','incisive-pass'],['duelSkill','dribble','technical'],['defendSkill','through','intercept','build'],['defendSkill','dribble','anticipate','duel']]){
  assert.ok(A[fn](make(id,true),kind,phase)>A[fn](make(id,false),kind,phase)+5,fn);
 }
 const stacked=player({},[{id:'technical',plus:true},{id:'trickster',plus:true},{id:'press-proven',plus:true}]);
 assert.equal(A.duelSkill(stacked,'dribble'),A.duelSkill(make('technical',true),'dribble'));
 assert.ok(A.goalChance(.1,player(),shot,make('far-reach',true))<A.goalChance(.1,player(),shot,player())*.81);
 assert.ok(A.goalChance(.1,player(),shot,null,make('block',true))<plain*.83);
 assert.equal(A.goalChance(.1,make('power-header',true),shot),plain,'irrelevant traits confer no shooting bonus');
 assert.ok(A.goalChance(.1,player({sho:40},[{id:'power-shot',plus:true}]),shot)<A.goalChance(.1,player({sho:90}),shot)*.2);
});


test('V21.302: situational creative Plus and endurance retain their own contexts',()=>{
 const make=(id,plus)=>player({},[{id,plus}]);
 const tight={actionKind:'through',finish:'chip',tightLateGame:true};
 assert.ok(A.goalChance(.1,make('gamechanger',true),tight)>A.goalChance(.1,make('gamechanger',false),tight)*1.08);
 assert.equal(A.goalChance(.1,make('gamechanger',true),{...tight,tightLateGame:false}),A.goalChance(.1,player(),{...tight,tightLateGame:false}));
 const outside={actionKind:'dribble',finish:'normal'};
 assert.ok(A.goalChance(.1,make('trivela',true),outside)>A.goalChance(.1,make('trivela',false),outside)*1.08);
 assert.ok(A.staminaMultiplier({},make('relentless',true))<A.staminaMultiplier({},make('relentless',false))*.90);
});
