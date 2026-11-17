// V21.456: every goal visibly crosses the line between the posts and under the bar
// (Basti: "der Ball geht optisch am Tor vorbei, aber es ist ein Tor").
const test=require('node:test'),assert=require('node:assert/strict');
test('goals cross the goal line inside the goal mouth',async()=>{
 const M=await import('../3d-highlights-scene.mjs'),P=await import('../3d-playbook.mjs');
 const places=[null];
 for(const side of [-1,1])for(const zone of ['inside','corner'])for(const style of [undefined,'top_corner','post_in','crossbar_in'])places.push({side,zone,height:'high',style});
 for(const seq of M.PLAY_SEQUENCES.filter(s=>!P.DEFENSIVE_SCENES.includes(s)))for(const fin of ['normal','finesse','header'])for(const pl of places){
  const c=M.goalLineCrossing(seq,fin,pl);
  assert.ok(c,seq+' '+fin+' never reaches the line');
  // In off the bar / post strikes the frame on purpose.
  assert.ok(Math.abs(c[0])<=(pl?.style==='post_in'?3.56:3.5)&&c[1]<=(pl?.style==='crossbar_in'?2.5:2.33),seq+' '+fin+' '+JSON.stringify(pl)+' crosses at '+c.map(v=>v.toFixed(2)));
  // Behind the line it stays inside the net and still ends on the simulated spot.
  const end=M.shotArrival('goal',seq,fin,pl);
  for(let t=M.SHOT_TIME;t<=end+.5;t+=.02){const b=M.ballPosition('goal',t,seq,fin,'classic',pl);if(b[2]<-52.6)assert.ok(Math.abs(b[0])<3.62&&b[1]<2.44,seq+' '+fin+' '+JSON.stringify(pl)+' outside the net at '+t.toFixed(2)+': '+b.map(v=>v.toFixed(2)))}
  const imp=M.shotImpact('goal',seq,fin,pl),arr=M.ballPosition('goal',end,seq,fin,'classic',pl);
  assert.ok(Math.hypot(...arr.map((v,i)=>v-imp[i]))<1e-3,seq+' '+fin+' '+JSON.stringify(pl)+' keeps its impact '+arr+' vs '+imp);
 }
 // The bend-in is smooth: no jump at the strike.
 const pl={side:-1,zone:'inside',height:'high',style:'top_corner'};
 const a=M.ballPosition('goal',M.SHOT_TIME,'counter_sprint_left','normal','classic',pl),b=M.ballPosition('goal',M.SHOT_TIME+.01,'counter_sprint_left','normal','classic',pl);
 assert.ok(Math.hypot(a[0]-b[0],a[1]-b[1],a[2]-b[2])<.5);
});
