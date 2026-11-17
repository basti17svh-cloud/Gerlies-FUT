// V21.456 (Basti 2026-11-17): "Ansicht aus der Luft (wie beim Anfang vom Spiel)
// ... nicht komplett weit weg" + "Mache noch 6 neue Stadionmodelle".
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {stadiumLook,STADIUM_STYLES,STADIUM_STYLE_LABELS} from '../3d-stadium.mjs';
import {arenaPerimeter,stadiumExtrasPlan,waveRoofLift,onHostEnd} from '../3d-arena.mjs';
const read=f=>fs.readFileSync(new URL('../'+f,import.meta.url),'utf8');

test('six new builds, each with its own silhouette',()=>{
 const fresh=['welle','bogen','kuppel','ground','wand','berg'];
 for(const s of fresh){assert.ok(STADIUM_STYLES.includes(s));assert.ok(STADIUM_STYLE_LABELS[s])}
 const sig=s=>{const l=stadiumLook({style:s,seatPrimary:'#c8102e'}),p=stadiumExtrasPlan(l);return JSON.stringify([!!l.upper,l.roof,l.roofShape,l.openHostEnd,p.arch,p.dome,p.hills,p.stands.map(x=>x.roof)])};
 const all=STADIUM_STYLES.filter(s=>s!=='kessel').map(sig);
 assert.equal(new Set(all).size,all.length,'every build differs in shape (Hexenkessel differs by its steeper tier)');
 assert.equal(stadiumLook({style:'welle'}).roofShape,'wave');
 assert.ok(stadiumExtrasPlan(stadiumLook({style:'bogen'})).arch);
 assert.ok(stadiumExtrasPlan(stadiumLook({style:'kuppel'})).dome);
 const ground=stadiumExtrasPlan(stadiumLook({style:'ground'}));assert.equal(ground.stands.length,4);assert.ok(ground.stands.every(s=>s.roof==='gable'));
 const berg=stadiumExtrasPlan(stadiumLook({style:'berg'}));assert.ok(berg.hills);assert.equal(berg.stands.length,1);
});

test('Fanwand stands at the host end and the ring tier leaves room for it',()=>{
 for(const hostEnd of [-1,1]){
  const wall=stadiumExtrasPlan(stadiumLook({style:'wand'}),{hostEnd}).stands.find(s=>s.wall);
  assert.equal(wall.axis,'z');assert.equal(wall.side,hostEnd);assert.ok(wall.y1>40,'much higher than the upper tier');
  const pts=arenaPerimeter(27).points;
  assert.ok(pts.some(p=>onHostEnd(p,hostEnd)));assert.ok(!pts.some(p=>onHostEnd(p,-hostEnd)&&onHostEnd(p,hostEnd)));
 }
 assert.match(read('3d-highlights-scene.mjs'),/kits:crowdKits,look,hostEnd,/,'the scene tells the arena which end is home');
});

test('wave roof rises mid-stand and dips in the corners; straights can be split',()=>{
 assert.ok(waveRoofLift(60,0)>4&&waveRoofLift(0,80)>4);assert.ok(waveRoofLift(50,70)<-3);
 const a=arenaPerimeter(20),b=arenaPerimeter(20,6);assert.equal(b.points.length-a.points.length,4*5);
 assert.ok(Math.abs(a.length-b.length)<1e-6);
});

test('3D aerial preview in Verein > Stadion: real stadium, close enough, flat strip as fallback',async()=>{
 const src=read('3d-stadium-preview.mjs');
 assert.match(src,/createArena\(THREE,/);assert.match(src,/createFanWall\(THREE,/);
 const {previewCamera}=await import('../3d-stadium-preview.mjs').catch(()=>({}))??{};
 // Module needs a browser for three.js; check the camera numbers by text when it can't load here.
 const radius=Number(src.match(/const radius=(\d+),height=(\d+)/)[1]),height=Number(src.match(/const radius=(\d+),height=(\d+)/)[2]);
 assert.ok(radius>=140&&radius<=200,'not too far away');assert.ok(height>=60&&height<=110,'from the air');
 if(previewCamera)assert.ok(previewCamera(0).position[1]>50);
 const app=read('footera-app.js');
 assert.match(app,/const STADIUM_PREVIEW_MODULE="\.\/3d-stadium-preview\.mjs\?v=\d+"/);
 assert.match(app,/footera-3d-stadium-preview/,'opt-out flag');
 assert.match(app,/stadiumPreviewFailed=true;box\.classList\.remove\("is-3d"\)/,'falls back to the drawn strip');
 const version=app.match(/3d-stadium-preview\.mjs\?v=(\d+)/)[1];
 assert.ok(read('service-worker.js').includes(`"./3d-stadium-preview.mjs?v=${version}"`),'cached offline');
 assert.match(read('club-identity.css'),/\.stadium-preview\.is-3d \.stadium-preview-flat\{display:none\}/);
 // All nine builds can be picked and opponents use all nine.
 const from=app.indexOf('const STADIUM_STYLES='),to=app.indexOf('function matchStadiumFor');
 const ctx={};vm.createContext(ctx);vm.runInContext(app.slice(from,to)+';this.api={STADIUM_STYLES,opponentClubStadium}',ctx);
 assert.deepEqual(Object.keys(ctx.api.STADIUM_STYLES),[...STADIUM_STYLES]);
 const seen=new Set();for(let i=0;i<400;i++)seen.add(ctx.api.opponentClubStadium('Club '+i,{}).style);
 assert.equal(seen.size,STADIUM_STYLES.length);
});
