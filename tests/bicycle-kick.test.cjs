const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
// V21.206 (Basti): the bicycle scene is a real overhead kick, not a standing shot.
test('bicycle kick turns the striker over his pelvis, kicks above him and gets him up before the celebration',async()=>{
 const M=await import('../3d-highlights-scene.mjs');
 assert.equal(M.bicycleKickPose(4.8),null);
 const contact=M.bicycleKickPose(M.SHOT_TIME);
 assert.equal(contact.weight,1);
 assert.ok(contact.pitch>1.3,'body past horizontal at contact: '+contact.pitch);
 assert.ok(contact.legs[1][0]>.5&&contact.legs[1][1]>-.3,'kicking leg up and almost straight');
 assert.ok(contact.legs[0][0]<.2,'other leg has scissored down');
 assert.ok(M.bicycleKickPose(5.15).legs[0][0]>1,'other leg swings up first');
 const lying=M.bicycleKickPose(6);
 assert.ok(lying.pitch>1.2&&lying.lift<-.7,'lands on his back');
 assert.equal(M.bicycleKickPose(M.IMPACT_TIME+.35),null,'up again before the celebration starts');
 let prev=null;
 for(let t=4.85;t<7;t+=.01){const p=M.bicycleKickPose(t);if(!p){prev=null;continue}
  for(const v of [p.pitch*p.weight,p.lift*p.weight,p.back*p.weight])assert.ok(Number.isFinite(v));
  if(prev)assert.ok(Math.abs(p.pitch*p.weight-prev.pitch*prev.weight)<.12,'smooth turn at '+t.toFixed(2));
  prev=p;
 }
});
test('the bicycle scene keeps its overhead finish whatever finish the simulation named',()=>{
 const source=fs.readFileSync(path.join(__dirname,'../3d-highlights-match.js'),'utf8');
 assert.match(source,/presentation\.finish=presentation\.sequence==='bicycle'\?'bicycle':/);
});
