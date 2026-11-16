/* Transparent PNGs of production base cards. node scripts/social/render-card-pngs.cjs <outdir> "Name 1" "Name 2" ... */
const {chromium}=require('playwright'),fs=require('node:fs'),path=require('node:path');
const {server}=require('../../tests/3d-highlights.browser.cjs');
const OUT=path.resolve(process.argv[2]),NAMES=process.argv.slice(3),LOCAL=process.env.LOCAL==='1';
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch();
 try{
  const page=await browser.newPage({viewport:{width:1080,height:1920},deviceScaleFactor:3,serviceWorkers:'block'});
  await page.goto(base+'/index.html');await page.waitForTimeout(2000);
  await page.evaluate(()=>{if(!PLAYERS.length)syncDatabase(true)});await page.waitForFunction(()=>PLAYERS.length>10000,{},{timeout:90000});await page.waitForTimeout(1500);
  fs.mkdirSync(OUT,{recursive:true});const meta={};
  for(const name of NAMES){
   const info=await page.evaluate(name=>{for(const id of ['bootIntro','dbGate','onboarding','usernameRequiredModal'])document.getElementById(id)?.remove();
    const norm=s=>String(s||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase();
    const c=PLAYERS.filter(p=>norm(p.name)===norm(name)||norm(p.fullName)===norm(name)).sort((a,b)=>(b.ovr||0)-(a.ovr||0));const p=c[0];if(!p)return null;
    let host=document.getElementById('__cardHost');if(!host){host=document.createElement('div');host.id='__cardHost';host.style.cssText='position:fixed;left:40px;top:40px;width:470px;z-index:999999;background:transparent';document.body.appendChild(host)}
    host.innerHTML=cardHTML(p,makeItem(p));host.querySelectorAll('img').forEach(i=>{i.loading='eager'});return{id:p.id,name:p.name,ovr:p.ovr,team:p.team,position:p.position}},name);
   if(!info){console.log('MISSING',name);continue}
   for(let t=0;t<40;t++){const ok=await page.evaluate(()=>[...document.querySelectorAll('#__cardHost img')].every(i=>i.complete&&i.naturalWidth>0));if(ok||LOCAL)break;await page.waitForTimeout(500)}
   await page.waitForTimeout(400);
   const file=name.normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^A-Za-z0-9]+/g,'-').toLowerCase()+'.png';
   await page.locator('#__cardHost .card-shell').screenshot({path:path.join(OUT,file),omitBackground:true});
   meta[name]={...info,file};console.log(name,info.ovr,info.team);
  }
  fs.writeFileSync(path.join(OUT,'cards.json'),JSON.stringify(meta,null,1));
 }finally{await browser.close();server.close()}
})().catch(e=>{console.error(e);server.close();process.exitCode=1});
