// V21.483 "Manche Szenen hängen": work that froze single frames in the middle
// of a 3D scene now happens before the first picture, or not every frame.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const read=f=>fs.readFileSync(path.join(__dirname,'..',f),'utf8');

test('shaders and textures are prepared before the first picture',()=>{
 const scene=read('3d-highlights-scene.mjs');
 assert.match(scene,/function prewarm\(\)\{[\s\S]{0,200}renderer\.compile\(scene,camera\)/);
 assert.match(scene,/renderer\.initTexture\(t\)/);
 assert.match(scene,/return\{update,resize,dispose,inspect,reduceQuality,soundProbe,prewarm,/);
 // called once, after the size is known and before the first frame is requested
 const play=scene.slice(scene.indexOf('world=makeScene(renderer'));
 assert.ok(play.indexOf('world.prewarm?.()')>0&&play.indexOf('world.prewarm?.()')<play.indexOf('raf=requestAnimationFrame(frame)'));
});

test('the bench sits down before the walk-out starts when the body is ready',()=>{
 const scene=read('3d-highlights-scene.mjs'),i=scene.indexOf('  mountCoach(0);');
 assert.ok(i>0);
 assert.match(scene.slice(i,i+500),/if\(coachBench\?\.figure\)for\(let k=0;k<SUB_SEATS\.length&&!coachBench\.subsFailed&&coachBench\.subs\.length===k;k\+\+\)mountSub\(0\)/);
});

test('phone fans keep their place with a lighter head',()=>{
 const scene=read('3d-highlights-scene.mjs');
 assert.match(scene,/geo\(high\?'crowd-head-human':'crowd-head-human-phone',\(\)=>\{const g=high\?new THREE\.SphereGeometry\(\.123,7,6\):new THREE\.SphereGeometry\(\.123,6,5\)/);
});

test('goal clip copies the 3D picture once per video frame',()=>{
 const clip=read('footera-goal-clip.js'),body=clip.slice(clip.indexOf('function drawFrame('),clip.indexOf('/* ---------- recording'));
 // the blur reads the previous video frame (2D canvas) once a picture was drawn
 assert.match(body,/if\(look\.drawn\)blurCtx\.drawImage\(ctx\.canvas,0,vy,vw,vh,/);
 assert.equal((body.match(/drawImage\(src,/g)||[]).length,2,'first-frame blur fallback + the crop');
 assert.match(body,/ctx\.drawImage\(src,sx,sy,sw,sh,0,vy,vw,vh\);look\.drawn=true;/);
});

test('rain/snow spray reuses ball positions between frames',async()=>{
 const W=await import('../3d-weather.mjs'),src=read('3d-weather.mjs');
 assert.match(src,/const a=ballNear\(t0\),b=ballNear\(t0\+\.04\)/);
 assert.ok(!/ballAt\(t0/.test(src));
 assert.ok(W.createStadiumWeather);
});
