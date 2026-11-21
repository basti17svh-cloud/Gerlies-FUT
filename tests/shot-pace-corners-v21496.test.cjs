// V21.496 (Basti: "Schüsse platzierter ins Eck und nicht so halbherzig"):
// goals go low or high into a corner and every shot flies at a real pace.
const test=require('node:test'),assert=require('node:assert/strict');
test('goals go into a corner, low or high, never half-height next to the keeper',async()=>{
 const M=await import('../3d-highlights-scene.mjs'),P=await import('../3d-playbook.mjs'),D=await import('../3d-dream-goals.mjs');
 const places=[null];
 for(const side of [-1,1])for(const zone of ['inside','channel','corner'])for(const height of ['low','mid','high'])places.push({side,zone,height});
 for(const seq of M.PLAY_SEQUENCES.filter(s=>!P.DEFENSIVE_SCENES.includes(s)&&!D.DREAM_GOAL_IDS.includes(s)&&!/^extended_/.test(s)))
  for(const fin of ['normal','finesse','power','low_driven','volley'])for(const pl of places){
   const [x,y]=M.shotImpact('goal',seq,fin,pl);
   assert.ok(Math.abs(x)>=2.4&&Math.abs(x)<=3.35,seq+' '+fin+' wide enough: '+x);
   assert.ok(y<=.6||y>=1.9,seq+' '+fin+' '+JSON.stringify(pl)+' low or high: '+y);
  }
 // Saves keep their reachable spots.
 assert.ok(Math.abs(M.shotImpact('big_chance_saved','central','normal',{side:1,zone:'inside',height:'mid'})[0])<1.5);
});
test('shot pace: real metres per second on screen, independent of the outcome and scene length',async()=>{
 const C=await import('../3d-playback-clock.mjs');
 for(const seconds of [9,13,17])for(const d of [11,15,22]){
  const scale=10.4/seconds,rate=C.shotPaceRate('normal',d,scale),speed=d/(1.25/(scale*rate));
  assert.ok(speed>=20&&speed<=32,seconds+'s '+d+'m: '+speed.toFixed(1)+' m/s');
 }
 const pace=type=>{const c=C.createHighlightPlayback({type,playSeconds:17,finish:'normal'},10.4,{shotDistance:15});c.tick(0);c.presented(0);
  let prev=0,real=null,start=null;for(let now=10;now<=c.totalSeconds*1000+20;now+=10){const t=c.tick(now).time;if(start===null&&t>=5.4)start=now;if(real===null&&t>=6.6)real=now-start;prev=t}return real};
 const goal=pace('goal');
 for(const type of ['big_chance_saved','big_chance_missed','shot_post'])assert.equal(pace(type),goal);
 assert.ok(goal<800,'15 m shot reaches the keeper in under 0.8 s, was '+goal+' ms');
});
