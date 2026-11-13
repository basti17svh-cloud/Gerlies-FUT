// V21.406 Stadien (Basti 2026-11-13): fans in every stand, individual grounds,
// home/away alternating (presentation only) and the stadium shot before kick-off.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {fanWallQuads,quadNormal,FAN_WALL_ROWS,stadiumLook,cleanStadium,STADIUM_STYLES} from '../3d-stadium.mjs';
import {ceremonyCamera,CEREMONY_ARENA_SHOT} from '../3d-ceremony.mjs';
const read=f=>fs.readFileSync(new URL('../'+f,import.meta.url),'utf8');

test('fan wall: every terrace row of every stand and corner has supporters facing the pitch',()=>{
 for(const hostEnd of [-1,1]){
  const quads=fanWallQuads({hostEnd});
  const rowsAt=(pred)=>new Set(quads.filter(pred).map(q=>Math.round((q[4]-.84)/.72)));
  for(const side of [-1,1]){
   assert.equal(rowsAt(q=>Math.abs(q[0]-q[2])<.01&&Math.sign(q[0])===side&&Math.abs(q[0])>39).size,FAN_WALL_ROWS,'long side '+side);
   assert.equal(rowsAt(q=>Math.abs(q[1]-q[3])<.01&&Math.sign(q[1])===side&&Math.abs(q[1])>59).size,FAN_WALL_ROWS,'end '+side);
  }
  for(const q of quads){const [nx,nz]=quadNormal(q),mx=(q[0]+q[2])/2,mz=(q[1]+q[3])/2;assert.ok(nx*-mx+nz*-mz>0,'faces the pitch')}
  // Long sides are covered end to end apart from the aisles.
  const side=quads.filter(q=>Math.abs(q[0]-q[2])<.01&&q[0]>39&&q[4]<1);
  assert.ok(side.reduce((s,q)=>s+Math.abs(q[3]-q[1]),0)>110);
  // The guests get their own end; the host fills its end and most of the sides.
  const ends=quads.filter(q=>Math.abs(q[1]-q[3])<.01&&Math.abs(q[1])>59);
  assert.ok(ends.every(q=>q[5]===(Math.sign(q[1])===hostEnd?0:1)));
 }
 const aisled=fanWallQuads({aisles:{side:[0],end:[0]}}).filter(q=>q[4]<1&&Math.abs(q[0]-q[2])<.01&&q[0]>39);
 assert.ok(aisled.every(q=>Math.max(q[1],q[3])<-.5||Math.min(q[1],q[3])>.5),'aisles stay free');
});

test('slow phones thin every stand evenly instead of hiding whole stands',()=>{
 const scene=read('3d-highlights-scene.mjs');
 assert.match(scene,/crowdStaticSpecs=crowdSpecs\.filter\(x=>!x\.animated\)\.sort\(scatter\)/);
 assert.match(scene,/crowdDynamicSpecs=crowdSpecs\.filter\(x=>x\.animated\)\.sort\(scatter\)/);
 assert.match(scene,/createFanWall\(THREE,/);
 assert.ok(!/Math\.random|Date\.now|performance\.now/.test(read('3d-stadium.mjs')));
});

test('three builds: arena, Hexenkessel, Traditionsstadion; data is cleaned',()=>{
 assert.deepEqual([...STADIUM_STYLES],['arena','kessel','tradition']);
 assert.ok(stadiumLook({style:'arena'}).upper&&stadiumLook({style:'arena'}).roof);
 const k=stadiumLook({style:'kessel',seatPrimary:'#dc052d'});assert.ok(k.upper.y1>25.2&&k.upper.r1<34&&k.ribbon==='#dc052d');
 const t=stadiumLook({style:'tradition'});assert.equal(t.upper,null);assert.equal(t.roof,false);
 const c=cleanStadium({name:'<b>x</b>'.repeat(9),style:'x',seatPrimary:'red'});
 assert.ok(c.name.length<=28&&!/[<>]/.test(c.name));assert.equal(c.style,'arena');assert.match(c.seatPrimary,/^#[0-9a-f]{6}$/);
 const arena=read('3d-arena.mjs');assert.match(arena,/if\(hasRoof\)add\(/);assert.match(arena,/FooteraStadiumFacade/);
});

test('stadium shot before kick-off: high above the roof, then into the bowl, with the name on screen',()=>{
 assert.ok(CEREMONY_ARENA_SHOT>=3);
 assert.ok(ceremonyCamera('kickoff',0).position[1]>90);
 const scene=read('3d-highlights-scene.mjs');
 assert.match(scene,/fh3d-stadium-title/);assert.match(scene,/WILLKOMMEN IM/);
 assert.match(read('3d-highlights.css'),/\.fh3d-stadium-title\.visible\{opacity:1/);
 const hl=read('3d-highlights.js');assert.match(hl,/venue:event\.venue==='away'\?'away':'home'/);
 const qm=read('3d-highlights-match.js');assert.equal(qm.match(/\.\.\.match3DStadium\(current\)/g).length,2,'match scenes and ceremonies');
});

test('own stadium in the club identity; every second match away in the opponent ground',()=>{
 const app=read('footera-app.js'),from=app.indexOf('function safeClubHex'),to=app.indexOf('function ensureClubIdentityState');
 const ctx={state:{profile:{clubName:'FC Gerlies',clubIdentity:{colors:{primary:'#053300',secondary:'#800000'},stadium:{style:'kessel'}}}}};
 vm.createContext(ctx);vm.runInContext(app.slice(app.indexOf('function defaultClubIdentity'),app.indexOf('function safeClubHex'))+app.slice(from,to)+';this.api={cleanClubIdentity,matchStadiumFor,opponentClubStadium,resolvedClubStadium}',ctx);
 const {cleanClubIdentity,matchStadiumFor,opponentClubStadium}=ctx.api;
 assert.deepEqual({...cleanClubIdentity({}).stadium},{name:'',style:'arena',seatPrimary:'',seatSecondary:''},'old saves get the default');
 const home=matchStadiumFor(0,null,'Bayern',{shirtPrimary:'#dc052d'});
 assert.equal(home.venue,'home');assert.equal(home.stadium.name,'FC Gerlies Arena');assert.equal(home.stadium.style,'kessel');assert.equal(home.stadium.seatPrimary,'#053300');
 const away=matchStadiumFor(1,null,'FC Bayern München',{shirtPrimary:'#dc052d'});
 assert.equal(away.venue,'away');assert.equal(away.stadium.seatPrimary,'#dc052d');assert.match(away.stadium.name,/Bayern München/);
 assert.deepEqual({...opponentClubStadium('Werder Bremen',{})},{...opponentClubStadium('Werder Bremen',{})},'same ground every time');
 assert.equal(matchStadiumFor(2,null,'x',{}).venue,'home');
 const html=read('index.html');assert.match(html,/data-identity-tab="stadium"/);assert.match(html,/id="identityStadiumName"/);
});
