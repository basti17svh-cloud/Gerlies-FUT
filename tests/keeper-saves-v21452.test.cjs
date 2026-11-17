'use strict';
// V21.452 Neue Paraden: tipped over the crossbar and punched clear.
const test=require('node:test');
const assert=require('node:assert/strict');
const H=require('../3d-highlights.js');

test('V21.452: over the bar and punch are real keeper actions with their own ball',async()=>{
 const M=await import('../3d-highlights-scene.mjs'),G=await import('../3d-goalkeeper-biomechanics.mjs');
 for(const a of ['over_bar','punch'])assert.ok(G.GOALKEEPER_ACTIONS.includes(a),a);
 for(const seq of ['long_shot','dream_rocket_dip','dream_diving_header_right','central']){
  const fin=seq==='dream_diving_header_right'?'header':'power',placement={side:1,zone:'corner',height:'high'};
  const impact=M.shotImpact('big_chance_saved',seq,fin,placement);
  // Over the bar: still the same contact, then above the crossbar on the goal line, lands behind the goal.
  const at=t=>M.ballPosition('big_chance_saved',t,seq,fin,'over_bar',placement);
  assert.ok(Math.hypot(...at(M.IMPACT_TIME).map((v,i)=>v-impact[i]))<.05,'over_bar starts at the save '+seq);
  let crossed=null,prev=at(M.IMPACT_TIME);
  for(let t=M.IMPACT_TIME;t<M.IMPACT_TIME+1.6;t+=.01){const b=at(t);if(prev[2]>-52.5&&b[2]<=-52.5)crossed=b;assert.ok(Math.hypot(...b.map((v,i)=>v-prev[i]))<.3,'smooth');prev=b}
  assert.ok(crossed&&crossed[1]>2.6,'clears the crossbar '+seq+' '+crossed?.[1]);
  assert.ok(prev[2]<-55&&prev[1]<.3,'drops behind the goal');
  // Punch: flies back out towards the edge of the box, high.
  const punch=t=>M.ballPosition('big_chance_saved',t,seq,fin,'punch',placement);
  let peak=0;for(let t=M.IMPACT_TIME;t<M.IMPACT_TIME+1.6;t+=.02)peak=Math.max(peak,punch(t)[1]);
  assert.ok(punch(M.IMPACT_TIME+1.6)[2]>-40&&peak>3,'punched clear '+seq);
 }
});

test('V21.452: the new saves only come for a fitting shot',()=>{
 const seen={over_bar:0,punch:0};
 for(let i=0;i<800;i++){
  const header=i%2===0;
  const r=H.chooseReactions({id:'k'+i,type:'big_chance_saved',sequence:header?'near_post_header_right':'long_shot',finish:header?'header':'power',shotPlacement:{side:1,zone:'corner',height:header?'mid':'high'}});
  if(r.keeperAction in seen)seen[r.keeperAction]++;
  if(r.keeperAction==='punch')assert.ok(header||r,'punch: header or a hard shot');
 }
 assert.ok(seen.over_bar>40&&seen.punch>40,JSON.stringify(seen));
 for(let i=0;i<400;i++){
  const r=H.chooseReactions({id:'n'+i,type:'big_chance_saved',sequence:'triangle_left',finish:'normal',shotPlacement:{side:1,zone:'inside',height:'low'}});
  assert.ok(!['punch','over_bar'].includes(r.keeperAction),'no punch/over the bar for a low side-foot shot');
 }
 for(let i=0;i<300;i++){
  const r=H.chooseReactions({id:'g'+i,type:'goal',sequence:'long_shot',finish:'power',shotPlacement:{height:'high'}});
  assert.equal(r.keeperAction,'beaten');
 }
});
