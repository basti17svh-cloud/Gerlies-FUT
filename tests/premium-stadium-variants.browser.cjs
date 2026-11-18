// Verify that the shared stadium builder still draws every selectable venue.
const {chromium}=require('playwright');
const {server}=require('./3d-highlights.browser.cjs');
const assert=require('node:assert/strict');

async function main(){
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const origin='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({headless:true,executablePath:process.env.FOOTERA_CHROMIUM,args:['--enable-unsafe-swiftshader','--use-angle=swiftshader']});
 try{
  const page=await browser.newPage({serviceWorkers:'block'}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('console',m=>{if(m.type()==='error'&&/THREE.*(shader|WebGLProgram)/i.test(m.text()))errors.push(m.text())});
  await page.route('**/*',r=>r.request().url().startsWith(origin)?r.continue():r.abort());
  await page.goto(origin,{waitUntil:'load'});
  const rows=await page.evaluate(async()=>{
   const T=await import('./vendor/three/three.module.min.js');
   const {createArena}=await import('./3d-arena.mjs?v=21469');
   const {stadiumLook,STADIUM_STYLES}=await import('./3d-stadium.mjs?v=21459');
   const renderer=new T.WebGLRenderer({alpha:false});
   renderer.setSize(210,140,false);
   const camera=new T.PerspectiveCamera(40,1.5,1,1200);
   camera.position.set(142,93,139);camera.lookAt(0,4,0);
   const rows=[];
   for(const style of STADIUM_STYLES){
    const scene=new T.Scene(),field=new T.Group(),resources=new Set();scene.add(field);
    const look=stadiumLook({name:'QA Arena',style});
    const arena=createArena(T,{scene,field,renderer,look,weak:true,track:o=>(resources.add(o),o)});
    arena.update(0,camera);
    renderer.render(scene,camera);
    const deck=arena.group.getObjectByName('FooteraArenaUpperTier');
    rows.push({style,...arena.info,vertices:deck?.geometry.getAttribute('position').count||0,calls:renderer.info.render.calls});
    arena.dispose();
    for(const item of resources)item.dispose?.();
   }
   renderer.dispose();
   return rows;
  });
  assert.equal(rows.length,9);
  const features={arena:[true,true],kessel:[true,true],tradition:[false,false],welle:[true,true],bogen:[true,true],kuppel:[true,true],ground:[false,false],wand:[true,true],berg:[false,false]};
  for(const row of rows){
   assert.deepEqual([row.roof,row.upperTier],features[row.style],row.style);
   assert.ok(row.calls>0&&row.lamps>0,row.style);
   if(row.upperTier)assert.ok(row.terraceRows===11&&row.vertices>100,row.style);
   if(!row.roof)assert.equal(row.masts,4,row.style);
   console.log(JSON.stringify(row));
  }
  for(const style of ['bogen','kuppel','ground','berg'])assert.ok(rows.find(r=>r.style===style).extras.length>0,style);
  assert.deepEqual(errors,[]);
 }finally{await browser.close();server.close()}
}

main().catch(e=>{console.error(e);process.exitCode=1});
