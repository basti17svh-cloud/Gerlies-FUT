// Isolated screenshot and WebGL workload comparison for Step 1.5.
// Run with a path to a pristine main worktree and a destination directory.
const {chromium}=require('playwright');
const {fixture,force}=require('./3d-highlights.browser.cjs');
const {createServer}=require('node:http');
const {mkdir,readFile,writeFile}=require('node:fs/promises');
const {resolve,extname,sep}=require('node:path');
const assert=require('node:assert/strict');

const mime={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.webp':'image/webp','.png':'image/png','.svg':'image/svg+xml'};
const baseline=resolve(process.argv[2]);
const out=resolve(process.argv[3]);

async function serve(root){
 const server=createServer(async (req,res)=>{
  const pathname=new URL(req.url,'http://localhost').pathname;
  const file=resolve(root,'.'+(pathname==='/'?'/index.html':pathname));
  if(!file.startsWith(root+sep)){res.writeHead(403).end();return}
  try{
   let body=await readFile(file);
   if(pathname==='/'||pathname==='/index.html'){
    // Remove only the startup script that connects to the player account.
    const html=body.toString(),last=html.lastIndexOf('<script>');
    body=html.slice(0,last)+html.slice(html.indexOf('</script>',last)+9);
   }
   if(pathname==='/3d-highlights-scene.mjs'){
    // Snapshot the real broadcast camera and draw statistics immediately
    // before/after render. A/B uses the exact baseline camera projection.
    body=body.toString().replace('const displayTime=sample.time;', 'const displayTime=globalThis.qaSceneTime ?? sample.time;')
     .replace('world.update(displayTime);', 'world.update(displayTime, {replay:globalThis.qaReplay});')
     .replace('   renderer.render(scene,camera);\n  }\n  function reduceQuality',`   globalThis.qaCamera?.(camera);
   renderer.render(scene,camera);
   globalThis.qaRender?.(renderer, time);
  }
  function reduceQuality`);
   }
   res.setHeader('Content-Type',mime[extname(file)]||'application/octet-stream');res.end(body);
  }catch{res.writeHead(404).end()}
 });
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 return {url:`http://127.0.0.1:${server.address().port}`,close:()=>server.close()};
}

async function open(browser,url,width,low){
 const ctx=await browser.newContext({viewport:{width,height:844},deviceScaleFactor:1,isMobile:true,hasTouch:true,serviceWorkers:'block'});
 const page=await ctx.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 page.on('console',m=>{if(m.type()==='error'&&/THREE.*(shader|WebGLProgram)/i.test(m.text()))errors.push(m.text())});
 await page.route('**/*',r=>r.request().url().startsWith(url)?r.continue():r.abort());
 await page.addInitScript(low=>{
  Object.defineProperty(navigator,'deviceMemory',{get:()=>low?2:8});
  Object.defineProperty(navigator,'hardwareConcurrency',{get:()=>low?4:8});
  globalThis.FOOTERA_TEST_REALTIME_3D=true;
  const raf=requestAnimationFrame,caf=cancelAnimationFrame,queued=new Map();
  const timeout=setTimeout;
  globalThis.setTimeout=(cb,ms,...args)=>timeout(cb,hold&&ms>=12000?600000:ms,...args);
  let id=1000000,now=0,hold=false;
  globalThis.requestAnimationFrame=cb=>hold?(queued.set(++id,cb),id):raf(cb);
  globalThis.cancelAnimationFrame=i=>queued.delete(i)||caf(i);
  globalThis.qaHold=()=>{hold=true;queued.clear()};
  globalThis.qaAdvance=ms=>{
   const callbacks=[...queued.values()];queued.clear();now=Math.max(now,performance.now())+ms;
   callbacks.forEach(cb=>cb(now));
  };
  globalThis.qaResume=()=>{hold=false;for(const cb of queued.values())raf(cb);queued.clear()};
  globalThis.qaCamera=c=>{
   globalThis.qaPose={position:c.position.toArray(),rotation:c.quaternion.toArray(),fov:c.fov};
   if(globalThis.qaFixedCamera){
    const {position,rotation,fov}=globalThis.qaFixedCamera;
    c.position.fromArray(position);c.quaternion.fromArray(rotation);c.fov=fov;
    c.updateProjectionMatrix();c.updateMatrixWorld();
   }
  };
  globalThis.qaRender=(r,time)=>{globalThis.qaFrame={...r.info.render,time}};
 },low);
 await page.goto(url,{waitUntil:'load'});
 return {ctx,page,errors};
}

async function saveFrame(page,name){
 const clip=await page.locator('.fh3d').boundingBox();
 assert.ok(clip,'the production highlight is visible');
 await page.screenshot({path:resolve(out,name),clip,timeout:90000});
}

async function capture(browser,url,width,label,poses){
 const low=width===360,{ctx,page,errors}=await open(browser,url,width,low);
 try{
  await page.evaluate(async()=>{
   const src=performance.getEntriesByType('resource').find(r=>r.name.includes('/3d-highlights.js')).name;
   const entry=await (await fetch(src)).text();
   const scene=entry.match(/import\('(.\/3d-highlights-scene\.mjs\?v=\d+)'\)/)[1];
   const model=await import(scene);
   await model.prepareFooteraHumanModel();
   await model.footeraRealBodyLoaded();
  });
  await fixture(page);
  await page.evaluate(()=>{
   match.minute=38;match.venue='home';match.stadium={style:'arena',name:'Heimteam Arena',seatPrimary:'#194e3f',seatSecondary:'#e7c776'};
   match.weather={kind:'clear'};updateMatchUI();
   window.originalSequence=match3DSequence;match3DSequence=()=>'cut_inside_right';
   window.originalPresentation=FooteraHighlights.choosePresentation;
   window.originalPlacement=FooteraHighlights.chooseShotPlacement;
   window.originalReaction=FooteraHighlights.chooseReactions;
   FooteraHighlights.chooseShotPlacement=()=>({side:1,zone:'corner',height:'mid'});
   FooteraHighlights.chooseReactions=()=>({defenderAction:'jockey',keeperAction:'fingertip'});
   FooteraHighlights.choosePresentation=(event,history)=>({...window.originalPresentation(event,history),sequence:'cut_inside_right',finish:'finesse'});
   match.kickoffKits={
    home:{pattern:'diagonal',shirtPrimary:'#194e3f',shirtSecondary:'#e7c776',shorts:'#112627',socks:'#e7c776'},
    away:{pattern:'halves',shirtPrimary:'#f2f5f6',shirtSecondary:'#a52349',shorts:'#f2f5f6',socks:'#a52349'}
   };
   qaHold();
  });
  assert.equal((await force(page,'goal')).goals,1);
  await page.waitForSelector('.fh3d canvas',{state:'attached',timeout:20000});
  await page.evaluate(()=>{
   match3DSequence=window.originalSequence;
   FooteraHighlights.choosePresentation=window.originalPresentation;
   FooteraHighlights.chooseShotPlacement=window.originalPlacement;
   FooteraHighlights.chooseReactions=window.originalReaction;
  });
  const rows=[];
  for(const [name,t] of [['angriff',4.4],['tor',7.08]]){
   const stats=await page.evaluate(({t,fixed})=>{
    globalThis.qaSceneTime=t;
    globalThis.qaFixedCamera=fixed||null;
    qaAdvance(16);
    const layer=document.querySelector('.fh3d'),canvas=layer.querySelector('canvas');
    return {frame:qaFrame,pose:qaPose,quality:layer.dataset.quality,model:layer.dataset.playerModelVariant,modelLabel:layer.querySelector('[data-model-status]')?.textContent,webgl:!!canvas.getContext('webgl2'),size:[canvas.width,canvas.height],score:match.home};
   },{t,fixed:poses?.[name]});
   assert.ok(stats.webgl&&Math.abs(stats.frame.time-t)<.012,JSON.stringify(stats));
   assert.equal(stats.model,'human');
   await saveFrame(page,`${label}-${width}-${name}.png`);
   rows.push({name,width,label,...stats});
  }
  if(poses&&width===390){
   await page.evaluate(()=>{globalThis.qaFixedCamera=null;globalThis.qaReplay=true;qaAdvance(16)});
   await saveFrame(page,'nachher-390-tv-kamera.png');
  }
  await page.evaluate(()=>{document.querySelector('.fh3d-skip').click();qaResume()});
  await page.waitForSelector('.fh3d',{state:'detached'});
  assert.ok(await page.evaluate(()=>match.home===1&&match.goalEvents.length===1&&match.shotEvents.length===1&&!match.highlight3DPending&&matchTimer!==null));
  if(width===390){
   await page.evaluate(()=>{
    stopMatchTimer();qaHold();globalThis.qaSceneTime=2.65;globalThis.qaReplay=false;
    globalThis.qaFixedCamera=null;queueMatchCeremony3D('kickoff');
   });
   await page.waitForSelector('.fh3d canvas',{state:'attached',timeout:20000});
   await page.evaluate(()=>qaAdvance(16));
   await saveFrame(page,`${label}-390-stadion.png`);
  }
  assert.deepEqual(errors,[]);
  return rows;
 }finally{await ctx.close()}
}

async function main(){
 await mkdir(out,{recursive:true});
 const before=await serve(baseline),after=await serve(resolve(__dirname,'..'));
 const browser=await chromium.launch({headless:true,executablePath:process.env.FOOTERA_CHROMIUM, args:['--enable-unsafe-swiftshader','--use-angle=swiftshader']});
 try{
  const report=[];
  for(const width of (process.env.FOOTERA_WIDTHS||'390,360,412').split(',').map(Number)){
   const old=await capture(browser,before.url,width,'vorher');
   const poses=Object.fromEntries(old.map(row=>[row.name,row.pose]));
   const next=await capture(browser,after.url,width,'nachher',poses);
   for(let i=0;i<old.length;i++){
    assert.deepEqual(next[i].size,old[i].size);
    assert.equal(next[i].modelLabel,old[i].modelLabel);
    assert.equal(next[i].quality,old[i].quality);
    assert.equal(next[i].frame.time,old[i].frame.time);
    assert.ok(next[i].frame.triangles<=old[i].frame.triangles*1.03,'Mobile triangle budget');
    assert.ok(next[i].frame.calls<=old[i].frame.calls+2,'Mobile draw-call budget');
   }
   report.push(...old,...next);
   console.log(JSON.stringify([...old,...next]));
   await writeFile(resolve(out,'messwerte.json'),JSON.stringify(report,null,2)+'\n');
  }
 }finally{await browser.close();before.close();after.close()}
}

main().catch(e=>{console.error(e);process.exitCode=1});
