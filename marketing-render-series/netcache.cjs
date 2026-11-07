const {chromium}=require('playwright'),http=require('http'),fs=require('fs'),path=require('path');
const root=require('path').join(__dirname,'..'),OUT=__dirname+'/cards2',NET=__dirname+'/net';fs.mkdirSync(OUT,{recursive:true});fs.mkdirSync(NET,{recursive:true});const netIndex={};const crypto=require('crypto');
const xi=require('./xi.json');const xf=require('./xi-full.json');const ids=[...new Set([...xf.home,...xf.away].map(p=>p.id))];
const mime={'.js':'text/javascript','.mjs':'text/javascript','.html':'text/html','.css':'text/css','.json':'application/json','.webp':'image/webp','.png':'image/png','.svg':'image/svg+xml','.csv':'text/csv','.woff2':'font/woff2'};
const srv=http.createServer((q,r)=>{let f=path.join(root,decodeURIComponent(new URL(q.url,'http://x').pathname));if(f.endsWith('/'))f+='index.html';try{r.setHeader('Content-Type',mime[path.extname(f)]||'application/octet-stream');r.end(fs.readFileSync(f))}catch{r.writeHead(404).end()}});
srv.listen(0,async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:1200,height:1400},deviceScaleFactor:2,serviceWorkers:'block',locale:'de-DE'});
ctx.on('response',async res=>{try{const u=res.url();if(u.startsWith('http://127.0.0.1')||res.status()!==200)return;const t=res.request().resourceType();if(!['image','font','fetch','xhr'].includes(t))return;if(/supabase\.co\/(rest|auth)/.test(u))return;const b=await res.body();const f=crypto.createHash('sha1').update(u).digest('hex').slice(0,20);fs.writeFileSync(NET+'/'+f,b);netIndex[u]={f,type:res.headers()['content-type']||''};fs.writeFileSync(NET+'/index.json',JSON.stringify(netIndex,null,1))}catch(e){}});
await ctx.route(/supabase\.co\/(rest|auth|realtime|functions)|googletag/,r=>r.abort());await ctx.addInitScript(()=>{try{localStorage.setItem("footera-analytics-consent-v1","denied")}catch(_){}});
const p=await ctx.newPage();await p.goto('http://127.0.0.1:'+srv.address().port+'/');
await p.waitForFunction(()=>typeof PLAYERS!=='undefined'&&PLAYERS.length>1000&&typeof cardHTML==='function',null,{timeout:180000});await p.waitForTimeout(2000);
await p.evaluate(()=>{const box=document.createElement("div");box.id="scb";box.style.cssText="position:fixed;left:0;top:0;z-index:2147483647;padding:40px";document.body.appendChild(box);const s=document.createElement("style");s.textContent="body>*:not(#scb){visibility:hidden!important} #scb .card-shell{width:320px!important;max-width:320px!important;margin:0!important}";document.head.appendChild(s);document.documentElement.style.background="transparent";document.body.style.background="transparent"});
for(const id of ids){
 const ok=await p.evaluate(id=>{const pl=P_BY_ID.get(String(id));if(!pl)return false;const box=document.getElementById('scb');box.innerHTML=cardHTML(pl);box.querySelectorAll("img").forEach(im=>{im.loading="eager";if(im.dataset.pendingSrc&&!im.getAttribute('src')){im.src=im.dataset.pendingSrc;im.style.display=''}});if(typeof fitCardPortrait==="function")box.querySelectorAll("img").forEach(im=>{try{fitCardPortrait(im)}catch(_){}});return true},id);
 if(!ok){console.log('missing',id);continue}
 await p.waitForFunction(()=>[...document.querySelectorAll("#scb img")].every(i=>i.complete),null,{timeout:30000}).catch(()=>{});await p.waitForTimeout(2500);
 await (await p.$('#scb .card-shell')||await p.$('#scb > *')).screenshot({path:`${OUT}/${id}.png`,omitBackground:true});
}
console.log('done',ids.length);await b.close();srv.close()});
